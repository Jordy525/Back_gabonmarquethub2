// Routes API SIMPLES pour les messages - SANS COMPLEXITÉ

const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Récupérer les messages d'une conversation
router.get('/:conversationId/messages', authenticateToken, async (req, res) => {
    try {
        const conversationId = parseInt(req.params.conversationId);
        const userId = req.user.id;

        console.log('📥 Récupération messages conversation:', conversationId, 'pour utilisateur:', userId);

        // Vérifier que l'utilisateur fait partie de la conversation
        const [convCheck] = await db.execute(
            'SELECT id FROM conversations WHERE id = ? AND (acheteur_id = ? OR fournisseur_id = ?)',
            [conversationId, userId, userId]
        );

        if (convCheck.length === 0) {
            return res.status(403).json({
                success: false,
                error: 'Accès non autorisé à cette conversation'
            });
        }

        // Récupérer les messages avec les infos de l'expéditeur
        const [messages] = await db.execute(`
            SELECT 
                m.id,
                m.conversation_id,
                m.expediteur_id,
                m.contenu,
                m.created_at,
                m.lu,
                m.type,
                m.fichier_url,
                m.fichier_nom,
                m.fichier_taille,
                m.fichier_type,
                u.nom,
                u.prenom,
                u.email
            FROM messages m
            JOIN utilisateurs u ON m.expediteur_id = u.id
            WHERE m.conversation_id = ?
            ORDER BY m.created_at ASC
        `, [conversationId]);

        // Formater les messages pour le frontend
        const formattedMessages = messages.map(msg => ({
            id: msg.id,
            conversation_id: msg.conversation_id,
            expediteur_id: msg.expediteur_id,
            contenu: msg.contenu,
            created_at: msg.created_at || new Date().toISOString(), // Fallback si NULL
            lu: Boolean(msg.lu),
            type: msg.type || 'texte',
            fichier: msg.fichier_url ? {
                url: msg.fichier_url,
                nom: msg.fichier_nom,
                taille: msg.fichier_taille,
                type: msg.fichier_type
            } : null,
            expediteur: {
                id: msg.expediteur_id,
                nom: msg.nom,
                prenom: msg.prenom,
                email: msg.email
            }
        }));

        console.log('✅ Messages récupérés:', formattedMessages.length);

        res.json({
            success: true,
            data: formattedMessages
        });

    } catch (error) {
        console.error('❌ Erreur récupération messages:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des messages'
        });
    }
});

// Envoyer un message
router.post('/:conversationId/messages',
    authenticateToken,
    [
        body('contenu').trim().isLength({ min: 1, max: 2000 }).withMessage('Contenu requis (max 2000 caractères)'),
        body('type').optional().isIn(['texte', 'image', 'fichier']).withMessage('Type de message invalide')
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

            const conversationId = parseInt(req.params.conversationId);
            const userId = req.user.id;
            const { contenu, type = 'texte', fichier } = req.body;

            console.log('📤 Envoi message:', {
                conversationId,
                expediteurId: userId,
                type,
                contenu: contenu.substring(0, 50) + '...'
            });

            // Vérifier que l'utilisateur fait partie de la conversation
            const [convCheck] = await db.execute(
                'SELECT id FROM conversations WHERE id = ? AND (acheteur_id = ? OR fournisseur_id = ?)',
                [conversationId, userId, userId]
            );

            if (convCheck.length === 0) {
                return res.status(403).json({
                    success: false,
                    error: 'Accès non autorisé à cette conversation'
                });
            }

            // Préparer les données du message
            const messageData = {
                conversation_id: conversationId,
                expediteur_id: userId,
                contenu,
                type,
                created_at: new Date(),
                lu: 0
            };

            // Ajouter les informations de fichier si présent
            if (fichier && type !== 'texte') {
                messageData.fichier_url = fichier.url;
                messageData.fichier_nom = fichier.nom;
                messageData.fichier_taille = fichier.taille;
                messageData.fichier_type = fichier.type;
            }

            // Construire la requête SQL dynamiquement
            const fields = Object.keys(messageData);
            const placeholders = fields.map(() => '?').join(', ');
            const values = Object.values(messageData);

            const [result] = await db.execute(
                `INSERT INTO messages (${fields.join(', ')}) VALUES (${placeholders})`,
                values
            );

            const messageId = result.insertId;

            // Mettre à jour la dernière activité de la conversation
            await db.execute(
                'UPDATE conversations SET updated_at = NOW(), derniere_activite = NOW() WHERE id = ?',
                [conversationId]
            );

            // Récupérer le message créé avec les infos de l'expéditeur
            const [newMessage] = await db.execute(`
                SELECT 
                    m.id,
                    m.conversation_id,
                    m.expediteur_id,
                    m.contenu,
                    m.created_at,
                    m.lu,
                    m.type,
                    m.fichier_url,
                    m.fichier_nom,
                    m.fichier_taille,
                    m.fichier_type,
                    u.nom,
                    u.prenom,
                    u.email
                FROM messages m
                JOIN utilisateurs u ON m.expediteur_id = u.id
                WHERE m.id = ?
            `, [messageId]);

            const formattedMessage = {
                id: newMessage[0].id,
                conversation_id: newMessage[0].conversation_id,
                expediteur_id: newMessage[0].expediteur_id,
                contenu: newMessage[0].contenu,
                created_at: newMessage[0].created_at,
                lu: Boolean(newMessage[0].lu),
                type: newMessage[0].type || 'texte',
                fichier: newMessage[0].fichier_url ? {
                    url: newMessage[0].fichier_url,
                    nom: newMessage[0].fichier_nom,
                    taille: newMessage[0].fichier_taille,
                    type: newMessage[0].fichier_type
                } : null,
                expediteur: {
                    id: newMessage[0].expediteur_id,
                    nom: newMessage[0].nom,
                    prenom: newMessage[0].prenom,
                    email: newMessage[0].email
                }
            };

            console.log('✅ Message envoyé:', messageId);

            // Émettre via Socket.IO si disponible
            if (req.io) {
                try {
                    req.io.to(`conversation_${conversationId}`).emit('message:new', formattedMessage);
                    console.log('📡 Message émis via Socket.IO');
                } catch (socketError) {
                    console.error('⚠️ Erreur Socket.IO (non bloquante):', socketError.message);
                }
            }

            res.status(201).json({
                success: true,
                data: formattedMessage,
                message: 'Message envoyé avec succès'
            });

        } catch (error) {
            console.error('❌ Erreur envoi message:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de l\'envoi du message'
            });
        }
    }
);

