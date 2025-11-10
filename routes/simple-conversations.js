// Routes API SIMPLES pour les conversations - SANS COMPLEXITÉ

const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Récupérer toutes les conversations de l'utilisateur connecté
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role_id;

        console.log('📋 Récupération conversations pour utilisateur:', userId, 'rôle:', userRole);

        let query, params;

        if (userRole === 1) {
            // ACHETEUR : conversations où il est l'acheteur
            query = `
                SELECT 
                    c.id,
                    c.acheteur_id,
                    c.fournisseur_id,
                    c.sujet,
                    c.statut,
                    c.created_at,
                    c.updated_at,
                    -- Infos fournisseur
                    e.nom_entreprise,
                    u_fournisseur.nom as fournisseur_nom,
                    u_fournisseur.prenom as fournisseur_prenom,
                    -- Messages non lus pour l'acheteur
                    COALESCE(
                        (SELECT COUNT(*) FROM messages m 
                         WHERE m.conversation_id = c.id 
                         AND m.lu = 0 
                         AND m.expediteur_id != c.acheteur_id), 0
                    ) as messages_non_lus_acheteur,
                    -- Dernier message
                    (SELECT contenu FROM messages m2 
                     WHERE m2.conversation_id = c.id 
                     ORDER BY m2.created_at DESC LIMIT 1) as dernier_message,
                    -- Dernière activité (avec fallback sur created_at si pas de messages)
                    COALESCE(
                        (SELECT created_at FROM messages m3 
                         WHERE m3.conversation_id = c.id 
                         ORDER BY m3.created_at DESC LIMIT 1), 
                        c.created_at
                    ) as derniere_activite
                FROM conversations c
                JOIN utilisateurs u_fournisseur ON c.fournisseur_id = u_fournisseur.id
                JOIN entreprises e ON u_fournisseur.id = e.utilisateur_id
                WHERE c.acheteur_id = ?
                ORDER BY 
                    COALESCE(
                        (SELECT created_at FROM messages m4 
                         WHERE m4.conversation_id = c.id 
                         ORDER BY m4.created_at DESC LIMIT 1), 
                        c.created_at
                    ) DESC
            `;
            params = [userId];

        } else if (userRole === 2) {
            // FOURNISSEUR : conversations où il est le fournisseur
            query = `
                SELECT 
                    c.id,
                    c.acheteur_id,
                    c.fournisseur_id,
                    c.sujet,
                    c.statut,
                    c.created_at,
                    c.updated_at,
                    -- Infos acheteur
                    u_acheteur.nom as acheteur_nom,
                    u_acheteur.prenom as acheteur_prenom,
                    -- Messages non lus pour le fournisseur
                    COALESCE(
                        (SELECT COUNT(*) FROM messages m 
                         WHERE m.conversation_id = c.id 
                         AND m.lu = 0 
                         AND m.expediteur_id != c.fournisseur_id), 0
                    ) as messages_non_lus_fournisseur,
                    -- Dernier message
                    (SELECT contenu FROM messages m2 
                     WHERE m2.conversation_id = c.id 
                     ORDER BY m2.created_at DESC LIMIT 1) as dernier_message,
                    -- Dernière activité (avec fallback sur created_at si pas de messages)
                    COALESCE(
                        (SELECT created_at FROM messages m3 
                         WHERE m3.conversation_id = c.id 
                         ORDER BY m3.created_at DESC LIMIT 1), 
                        c.created_at
                    ) as derniere_activite
                FROM conversations c
                JOIN utilisateurs u_acheteur ON c.acheteur_id = u_acheteur.id
                WHERE c.fournisseur_id = ?
                ORDER BY 
                    COALESCE(
                        (SELECT created_at FROM messages m4 
                         WHERE m4.conversation_id = c.id 
                         ORDER BY m4.created_at DESC LIMIT 1), 
                        c.created_at
                    ) DESC
            `;
            params = [userId];

        } else {
            return res.status(403).json({ 
                success: false, 
                error: 'Rôle non autorisé pour accéder aux conversations' 
            });
        }

        const [conversations] = await db.execute(query, params);

        console.log('✅ Conversations récupérées:', conversations.length);

        res.json({
            success: true,
            data: conversations
        });

    } catch (error) {
        console.error('❌ Erreur récupération conversations:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des conversations'
        });
    }
});

