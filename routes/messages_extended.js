const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult, query } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const {
    messageRateLimit,
    conversationRateLimit,
    validateSendMessage,
    validateCreateConversation,
    validateConversationParams,
    validatePagination,
    validateConversationFilters,
    validateMarkAsRead,
    validateSearch,
    handleValidationErrors,
    validateConversationAccess,
    securityLogger,
    validateFileUpload,
    sanitizeMessageContent
} = require('../middleware/messageValidation');
const router = express.Router();

// Configuration de multer pour l'upload de fichiers
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = 'uploads/messages/';
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: function (req, file, cb) {
        // Types de fichiers autorisés
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf', 'text/plain',
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/zip', 'application/x-rar-compressed'
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Type de fichier non autorisé'), false);
        }
    }
});

// Lister les conversations avec filtres et pagination
router.get('/conversations',
    authenticateToken,
    securityLogger('list_conversations'),
    validatePagination,
    validateConversationFilters,
    handleValidationErrors,
    async (req, res) => { // Ajout de la fonction async manquante
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const offset = (page - 1) * limit;

            let whereConditions = [];
            let params = [];

            // Construire les conditions WHERE selon le rôle
            if (req.user.role_id === 1) { // Acheteur
                whereConditions.push('c.acheteur_id = ?');
                params.push(req.user.id);
            } else if (req.user.role_id === 2) { // Fournisseur
                whereConditions.push('e.utilisateur_id = ?');
                params.push(req.user.id);
            }

            // Ajouter les filtres
            if (req.query.statut) {
                whereConditions.push('c.statut = ?');
                params.push(req.query.statut);
            }

            if (req.query.archivee !== undefined) {
                whereConditions.push('c.archivee = ?');
                params.push(req.query.archivee === 'true');
            }

            if (req.query.priorite) {
                whereConditions.push('c.priorite = ?');
                params.push(req.query.priorite);
            }

            if (req.query.produit_id) {
                whereConditions.push('c.produit_id = ?');
                params.push(req.query.produit_id);
            }

            if (req.query.commande_id) {
                whereConditions.push('c.commande_id = ?');
                params.push(req.query.commande_id);
            }

            const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

            // Requête pour compter le total
            const countQuery = `
                SELECT COUNT(*) as total
                FROM conversations c
                LEFT JOIN entreprises e ON c.fournisseur_id = e.id
                ${whereClause}
            `;

            const [countResult] = await db.execute(countQuery, params);
            const total = countResult[0].total;

            // Requête principale avec données étendues
            let mainQuery;
            if (req.user.role_id === 1) { // Acheteur - voir les fournisseurs
                mainQuery = `
                    SELECT c.*, 
                           e.nom_entreprise, 
                           e.description as fournisseur_description,
                           e.logo as fournisseur_logo,
                           e.ville as fournisseur_ville,
                           e.pays as fournisseur_pays,
                           uf.nom as fournisseur_nom,
                           uf.prenom as fournisseur_prenom,
                           uf.email as fournisseur_email,
                           uf.telephone as fournisseur_telephone,
                           p.nom as produit_nom,
                           cmd.numero_commande,
                           (SELECT JSON_OBJECT(
                               'id', m.id,
                               'contenu', m.contenu,
                               'type', m.type,
                               'created_at', m.created_at,
                               'expediteur_id', m.expediteur_id
                           ) FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as dernier_message
                    FROM conversations c
                    LEFT JOIN entreprises e ON c.fournisseur_id = e.id
                    LEFT JOIN utilisateurs uf ON e.utilisateur_id = uf.id
                    LEFT JOIN produits p ON c.produit_id = p.id
                    LEFT JOIN commandes cmd ON c.commande_id = cmd.id
                    ${whereClause}
                    ORDER BY c.derniere_activite DESC
                    LIMIT ? OFFSET ?
                `;
            } else { // Fournisseur - voir les acheteurs
                mainQuery = `
                    SELECT c.*, 
                           ua.nom as acheteur_nom, 
                           ua.prenom as acheteur_prenom,
                           ua.email as acheteur_email,
                           ua.telephone as acheteur_telephone,
                           p.nom as produit_nom,
                           cmd.numero_commande,
                           (SELECT JSON_OBJECT(
                               'id', m.id,
                               'contenu', m.contenu,
                               'type', m.type,
                               'created_at', m.created_at,
                               'expediteur_id', m.expediteur_id
                           ) FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as dernier_message
                    FROM conversations c
                    LEFT JOIN entreprises e ON c.fournisseur_id = e.id
                    LEFT JOIN utilisateurs ua ON c.acheteur_id = ua.id
                    LEFT JOIN produits p ON c.produit_id = p.id
                    LEFT JOIN commandes cmd ON c.commande_id = cmd.id
                    ${whereClause}
                    ORDER BY c.derniere_activite DESC
                    LIMIT ? OFFSET ?
                `;
            }

            params.push(limit, offset);

            console.log('🔍 DEBUG - Requête conversations:', {
                query: mainQuery.substring(0, 200) + '...',
                paramsCount: params.length,
                userRole: req.user.role_id,
                userId: req.user.id,
                whereClause: whereClause
            });

            const [conversations] = await db.execute(mainQuery, params);

            console.log('📊 DEBUG - Conversations récupérées - DÉTAIL COMPLET:', {
                count: conversations.length,
                userRole: req.user.role_id === 1 ? 'Acheteur' : 'Fournisseur',
                allConversations: conversations.map(c => ({
                    id: c.id,
                    sujet: c.sujet,
                    acheteur_id: c.acheteur_id,
                    fournisseur_id: c.fournisseur_id,
                    // Données fournisseur (pour acheteurs)
                    nom_entreprise: c.nom_entreprise,
                    fournisseur_nom: c.fournisseur_nom,
                    fournisseur_prenom: c.fournisseur_prenom,
                    fournisseur_email: c.fournisseur_email,
                    // Données acheteur (pour fournisseurs)
                    acheteur_nom: c.acheteur_nom,
                    acheteur_prenom: c.acheteur_prenom,
                    acheteur_email: c.acheteur_email,
                    // Métadonnées
                    statut: c.statut,
                    derniere_activite: c.derniere_activite,
                    messages_non_lus_acheteur: c.messages_non_lus_acheteur,
                    messages_non_lus_fournisseur: c.messages_non_lus_fournisseur
                }))
            });

            // Parser le JSON du dernier message
            conversations.forEach(conv => {
                if (conv.dernier_message && typeof conv.dernier_message === 'string') {
                    try {
                        conv.dernier_message = JSON.parse(conv.dernier_message);
                    } catch (e) {
                        conv.dernier_message = null;
                    }
                }

                // Parser les tags JSON
                if (conv.tags && typeof conv.tags === 'string') {
                    try {
                        conv.tags = JSON.parse(conv.tags);
                    } catch (e) {
                        conv.tags = [];
                    }
                }
            });

            console.log('📤 RÉPONSE FINALE envoyée au client:', {
                conversationsCount: conversations.length,
                userRole: req.user.role_id === 1 ? 'Acheteur' : 'Fournisseur',
                sampleConversation: conversations[0] ? {
                    id: conversations[0].id,
                    sujet: conversations[0].sujet,
                    nom_entreprise: conversations[0].nom_entreprise,
                    fournisseur_nom: conversations[0].fournisseur_nom,
                    acheteur_nom: conversations[0].acheteur_nom,
                    acheteur_prenom: conversations[0].acheteur_prenom
                } : null
            });

            res.json({
                data: conversations,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            });

        } catch (error) {
            console.error('Erreur récupération conversations:', error);
            res.status(500).json({ error: 'Erreur lors de la récupération des conversations' });
        }
    }
);

