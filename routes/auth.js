const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const passport = require('passport');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const oauthService = require('../services/oauthService');
const config = require('../config/environment');
const OAUTH_CONFIG = config.OAUTH;
const REDIRECT_CONFIG = config.REDIRECT;
const router = express.Router();

// Vérifier si un email existe déjà
router.get('/check-email/:email', async (req, res) => {
    try {
        const { email } = req.params;

        const [users] = await db.execute(
            'SELECT id, email_verified FROM utilisateurs WHERE email = ?',
            [email]
        );

        if (users.length > 0) {
            return res.status(400).json({ 
                error: 'Email déjà utilisé',
                exists: true,
                verified: users[0].email_verified 
            });
        }

        res.json({ 
            message: 'Email disponible',
            exists: false 
        });

    } catch (error) {
        console.error('Erreur vérification email:', error);
        
        // Gérer spécifiquement les erreurs de connexion DB
        if (error.message && error.message.includes('max_user_connections')) {
            console.log('🔧 Erreur de connexion DB détectée, utilisation du fallback');
            return res.status(200).json({ 
                error: 'Service temporairement indisponible. Veuillez réessayer dans quelques instants.',
                fallback: true 
            });
        }
        
        res.status(500).json({ error: 'Erreur lors de la vérification de l\'email' });
    }
});

// Inscription - Étape 1: Envoi du code de vérification
router.post('/register/send-verification', [
    body('email').isEmail().normalizeEmail()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email } = req.body;

        // Vérifier si l'email existe déjà
        const [existingUsers] = await db.execute(
            'SELECT id, email_verified FROM utilisateurs WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            if (existingUsers[0].email_verified) {
                return res.status(400).json({ error: 'Cet email est déjà utilisé et vérifié' });
            } else {
                return res.status(400).json({ error: 'Cet email est déjà utilisé mais non vérifié. Vérifiez votre boîte email.' });
            }
        }

        // Générer un code de vérification à 6 chiffres
        const emailService = require('../services/emailService');
        const verificationCode = emailService.generateVerificationCode();
        const codeExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Debug: Afficher le code généré
        console.log('🔧 [Auth] Génération du code de vérification:');
        console.log('  - Email:', email);
        console.log('  - Code généré:', verificationCode);
        console.log('  - Type du code:', typeof verificationCode);
        console.log('  - Expiration:', codeExpiry);

        // Créer ou mettre à jour un utilisateur temporaire avec le code
        const [result] = await db.execute(`
            INSERT INTO utilisateurs_temp (
                email, verification_code, code_expires_at, created_at
            ) VALUES (?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE
                verification_code = VALUES(verification_code),
                code_expires_at = VALUES(code_expires_at),
                created_at = NOW()
        `, [email, verificationCode, codeExpiry]);

        // Debug: Vérifier ce qui a été stocké
        const [storedUser] = await db.execute(`
            SELECT * FROM utilisateurs_temp WHERE email = ?
        `, [email]);
        
        console.log('  - Utilisateur stocké:', storedUser[0]);
        console.log('  - Code stocké:', storedUser[0]?.verification_code);
        console.log('  - Type du code stocké:', typeof storedUser[0]?.verification_code);

        // Envoyer l'email de vérification
        const userData = { email, prenom: '', nom: '' };
        await emailService.sendVerificationCodeEmail(userData, verificationCode);

        res.json({
            message: 'Code de vérification envoyé par email',
            email: email,
            expires_in: 600 // 10 minutes en secondes
        });

    } catch (error) {
        console.error('Erreur envoi code vérification:', error);
        res.status(500).json({ error: 'Erreur lors de l\'envoi du code de vérification' });
    }
});

