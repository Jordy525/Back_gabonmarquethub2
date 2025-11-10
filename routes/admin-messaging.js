const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Middleware pour vérifier les droits admin
const requireAdmin = requireRole([3]); // Role ID 3 = Admin

// ==================== GESTION ADMIN DES MESSAGES ====================

// GET /api/admin/messages/conversations - Toutes les conversations (admin)
router.get('/conversations', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20, search, type } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE 1=1';
        let params = [];

        if (search) {
            whereClause += ' AND (c.subject LIKE ? OR EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id AND m.content LIKE ?))';
            params.push(`%${search}%`, `%${search}%`);
        }

        if (type) {
            whereClause += ' AND c.type = ?';
            params.push(type);
        }

        const [conversations] = await db.execute(`
            SELECT 
                c.id,
                c.type,
                c.subject,
                c.created_at,
                c.updated_at,
                c.is_archived,
                CONCAT(creator.prenom, ' ', creator.nom) as created_by_name,
                creator.email as created_by_email,
                -- Nombre de participants
                (SELECT COUNT(*) FROM conversation_participants WHERE conversation_id = c.id) as participant_count,
                -- Nombre de messages
                (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND is_deleted = FALSE) as message_count,
                -- Dernier message
                lm.content as last_message_content,
                lm.created_at as last_message_at,
                CONCAT(sender.prenom, ' ', sender.nom) as last_sender_name,
                -- Participants (noms)
                GROUP_CONCAT(
                    DISTINCT CONCAT(u.prenom, ' ', u.nom, ' (', u.email, ')') 
                    ORDER BY u.nom 
                    SEPARATOR ', '
                ) as participants
            FROM conversations c
            LEFT JOIN utilisateurs creator ON c.created_by = creator.id
            LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id
            LEFT JOIN utilisateurs u ON cp.user_id = u.id
            LEFT JOIN messages lm ON c.id = lm.conversation_id AND lm.id = (
                SELECT MAX(id) FROM messages WHERE conversation_id = c.id AND is_deleted = FALSE
            )
            LEFT JOIN utilisateurs sender ON lm.sender_id = sender.id
            ${whereClause}
            GROUP BY c.id, creator.prenom, creator.nom, creator.email, lm.content, lm.created_at, sender.prenom, sender.nom
            ORDER BY c.updated_at DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), parseInt(offset)]);

        // Compter le total
        const [totalResult] = await db.execute(`
            SELECT COUNT(DISTINCT c.id) as total
            FROM conversations c
            LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id
            LEFT JOIN utilisateurs u ON cp.user_id = u.id
            ${whereClause}
        `, params);

        res.json({
            conversations,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalResult[0].total,
                totalPages: Math.ceil(totalResult[0].total / limit)
            }
        });

    } catch (error) {
        console.error('Erreur récupération conversations admin:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des conversations' });
    }
});

// GET /api/admin/messages/conversations/:id - Détails conversation (admin)
router.get('/conversations/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const conversationId = parseInt(req.params.id);

        // Récupérer les détails de la conversation
        const [conversation] = await db.execute(`
            SELECT 
                c.*,
                CONCAT(creator.prenom, ' ', creator.nom) as created_by_name,
                creator.email as created_by_email
            FROM conversations c
            LEFT JOIN utilisateurs creator ON c.created_by = creator.id
            WHERE c.id = ?
        `, [conversationId]);

        if (conversation.length === 0) {
            return res.status(404).json({ error: 'Conversation non trouvée' });
        }

        // Récupérer les participants
        const [participants] = await db.execute(`
            SELECT 
                u.id,
                u.nom,
                u.prenom,
                u.email,
                r.nom as role_nom,
                cp.joined_at,
                cp.last_read_at,
                cp.is_muted
            FROM conversation_participants cp
            INNER JOIN utilisateurs u ON cp.user_id = u.id
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE cp.conversation_id = ?
            ORDER BY u.nom, u.prenom
        `, [conversationId]);

        // Récupérer les statistiques
        const [stats] = await db.execute(`
            SELECT 
                COUNT(*) as total_messages,
                COUNT(CASE WHEN is_deleted = TRUE THEN 1 END) as deleted_messages,
                COUNT(CASE WHEN message_type = 'file' THEN 1 END) as messages_with_files,
                MIN(created_at) as first_message_at,
                MAX(created_at) as last_message_at
            FROM messages
            WHERE conversation_id = ?
        `, [conversationId]);

        res.json({
            conversation: conversation[0],
            participants,
            stats: stats[0]
        });

    } catch (error) {
        console.error('Erreur récupération détails conversation admin:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des détails' });
    }
});

// GET /api/admin/messages/conversations/:id/messages - Messages conversation (admin)
router.get('/conversations/:id/messages', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const conversationId = parseInt(req.params.id);
        const { page = 1, limit = 50, includeDeleted = false } = req.query;
        const offset = (page - 1) * limit;

        let deletedFilter = 'AND m.is_deleted = FALSE';
        if (includeDeleted === 'true') {
            deletedFilter = ''; // Inclure les messages supprimés
        }

        const [messages] = await db.execute(`
            SELECT 
                m.id,
                m.content,
                m.message_type,
                m.created_at,
                m.is_edited,
                m.edited_at,
                m.is_deleted,
                m.deleted_at,
                m.parent_message_id,
                CONCAT(sender.prenom, ' ', sender.nom) as sender_name,
                sender.email as sender_email,
                sender.id as sender_id,
                sender.role_id as sender_role_id,
                CONCAT(deleter.prenom, ' ', deleter.nom) as deleted_by_name,
                -- Fichiers joints
                GROUP_CONCAT(
                    DISTINCT CONCAT(
                        att.id, ':', att.original_filename, ':', att.file_size, ':', att.mime_type
                    ) SEPARATOR '||'
                ) as attachments
            FROM messages m
            INNER JOIN utilisateurs sender ON m.sender_id = sender.id
            LEFT JOIN utilisateurs deleter ON m.deleted_by = deleter.id
            LEFT JOIN message_attachments att ON m.id = att.message_id
            WHERE m.conversation_id = ? ${deletedFilter}
            GROUP BY m.id, sender.prenom, sender.nom, sender.email, sender.id, sender.role_id, 
                     deleter.prenom, deleter.nom
            ORDER BY m.created_at ASC
            LIMIT ? OFFSET ?
        `, [conversationId, parseInt(limit), parseInt(offset)]);

        // Traiter les fichiers joints
        const processedMessages = messages.map(message => ({
            ...message,
            attachments: message.attachments ? 
                message.attachments.split('||').map(att => {
                    const [id, filename, size, mimetype] = att.split(':');
                    return { id: parseInt(id), filename, size: parseInt(size), mimetype };
                }) : []
        }));

        res.json({
            messages: processedMessages,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Erreur récupération messages admin:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des messages' });
    }
});

// DELETE /api/admin/messages/:id - Supprimer un message (admin)
router.delete('/messages/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const messageId = parseInt(req.params.id);
        const adminId = req.user.id;
        const { reason } = req.body;

        // Vérifier que le message existe
        const [message] = await db.execute(`
            SELECT id, conversation_id, sender_id, content
            FROM messages 
            WHERE id = ? AND is_deleted = FALSE
        `, [messageId]);

        if (message.length === 0) {
            return res.status(404).json({ error: 'Message non trouvé' });
        }

        // Marquer le message comme supprimé
        await db.execute(`
            UPDATE messages 
            SET is_deleted = TRUE, deleted_at = NOW(), deleted_by = ?
            WHERE id = ?
        `, [adminId, messageId]);

        // Log de l'action admin
        console.log(`Admin ${adminId} a supprimé le message ${messageId}. Raison: ${reason || 'Non spécifiée'}`);

        res.json({ 
            message: 'Message supprimé avec succès',
            reason: reason || null
        });

    } catch (error) {
        console.error('Erreur suppression message admin:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression du message' });
    }
});

// PATCH /api/admin/conversations/:id/archive - Archiver une conversation (admin)
router.patch('/conversations/:id/archive', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const conversationId = parseInt(req.params.id);
        const { archived = true } = req.body;

        await db.execute(`
            UPDATE conversations 
            SET is_archived = ?
            WHERE id = ?
        `, [archived, conversationId]);

        res.json({ 
            message: archived ? 'Conversation archivée' : 'Conversation désarchivée'
        });

    } catch (error) {
        console.error('Erreur archivage conversation:', error);
        res.status(500).json({ error: 'Erreur lors de l\'archivage' });
    }
});

// ==================== MESSAGES SYSTÈME ====================

// GET /api/admin/system-messages - Liste des messages système
router.get('/system-messages', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20, active_only = false } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE 1=1';
        let params = [];

        if (active_only === 'true') {
            whereClause += ' AND sm.is_active = TRUE AND (sm.expires_at IS NULL OR sm.expires_at > NOW())';
        }

        const [messages] = await db.execute(`
            SELECT 
                sm.*,
                CONCAT(creator.prenom, ' ', creator.nom) as created_by_name,
                creator.email as created_by_email,
                -- Nombre de lectures
                (SELECT COUNT(*) FROM system_message_reads WHERE system_message_id = sm.id) as read_count,
                -- Nombre d'utilisateurs ciblés
                CASE 
                    WHEN sm.target_audience = 'all' THEN (SELECT COUNT(*) FROM utilisateurs WHERE statut = 'actif')
                    WHEN sm.target_audience = 'buyers' THEN (SELECT COUNT(*) FROM utilisateurs u INNER JOIN roles r ON u.role_id = r.id WHERE r.nom = 'acheteur' AND u.statut = 'actif')
                    WHEN sm.target_audience = 'suppliers' THEN (SELECT COUNT(*) FROM utilisateurs u INNER JOIN roles r ON u.role_id = r.id WHERE r.nom = 'fournisseur' AND u.statut = 'actif')
                    WHEN sm.target_audience = 'admins' THEN (SELECT COUNT(*) FROM utilisateurs u INNER JOIN roles r ON u.role_id = r.id WHERE r.nom = 'admin' AND u.statut = 'actif')
                    ELSE 0
                END as target_count
            FROM system_messages sm
            LEFT JOIN utilisateurs creator ON sm.created_by = creator.id
            ${whereClause}
            ORDER BY sm.priority DESC, sm.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), parseInt(offset)]);

        // Compter le total
        const [totalResult] = await db.execute(`
            SELECT COUNT(*) as total
            FROM system_messages sm
            ${whereClause}
        `, params);

        res.json({
            messages,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalResult[0].total,
                totalPages: Math.ceil(totalResult[0].total / limit)
            }
        });

    } catch (error) {
        console.error('Erreur récupération messages système:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des messages système' });
    }
});

