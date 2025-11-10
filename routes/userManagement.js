const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const emailService = require('../services/emailService');
const documentService = require('../services/documentService');

// POST /api/users/register - Inscription utilisateur avec envoi email de vérification
router.post('/register', async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();

        const { email, mot_de_passe, nom, prenom, telephone, role_id } = req.body;

        // Validation des données
        if (!email || !mot_de_passe || !nom || !role_id) {
            return res.status(400).json({ 
                error: 'Email, mot de passe, nom et rôle sont requis' 
            });
        }

        if (![1, 2].includes(parseInt(role_id))) {
            return res.status(400).json({ 
                error: 'Rôle invalide. Seuls les acheteurs (1) et fournisseurs (2) peuvent s\'inscrire' 
            });
        }

        // Vérifier si l'email existe déjà
        const [existingUser] = await connection.execute(
            'SELECT id FROM utilisateurs WHERE email = ?',
            [email]
        );

        if (existingUser.length > 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'Cet email est déjà utilisé' });
        }

        // Hasher le mot de passe
        const hashedPassword = await bcrypt.hash(mot_de_passe, 12);

        // Générer le token de vérification
        const verificationToken = emailService.generateVerificationToken();
        const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

        // Créer l'utilisateur avec statut "en_attente"
        const [result] = await connection.execute(`
            INSERT INTO utilisateurs 
            (email, mot_de_passe, nom, prenom, telephone, role_id, statut, 
             email_verification_token, email_verification_expires)
            VALUES (?, ?, ?, ?, ?, ?, 'en_attente', ?, ?)
        `, [email, hashedPassword, nom, prenom, telephone, role_id, verificationToken, tokenExpiry]);

        const userId = result.insertId;

        // Récupérer l'utilisateur créé
        const [newUser] = await connection.execute(
            'SELECT * FROM utilisateurs WHERE id = ?',
            [userId]
        );

        await connection.commit();

        // Envoyer l'email de vérification
        try {
            await emailService.sendVerificationEmail(newUser[0], verificationToken);
            console.log(`Email de vérification envoyé à ${email}`);
        } catch (emailError) {
            console.error('Erreur envoi email de vérification:', emailError);
            // Ne pas faire échouer l'inscription si l'email ne peut pas être envoyé
        }

        res.status(201).json({
            message: 'Inscription réussie. Vérifiez votre email pour activer votre compte.',
            user: {
                id: userId,
                email: newUser[0].email,
                nom: newUser[0].nom,
                prenom: newUser[0].prenom,
                role_id: newUser[0].role_id,
                statut: newUser[0].statut
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('Erreur inscription:', error);
        res.status(500).json({ error: 'Erreur lors de l\'inscription' });
    } finally {
        connection.release();
    }
});

// POST /api/users/verify-email - Vérification de l'email
router.post('/verify-email', async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();

        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Token de vérification requis' });
        }

        // Trouver l'utilisateur avec ce token
        const [users] = await connection.execute(`
            SELECT * FROM utilisateurs 
            WHERE email_verification_token = ? 
            AND email_verification_expires > NOW()
            AND email_verified = 0
        `, [token]);

        if (users.length === 0) {
            await connection.rollback();
            return res.status(400).json({ 
                error: 'Token invalide ou expiré' 
            });
        }

        const user = users[0];

        // Marquer l'email comme vérifié
        await connection.execute(`
            UPDATE utilisateurs 
            SET email_verified = 1, 
                email_verified_at = NOW(),
                email_verification_token = NULL,
                email_verification_expires = NULL,
                statut = CASE 
                    WHEN role_id = 1 THEN 'actif'  -- Acheteur directement actif
                    WHEN role_id = 2 THEN 'en_attente'  -- Fournisseur reste en attente
                    ELSE statut 
                END
            WHERE id = ?
        `, [user.id]);

        await connection.commit();

        // Envoyer email de bienvenue selon le rôle
        try {
            if (user.role_id === 1) {
                // Acheteur - compte activé
                await emailService.sendStatusChangeEmail(user, 'actif');
            } else if (user.role_id === 2) {
                // Fournisseur - email de prochaines étapes
                await emailService.createEmailNotification(
                    user.id,
                    'welcome',
                    'Prochaines étapes - GabMarketHub',
                    `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2>Email vérifié avec succès !</h2>
                        <p>Bonjour ${user.prenom},</p>
                        <p>Votre email a été vérifié. Pour activer votre compte fournisseur, vous devez maintenant télécharger les documents suivants :</p>
                        <ul>
                            <li>Kbis ou équivalent</li>
                            <li>Patente commerciale</li>
                            <li>Pièce d'identité du dirigeant</li>
                        </ul>
                        <p>Connectez-vous à votre compte pour télécharger ces documents.</p>
                        <a href="${process.env.FRONTEND_URL}/supplier/login" style="background-color: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Se connecter</a>
                    </div>
                    `
                );
            }
        } catch (emailError) {
            console.error('Erreur envoi email de bienvenue:', emailError);
        }

        res.json({
            message: 'Email vérifié avec succès',
            user: {
                id: user.id,
                email: user.email,
                nom: user.nom,
                prenom: user.prenom,
                role_id: user.role_id,
                statut: user.role_id === 1 ? 'actif' : 'en_attente'
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('Erreur vérification email:', error);
        res.status(500).json({ error: 'Erreur lors de la vérification' });
    } finally {
        connection.release();
    }
});