// Inscription - Étape 2: Vérification du code et finalisation
router.post('/register/verify-code', [
    body('email').isEmail().normalizeEmail(),
    body('verification_code').isLength({ min: 6, max: 6 }),
    body('mot_de_passe').isLength({ min: 6 }),
    body('nom').notEmpty().trim(),
    body('role_id').isInt({ min: 1, max: 3 })
], async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, verification_code, mot_de_passe, nom, prenom, telephone, role_id, entreprise } = req.body;

        // Debug: Vérifier le code de vérification
        console.log('🔍 [Auth] Vérification du code:');
        console.log('  - Email:', email);
        console.log('  - Code reçu:', verification_code);
        console.log('  - Type du code:', typeof verification_code);
        
        const [tempUsers] = await connection.execute(`
            SELECT * FROM utilisateurs_temp 
            WHERE email = ? AND verification_code = ? AND code_expires_at > UTC_TIMESTAMP()
        `, [email, verification_code]);

        console.log('  - Utilisateurs trouvés:', tempUsers.length);
        if (tempUsers.length > 0) {
            console.log('  - Utilisateur temp trouvé:', tempUsers[0]);
        }

        if (tempUsers.length === 0) {
            // Debug: Vérifier si l'utilisateur existe mais avec un code différent
            const [tempUsersAll] = await connection.execute(`
                SELECT * FROM utilisateurs_temp 
                WHERE email = ? AND code_expires_at > UTC_TIMESTAMP()
            `, [email]);
            
            console.log('  - Utilisateurs temp avec email (tous codes):', tempUsersAll.length);
            if (tempUsersAll.length > 0) {
                console.log('  - Code stocké:', tempUsersAll[0].verification_code);
                console.log('  - Code attendu:', verification_code);
                console.log('  - Codes identiques:', tempUsersAll[0].verification_code === verification_code);
            }
            
            await connection.rollback();
            return res.status(400).json({ error: 'Code de vérification invalide ou expiré' });
        }

        // Vérifier si l'email existe déjà dans la table principale
        const [existingUsers] = await connection.execute(
            'SELECT id FROM utilisateurs WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'Cet email est déjà utilisé' });
        }

        // Hasher le mot de passe
        const hashedPassword = await bcrypt.hash(mot_de_passe, 12);

        // Insérer l'utilisateur avec email vérifié
        const [result] = await connection.execute(
            'INSERT INTO utilisateurs (email, mot_de_passe, nom, prenom, telephone, role_id, email_verified, email_verified_at) VALUES (?, ?, ?, ?, ?, ?, 1, NOW())',
            [email, hashedPassword, nom, prenom, telephone, role_id]
        );

        const userId = result.insertId;
        let entrepriseId = null;

        // Si c'est un fournisseur et qu'il y a des données d'entreprise, les créer
        if (role_id === 2 && entreprise) {
            const [entrepriseResult] = await connection.execute(`
                INSERT INTO entreprises (
                    utilisateur_id, nom_entreprise, telephone_professionnel, site_web, description,
                    secteur_activite_id, type_entreprise_id, annee_creation, nombre_employes,
                    adresse_ligne1, adresse_ligne2, ville, code_postal, pays,
                    numero_siret, numero_registre_commerce, numero_tva, capacite_production, certifications,
                    statut_verification
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'en_attente')
            `, [
                userId,
                entreprise.nom_entreprise,
                entreprise.telephone_professionnel,
                entreprise.site_web || null,
                entreprise.description || null,
                entreprise.secteur_activite_id,
                entreprise.type_entreprise_id,
                entreprise.annee_creation || null,
                entreprise.nombre_employes || null,
                entreprise.adresse_ligne1,
                entreprise.adresse_ligne2 || null,
                entreprise.ville,
                entreprise.code_postal,
                entreprise.pays || 'Gabon',
                entreprise.numero_siret,
                entreprise.numero_registre_commerce || null,
                entreprise.numero_tva || null,
                entreprise.capacite_production || null,
                entreprise.certifications || null,
            ]);

            entrepriseId = entrepriseResult.insertId;

            // Créer l'enregistrement des étapes d'inscription
            await connection.execute(`
                INSERT INTO etapes_inscription (
                    entreprise_id, etape_1_compte, etape_2_entreprise, etape_3_adresse,
                    etape_4_legal, etape_5_produits, etape_completee
                ) VALUES (?, 1, 1, 1, 1, 1, 1)
            `, [entrepriseId]);
        }

        // Supprimer l'enregistrement temporaire
        await connection.execute('DELETE FROM utilisateurs_temp WHERE email = ?', [email]);

        // Générer le token JWT
        const token = jwt.sign(
            { id: userId, email, role_id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        await connection.commit();

        res.status(201).json({
            message: 'Compte créé et vérifié avec succès',
            token,
            user: {
                id: userId,
                email,
                nom,
                prenom,
                role_id,
                entreprise_id: entrepriseId
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('Erreur création compte:', error);
        res.status(500).json({ error: 'Erreur lors de la création du compte' });
    } finally {
        connection.release();
    }
});

// Inscription (ancienne route - gardée pour compatibilité)
router.post('/register', [
    body('email').isEmail().normalizeEmail(),
    body('mot_de_passe').isLength({ min: 6 }),
    body('nom').notEmpty().trim(),
    body('role_id').isInt({ min: 1, max: 3 })
], async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, mot_de_passe, nom, prenom, telephone, role_id, entreprise } = req.body;

        // Vérifier si l'email existe déjà
        const [existingUsers] = await connection.execute(
            'SELECT id FROM utilisateurs WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'Cet email est déjà utilisé' });
        }

        // Hasher le mot de passe
        const hashedPassword = await bcrypt.hash(mot_de_passe, 12);

        // Insérer l'utilisateur
        const [result] = await connection.execute(
            'INSERT INTO utilisateurs (email, mot_de_passe, nom, prenom, telephone, role_id) VALUES (?, ?, ?, ?, ?, ?)',
            [email, hashedPassword, nom, prenom, telephone, role_id]
        );

        const userId = result.insertId;
        let entrepriseId = null;

        // Si c'est un fournisseur et qu'il y a des données d'entreprise, les créer
        if (role_id === 2 && entreprise) {
            const [entrepriseResult] = await connection.execute(`
                INSERT INTO entreprises (
                    utilisateur_id, nom_entreprise, telephone_professionnel, site_web, description,
                    secteur_activite_id, type_entreprise_id, annee_creation, nombre_employes,
                    adresse_ligne1, adresse_ligne2, ville, code_postal, pays,
                    numero_siret, numero_registre_commerce, numero_tva, capacite_production, certifications,
                    statut_verification
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'en_attente')
            `, [
                userId,
                entreprise.nom_entreprise,
                entreprise.telephone_professionnel,
                entreprise.site_web || null,
                entreprise.description || null,
                entreprise.secteur_activite_id,
                entreprise.type_entreprise_id,
                entreprise.annee_creation || null,
                entreprise.nombre_employes || null,
                entreprise.adresse_ligne1,
                entreprise.adresse_ligne2 || null,
                entreprise.ville,
                entreprise.code_postal,
                entreprise.pays || 'Gabon',
                entreprise.numero_siret,
                entreprise.numero_registre_commerce || null,
                entreprise.numero_tva || null,
                entreprise.capacite_production || null,
                entreprise.certifications || null,
            ]);

            entrepriseId = entrepriseResult.insertId;

            // Créer l'enregistrement des étapes d'inscription
            await connection.execute(`
                INSERT INTO etapes_inscription (
                    entreprise_id, etape_1_compte, etape_2_entreprise, etape_3_adresse,
                    etape_4_legal, etape_5_produits, etape_completee
                ) VALUES (?, 1, 1, 1, 1, 1, 1)
            `, [entrepriseId]);
        }

        // Générer le token JWT
        const token = jwt.sign(
            { id: userId, email, role_id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        await connection.commit();

        res.status(201).json({
            message: 'Utilisateur créé avec succès',
            token,
            user: { 
                id: userId, 
                email, 
                nom, 
                prenom, 
                role_id,
                entreprise_id: entrepriseId
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de l\'inscription' });
    } finally {
        connection.release();
    }
});


// Connexion
router.post('/login', [
    body('email').isEmail().normalizeEmail(),
    body('mot_de_passe').notEmpty()
], async (req, res) => {
    try {
        console.log('🔍 Login Debug: Début de la connexion');
        console.log('🔍 Login Debug: Variables env - JWT_SECRET:', process.env.JWT_SECRET ? 'Défini' : 'MANQUANT');
        console.log('🔍 Login Debug: Variables env - JWT_EXPIRES_IN:', process.env.JWT_EXPIRES_IN || 'MANQUANT');
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('🔍 Login Debug: Erreurs de validation:', errors.array());
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, mot_de_passe } = req.body;
        console.log('🔍 Login Debug: Email reçu:', email);
        console.log('🔍 Login Debug: Mot de passe reçu:', mot_de_passe ? 'Oui' : 'Non');

        // Vérifier la connexion à la base de données
        console.log('🔍 Login Debug: Test connexion DB...');
        try {
            await db.execute('SELECT 1');
            console.log('🔍 Login Debug: Connexion DB OK');
        } catch (dbError) {
            console.error('🔍 Login Debug: ERREUR DB:', dbError);
            return res.status(500).json({ error: 'Erreur de base de données' });
        }

        // Trouver l'utilisateur
        console.log('🔍 Login Debug: Recherche utilisateur en base...');
        let users;
        try {
            [users] = await db.execute(
                'SELECT id, email, mot_de_passe, nom, prenom, role_id, statut FROM utilisateurs WHERE email = ?',
                [email]
            );
            console.log('🔍 Login Debug: Utilisateurs trouvés:', users.length);
        } catch (queryError) {
            console.error('🔍 Login Debug: ERREUR REQUÊTE UTILISATEUR:', queryError);
            return res.status(500).json({ error: 'Erreur lors de la recherche utilisateur' });
        }

        if (users.length === 0) {
            console.log('🔍 Login Debug: Aucun utilisateur trouvé pour:', email);
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }

        const user = users[0];
        console.log('🔍 Login Debug: Utilisateur trouvé - ID:', user.id, 'Statut:', user.statut);

        if (user.statut === 'suspendu') {
            console.log('🔍 Login Debug: Compte suspendu pour:', email);
            
            // Récupérer les détails de la suspension
            const [suspensionDetails] = await db.execute(
                'SELECT suspension_reason, suspended_at FROM utilisateurs WHERE id = ?',
                [user.id]
            );
            
            const reason = suspensionDetails[0]?.suspension_reason || 'Aucune raison spécifiée';
            
            return res.status(403).json({ 
                error: 'Compte suspendu par l\'administrateur',
                details: `Raison: ${reason}`,
                suspended: true
            });
        }
        
        if (user.statut !== 'actif') {
            console.log('🔍 Login Debug: Compte inactif pour:', email);
            return res.status(401).json({ error: 'Compte inactif' });
        }

        // Vérifier le mot de passe
        console.log('🔍 Login Debug: Vérification du mot de passe...');
        let isValidPassword;
        try {
            isValidPassword = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
            console.log('🔍 Login Debug: Mot de passe valide:', isValidPassword);
        } catch (bcryptError) {
            console.error('🔍 Login Debug: ERREUR BCRYPT:', bcryptError);
            return res.status(500).json({ error: 'Erreur lors de la vérification du mot de passe' });
        }
        
        if (!isValidPassword) {
            console.log('🔍 Login Debug: Mot de passe incorrect pour:', email);
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }

        // Mettre à jour la dernière connexion
        console.log('🔍 Login Debug: Mise à jour dernière connexion...');
        try {
            await db.execute(
                'UPDATE utilisateurs SET derniere_connexion = NOW() WHERE id = ?',
                [user.id]
            );
            console.log('🔍 Login Debug: Dernière connexion mise à jour');
        } catch (updateError) {
            console.error('🔍 Login Debug: ERREUR MISE À JOUR:', updateError);
            // Ne pas bloquer la connexion pour cette erreur
        }

        // Vérifier les variables JWT
        if (!process.env.JWT_SECRET) {
            console.error('🔍 Login Debug: JWT_SECRET manquant !');
            return res.status(500).json({ error: 'Configuration serveur incorrecte' });
        }

        // Générer le token JWT
        console.log('🔍 Login Debug: Génération du token JWT...');
        console.log('🔍 Login Debug: JWT_SECRET présent:', !!process.env.JWT_SECRET);
        console.log('🔍 Login Debug: JWT_EXPIRES_IN:', process.env.JWT_EXPIRES_IN);
        console.log('🔍 Login Debug: Payload:', { id: user.id, email: user.email, role_id: user.role_id });
        
        let token;
        try {
            token = jwt.sign(
                { id: user.id, email: user.email, role_id: user.role_id },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
            );
            console.log('🔍 Login Debug: Token généré avec succès, longueur:', token ? token.length : 'undefined');
            console.log('🔍 Login Debug: Token preview:', token ? token.substring(0, 50) + '...' : 'undefined');
        } catch (jwtError) {
            console.error('🔍 Login Debug: ERREUR JWT:', jwtError);
            return res.status(500).json({ error: 'Erreur lors de la génération du token' });
        }

        console.log('🔍 Login Debug: Connexion réussie pour:', email);
        console.log('🔍 Login Debug: Réponse à envoyer:', {
            message: 'Connexion réussie',
            token: token ? 'PRÉSENT' : 'ABSENT',
            user: 'PRÉSENT'
        });
        
        res.json({
            message: 'Connexion réussie',
            token,
            user: {
                id: user.id,
                email: user.email,
                nom: user.nom,
                prenom: user.prenom,
                role_id: user.role_id
            }
        });

    } catch (error) {
        console.error('🔍 Login Debug: ERREUR CRITIQUE NON GÉRÉE:', error);
        console.error('🔍 Login Debug: Type d\'erreur:', error.constructor.name);
        console.error('🔍 Login Debug: Message:', error.message);
        console.error('🔍 Login Debug: Stack trace:', error.stack);
        res.status(500).json({ 
            error: 'Erreur lors de la connexion',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Route pour récupérer l'utilisateur actuel
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const [users] = await db.execute(`
            SELECT u.id, u.email, u.nom, u.prenom, u.telephone, u.role_id, u.date_inscription as created_at,
                   r.nom as role_nom
            FROM utilisateurs u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = ?
        `, [req.user.id]);

        if (users.length === 0) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        const user = users[0];
        user.role = { id: user.role_id, nom: user.role_nom };
        delete user.role_nom;

        // Si c'est un fournisseur, récupérer les infos entreprise avec relations
        if (user.role_id === 2) {
            const [entreprises] = await db.execute(`
                SELECT e.*, 
                       sa.nom as secteur_activite_nom,
                       te.nom as type_entreprise_nom
                FROM entreprises e
                LEFT JOIN secteurs_activite sa ON e.secteur_activite_id = sa.id
                LEFT JOIN types_entreprise te ON e.type_entreprise_id = te.id
                WHERE e.utilisateur_id = ?
            `, [user.id]);
            
            if (entreprises.length > 0) {
                const entreprise = entreprises[0];
                // Ajouter les objets de relation pour compatibilité frontend
                if (entreprise.secteur_activite_nom) {
                    entreprise.secteur_activite = {
                        id: entreprise.secteur_activite_id,
                        nom: entreprise.secteur_activite_nom
                    };
                }
                if (entreprise.type_entreprise_nom) {
                    entreprise.type_entreprise = {
                        id: entreprise.type_entreprise_id,
                        nom: entreprise.type_entreprise_nom
                    };
                }
                user.entreprise = entreprise;
            }
        }

        // Récupérer les adresses
        const [adresses] = await db.execute(
            'SELECT * FROM adresses WHERE utilisateur_id = ? ORDER BY par_defaut DESC',
            [user.id]
        );
        
        user.adresses = adresses;

        res.json(user);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la récupération du profil' });
    }
});

// Déconnexion
router.post('/logout', authenticateToken, (req, res) => {
    // En JWT, la déconnexion se fait côté client en supprimant le token
    res.json({ message: 'Déconnexion réussie' });
});

// Route de test pour diagnostiquer les problèmes de connexion
router.get('/test', async (req, res) => {
    try {
        console.log('🔍 Auth Test: Début du test');
        
        // Test 1: Variables d'environnement
        const envCheck = {
            JWT_SECRET: process.env.JWT_SECRET ? 'Défini' : 'MANQUANT',
            JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || 'MANQUANT',
            DB_HOST: process.env.DB_HOST ? 'Défini' : 'MANQUANT',
            DB_NAME: process.env.DB_NAME ? 'Défini' : 'MANQUANT'
        };
        
        // Test 2: Connexion base de données
        let dbStatus = 'OK';
        let userCount = 0;
        try {
            await db.execute('SELECT 1');
            const [users] = await db.execute('SELECT COUNT(*) as count FROM utilisateurs');
            userCount = users[0].count;
        } catch (dbError) {
            dbStatus = `ERREUR: ${dbError.message}`;
        }
        
        // Test 3: Modules requis
        const modulesCheck = {
            bcrypt: typeof bcrypt !== 'undefined' ? 'OK' : 'MANQUANT',
            jwt: typeof jwt !== 'undefined' ? 'OK' : 'MANQUANT',
            validator: typeof validationResult !== 'undefined' ? 'OK' : 'MANQUANT'
        };
        
        res.json({
            message: 'Test de diagnostic auth',
            timestamp: new Date().toISOString(),
            environment: envCheck,
            database: {
                status: dbStatus,
                userCount: userCount
            },
            modules: modulesCheck,
            nodeVersion: process.version,
            platform: process.platform
        });
        
    } catch (error) {
        console.error('🔍 Auth Test: ERREUR:', error);
        res.status(500).json({
            error: 'Erreur lors du test',
            details: error.message
        });
    }
});

// Mot de passe oublié - Demander la réinitialisation
router.post('/forgot-password', [
    body('email').isEmail().normalizeEmail()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email } = req.body;

        // Vérifier si l'utilisateur existe
        const [users] = await db.execute(
            'SELECT id, email, nom, prenom FROM utilisateurs WHERE email = ? AND statut = "actif"',
            [email]
        );

        if (users.length === 0) {
            // Ne pas révéler si l'email existe ou non pour des raisons de sécurité
            return res.json({
                message: 'Si cet email existe dans notre système, vous recevrez un lien de réinitialisation'
            });
        }

        const user = users[0];

        // Générer un token de reset
        const emailService = require('../services/emailService');
        const resetToken = emailService.generateResetToken();
        const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

        // Supprimer les anciens tokens de reset pour cet utilisateur
        await db.execute(
            'DELETE FROM password_reset_tokens WHERE utilisateur_id = ?',
            [user.id]
        );

        // Insérer le nouveau token
        await db.execute(`
            INSERT INTO password_reset_tokens (utilisateur_id, token, expires_at, created_at)
            VALUES (?, ?, ?, NOW())
        `, [user.id, resetToken, tokenExpiry]);

        // Envoyer l'email de reset
        await emailService.sendPasswordResetEmail(user, resetToken);

        res.json({
            message: 'Si cet email existe dans notre système, vous recevrez un lien de réinitialisation'
        });

    } catch (error) {
        console.error('Erreur forgot password:', error);
        res.status(500).json({ error: 'Erreur lors de la demande de réinitialisation' });
    }
});

// Vérifier la validité du token de reset
router.get('/reset-password/verify/:token', async (req, res) => {
    try {
        const { token } = req.params;

        const [tokens] = await db.execute(`
            SELECT prt.*, u.email, u.nom, u.prenom 
            FROM password_reset_tokens prt
            JOIN utilisateurs u ON prt.utilisateur_id = u.id
            WHERE prt.token = ? AND prt.expires_at > UTC_TIMESTAMP() AND prt.used = 0
        `, [token]);

        if (tokens.length === 0) {
            return res.status(400).json({ 
                error: 'Token invalide ou expiré',
                valid: false 
            });
        }

        res.json({
            valid: true,
            user: {
                email: tokens[0].email,
                nom: tokens[0].nom,
                prenom: tokens[0].prenom
            }
        });

    } catch (error) {
        console.error('Erreur vérification token:', error);
        res.status(500).json({ error: 'Erreur lors de la vérification du token' });
    }
});

// Réinitialiser le mot de passe
router.post('/reset-password', [
    body('token').notEmpty(),
    body('newPassword').isLength({ min: 6 })
], async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { token, newPassword } = req.body;

        // Vérifier le token
        const [tokens] = await connection.execute(`
            SELECT * FROM password_reset_tokens 
            WHERE token = ? AND expires_at > UTC_TIMESTAMP() AND used = 0
        `, [token]);

        if (tokens.length === 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'Token invalide ou expiré' });
        }

        const resetToken = tokens[0];

        // Hasher le nouveau mot de passe
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Mettre à jour le mot de passe
        await connection.execute(
            'UPDATE utilisateurs SET mot_de_passe = ? WHERE id = ?',
            [hashedPassword, resetToken.utilisateur_id]
        );

        // Marquer le token comme utilisé
        await connection.execute(
            'UPDATE password_reset_tokens SET used = 1, used_at = NOW() WHERE id = ?',
            [resetToken.id]
        );

        await connection.commit();

        res.json({
            message: 'Mot de passe réinitialisé avec succès'
        });

    } catch (error) {
        await connection.rollback();
        console.error('Erreur reset password:', error);
        res.status(500).json({ error: 'Erreur lors de la réinitialisation du mot de passe' });
    } finally {
        connection.release();
    }
});