// Créer une nouvelle conversation
router.post('/conversations', authenticateToken, [
    body('fournisseur_id').isInt({ min: 1 }),
    body('sujet').optional().trim(),
    body('produit_id').optional().isInt({ min: 1 }),
    body('commande_id').optional().isInt({ min: 1 }),
    body('priorite').optional().isIn(['normale', 'haute', 'urgente']),
    body('tags').optional().isArray()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        if (req.user.role_id !== 1) {
            return res.status(403).json({ error: 'Seuls les acheteurs peuvent initier des conversations' });
        }

        const { fournisseur_id, sujet, produit_id, commande_id, priorite, tags } = req.body;

        // Vérifier si une conversation existe déjà
        let existingQuery = 'SELECT id FROM conversations WHERE acheteur_id = ? AND fournisseur_id = ?';
        const params = [req.user.id, fournisseur_id];

        if (produit_id) {
            existingQuery += ' AND produit_id = ?';
            params.push(produit_id);
        } else if (commande_id) {
            existingQuery += ' AND commande_id = ?';
            params.push(commande_id);
        } else {
            existingQuery += ' AND produit_id IS NULL AND commande_id IS NULL';
        }

        const [existing] = await db.execute(existingQuery, params);

        if (existing.length > 0) {
            return res.json({
                message: 'Conversation existante',
                data: { id: existing[0].id }
            });
        }

        // Créer la nouvelle conversation
        const [result] = await db.execute(`
            INSERT INTO conversations (
                acheteur_id, fournisseur_id, produit_id, commande_id, 
                sujet, priorite, tags, derniere_activite, statut, archivee,
                messages_non_lus_acheteur, messages_non_lus_fournisseur
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), 'ouverte', FALSE, 0, 0)
        `, [
            req.user.id,
            fournisseur_id,
            produit_id || null,
            commande_id || null,
            sujet || 'Nouvelle conversation',
            priorite || 'normale',
            tags ? JSON.stringify(tags) : null
        ]);

        // Récupérer la conversation créée avec toutes les informations
        const [newConversation] = await db.execute(`
            SELECT c.*, 
                   e.nom_entreprise, 
                   e.description as fournisseur_description,
                   e.logo as fournisseur_logo,
                   u.nom as fournisseur_nom,
                   u.prenom as fournisseur_prenom,
                   u.email as fournisseur_email
            FROM conversations c
            LEFT JOIN entreprises e ON c.fournisseur_id = e.id
            LEFT JOIN utilisateurs u ON e.utilisateur_id = u.id
            WHERE c.id = ?
        `, [result.insertId]);

        res.status(201).json({
            message: 'Conversation créée avec succès',
            data: newConversation[0],
            conversation_id: result.insertId,
            id: result.insertId
        });

    } catch (error) {
        console.error('Erreur création conversation:', error);
        res.status(500).json({ error: 'Erreur lors de la création de la conversation' });
    }
});