// Marquer des messages comme lus
router.post('/:conversationId/messages/read',
    authenticateToken,
    [
        body('message_ids').isArray().withMessage('Liste d\'IDs de messages requise')
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

            const conversationId = parseInt(req.params.conversationId);
            const userId = req.user.id;
            const { message_ids } = req.body;

            console.log('👁️ Marquage messages comme lus:', {
                conversationId,
                userId,
                messageIds: message_ids
            });

            // Vérifier que l'utilisateur fait partie de la conversation
            const [convCheck] = await db.execute(
                'SELECT id FROM conversations WHERE id = ? AND (acheteur_id = ? OR fournisseur_id = ?)',
                [conversationId, userId, userId]
            );

            if (convCheck.length === 0) {
                return res.status(403).json({
                    success: false,
                    error: 'Accès non autorisé à cette conversation'
                });
            }

            if (message_ids.length === 0) {
                return res.json({
                    success: true,
                    message: 'Aucun message à marquer'
                });
            }

            // Marquer les messages comme lus (seulement ceux qui ne sont pas de l'utilisateur)
            const placeholders = message_ids.map(() => '?').join(',');
            const params = [...message_ids, conversationId, userId];

            const [result] = await db.execute(
                `UPDATE messages 
                 SET lu = 1 
                 WHERE id IN (${placeholders}) 
                 AND conversation_id = ? 
                 AND expediteur_id != ?`,
                params
            );

            console.log('✅ Messages marqués comme lus:', result.affectedRows);

            // Émettre une notification de mise à jour si Socket.IO disponible
            if (req.io && result.affectedRows > 0) {
                try {
                    req.io.to(`conversation_${conversationId}`).emit('messages:read', {
                        conversation_id: conversationId,
                        user_id: userId,
                        message_ids: message_ids,
                        timestamp: new Date().toISOString()
                    });
                } catch (socketError) {
                    console.error('⚠️ Erreur Socket.IO (non bloquante):', socketError.message);
                }
            }

            res.json({
                success: true,
                message: 'Messages marqués comme lus',
                affected: result.affectedRows
            });

        } catch (error) {
            console.error('❌ Erreur marquage messages lus:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors du marquage des messages'
            });
        }
    }
);

// Supprimer un message (seulement pour l'expéditeur)
router.delete('/:conversationId/messages/:messageId',
    authenticateToken,
    async (req, res) => {
        try {
            const conversationId = parseInt(req.params.conversationId);
            const messageId = parseInt(req.params.messageId);
            const userId = req.user.id;

            console.log('🗑️ Suppression message:', { conversationId, messageId, userId });

            // Vérifier que l'utilisateur fait partie de la conversation
            const [convCheck] = await db.execute(
                'SELECT id FROM conversations WHERE id = ? AND (acheteur_id = ? OR fournisseur_id = ?)',
                [conversationId, userId, userId]
            );

            if (convCheck.length === 0) {
                return res.status(403).json({
                    success: false,
                    error: 'Accès non autorisé à cette conversation'
                });
            }

            // Vérifier que l'utilisateur est l'expéditeur du message
            const [messageCheck] = await db.execute(
                'SELECT id FROM messages WHERE id = ? AND expediteur_id = ? AND conversation_id = ?',
                [messageId, userId, conversationId]
            );

            if (messageCheck.length === 0) {
                return res.status(403).json({
                    success: false,
                    error: 'Vous ne pouvez supprimer que vos propres messages'
                });
            }

            // Supprimer le message (soft delete)
            await db.execute(
                'UPDATE messages SET deleted_at = NOW() WHERE id = ?',
                [messageId]
            );

            console.log('✅ Message supprimé:', messageId);

            // Notifier les autres participants via Socket.IO
            if (req.io) {
                try {
                    req.io.to(`conversation_${conversationId}`).emit('message:deleted', {
                        conversation_id: conversationId,
                        message_id: messageId,
                        user_id: userId,
                        timestamp: new Date().toISOString()
                    });
                } catch (socketError) {
                    console.error('⚠️ Erreur Socket.IO (non bloquante):', socketError.message);
                }
            }

            res.json({
                success: true,
                message: 'Message supprimé avec succès'
            });

        } catch (error) {
            console.error('❌ Erreur suppression message:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la suppression du message'
            });
        }
    }
);

module.exports = router;