// ===== ROUTES OAUTH =====

// Configuration des stratégies Passport
oauthService.configureStrategies();

// Route de test OAuth (bypass pour développement)
router.get('/oauth-test-success', async (req, res) => {
    try {
        console.log('🧪 Test OAuth - Simulation de connexion réussie');
        
        // Simuler un utilisateur OAuth
        const mockUser = {
            id: 999,
            email: 'test.oauth@example.com',
            nom: 'Test',
            prenom: 'OAuth',
            role_id: 1, // Acheteur
            photo_profil: 'https://via.placeholder.com/150'
        };

        // Créer ou trouver l'utilisateur
        const user = await oauthService.findOrCreateUser({
            id: 'test-oauth-user',
            emails: [{ value: mockUser.email }],
            name: { givenName: mockUser.prenom, familyName: mockUser.nom },
            photos: [{ value: mockUser.photo_profil }]
        }, 'test');

        const token = oauthService.generateToken(user);
        
        console.log('✅ Utilisateur de test créé:', user.email);
        
        // Rediriger vers le frontend avec le token
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const userData = encodeURIComponent(JSON.stringify({
            id: user.id,
            email: user.email,
            nom: user.nom,
            prenom: user.prenom,
            role_id: user.role_id,
            photo_profil: user.photo_profil
        }));
        
        const redirectUrl = frontendUrl + '/login?oauth=success&token=' + token + '&user=' + userData;
        console.log('🔄 Redirection vers:', redirectUrl);
        
        res.redirect(redirectUrl);
    } catch (error) {
        console.error('❌ Erreur test OAuth:', error);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(frontendUrl + '/login?oauth=error&error=' + encodeURIComponent(error.message));
    }
});