// Récupérer les messages d'une conversation avec pagination
router.get('/conversations/:id/messages', authenticateToken, [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Vérifier l'accès à la conversation
        const hasAccess = await checkConversationAccess(req.params.id, req.user);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Accès non autorisé à cette conversation' });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        // Compter le total de messages
        const [countResult] = await db.execute(
            'SELECT COUNT(*) as total FROM messages WHERE conversation_id = ? AND deleted_at IS NULL',
            [req.params.id]
        );
        const total = countResult[0].total;

        // Récupérer les messages avec les fichiers associés
        const [messages] = await db.execute(`
            SELECT m.*, 
                   u.nom, u.prenom,
                   COALESCE(
                       JSON_ARRAYAGG(
                           CASE WHEN mf.id IS NOT NULL THEN
                               JSON_OBJECT(
                                   'id', mf.id,
                                   'nom_original', mf.nom_original,
                                   'url', mf.url,
                                   'taille', mf.taille,
                                   'type_mime', mf.type_mime
                               )
                           ELSE NULL END
                       ), 
                       JSON_ARRAY()
                   ) as fichiers
            FROM messages m
            JOIN utilisateurs u ON m.expediteur_id = u.id
            LEFT JOIN message_files mf ON m.id = mf.message_id
            WHERE m.conversation_id = ? AND m.deleted_at IS NULL
            GROUP BY m.id
            ORDER BY m.created_at DESC
            LIMIT ? OFFSET ?
        `, [req.params.id, limit, offset]);

        // Parser les fichiers JSON et nettoyer les valeurs null
        messages.forEach(message => {
            // ✅ Validation des champs obligatoires
            if (!message.id || !message.created_at || message.expediteur_id === undefined) {
                console.warn('Message invalide détecté:', message);
                return; // Skip ce message
            }

            if (message.fichiers) {
                try {
                    const fichiers = JSON.parse(message.fichiers);
                    message.fichiers = Array.isArray(fichiers) ? fichiers.filter(f => f !== null) : [];
                } catch (e) {
                    message.fichiers = [];
                }
            } else {
                message.fichiers = [];
            }

            // Parser les métadonnées JSON
            if (message.metadata && typeof message.metadata === 'string') {
                try {
                    message.metadata = JSON.parse(message.metadata);
                } catch (e) {
                    message.metadata = null;
                }
            }
        });

        // ✅ Filtrer les messages valides seulement
        const validMessages = messages.filter(msg =>
            msg && msg.id && msg.created_at && msg.expediteur_id !== undefined
        );

        res.json({
            data: validMessages.reverse(), // Inverser pour avoir les plus anciens en premier
            pagination: {
                page,
                limit,
                total: total, // Utiliser le total réel des messages
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Erreur récupération messages:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des messages' });
    }
});

// Récupérer le nombre de messages non lus
router.get('/unread-count', authenticateToken, async (req, res) => {
    try {
        let countQuery, countParams;

        if (req.user.role_id === 1) { // Acheteur
            countQuery = `
                SELECT 
                    c.id as conversation_id,
                    c.messages_non_lus_acheteur as unread_count
                FROM conversations c
                WHERE c.acheteur_id = ? AND c.messages_non_lus_acheteur > 0
            `;
            countParams = [req.user.id];
        } else if (req.user.role_id === 2) { // Fournisseur
            countQuery = `
                SELECT 
                    c.id as conversation_id,
                    c.messages_non_lus_fournisseur as unread_count
                FROM conversations c
                WHERE c.fournisseur_id = ? AND c.messages_non_lus_fournisseur > 0
            `;
            countParams = [req.user.id];
        } else {
            return res.json({ total: 0, conversations: [] });
        }

        const [conversations] = await db.execute(countQuery, countParams);

        const total = conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);

        res.json({
            total,
            conversations: conversations.map(conv => ({
                conversation_id: conv.conversation_id,
                unread_count: conv.unread_count
            }))
        });

    } catch (error) {
        console.error('Erreur récupération messages non lus:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des messages non lus' });
    }
});

