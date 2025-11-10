const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuration multer pour les fichiers joints
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/messages';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
    },
    fileFilter: (req, file, cb) => {
        // Types de fichiers autorisés
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|rar/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Type de fichier non autorisé'));
        }
    }
});

// ==================== CONVERSATIONS ====================

// GET /api/messages - Liste des conversations (version simplifiée)
router.get('/', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 [Messages] Requête reçue pour /api/messages');
        const userId = req.user.id;
        console.log('🔍 [Messages] User ID:', userId);

        // Version simplifiée - retourner un tableau vide pour l'instant
        res.json({
            success: true,
            data: [],
            pagination: {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 0
            }
        });

    } catch (error) {
        console.error('Erreur récupération conversations:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération des conversations',
            details: error.message 
        });
    }
});

// GET /api/messages/conversations - Liste des conversations de l'utilisateur
router.get('/conversations', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20, search } = req.query;
        const offset = (page - 1) * limit;

        let searchClause = '';
        let searchParams = [];
        
        if (search) {
            searchClause = `
                AND (c.subject LIKE ? OR 
                     EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id AND m.content LIKE ?))
            `;
            searchParams = [`%${search}%`, `%${search}%`];
        }

        const [conversations] = await db.execute(`
            SELECT 
                c.id,
                c.type,
                c.subject,
                c.created_at,
                c.updated_at,
                cp.last_read_at,
                cp.is_muted,
                -- Dernier message
                lm.content as last_message_content,
                lm.created_at as last_message_at,
                lm.message_type as last_message_type,
                CONCAT(sender.prenom, ' ', sender.nom) as last_sender_name,
                -- Nombre de messages non lus
                (
                    SELECT COUNT(*) 
                    FROM messages m2 
                    WHERE m2.conversation_id = c.id 
                    AND m2.created_at > COALESCE(cp.last_read_at, '1970-01-01')
                    AND m2.sender_id != ?
                    AND m2.is_deleted = FALSE
                ) as unread_count,
                -- Participants (noms)
                GROUP_CONCAT(
                    DISTINCT CONCAT(u.prenom, ' ', u.nom) 
                    ORDER BY u.nom 
                    SEPARATOR ', '
                ) as participants
            FROM conversations c
            INNER JOIN conversation_participants cp ON c.id = cp.conversation_id
            LEFT JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id != ?
            LEFT JOIN utilisateurs u ON cp2.user_id = u.id
            LEFT JOIN messages lm ON c.id = lm.conversation_id AND lm.id = (
                SELECT MAX(id) FROM messages WHERE conversation_id = c.id AND is_deleted = FALSE
            )
            LEFT JOIN utilisateurs sender ON lm.sender_id = sender.id
            WHERE cp.user_id = ?
            ${searchClause}
            GROUP BY c.id, cp.last_read_at, cp.is_muted, lm.content, lm.created_at, lm.message_type, sender.prenom, sender.nom
            ORDER BY COALESCE(lm.created_at, c.created_at) DESC
            LIMIT ? OFFSET ?
        `, [userId, userId, userId, ...searchParams, parseInt(limit), parseInt(offset)]);

        // Compter le total
        const [totalResult] = await db.execute(`
            SELECT COUNT(DISTINCT c.id) as total
            FROM conversations c
            INNER JOIN conversation_participants cp ON c.id = cp.conversation_id
            WHERE cp.user_id = ?
            ${searchClause}
        `, [userId, ...searchParams]);

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
        console.error('Erreur récupération conversations:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des conversations' });
    }
});

