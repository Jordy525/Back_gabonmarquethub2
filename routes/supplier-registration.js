const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const db = require('../config/database');
const router = express.Router();

// Configuration multer pour les logos
const logoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/logos/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadLogo = multer({ 
    storage: logoStorage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Format non supporté. Utilisez JPG, PNG ou GIF'));
        }
    }
});

// Inscription fournisseur complète
router.post('/register-supplier', uploadLogo.single('logo'), [
    body('email').isEmail().normalizeEmail(),
    body('mot_de_passe').isLength({ min: 6 }),
    body('entreprise.nom_entreprise').notEmpty().trim(),
    body('entreprise.telephone_professionnel').notEmpty().trim(),
    body('entreprise.secteur_activite_id').isInt({ min: 1 }),
    body('entreprise.type_entreprise_id').isInt({ min: 1 }),
    body('entreprise.adresse_ligne1').notEmpty().trim(),
    body('entreprise.ville').notEmpty().trim(),
    body('entreprise.code_postal').notEmpty().trim(),
    body('entreprise.numero_siret').notEmpty().trim()
], async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, mot_de_passe, nom, prenom, telephone, entreprise } = req.body;

        // Debug: Afficher les données reçues
        console.log('🔍 DEBUG - Données reçues dans /register-supplier:');
        console.log('📧 Email:', email);
        console.log('👤 Nom/Prénom:', nom, prenom);
        console.log('🏢 Entreprise (objet):', entreprise);
        console.log('📋 Body complet:', req.body);
        console.log('🏦 Champs bancaires directs:', {
            nom_banque: req.body.nom_banque,
            iban: req.body.iban,
            nom_titulaire_compte: req.body.nom_titulaire_compte,
            bic_swift: req.body.bic_swift,
            numero_registre_commerce: req.body.numero_registre_commerce
        });

        // Gérer les deux formats : JSON avec entreprise ou FormData plat
        const entrepriseData = entreprise || {
            nom_entreprise: req.body.nom_entreprise,
            telephone_professionnel: req.body.telephone_professionnel,
            site_web: req.body.site_web,
            description: req.body.description,
            secteur_activite_id: req.body.secteur_activite_id,
            type_entreprise_id: req.body.type_entreprise_id,
            annee_creation: req.body.annee_creation,
            nombre_employes: req.body.nombre_employes,
            adresse_ligne1: req.body.adresse_ligne1,
            adresse_ligne2: req.body.adresse_ligne2,
            ville: req.body.ville,
            code_postal: req.body.code_postal,
            pays: req.body.pays,
            numero_siret: req.body.numero_siret,
            numero_registre_commerce: req.body.numero_registre_commerce,
            numero_tva: req.body.numero_tva,
            capacite_production: req.body.capacite_production,
            certifications: req.body.certifications,
            nom_banque: req.body.nom_banque,
            iban: req.body.iban,
            nom_titulaire_compte: req.body.nom_titulaire_compte,
            bic_swift: req.body.bic_swift
        };

        // Debug: Afficher les données entreprise finales
        console.log('🏢 DEBUG - Données entreprise finales:', entrepriseData);
        console.log('🏦 DEBUG - Champs bancaires finaux:', {
            nom_banque: entrepriseData.nom_banque,
            iban: entrepriseData.iban,
            nom_titulaire_compte: entrepriseData.nom_titulaire_compte,
            bic_swift: entrepriseData.bic_swift,
            numero_registre_commerce: entrepriseData.numero_registre_commerce
        });

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

        // Créer l'utilisateur avec statut inactif (en attente de validation des documents)
        const [userResult] = await connection.execute(`
            INSERT INTO utilisateurs (email, mot_de_passe, nom, prenom, telephone, role_id, statut, date_inscription)
            VALUES (?, ?, ?, ?, ?, 2, 'inactif', NOW())
        `, [email, hashedPassword, nom || 'Utilisateur', prenom || '', telephone || entrepriseData.telephone_professionnel]);

        const userId = userResult.insertId;

        // Créer l'entreprise
        const [entrepriseResult] = await connection.execute(`
            INSERT INTO entreprises (
                utilisateur_id, nom_entreprise, telephone_professionnel, site_web, description,
                secteur_activite_id, type_entreprise_id, annee_creation, nombre_employes,
                adresse_ligne1, adresse_ligne2, ville, code_postal, pays,
                numero_siret, numero_registre_commerce, numero_tva, capacite_production, certifications,
                nom_banque, iban, nom_titulaire_compte, bic_swift, logo,
                statut_verification
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'en_attente')
        `, [
            userId,
            entrepriseData.nom_entreprise,
            entrepriseData.telephone_professionnel,
            entrepriseData.site_web || null,
            entrepriseData.description || null,
            entrepriseData.secteur_activite_id,
            entrepriseData.type_entreprise_id,
            entrepriseData.annee_creation || null,
            entrepriseData.nombre_employes || null,
            entrepriseData.adresse_ligne1,
            entrepriseData.adresse_ligne2 || null,
            entrepriseData.ville,
            entrepriseData.code_postal,
            entrepriseData.pays || 'Gabon',
            entrepriseData.numero_siret,
            entrepriseData.numero_registre_commerce || null,
            entrepriseData.numero_tva || null,
            entrepriseData.capacite_production || null,
            entrepriseData.certifications || null,
            entrepriseData.nom_banque || null,
            entrepriseData.iban || null,
            entrepriseData.nom_titulaire_compte || null,
            entrepriseData.bic_swift || null,
            req.file ? `/uploads/logos/${req.file.filename}` : null
        ]);

        const entrepriseId = entrepriseResult.insertId;

        // Créer l'enregistrement des étapes d'inscription
        await connection.execute(`
            INSERT INTO etapes_inscription (
                entreprise_id, etape_1_compte, etape_2_entreprise, etape_3_adresse,
                etape_4_legal, etape_5_produits, etape_completee
            ) VALUES (?, 1, 1, 1, 1, 1, 1)
        `, [entrepriseId]);

        // Générer le token JWT
        const token = jwt.sign(
            { id: userId, email, role_id: 2 },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        await connection.commit();

        res.status(201).json({
            message: 'Inscription fournisseur réussie',
            data: {
                token,
                user: {
                    id: userId,
                    email,
                    role_id: 2,
                    entreprise_id: entrepriseId
                }
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

// Récupérer les secteurs d'activité
router.get('/secteurs', async (req, res) => {
    try {
        const [secteurs] = await db.execute(
            'SELECT id, nom, description FROM secteurs_activite ORDER BY nom'
        );
        res.json({ secteurs });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la récupération des secteurs' });
    }
});

// Récupérer les types d'entreprise
router.get('/types-entreprise', async (req, res) => {
    try {
        const [types] = await db.execute(
            'SELECT id, nom, description FROM types_entreprise ORDER BY nom'
        );
        res.json({ types });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la récupération des types d\'entreprise' });
    }
});

// Créer ou mettre à jour les informations d'entreprise
router.post('/complete-profile', [
    body('nom_entreprise').notEmpty().trim(),
    body('telephone_professionnel').notEmpty().trim(),
    body('secteur_activite_id').isInt({ min: 1 }),
    body('type_entreprise_id').isInt({ min: 1 }),
    body('adresse_ligne1').notEmpty().trim(),
    body('ville').notEmpty().trim(),
    body('code_postal').notEmpty().trim(),
    body('numero_siret').notEmpty().trim()
], async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { 
            nom_entreprise, telephone_professionnel, site_web, description,
            secteur_activite_id, type_entreprise_id, annee_creation, nombre_employes,
            adresse_ligne1, adresse_ligne2, ville, code_postal, pays,
            numero_siret, numero_registre_commerce, numero_tva, capacite_production, certifications,
            nom_banque, iban, nom_titulaire_compte, bic_swift
        } = req.body;

        // Récupérer le token depuis les headers
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'Token requis' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        // Vérifier si l'entreprise existe déjà
        const [existingEntreprise] = await connection.execute(
            'SELECT id FROM entreprises WHERE utilisateur_id = ?',
            [userId]
        );

        if (existingEntreprise.length > 0) {
            // Mettre à jour l'entreprise existante
            await connection.execute(`
                UPDATE entreprises SET 
                    nom_entreprise = ?, telephone_professionnel = ?, site_web = ?, description = ?,
                    secteur_activite_id = ?, type_entreprise_id = ?, annee_creation = ?, nombre_employes = ?,
                    adresse_ligne1 = ?, adresse_ligne2 = ?, ville = ?, code_postal = ?, pays = ?,
                    numero_siret = ?, numero_registre_commerce = ?, numero_tva = ?, capacite_production = ?, certifications = ?,
                    nom_banque = ?, iban = ?, nom_titulaire_compte = ?, bic_swift = ?
                WHERE utilisateur_id = ?
            `, [
                nom_entreprise, telephone_professionnel, site_web, description,
                secteur_activite_id, type_entreprise_id, annee_creation, nombre_employes,
                adresse_ligne1, adresse_ligne2, ville, code_postal, pays || 'Gabon',
                numero_siret, numero_registre_commerce, numero_tva, capacite_production, certifications,
                nom_banque, iban, nom_titulaire_compte, bic_swift, userId
            ]);
            
            res.json({ message: 'Profil entreprise mis à jour avec succès' });
        } else {
            // Créer une nouvelle entreprise
            const [entrepriseResult] = await connection.execute(`
                INSERT INTO entreprises (
                    utilisateur_id, nom_entreprise, telephone_professionnel, site_web, description,
                    secteur_activite_id, type_entreprise_id, annee_creation, nombre_employes,
                    adresse_ligne1, adresse_ligne2, ville, code_postal, pays,
                    numero_siret, numero_registre_commerce, numero_tva, capacite_production, certifications,
                    nom_banque, iban, nom_titulaire_compte, bic_swift, statut_verification
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'en_attente')
            `, [
                userId, nom_entreprise, telephone_professionnel, site_web, description,
                secteur_activite_id, type_entreprise_id, annee_creation, nombre_employes,
                adresse_ligne1, adresse_ligne2, ville, code_postal, pays || 'Gabon',
                numero_siret, numero_registre_commerce, numero_tva, capacite_production, certifications,
                nom_banque, iban, nom_titulaire_compte, bic_swift
            ]);

            const entrepriseId = entrepriseResult.insertId;

            // Créer l'enregistrement des étapes d'inscription
            await connection.execute(`
                INSERT INTO etapes_inscription (
                    entreprise_id, etape_1_compte, etape_2_entreprise, etape_3_adresse,
                    etape_4_legal, etape_5_produits, etape_completee
                ) VALUES (?, 1, 1, 1, 1, 0, 0)
            `, [entrepriseId]);
            
            res.json({ message: 'Profil entreprise créé avec succès', entreprise_id: entrepriseId });
        }

        await connection.commit();

    } catch (error) {
        await connection.rollback();
        console.error('Erreur complete-profile:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour du profil' });
    } finally {
        connection.release();
    }
});

module.exports = router;