// Route d'authentification Google
router.get('/google', (req, res, next) => {
    // Vérifier si les clés OAuth sont configurées
    if (!OAUTH_CONFIG.GOOGLE.CLIENT_ID || !OAUTH_CONFIG.GOOGLE.CLIENT_SECRET) {
        return res.status(400).json({
            error: 'OAuth Google non configuré',
            message: 'Les clés GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET doivent être définies dans .env'
        });
    }
    passport.authenticate('google', {
        scope: ['profile', 'email']
    })(req, res, next);
});

// Callback Google
router.get('/google/callback', (req, res, next) => {
    // Vérifier si les clés OAuth sont configurées
    if (!OAUTH_CONFIG.GOOGLE.CLIENT_ID || !OAUTH_CONFIG.GOOGLE.CLIENT_SECRET) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return res.redirect(frontendUrl + REDIRECT_CONFIG.OAUTH_ERROR + '&error=' + encodeURIComponent('OAuth Google non configuré'));
    }
    passport.authenticate('google', { 
        failureRedirect: (process.env.FRONTEND_URL || 'http://localhost:5173') + REDIRECT_CONFIG.OAUTH_ERROR 
    })(req, res, next);
},
    async (req, res) => {
        try {
            console.log('🔍 Callback Google - Utilisateur reçu:', req.user);
            
            if (!req.user) {
                throw new Error('Aucun utilisateur reçu du callback Google');
            }

            const user = req.user;
            const token = oauthService.generateToken(user);
            
            console.log('✅ Token généré pour utilisateur:', user.email);
            
            // Rediriger vers le frontend avec le token
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const userData = encodeURIComponent(JSON.stringify({
                id: user.id,
                email: user.email,
                nom: user.nom,
                prenom: user.prenom,
                role_id: user.role_id,
                photo_profil: user.photo_profil
            }));
            
            // Rediriger directement vers le dashboard selon le rôle
            let dashboardUrl = '/';
            if (user.role_id === 1) {
                dashboardUrl = '/dashboard'; // Acheteur
            } else if (user.role_id === 2) {
                dashboardUrl = '/supplier/dashboard'; // Fournisseur
            } else if (user.role_id === 3) {
                dashboardUrl = '/admin/dashboard'; // Admin
            }
            
            const redirectUrl = frontendUrl + dashboardUrl + '?oauth=success&token=' + token + '&user=' + userData;
            console.log('🔄 Redirection vers:', redirectUrl);
            
            res.redirect(redirectUrl);
        } catch (error) {
            console.error('❌ Erreur callback Google:', error);
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            res.redirect(frontendUrl + REDIRECT_CONFIG.OAUTH_ERROR + '&error=' + encodeURIComponent(error.message));
        }
    }
);