// POST /api/admin/system-messages - Créer un message système
router.post('/system-messages', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const {
            title,
            content,
            message_type = 'info',
            target_audience = 'all',
            expires_at,
            priority = 0
        } = req.body;
        const adminId = req.user.id;

        if (!title || !content) {
            return res.status(400).json({ error: 'Titre et contenu requis' });
        }

        const [result] = await db.execute(`
            INSERT INTO system_messages (
                title, content, message_type, target_audience, 
                created_by, expires_at, priority
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [title, content, message_type, target_audience, adminId, expires_at || null, priority]);

        res.status(201).json({
            message: 'Message système créé avec succès',
            messageId: result.insertId
        });

    } catch (error) {
        console.error('Erreur création message système:', error);
        res.status(500).json({ error: 'Erreur lors de la création du message système' });
    }
});

// ==================== STATISTIQUES ====================

// GET /api/admin/messages/stats - Statistiques de messagerie
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // Statistiques générales
        const [generalStats] = await db.execute(`
            SELECT 
                (SELECT COUNT(*) FROM conversations) as total_conversations,
                (SELECT COUNT(*) FROM conversations WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as conversations_last_30_days,
                (SELECT COUNT(*) FROM messages WHERE is_deleted = FALSE) as total_messages,
                (SELECT COUNT(*) FROM messages WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND is_deleted = FALSE) as messages_last_30_days,
                (SELECT COUNT(DISTINCT user_id) FROM conversation_participants) as active_users,
                (SELECT COUNT(*) FROM message_attachments) as total_attachments,
                (SELECT SUM(file_size) FROM message_attachments) as total_storage_bytes
        `);

        // Messages par type
        const [messageTypes] = await db.execute(`
            SELECT 
                message_type,
                COUNT(*) as count
            FROM messages 
            WHERE is_deleted = FALSE
            GROUP BY message_type
        `);

        // Utilisateurs les plus actifs
        const [activeUsers] = await db.execute(`
            SELECT 
                u.id,
                CONCAT(u.prenom, ' ', u.nom) as name,
                u.email,
                COUNT(m.id) as message_count
            FROM utilisateurs u
            INNER JOIN messages m ON u.id = m.sender_id
            WHERE m.is_deleted = FALSE
            GROUP BY u.id, u.prenom, u.nom, u.email
            ORDER BY message_count DESC
            LIMIT 10
        `);

        res.json({
            general: generalStats[0],
            messageTypes,
            activeUsers
        });

    } catch (error) {
        console.error('Erreur récupération statistiques:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
    }
});

module.exports = router;