// Upload de fichier
router.post('/upload', authenticateToken, upload.single('file'), [
    body('conversation_id').isInt({ min: 1 }),
    body('message_id').optional().isInt({ min: 1 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Aucun fichier fourni' });
        }

        const { conversation_id, message_id } = req.body;

        // Vérifier l'accès à la conversation
        const hasAccess = await checkConversationAccess(conversation_id, req.user);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Accès non autorisé à cette conversation' });
        }

        const fileUrl = `/uploads/messages/${req.file.filename}`;

        // Si un message_id est fourni, associer le fichier au message
        if (message_id) {
            await db.execute(`
                INSERT INTO message_files (message_id, nom_original, nom_stockage, url, taille, type_mime)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                message_id,
                req.file.originalname,
                req.file.filename,
                fileUrl,
                req.file.size,
                req.file.mimetype
            ]);
        }

        res.json({
            message: 'Fichier uploadé avec succès',
            data: {
                id: Date.now(), // Temporaire, sera remplacé par l'ID réel si associé à un message
                url: fileUrl,
                nom_original: req.file.originalname,
                nom_stockage: req.file.filename,
                taille: req.file.size,
                type_mime: req.file.mimetype,
                created_at: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Erreur upload fichier:', error);
        res.status(500).json({ error: 'Erreur lors de l\'upload du fichier' });
    }
});

// Envoyer un message avec support des fichiers
router.post('/conversations/:id/messages',
    authenticateToken,
    messageRateLimit,
    securityLogger('send_message'),
    validateConversationAccess,
    upload.single('fichier'),
    validateFileUpload,
    validateSendMessage,
    handleValidationErrors,
    body('fichier_url').optional().isURL(),
    body('fichier_nom').optional().trim(),
    body('fichier_taille').optional().isInt({ min: 1 }),
    body('fichier_type').optional().trim(),
    body('message_parent_id').optional().isInt({ min: 1 }),
    body('metadata').optional().isObject(),
    async (req, res) => { // Ajout de la fonction async manquante
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            // Vérifier l'accès à la conversation
            const hasAccess = await checkConversationAccess(req.params.id, req.user);
            if (!hasAccess) {
                return res.status(403).json({ error: 'Accès non autorisé à cette conversation' });
            }

            const {
                contenu,
                type = 'texte',
                fichier_url,
                fichier_nom,
                fichier_taille,
                fichier_type,
                message_parent_id,
                metadata
            } = req.body;

            // Valider qu'il y a du contenu ou un fichier
            if (!contenu && !fichier_url) {
                return res.status(400).json({ error: 'Le message doit contenir du texte ou un fichier' });
            }

            // Insérer le message
            const [result] = await db.execute(`
                INSERT INTO messages (
                    conversation_id, expediteur_id, contenu, type,
                    fichier_url, fichier_nom, fichier_taille, fichier_type,
                    message_parent_id, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                req.params.id,
                req.user.id,
                contenu || '',
                type,
                fichier_url || null,
                fichier_nom || null,
                fichier_taille || null,
                fichier_type || null,
                message_parent_id || null,
                metadata ? JSON.stringify(metadata) : null
            ]);

            // Récupérer le message créé avec les informations de l'expéditeur
            const [newMessage] = await db.execute(`
                SELECT m.*, u.nom, u.prenom
                FROM messages m
                JOIN utilisateurs u ON m.expediteur_id = u.id
                WHERE m.id = ?
            `, [result.insertId]);

            const message = newMessage[0];

            // Parser les métadonnées
            if (message.metadata && typeof message.metadata === 'string') {
                try {
                    message.metadata = JSON.parse(message.metadata);
                } catch (e) {
                    message.metadata = null;
                }
            }

            // Émettre l'événement WebSocket via les utilitaires
            const { notifyNewMessage } = require('../utils/socketUtils');
            const socketManager = req.app.get('socketManager');

            notifyNewMessage(socketManager, req.params.id, message, req.user);

            res.status(201).json({
                message: 'Message envoyé avec succès',
                data: message
            });

        } catch (error) {
            console.error('Erreur envoi message:', error);
            res.status(500).json({ error: 'Erreur lors de l\'envoi du message' });
        }
    }
);