// POST /api/messages/conversations - Créer une nouvelle conversation
router.post('/conversations', authenticateToken, async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        const { participants, subject, initialMessage } = req.body;
        const userId = req.user.id;

        if (!participants || participants.length === 0) {
            return res.status(400).json({ error: 'Au moins un participant est requis' });
        }

        if (!initialMessage || !initialMessage.trim()) {
            return res.status(400).json({ error: 'Message initial requis' });
        }

        await connection.beginTransaction();

        // Créer la conversation
        const [conversationResult] = await connection.execute(`
            INSERT INTO conversations (subject, created_by, type)
            VALUES (?, ?, 'private')
        `, [subject || 'Nouvelle conversation', userId]);

        const conversationId = conversationResult.insertId;

        // Ajouter le créateur comme participant
        await connection.execute(`
            INSERT INTO conversation_participants (conversation_id, user_id)
            VALUES (?, ?)
        `, [conversationId, userId]);

        // Ajouter les autres participants
        for (const participantId of participants) {
            if (participantId !== userId) {
                await connection.execute(`
                    INSERT INTO conversation_participants (conversation_id, user_id)
                    VALUES (?, ?)
                `, [conversationId, participantId]);
            }
        }

        // Ajouter le message initial
        const [messageResult] = await connection.execute(`
            INSERT INTO messages (conversation_id, sender_id, content, message_type)
            VALUES (?, ?, ?, 'text')
        `, [conversationId, userId, initialMessage.trim()]);

        // Créer les notifications pour les autres participants
        for (const participantId of participants) {
            if (participantId !== userId) {
                await connection.execute(`
                    INSERT INTO message_notifications (user_id, message_id, conversation_id)
                    VALUES (?, ?, ?)
                `, [participantId, messageResult.insertId, conversationId]);
            }
        }

        await connection.commit();

        res.status(201).json({
            message: 'Conversation créée avec succès',
            conversationId: conversationId
        });

    } catch (error) {
        await connection.rollback();
        console.error('Erreur création conversation:', error);
        res.status(500).json({ error: 'Erreur lors de la création de la conversation' });
    } finally {
        connection.release();
    }
});