// Créer une nouvelle conversation
router.post('/', 
    authenticateToken,
    [
        body('fournisseur_id').isInt({ min: 1 }).withMessage('ID fournisseur requis'),
        body('sujet').trim().isLength({ min: 1, max: 255 }).withMessage('Sujet requis (max 255 caractères)')
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Données invalides',
                    details: errors.array()
                });
            }

            const acheteurId = req.user.id;
            const { fournisseur_id, sujet } = req.body;

            console.log('🔄 Création conversation:', {
                acheteurId,
                fournisseurId: fournisseur_id,
                sujet
            });

            // Vérifier que l'utilisateur est un acheteur
            if (req.user.role_id !== 1) {
                return res.status(403).json({
                    success: false,
                    error: 'Seuls les acheteurs peuvent créer des conversations'
                });
            }

            // Vérifier que le fournisseur existe
            const [fournisseurCheck] = await db.execute(
                'SELECT id FROM utilisateurs WHERE id = ? AND role_id = 2',
                [fournisseur_id]
            );

            if (fournisseurCheck.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Fournisseur non trouvé'
                });
            }

            // Vérifier qu'une conversation n'existe pas déjà
            const [existingConv] = await db.execute(
                'SELECT id FROM conversations WHERE acheteur_id = ? AND fournisseur_id = ?',
                [acheteurId, fournisseur_id]
            );

            if (existingConv.length > 0) {
                return res.status(409).json({
                    success: false,
                    error: 'Une conversation existe déjà avec ce fournisseur',
                    data: { conversation_id: existingConv[0].id }
                });
            }

            // Créer la conversation
            const [result] = await db.execute(
                `INSERT INTO conversations (acheteur_id, fournisseur_id, sujet, statut, created_at, updated_at)
                 VALUES (?, ?, ?, 'ouverte', NOW(), NOW())`,
                [acheteurId, fournisseur_id, sujet]
            );

            const conversationId = result.insertId;

            // Récupérer la conversation créée avec les infos complètes
            const [newConversation] = await db.execute(`
                SELECT 
                    c.id,
                    c.acheteur_id,
                    c.fournisseur_id,
                    c.sujet,
                    c.statut,
                    c.created_at,
                    c.updated_at,
                    e.nom_entreprise,
                    u_fournisseur.nom as fournisseur_nom,
                    u_fournisseur.prenom as fournisseur_prenom,
                    0 as messages_non_lus_acheteur
                FROM conversations c
                JOIN utilisateurs u_fournisseur ON c.fournisseur_id = u_fournisseur.id
                JOIN entreprises e ON u_fournisseur.id = e.utilisateur_id
                WHERE c.id = ?
            `, [conversationId]);

            console.log('✅ Conversation créée:', conversationId);

            res.status(201).json({
                success: true,
                data: newConversation[0],
                message: 'Conversation créée avec succès'
            });

        } catch (error) {
            console.error('❌ Erreur création conversation:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la création de la conversation'
            });
        }
    }
);

// Route pour trouver ou créer une conversation
router.post('/find-or-create', 
    authenticateToken,
    [
        body('fournisseur_id').isInt({ min: 1 }).withMessage('ID fournisseur requis'),
        body('sujet').trim().isLength({ min: 1, max: 255 }).withMessage('Sujet requis (max 255 caractères)')
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Données invalides',
                    details: errors.array()
                });
            }

            const acheteurId = req.user.id;
            const { fournisseur_id, sujet } = req.body;

            console.log('🔍 Recherche ou création conversation:', {
                acheteurId,
                fournisseurId: fournisseur_id,
                sujet
            });

            // Vérifier que l'utilisateur est un acheteur
            if (req.user.role_id !== 1) {
                return res.status(403).json({
                    success: false,
                    error: 'Seuls les acheteurs peuvent créer des conversations'
                });
            }

            // Vérifier que le fournisseur existe
            const [fournisseurCheck] = await db.execute(
                'SELECT id FROM utilisateurs WHERE id = ? AND role_id = 2',
                [fournisseur_id]
            );

            if (fournisseurCheck.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Fournisseur non trouvé'
                });
            }

            // Vérifier qu'une conversation n'existe pas déjà
            const [existingConv] = await db.execute(
                'SELECT id FROM conversations WHERE acheteur_id = ? AND fournisseur_id = ?',
                [acheteurId, fournisseur_id]
            );

            if (existingConv.length > 0) {
                // Retourner la conversation existante
                const [conversation] = await db.execute(`
                    SELECT 
                        c.id,
                        c.acheteur_id,
                        c.fournisseur_id,
                        c.sujet,
                        c.statut,
                        c.created_at,
                        c.updated_at,
                        e.nom_entreprise,
                        u_fournisseur.nom as fournisseur_nom,
                        u_fournisseur.prenom as fournisseur_prenom,
                        0 as messages_non_lus_acheteur
                    FROM conversations c
                    JOIN utilisateurs u_fournisseur ON c.fournisseur_id = u_fournisseur.id
                    JOIN entreprises e ON u_fournisseur.id = e.utilisateur_id
                    WHERE c.id = ?
                `, [existingConv[0].id]);

                console.log('✅ Conversation existante trouvée:', existingConv[0].id);

                return res.json({
                    success: true,
                    data: conversation[0],
                    message: 'Conversation existante trouvée',
                    existing: true
                });
            }

            // Créer la nouvelle conversation
            const [result] = await db.execute(
                `INSERT INTO conversations (acheteur_id, fournisseur_id, sujet, statut, created_at, updated_at)
                 VALUES (?, ?, ?, 'ouverte', NOW(), NOW())`,
                [acheteurId, fournisseur_id, sujet]
            );

            const conversationId = result.insertId;

            // Récupérer la conversation créée avec les infos complètes
            const [newConversation] = await db.execute(`
                SELECT 
                    c.id,
                    c.acheteur_id,
                    c.fournisseur_id,
                    c.sujet,
                    c.statut,
                    c.created_at,
                    c.updated_at,
                    e.nom_entreprise,
                    u_fournisseur.nom as fournisseur_nom,
                    u_fournisseur.prenom as fournisseur_prenom,
                    0 as messages_non_lus_acheteur
                FROM conversations c
                JOIN utilisateurs u_fournisseur ON c.fournisseur_id = u_fournisseur.id
                JOIN entreprises e ON u_fournisseur.id = e.utilisateur_id
                WHERE c.id = ?
            `, [conversationId]);

            console.log('✅ Nouvelle conversation créée:', conversationId);

            res.status(201).json({
                success: true,
                data: newConversation[0],
                message: 'Nouvelle conversation créée avec succès',
                existing: false
            });

        } catch (error) {
            console.error('❌ Erreur find-or-create conversation:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la recherche/création de la conversation'
            });
        }
    }
);