// Marquer des messages comme lus
router.patch('/conversations/:id/mark-read',
    authenticateToken,
    securityLogger('mark_messages_read'),
    validateConversationAccess,
    validateMarkAsRead,
    handleValidationErrors,
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            // Vérifier l'accès à la conversation
            const hasAccess = await checkConversationAccess(req.params.id, req.user);
            if (!hasAccess) {
                return res.status(403).json({ error: 'Accès non autorisé à cette conversation' });
            }

            const { message_ids } = req.body;

            let query, params;

            if (message_ids && message_ids.length > 0) {
                // Marquer des messages spécifiques
                const placeholders = message_ids.map(() => '?').join(',');
                query = `
                UPDATE messages 
                SET lu = TRUE 
                WHERE conversation_id = ? AND expediteur_id != ? AND id IN (${placeholders})
            `;
                params = [req.params.id, req.user.id, ...message_ids];
            } else {
                // Marquer tous les messages non lus de la conversation
                query = `
                UPDATE messages 
                SET lu = TRUE 
                WHERE conversation_id = ? AND expediteur_id != ? AND lu = FALSE
            `;
                params = [req.params.id, req.user.id];
            }

            const result = await db.execute(query, params);

            // Notifier via Socket.IO si des messages ont été marqués comme lus
            if (result.affectedRows > 0) {
                const { notifyMessageRead } = require('../utils/socketUtils');
                const socketManager = req.app.get('socketManager');

                const messageIds = message_ids || ['all']; // 'all' pour indiquer tous les messages
                notifyMessageRead(socketManager, req.params.id, messageIds, req.user);
            }

            res.json({
                message: 'Messages marqués comme lus',
                affected_rows: result.affectedRows
            });

        } catch (error) {
            console.error('Erreur marquage messages lus:', error);
            res.status(500).json({ error: 'Erreur lors du marquage des messages' });
        }
    });