// GET /api/messages/conversations/:id - Détails d'une conversation
router.get('/conversations/:id', authenticateToken, async (req, res) => {
    try {
        const conversationId = parseInt(req.params.id);
        const userId = req.user.id;

        // Vérifier que l'utilisateur fait partie de la conversation
        const [participantCheck] = await db.execute(`
            SELECT 1 FROM conversation_participants 
            WHERE conversation_id = ? AND user_id = ?
        `, [conversationId, userId]);

        if (participantCheck.length === 0) {
            return res.status(403).json({ error: 'Accès non autorisé à cette conversation' });
        }

        // Récupérer les détails de la conversation
        const [conversation] = await db.execute(`
            SELECT 
                c.*,
                CONCAT(creator.prenom, ' ', creator.nom) as created_by_name
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

        res.json({
            conversation: conversation[0],
            participants
        });

    } catch (error) {
        console.error('Erreur récupération détails conversation:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des détails' });
    }
});

// ==================== MESSAGES ====================

// GET /api/messages/conversations/:id/messages - Messages d'une conversation
router.get('/conversations/:id/messages', authenticateToken, async (req, res) => {
    try {
        const conversationId = parseInt(req.params.id);
        const userId = req.user.id;
        const { page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        console.log('🔍 Messages API - Conversation ID:', conversationId);
        console.log('🔍 Messages API - User ID:', userId);
        console.log('🔍 Messages API - Page:', page, 'Limit:', limit);
        console.log('🔍 Messages API - URL complète:', req.originalUrl);

        // Vérifier l'accès
        const [participantCheck] = await db.execute(`
            SELECT 1 FROM conversation_participants 
            WHERE conversation_id = ? AND user_id = ?
        `, [conversationId, userId]);

        if (participantCheck.length === 0) {
            return res.status(403).json({ error: 'Accès non autorisé' });
        }

        // Récupérer les messages
        const [messages] = await db.execute(`
            SELECT 
                m.id,
                m.content,
                m.message_type,
                m.created_at,
                m.is_edited,
                m.edited_at,
                m.parent_message_id,
                CONCAT(sender.prenom, ' ', sender.nom) as sender_name,
                sender.id as sender_id,
                sender.role_id as sender_role_id,
                sender.photo_profil as sender_photo,
                -- Message parent (pour les réponses)
                parent.content as parent_content,
                CONCAT(parent_sender.prenom, ' ', parent_sender.nom) as parent_sender_name,
                -- Fichiers joints
                GROUP_CONCAT(
                    DISTINCT CONCAT(
                        att.id, ':', att.original_filename, ':', att.file_size, ':', att.mime_type
                    ) SEPARATOR '||'
                ) as attachments,
                -- Statut de lecture
                CASE WHEN mrs.read_at IS NOT NULL THEN TRUE ELSE FALSE END as is_read_by_user
            FROM messages m
            INNER JOIN utilisateurs sender ON m.sender_id = sender.id
            LEFT JOIN messages parent ON m.parent_message_id = parent.id
            LEFT JOIN utilisateurs parent_sender ON parent.sender_id = parent_sender.id
            LEFT JOIN message_attachments att ON m.id = att.message_id
            LEFT JOIN message_read_status mrs ON m.id = mrs.message_id AND mrs.user_id = ?
            WHERE m.conversation_id = ? AND m.is_deleted = FALSE
            GROUP BY m.id, sender.prenom, sender.nom, sender.id, sender.role_id, 
                     parent.content, parent_sender.prenom, parent_sender.nom, mrs.read_at
            ORDER BY m.created_at DESC
            LIMIT ? OFFSET ?
        `, [userId, conversationId, parseInt(limit), parseInt(offset)]);

        // Traiter les fichiers joints
        const processedMessages = messages.map(message => ({
            ...message,
            attachments: message.attachments ? 
                message.attachments.split('||').map(att => {
                    const [id, filename, size, mimetype] = att.split(':');
                    return { id: parseInt(id), filename, size: parseInt(size), mimetype };
                }) : []
        }));

        // Marquer les messages comme lus
        if (messages.length > 0) {
            const messageIds = messages.map(m => m.id);
            await db.execute(`
                INSERT IGNORE INTO message_read_status (message_id, user_id)
                VALUES ${messageIds.map(() => '(?, ?)').join(', ')}
            `, messageIds.flatMap(id => [id, userId]));

            // Mettre à jour last_read_at
            await db.execute(`
                UPDATE conversation_participants 
                SET last_read_at = NOW() 
                WHERE conversation_id = ? AND user_id = ?
            `, [conversationId, userId]);
        }

        console.log('🔍 Messages API - Nombre de messages trouvés:', processedMessages.length);
        console.log('🔍 Messages API - Réponse JSON préparée');

        res.json({
            messages: processedMessages.reverse(), // Ordre chronologique
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Erreur récupération messages:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des messages' });
    }
});

// POST /api/messages/conversations/:id/messages - Envoyer un message
router.post('/conversations/:id/messages', authenticateToken, upload.array('attachments', 5), async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        const conversationId = parseInt(req.params.id);
        const userId = req.user.id;
        const { content, parentMessageId } = req.body;
        const files = req.files || [];

        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Contenu du message requis' });
        }

        // Vérifier l'accès
        const [participantCheck] = await db.execute(`
            SELECT 1 FROM conversation_participants 
            WHERE conversation_id = ? AND user_id = ?
        `, [conversationId, userId]);

        if (participantCheck.length === 0) {
            return res.status(403).json({ error: 'Accès non autorisé' });
        }

        await connection.beginTransaction();

        // Créer le message
        const [messageResult] = await connection.execute(`
            INSERT INTO messages (conversation_id, sender_id, content, message_type, parent_message_id)
            VALUES (?, ?, ?, ?, ?)
        `, [conversationId, userId, content.trim(), files.length > 0 ? 'file' : 'text', parentMessageId || null]);

        const messageId = messageResult.insertId;

        // Ajouter les fichiers joints
        for (const file of files) {
            await connection.execute(`
                INSERT INTO message_attachments (message_id, filename, original_filename, file_path, file_size, mime_type)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [messageId, file.filename, file.originalname, file.path, file.size, file.mimetype]);
        }

        // Récupérer les autres participants pour les notifications
        const [otherParticipants] = await connection.execute(`
            SELECT user_id FROM conversation_participants 
            WHERE conversation_id = ? AND user_id != ?
        `, [conversationId, userId]);

        // Créer les notifications
        for (const participant of otherParticipants) {
            await connection.execute(`
                INSERT INTO message_notifications (user_id, message_id, conversation_id)
                VALUES (?, ?, ?)
            `, [participant.user_id, messageId, conversationId]);
        }

        // Mettre à jour la conversation
        await connection.execute(`
            UPDATE conversations SET updated_at = NOW() WHERE id = ?
        `, [conversationId]);

        await connection.commit();

        res.status(201).json({
            message: 'Message envoyé avec succès',
            messageId: messageId
        });

    } catch (error) {
        await connection.rollback();
        console.error('Erreur envoi message:', error);
        res.status(500).json({ error: 'Erreur lors de l\'envoi du message' });
    } finally {
        connection.release();
    }
});