// POST /api/users/resend-verification - Renvoyer l'email de vérification
router.post('/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email requis' });
        }

        // Trouver l'utilisateur
        const [users] = await db.execute(`
            SELECT * FROM utilisateurs 
            WHERE email = ? AND email_verified = 0
        `, [email]);

        if (users.length === 0) {
            return res.status(404).json({ 
                error: 'Utilisateur non trouvé ou email déjà vérifié' 
            });
        }

        const user = users[0];

        // Générer un nouveau token
        const verificationToken = emailService.generateVerificationToken();
        const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Mettre à jour le token
        await db.execute(`
            UPDATE utilisateurs 
            SET email_verification_token = ?, email_verification_expires = ?
            WHERE id = ?
        `, [verificationToken, tokenExpiry, user.id]);

        // Envoyer l'email
        await emailService.sendVerificationEmail(user, verificationToken);

        res.json({ message: 'Email de vérification renvoyé' });

    } catch (error) {
        console.error('Erreur renvoi email:', error);
        res.status(500).json({ error: 'Erreur lors du renvoi de l\'email' });
    }
});

// POST /api/users/upload-documents - Upload de documents (fournisseurs uniquement)
router.post('/upload-documents', 
    authenticateToken, 
    requireRole([2]), // Fournisseurs uniquement
    (req, res, next) => {
        documentService.getUploadMiddleware()(req, res, (err) => {
            if (err) {
                return res.status(400).json({ error: err.message });
            }
            next();
        });
    },
    async (req, res) => {
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();

            const userId = req.user.id;
            const { types_documents } = req.body; // Array des types de documents
            const files = req.files;

            if (!files || files.length === 0) {
                return res.status(400).json({ error: 'Aucun fichier téléchargé' });
            }

            if (!types_documents || !Array.isArray(types_documents)) {
                return res.status(400).json({ error: 'Types de documents requis' });
            }

            if (files.length !== types_documents.length) {
                return res.status(400).json({ 
                    error: 'Le nombre de fichiers doit correspondre au nombre de types' 
                });
            }

            const savedDocuments = [];

            // Sauvegarder chaque document
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const documentType = types_documents[i];

                // Vérifier que le type est valide
                const validTypes = ['kbis', 'patente', 'identification', 'autre'];
                if (!validTypes.includes(documentType)) {
                    throw new Error(`Type de document invalide: ${documentType}`);
                }

                const documentId = await documentService.saveDocument(
                    userId, 
                    file, 
                    documentType
                );

                savedDocuments.push({
                    id: documentId,
                    type: documentType,
                    nom: file.originalname,
                    taille: file.size
                });
            }

            await connection.commit();

            // Notifier les admins qu'il y a de nouveaux documents à valider
            try {
                const [admins] = await db.execute(`
                    SELECT email, nom, prenom FROM utilisateurs WHERE role_id = 3
                `);

                for (const admin of admins) {
                    await emailService.createEmailNotification(
                        admin.id,
                        'document_validation',
                        'Nouveaux documents à valider - GabMarketHub',
                        `
                        <p>De nouveaux documents ont été soumis par ${req.user.prenom} ${req.user.nom} et sont en attente de validation.</p>
                        <a href="${process.env.FRONTEND_URL}/admin/documents">Voir les documents</a>
                        `
                    );
                }
            } catch (emailError) {
                console.error('Erreur notification admins:', emailError);
            }

            res.json({
                message: 'Documents téléchargés avec succès',
                documents: savedDocuments
            });

        } catch (error) {
            await connection.rollback();
            console.error('Erreur upload documents:', error);
            res.status(500).json({ error: 'Erreur lors du téléchargement des documents' });
        } finally {
            connection.release();
        }
    }
);

// GET /api/users/my-documents - Récupérer les documents de l'utilisateur connecté
router.get('/my-documents', authenticateToken, requireRole([2]), async (req, res) => {
    try {
        const documents = await documentService.getUserDocuments(req.user.id);
        res.json({ documents });
    } catch (error) {
        console.error('Erreur récupération documents:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des documents' });
    }
});

// DELETE /api/users/documents/:id - Supprimer un document (si pas encore validé)
router.delete('/documents/:id', authenticateToken, requireRole([2]), async (req, res) => {
    try {
        const documentId = req.params.id;
        const userId = req.user.id;

        // Vérifier que le document appartient à l'utilisateur et n'est pas validé
        const [documents] = await db.execute(`
            SELECT statut FROM fournisseur_documents 
            WHERE id = ? AND utilisateur_id = ?
        `, [documentId, userId]);

        if (documents.length === 0) {
            return res.status(404).json({ error: 'Document non trouvé' });
        }

        if (documents[0].statut !== 'pending') {
            return res.status(400).json({ 
                error: 'Impossible de supprimer un document déjà traité' 
            });
        }

        await documentService.deleteDocument(documentId, userId);

        res.json({ message: 'Document supprimé avec succès' });

    } catch (error) {
        console.error('Erreur suppression document:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression du document' });
    }
});

module.exports = router;