// Rechercher dans les conversations
router.get('/conversations/search', authenticateToken, [
    query('q').notEmpty().trim(),
    query('type').optional().isIn(['conversations', 'messages', 'all'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const searchQuery = req.query.q;
        const searchType = req.query.type || 'all';

        let results = [];

        if (searchType === 'conversations' || searchType === 'all') {
            // Rechercher dans les sujets de conversations
            let conversationQuery;
            let params = [`%${searchQuery}%`];

            if (req.user.role_id === 1) { // Acheteur
                conversationQuery = `
                    SELECT c.*, e.nom_entreprise, u.nom as fournisseur_nom
                    FROM conversations c
                    LEFT JOIN entreprises e ON c.fournisseur_id = e.id
                    LEFT JOIN utilisateurs u ON e.utilisateur_id = u.id
                    WHERE c.acheteur_id = ? AND c.sujet LIKE ?
                    ORDER BY c.derniere_activite DESC
                    LIMIT 20
                `;
                params.unshift(req.user.id);
            } else { // Fournisseur
                conversationQuery = `
                    SELECT c.*, u.nom as acheteur_nom, u.prenom as acheteur_prenom
                    FROM conversations c
                    LEFT JOIN entreprises e ON c.fournisseur_id = e.id
                    LEFT JOIN utilisateurs u ON c.acheteur_id = u.id
                    WHERE e.utilisateur_id = ? AND c.sujet LIKE ?
                    ORDER BY c.derniere_activite DESC
                    LIMIT 20
                `;
                params.unshift(req.user.id);
            }

            const [conversations] = await db.execute(conversationQuery, params);
            results = conversations;
        }

        res.json({ data: results });

    } catch (error) {
        console.error('Erreur recherche conversations:', error);
        res.status(500).json({ error: 'Erreur lors de la recherche' });
    }
});

// Fonction utilitaire pour vérifier l'accès à une conversation
async function checkConversationAccess(conversationId, user) {
    let checkQuery, checkParams;

    if (user.role_id === 1) { // Acheteur
        checkQuery = 'SELECT id FROM conversations WHERE id = ? AND acheteur_id = ?';
        checkParams = [conversationId, user.id];
    } else if (user.role_id === 2) { // Fournisseur
        checkQuery = `
            SELECT c.id FROM conversations c
            JOIN entreprises e ON c.fournisseur_id = e.id
            WHERE c.id = ? AND e.utilisateur_id = ?
        `;
        checkParams = [conversationId, user.id];
    } else {
        return false;
    }

    const [access] = await db.execute(checkQuery, checkParams);
    return access.length > 0;
}

module.exports = router;