// ==================== NOTIFICATIONS ====================

// GET /api/messages/notifications - Notifications de messages
router.get('/notifications', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 20 } = req.query;

        const [notifications] = await db.execute(`
            SELECT 
                mn.id,
                mn.created_at,
                mn.is_read,
                mn.read_at,
                c.subject as conversation_subject,
                m.content as message_content,
                CONCAT(sender.prenom, ' ', sender.nom) as sender_name
            FROM message_notifications mn
            INNER JOIN messages m ON mn.message_id = m.id
            INNER JOIN conversations c ON mn.conversation_id = c.id
            INNER JOIN utilisateurs sender ON m.sender_id = sender.id
            WHERE mn.user_id = ?
            ORDER BY mn.created_at DESC
            LIMIT ?
        `, [userId, parseInt(limit)]);

        // Compter les non lues
        const [unreadCount] = await db.execute(`
            SELECT COUNT(*) as count
            FROM message_notifications
            WHERE user_id = ? AND is_read = FALSE
        `, [userId]);

        res.json({
            notifications,
            unreadCount: unreadCount[0].count
        });

    } catch (error) {
        console.error('Erreur récupération notifications:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des notifications' });
    }
});

// PATCH /api/messages/notifications/:id/read - Marquer une notification comme lue
router.patch('/notifications/:id/read', authenticateToken, async (req, res) => {
    try {
        const notificationId = parseInt(req.params.id);
        const userId = req.user.id;

        await db.execute(`
            UPDATE message_notifications 
            SET is_read = TRUE, read_at = NOW()
            WHERE id = ? AND user_id = ?
        `, [notificationId, userId]);

        res.json({ message: 'Notification marquée comme lue' });

    } catch (error) {
        console.error('Erreur marquage notification:', error);
        res.status(500).json({ error: 'Erreur lors du marquage de la notification' });
    }
});

// ==================== COMPTEURS ====================

// GET /api/messages/unread-count - Nombre de messages non lus
router.get('/unread-count', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const [result] = await db.execute(`
            SELECT 
                COALESCE(SUM(c.messages_non_lus_acheteur), 0) as unread_acheteur,
                COALESCE(SUM(c.messages_non_lus_fournisseur), 0) as unread_fournisseur
            FROM conversations c
            WHERE c.acheteur_id = ? OR c.fournisseur_id = ?
        `, [userId, userId]);

        const unreadCount = result[0].unread_acheteur + result[0].unread_fournisseur;

        res.json({
            success: true,
            data: { count: unreadCount }
        });

    } catch (error) {
        console.error('Erreur récupération compteur messages non lus:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération du compteur' });
    }
});

// ==================== RECHERCHE ====================