// Route d'authentification Facebook
router.get('/facebook', (req, res, next) => {
    // Vérifier si les clés OAuth sont configurées
    if (!OAUTH_CONFIG.FACEBOOK.APP_ID || !OAUTH_CONFIG.FACEBOOK.APP_SECRET) {
        return res.status(400).json({
            error: 'OAuth Facebook non configuré',
            message: 'Les clés FACEBOOK_APP_ID et FACEBOOK_APP_SECRET doivent être définies dans .env'
        });
    }
    passport.authenticate('facebook', {
        scope: ['email']
    })(req, res, next);
});

// Callback Facebook
router.get('/facebook/callback', (req, res, next) => {
    // Vérifier si les clés OAuth sont configurées
    if (!OAUTH_CONFIG.FACEBOOK.APP_ID || !OAUTH_CONFIG.FACEBOOK.APP_SECRET) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return res.redirect(frontendUrl + REDIRECT_CONFIG.OAUTH_ERROR + '&error=' + encodeURIComponent('OAuth Facebook non configuré'));
    }
    passport.authenticate('facebook', { 
        failureRedirect: (process.env.FRONTEND_URL || 'http://localhost:5173') + REDIRECT_CONFIG.OAUTH_ERROR 
    })(req, res, next);
},
    async (req, res) => {
        try {
            const user = req.user;
            const token = oauthService.generateToken(user);
            
            // Rediriger vers le frontend avec le token
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const userData = encodeURIComponent(JSON.stringify({
                id: user.id,
                email: user.email,
                nom: user.nom,
                prenom: user.prenom,
                role_id: user.role_id,
                photo_profil: user.photo_profil
            }));
            
            // Rediriger directement vers le dashboard selon le rôle
            let dashboardUrl = '/';
            if (user.role_id === 1) {
                dashboardUrl = '/dashboard'; // Acheteur
            } else if (user.role_id === 2) {
                dashboardUrl = '/supplier/dashboard'; // Fournisseur
            } else if (user.role_id === 3) {
                dashboardUrl = '/admin/dashboard'; // Admin
            }
            
            const redirectUrl = frontendUrl + dashboardUrl + '?oauth=success&token=' + token + '&user=' + userData;
            res.redirect(redirectUrl);
        } catch (error) {
            console.error('Erreur callback Facebook:', error);
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            res.redirect(frontendUrl + REDIRECT_CONFIG.OAUTH_ERROR + '&error=oauth_error');
        }
    }
);

module.exports = router;