// Route pour les demandes de contact
router.post('/contact-request',
    authenticateToken,
    [
        body('fournisseur_id').isInt({ min: 1 }).withMessage('ID fournisseur requis'),
        body('message').trim().isLength({ min: 1, max: 1000 }).withMessage('Message requis (max 1000 caractères)'),
        body('sujet').optional().trim().isLength({ max: 255 }).withMessage('Sujet trop long (max 255 caractères)')
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Données invalides',
                    details: errors.array()
                });
            }

            const acheteurId = req.user.id;
            const { fournisseur_id, message, sujet = 'Demande de contact' } = req.body;

            console.log('📧 Demande de contact:', {
                acheteurId,
                fournisseurId: fournisseur_id,
                sujet,
                messageLength: message.length
            });

            // Vérifier que l'utilisateur est un acheteur
            if (req.user.role_id !== 1) {
                return res.status(403).json({
                    success: false,
                    error: 'Seuls les acheteurs peuvent envoyer des demandes de contact'
                });
            }

            // Vérifier que le fournisseur existe
            const [fournisseurCheck] = await db.execute(
                'SELECT id FROM utilisateurs WHERE id = ? AND role_id = 2',
                [fournisseur_id]
            );

            if (fournisseurCheck.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Fournisseur non trouvé'
                });
            }

            // Vérifier qu'une conversation n'existe pas déjà
            const [existingConv] = await db.execute(
                'SELECT id FROM conversations WHERE acheteur_id = ? AND fournisseur_id = ?',
                [acheteurId, fournisseur_id]
            );

            let conversationId;

            if (existingConv.length > 0) {
                // Utiliser la conversation existante
                conversationId = existingConv[0].id;
                console.log('✅ Conversation existante utilisée:', conversationId);
            } else {
                // Créer une nouvelle conversation
                const [result] = await db.execute(
                    `INSERT INTO conversations (acheteur_id, fournisseur_id, sujet, statut, created_at, updated_at)
                     VALUES (?, ?, ?, 'ouverte', NOW(), NOW())`,
                    [acheteurId, fournisseur_id, sujet]
                );
                conversationId = result.insertId;
                console.log('✅ Nouvelle conversation créée:', conversationId);
            }

            // Envoyer le message
            const [messageResult] = await db.execute(
                `INSERT INTO messages (conversation_id, expediteur_id, contenu, lu, created_at)
                 VALUES (?, ?, ?, 0, NOW())`,
                [conversationId, acheteurId, message]
            );

            // Mettre à jour la dernière activité de la conversation
            await db.execute(
                'UPDATE conversations SET derniere_activite = NOW(), updated_at = NOW() WHERE id = ?',
                [conversationId]
            );

            console.log('✅ Message envoyé:', messageResult.insertId);

            res.status(201).json({
                success: true,
                data: {
                    conversation_id: conversationId,
                    message_id: messageResult.insertId,
                    existing_conversation: existingConv.length > 0
                },
                message: 'Demande de contact envoyée avec succès'
            });

        } catch (error) {
            console.error('❌ Erreur demande de contact:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de l\'envoi de la demande de contact'
            });
        }
    }
);

module.exports = router;