// GET /api/messages/search - Rechercher dans les messages
router.get('/search', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { q, conversationId, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        if (!q || q.trim().length < 2) {
            return res.status(400).json({ error: 'Terme de recherche trop court (minimum 2 caractères)' });
        }

        let conversationFilter = '';
        let params = [userId, `%${q.trim()}%`];
        
        if (conversationId) {
            conversationFilter = 'AND m.conversation_id = ?';
            params.push(parseInt(conversationId));
        }

        const [results] = await db.execute(`
            SELECT 
                m.id,
                m.content,
                m.created_at,
                m.conversation_id,
                c.subject as conversation_subject,
                CONCAT(sender.prenom, ' ', sender.nom) as sender_name
            FROM messages m
            INNER JOIN conversations c ON m.conversation_id = c.id
            INNER JOIN conversation_participants cp ON c.id = cp.conversation_id
            INNER JOIN utilisateurs sender ON m.sender_id = sender.id
            WHERE cp.user_id = ? 
            AND m.content LIKE ?
            AND m.is_deleted = FALSE
            ${conversationFilter}
            ORDER BY m.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), parseInt(offset)]);

        res.json({
            results,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Erreur recherche messages:', error);
        res.status(500).json({ error: 'Erreur lors de la recherche' });
    }
});

// ==================== FICHIERS ====================

// GET /api/messages/attachments/:id - Télécharger un fichier joint
router.get('/attachments/:id', authenticateToken, async (req, res) => {
    try {
        const attachmentId = parseInt(req.params.id);
        const userId = req.user.id;

        // Vérifier l'accès au fichier
        const [attachment] = await db.execute(`
            SELECT att.*, m.conversation_id
            FROM message_attachments att
            INNER JOIN messages m ON att.message_id = m.id
            INNER JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
            WHERE att.id = ? AND cp.user_id = ?
        `, [attachmentId, userId]);

        if (attachment.length === 0) {
            return res.status(404).json({ error: 'Fichier non trouvé ou accès non autorisé' });
        }

        const file = attachment[0];
        const filePath = path.resolve(file.file_path);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Fichier physique non trouvé' });
        }

        res.setHeader('Content-Disposition', `attachment; filename="${file.original_filename}"`);
        res.setHeader('Content-Type', file.mime_type);
        res.sendFile(filePath);

    } catch (error) {
        console.error('Erreur téléchargement fichier:', error);
        res.status(500).json({ error: 'Erreur lors du téléchargement' });
    }
});

// POST /api/messages/upload - Upload de fichiers
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Aucun fichier fourni' });
        }

        const { conversation_id, message_id } = req.body;
        const userId = req.user.id;

        // Vérifier l'accès à la conversation
        if (conversation_id) {
            const [conversation] = await db.execute(
                'SELECT id FROM conversations WHERE id = ? AND (acheteur_id = ? OR fournisseur_id = ?)',
                [conversation_id, userId, userId]
            );

            if (conversation.length === 0) {
                return res.status(403).json({ error: 'Accès refusé à cette conversation' });
            }
        }

        // Enregistrer le fichier en base
        const [result] = await db.execute(`
            INSERT INTO message_attachments (
                message_id, 
                conversation_id, 
                filename, 
                original_filename, 
                file_path, 
                file_size, 
                mime_type, 
                uploaded_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            message_id || null,
            conversation_id || null,
            req.file.filename,
            req.file.originalname,
            req.file.path,
            req.file.size,
            req.file.mimetype,
            userId
        ]);

        res.json({
            success: true,
            data: {
                id: result.insertId,
                filename: req.file.filename,
                original_filename: req.file.originalname,
                url: `/api/messages/attachments/${result.insertId}`,
                size: req.file.size,
                mime_type: req.file.mimetype
            }
        });

    } catch (error) {
        console.error('Erreur upload fichier:', error);
        res.status(500).json({ error: 'Erreur lors de l\'upload' });
    }
});

module.exports = router;
