const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const userNotificationService = require('../services/userNotificationService');
const {
    conversationRateLimit,
    validateConversationCreation,
    validateConversationAccess,
    validateUserConversations,
    validateConversationStatusUpdate,
    checkConversationParticipant,
    checkUserAccess,
    sanitizeMessageContent,
    securityLogger,
    validatePagination,
    handleValidationErrors
} = require('../middleware/messageValidation');
const router = express.Router();

// Route pour récupérer toutes les conversations d'un utilisateur avec pagination
router.get('/user/:userId', 
    authenticateToken,
    securityLogger('get_user_conversations'),
    validatePagination,
    handleValidationErrors,
    async (req, res) => {
    try {
        const { userId } = req.params;
        const requestingUserId = req.user.id;

        // Paramètres de pagination
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 50); // Max 50 conversations par page
        const offset = (page - 1) * limit;

        // Vérifier que l'utilisateur demande ses propres conversations ou est admin
        if (parseInt(userId) !== requestingUserId && req.user.role_id !== 3) {
            return res.status(403).json({ 
                error: 'Accès non autorisé aux conversations de cet utilisateur' 
            });
        }

        console.log('📋 Récupération conversations utilisateur:', {
            userId,
            page,
            limit,
            offset
        });

        // Récupérer les conversations selon le rôle avec requête optimisée
        let query, params;
        
        if (req.user.role_id === 1) {
            // Acheteur : conversations où il est l'acheteur
            query = `
                SELECT 
                    c.id,
                    c.acheteur_id,
                    c.fournisseur_id,
                    c.produit_id,
                    c.sujet,
                    c.statut,
                    c.created_at,
                    c.updated_at,
                    -- Informations fournisseur (CORRECTION: fournisseur_id = utilisateur_id)
                    e_fournisseur.nom_entreprise as nom_entreprise,
                    e_fournisseur.nom_entreprise as fournisseur_nom_entreprise,
                    u_fournisseur.nom as fournisseur_nom,
                    u_fournisseur.prenom as fournisseur_prenom,
                    u_fournisseur.email as fournisseur_email,
                    -- Informations produit (si applicable)
                    p.nom as produit_nom,
                    -- Statistiques des messages (sous-requêtes optimisées)
                    COALESCE(msg_stats.total_messages, 0) as total_messages,
                    COALESCE(msg_stats.messages_non_lus_acheteur, 0) as messages_non_lus_acheteur,
                    COALESCE(msg_stats.messages_non_lus, 0) as messages_non_lus,
                    -- Dernier message
                    last_msg.contenu as dernier_message,
                    last_msg.created_at as dernier_message_date,
                    last_msg.created_at as derniere_activite,
                    last_msg.expediteur_id as dernier_message_expediteur_id,
                    CASE 
                        WHEN last_msg.expediteur_id = c.acheteur_id THEN 'acheteur'
                        ELSE 'fournisseur'
                    END as dernier_message_type
                FROM conversations c
                INNER JOIN utilisateurs u_fournisseur ON c.fournisseur_id = u_fournisseur.id
                INNER JOIN entreprises e_fournisseur ON u_fournisseur.id = e_fournisseur.utilisateur_id
                LEFT JOIN produits p ON c.produit_id = p.id
                -- Sous-requête pour les statistiques de messages
                LEFT JOIN (
                    SELECT 
                        conversation_id,
                        COUNT(*) as total_messages,
                        SUM(CASE WHEN lu = 0 AND expediteur_id != ? THEN 1 ELSE 0 END) as messages_non_lus_acheteur,
                        SUM(CASE WHEN lu = 0 AND expediteur_id != ? THEN 1 ELSE 0 END) as messages_non_lus
                    FROM messages 
                    GROUP BY conversation_id
                ) msg_stats ON c.id = msg_stats.conversation_id
                -- Sous-requête pour le dernier message
                LEFT JOIN (
                    SELECT DISTINCT
                        m1.conversation_id,
                        m1.contenu,
                        m1.created_at,
                        m1.expediteur_id
                    FROM messages m1
                    INNER JOIN (
                        SELECT conversation_id, MAX(created_at) as max_created_at
                        FROM messages
                        GROUP BY conversation_id
                    ) m2 ON m1.conversation_id = m2.conversation_id 
                        AND m1.created_at = m2.max_created_at
                ) last_msg ON c.id = last_msg.conversation_id
                WHERE c.acheteur_id = ?
                ORDER BY 
                    COALESCE(last_msg.created_at, c.updated_at) DESC,
                    c.id DESC
                LIMIT ? OFFSET ?
            `;
            params = [userId, userId, userId, limit, offset];
        } else if (req.user.role_id === 2) {
            // Fournisseur : conversations où il est le fournisseur
            query = `
                SELECT 
                    c.id,
                    c.acheteur_id,
                    c.fournisseur_id,
                    c.produit_id,
                    c.sujet,
                    c.statut,
                    c.created_at,
                    c.updated_at,
                    -- Informations acheteur
                    u_acheteur.nom as acheteur_nom,
                    u_acheteur.prenom as acheteur_prenom,
                    u_acheteur.email as acheteur_email,
                    -- Informations produit (si applicable)
                    p.nom as produit_nom,
                    -- Statistiques des messages (sous-requêtes optimisées)
                    COALESCE(msg_stats.total_messages, 0) as total_messages,
                    COALESCE(msg_stats.messages_non_lus_fournisseur, 0) as messages_non_lus_fournisseur,
                    COALESCE(msg_stats.messages_non_lus, 0) as messages_non_lus,
                    -- Dernier message
                    last_msg.contenu as dernier_message,
                    last_msg.created_at as dernier_message_date,
                    last_msg.created_at as derniere_activite,
                    last_msg.expediteur_id as dernier_message_expediteur_id,
                    CASE 
                        WHEN last_msg.expediteur_id = c.acheteur_id THEN 'acheteur'
                        ELSE 'fournisseur'
                    END as dernier_message_type
                FROM conversations c
                INNER JOIN utilisateurs u_acheteur ON c.acheteur_id = u_acheteur.id
                LEFT JOIN produits p ON c.produit_id = p.id
                -- Sous-requête pour les statistiques de messages
                LEFT JOIN (
                    SELECT 
                        conversation_id,
                        COUNT(*) as total_messages,
                        SUM(CASE WHEN lu = 0 AND expediteur_id != ? THEN 1 ELSE 0 END) as messages_non_lus_fournisseur,
                        SUM(CASE WHEN lu = 0 AND expediteur_id != ? THEN 1 ELSE 0 END) as messages_non_lus
                    FROM messages 
                    GROUP BY conversation_id
                ) msg_stats ON c.id = msg_stats.conversation_id
                -- Sous-requête pour le dernier message
                LEFT JOIN (
                    SELECT DISTINCT
                        m1.conversation_id,
                        m1.contenu,
                        m1.created_at,
                        m1.expediteur_id
                    FROM messages m1
                    INNER JOIN (
                        SELECT conversation_id, MAX(created_at) as max_created_at
                        FROM messages
                        GROUP BY conversation_id
                    ) m2 ON m1.conversation_id = m2.conversation_id 
                        AND m1.created_at = m2.max_created_at
                ) last_msg ON c.id = last_msg.conversation_id
                WHERE c.fournisseur_id = ?
                ORDER BY 
                    COALESCE(last_msg.created_at, c.updated_at) DESC,
                    c.id DESC
                LIMIT ? OFFSET ?
            `;
            params = [userId, userId, userId, limit, offset];
        } else {
            return res.status(403).json({ 
                error: 'Type d\'utilisateur non supporté pour cette opération' 
            });
        }

        // Exécuter la requête principale
        const [conversations] = await db.execute(query, params);

        // Requête pour compter le total des conversations (pour la pagination)
        let countQuery, countParams;
        if (req.user.role_id === 1) {
            countQuery = `
                SELECT COUNT(DISTINCT c.id) as total
                FROM conversations c
                WHERE c.acheteur_id = ?
            `;
            countParams = [userId];
        } else {
            countQuery = `
                SELECT COUNT(DISTINCT c.id) as total
                FROM conversations c
                WHERE c.fournisseur_id = ?
            `;
            countParams = [userId];
        }

        const [countResult] = await db.execute(countQuery, countParams);
        const totalConversations = countResult[0].total;

        // Calculer les métadonnées de pagination
        const totalPages = Math.ceil(totalConversations / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        // Calculer les statistiques globales
        const totalUnreadMessages = conversations.reduce((sum, conv) => sum + (conv.messages_non_lus || 0), 0);

        console.log('✅ Conversations récupérées:', {
            count: conversations.length,
            total: totalConversations,
            page,
            totalPages,
            userId,
            userRole: req.user.role_id,
            unreadMessages: totalUnreadMessages
        });

        res.json({
            conversations,
            pagination: {
                page,
                limit,
                total: totalConversations,
                pages: totalPages,
                hasNext: hasNextPage,
                hasPrev: hasPrevPage
            },
            summary: {
                totalConversations,
                totalUnreadMessages,
                conversationsWithUnread: conversations.filter(c => c.messages_non_lus > 0).length
            }
        });

    } catch (error) {
        console.error('Erreur récupération conversations utilisateur:', error);
        res.status(500).json({ 
            error: 'Erreur serveur lors de la récupération des conversations',
            details: error.message 
        });
    }
});

// Route pour trouver ou créer une conversation (évite les doublons)
router.post('/find-or-create', authenticateToken, [
    body('fournisseur_id').isInt({ min: 1 }).withMessage('ID fournisseur invalide'),
    body('produit_id').optional().isInt({ min: 1 }).withMessage('ID produit invalide'),
    body('sujet').optional().trim().isLength({ min: 1, max: 255 }).withMessage('Le sujet doit contenir entre 1 et 255 caractères')
], async (req, res) => {
    try {
        console.log('=== FIND OR CREATE CONVERSATION ===');
        console.log('Utilisateur connecté:', {
            id: req.user.id,
            role_id: req.user.role_id,
            nom: req.user.nom
        });
        console.log('Données reçues:', req.body);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: 'Données invalides', 
                details: errors.array() 
            });
        }

        const { fournisseur_id, produit_id, sujet } = req.body;
        const acheteur_id = req.user.id;

        // Vérifier que l'utilisateur est bien un acheteur
        if (req.user.role_id !== 1) {
            return res.status(403).json({ 
                error: 'Seuls les acheteurs peuvent initier des conversations',
                code: 'BUYER_ONLY'
            });
        }

        // Vérifier que le fournisseur existe et est bien un fournisseur
        const [fournisseurRows] = await db.execute(`
            SELECT u.id, u.nom, u.prenom, u.email, u.role_id, e.nom_entreprise, e.id as entreprise_id
            FROM utilisateurs u
            LEFT JOIN entreprises e ON u.id = e.utilisateur_id
            WHERE u.id = ? AND u.role_id = 2 AND e.id IS NOT NULL
        `, [fournisseur_id]);

        if (fournisseurRows.length === 0) {
            return res.status(404).json({ 
                error: 'Fournisseur non trouvé ou invalide',
                code: 'SUPPLIER_NOT_FOUND'
            });
        }

        const fournisseur = fournisseurRows[0];

        // Si un produit_id est fourni, vérifier qu'il existe et appartient au fournisseur
        if (produit_id) {
            const [produitRows] = await db.execute(`
                SELECT p.id, p.nom, p.fournisseur_id
                FROM produits p
                WHERE p.id = ? AND p.fournisseur_id = ?
            `, [produit_id, fournisseur.entreprise_id]);

            if (produitRows.length === 0) {
                return res.status(404).json({
                    error: 'Produit non trouvé ou n\'appartient pas à ce fournisseur',
                    code: 'PRODUCT_NOT_FOUND'
                });
            }
        }

        // Fonction helper pour récupérer une conversation avec toutes ses données
        const getConversationWithDetails = async (conversationId) => {
            const [rows] = await db.execute(`
                SELECT c.*, 
                       e_fournisseur.nom_entreprise as fournisseur_nom_entreprise,
                       u_fournisseur.nom as fournisseur_nom,
                       u_fournisseur.prenom as fournisseur_prenom,
                       u_fournisseur.email as fournisseur_email,
                       u_acheteur.nom as acheteur_nom,
                       u_acheteur.prenom as acheteur_prenom,
                       u_acheteur.email as acheteur_email,
                       p.nom as produit_nom
                FROM conversations c
                LEFT JOIN utilisateurs u_fournisseur ON c.fournisseur_id = u_fournisseur.id
                LEFT JOIN entreprises e_fournisseur ON u_fournisseur.id = e_fournisseur.utilisateur_id
                LEFT JOIN utilisateurs u_acheteur ON c.acheteur_id = u_acheteur.id
                LEFT JOIN produits p ON c.produit_id = p.id
                WHERE c.id = ?
            `, [conversationId]);
            return rows[0] || null;
        };

        // Chercher une conversation existante entre cet acheteur et ce fournisseur
        // CORRECTION: Utiliser l'ID utilisateur du fournisseur, pas l'ID entreprise
        let searchQuery = `
            SELECT c.id
            FROM conversations c
            WHERE c.acheteur_id = ? AND c.fournisseur_id = ?
        `;
        let searchParams = [acheteur_id, fournisseur_id];

        if (produit_id) {
            // Chercher une conversation spécifique à ce produit
            searchQuery += ' AND c.produit_id = ?';
            searchParams.push(produit_id);
        } else {
            // Chercher une conversation générale (sans produit spécifique)
            searchQuery += ' AND c.produit_id IS NULL';
        }

        searchQuery += ' ORDER BY c.created_at DESC LIMIT 1';

        console.log('🔍 Recherche conversation existante:', {
            acheteur_id,
            fournisseur_id,
            produit_id: produit_id || null
        });

        const [existingRows] = await db.execute(searchQuery, searchParams);
        
        if (existingRows.length > 0) {
            const existingConversation = await getConversationWithDetails(existingRows[0].id);
            
            if (existingConversation) {
                console.log('✅ Conversation existante trouvée:', existingConversation.id);
                return res.json({
                    conversation: existingConversation,
                    isNew: false
                });
            }
        }

        // Créer une nouvelle conversation
        const conversationSujet = sujet || (produit_id ? `Demande concernant le produit #${produit_id}` : 'Demande de renseignements');
        
        console.log('🆕 Création nouvelle conversation:', {
            acheteur_id,
            fournisseur_id,
            produit_id: produit_id || null,
            sujet: conversationSujet
        });

        const [result] = await db.execute(`
            INSERT INTO conversations (acheteur_id, fournisseur_id, produit_id, sujet, statut, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'ouverte', NOW(), NOW())
        `, [acheteur_id, fournisseur_id, produit_id || null, conversationSujet]);

        const conversationId = result.insertId;

        // Récupérer la conversation créée avec toutes les infos
        const newConversation = await getConversationWithDetails(conversationId);

        if (!newConversation) {
            throw new Error('Impossible de récupérer la conversation créée');
        }

        console.log('✅ Nouvelle conversation créée:', {
            id: conversationId,
            acheteur_id,
            fournisseur_id,
            produit_id,
            sujet: conversationSujet
        });

        // Créer une notification pour le fournisseur avec le nouveau service
        try {
            const NotificationService = require('../services/notificationService');
            const socketManager = req.app.get('socketManager');
            const notificationService = new NotificationService(socketManager);

            await notificationService.notifyNewConversation(
                req.user.id,
                fournisseur_id,
                conversationId,
                conversationSujet
            );

            console.log(`📢 Notification conversation envoyée au fournisseur ${fournisseur_id}`);
        } catch (notifError) {
            console.error('Erreur création notification conversation:', notifError);
            // Ne pas faire échouer la création de conversation si la notification échoue
        }

        res.status(201).json({
            conversation: newConversation,
            isNew: true
        });

    } catch (error) {
        console.error('Erreur find-or-create conversation:', error);
        res.status(500).json({ 
            error: 'Erreur serveur lors de la gestion de la conversation',
            details: error.message 
        });
    }
});

// Créer une nouvelle conversation
router.post('/', authenticateToken, [
    body('destinataire_id').isInt({ min: 1 }),

    body('type').optional().trim()
], async (req, res) => {
    try {
        console.log('=== CRÉATION CONVERSATION ===');
        console.log('Utilisateur connecté:', {
            id: req.user.id,
            role_id: req.user.role_id,
            nom: req.user.nom,
            email: req.user.email
        });
        console.log('Données reçues:', req.body);

        // RÈGLE MÉTIER : Seuls les acheteurs peuvent initier des conversations avec les fournisseurs
        // Les fournisseurs peuvent répondre mais pas initier
        if (req.user.role_id !== 1) {
            console.log('❌ ERREUR: Utilisateur non autorisé - role_id:', req.user.role_id);
            
            // Si c'est un fournisseur qui essaie de créer une conversation, on peut permettre
            // la création d'une conversation inverse (fournisseur vers acheteur)
            if (req.user.role_id === 2) {
                console.log('🔄 Tentative de création de conversation par un fournisseur');
                // Pour l'instant, on refuse mais on pourrait implémenter cette logique
                return res.status(403).json({ 
                    error: 'Les fournisseurs ne peuvent pas initier des conversations. Utilisez la messagerie depuis votre tableau de bord.',
                    code: 'SUPPLIER_CANNOT_INITIATE',
                    user_role: req.user.role_id,
                    suggestion: 'Attendez qu\'un acheteur vous contacte ou utilisez les outils de votre tableau de bord'
                });
            }
            
            return res.status(403).json({ 
                error: 'Seuls les acheteurs peuvent initier des conversations avec les fournisseurs',
                code: 'BUYER_ONLY_INITIATION',
                user_role: req.user.role_id
            });
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('❌ ERREUR: Validation échouée:', errors.array());
            return res.status(400).json({ errors: errors.array() });
        }

        const { destinataire_id, type, contexte } = req.body;
        console.log('Recherche du destinataire ID:', destinataire_id);

        // Vérifier que le destinataire existe et est un fournisseur
        const [destinataire] = await db.execute(`
            SELECT u.id, u.role_id, u.nom, u.email, e.id as entreprise_id, e.nom_entreprise
            FROM utilisateurs u
            LEFT JOIN entreprises e ON u.id = e.utilisateur_id
            WHERE u.id = ? AND u.role_id = 2
        `, [destinataire_id]);

        console.log('Résultat recherche destinataire:', destinataire);

        if (destinataire.length === 0) {
            console.log('❌ ERREUR: Fournisseur non trouvé pour ID:', destinataire_id);
            return res.status(404).json({ error: 'Fournisseur non trouvé' });
        }

        // Le fournisseur_id dans la table conversations doit être l'ID utilisateur, pas l'ID entreprise
        const fournisseur_user_id = destinataire[0].id; // ID de l'utilisateur fournisseur
        const entreprise_id = destinataire[0].entreprise_id; // ID de l'entreprise (pour référence)
        
        console.log('ID utilisateur du fournisseur:', fournisseur_user_id);
        console.log('ID entreprise du fournisseur:', entreprise_id);

        if (!entreprise_id) {
            console.log('❌ ERREUR: Pas d\'entreprise associée au fournisseur');
            return res.status(400).json({ error: 'Ce fournisseur n\'a pas d\'entreprise associée' });
        }

        // Vérifier si une conversation existe déjà (utiliser l'ID utilisateur)
        const [existing] = await db.execute(`
            SELECT id FROM conversations 
            WHERE acheteur_id = ? AND fournisseur_id = ?
        `, [req.user.id, fournisseur_user_id]);

        console.log('Conversation existante trouvée:', existing);

        if (existing.length > 0) {
            console.log('✅ Conversation existante retournée:', existing[0].id);
            return res.json({
                message: 'Conversation existante',
                conversation_id: existing[0].id
            });
        }

        // Créer la nouvelle conversation (utiliser l'ID utilisateur pour fournisseur_id)
        console.log('Création nouvelle conversation...');
        const [result] = await db.execute(`
            INSERT INTO conversations (acheteur_id, fournisseur_id, sujet)
            VALUES (?, ?, ?)
        `, [req.user.id, fournisseur_user_id, type || 'Contact fournisseur']);

        console.log('✅ Conversation créée avec succès, ID:', result.insertId);

        res.status(201).json({
            message: 'Conversation créée avec succès',
            conversation_id: result.insertId
        });

    } catch (error) {
        console.error('❌ ERREUR CRÉATION CONVERSATION:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ 
            error: 'Erreur lors de la création de la conversation',
            details: error.message 
        });
    }
});

// Lister les conversations
router.get('/', authenticateToken, async (req, res) => {
    try {
        let query, params;

        if (req.user.role_id === 1) { // Acheteur
            query = `
                SELECT c.*, e.nom_entreprise, u.nom as fournisseur_nom,
                       (SELECT contenu FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as dernier_message,
                       (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as derniere_activite
                FROM conversations c
                JOIN utilisateurs u ON c.fournisseur_id = u.id
                JOIN entreprises e ON u.id = e.utilisateur_id
                WHERE c.acheteur_id = ?
                ORDER BY derniere_activite DESC
            `;
            params = [req.user.id];
        } else if (req.user.role_id === 2) { // Fournisseur
            query = `
                SELECT c.*, u.nom as acheteur_nom, u.prenom as acheteur_prenom,
                       (SELECT contenu FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as dernier_message,
                       (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as derniere_activite
                FROM conversations c
                JOIN utilisateurs u ON c.acheteur_id = u.id
                WHERE c.fournisseur_id = ?
                ORDER BY derniere_activite DESC
            `;
            params = [req.user.id];
        }

        const [conversations] = await db.execute(query, params);
        res.json({ conversations });

    } catch (error) {
        console.error('Erreur récupération conversations:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des conversations' });
    }
});

// Récupérer les messages d'une conversation avec pagination
router.get('/:id/messages', authenticateToken, async (req, res) => {
    try {
        const conversationId = parseInt(req.params.id);
        
        // Paramètres de pagination
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100); // Max 100 messages par page
        const offset = (page - 1) * limit;
        
        // Paramètre pour marquer comme lu (par défaut true)
        const markAsRead = req.query.markAsRead !== 'false';

        console.log('📨 Récupération messages conversation:', {
            conversationId,
            userId: req.user.id,
            userRole: req.user.role_id,
            page,
            limit,
            markAsRead
        });

        // Vérifier que l'utilisateur fait partie de la conversation et récupérer les métadonnées
        let conversationQuery, conversationParams;

        if (req.user.role_id === 1) { // Acheteur
            conversationQuery = `
                SELECT c.*, 
                       e_fournisseur.nom_entreprise as fournisseur_nom_entreprise,
                       u_fournisseur.nom as fournisseur_nom,
                       u_fournisseur.prenom as fournisseur_prenom,
                       u_fournisseur.email as fournisseur_email,
                       p.nom as produit_nom
                FROM conversations c
                LEFT JOIN utilisateurs u_fournisseur ON c.fournisseur_id = u_fournisseur.id
                LEFT JOIN entreprises e_fournisseur ON u_fournisseur.id = e_fournisseur.utilisateur_id
                LEFT JOIN produits p ON c.produit_id = p.id
                WHERE c.id = ? AND c.acheteur_id = ?
            `;
            conversationParams = [conversationId, req.user.id];
        } else if (req.user.role_id === 2) { // Fournisseur
            conversationQuery = `
                SELECT c.*, 
                       u_acheteur.nom as acheteur_nom,
                       u_acheteur.prenom as acheteur_prenom,
                       u_acheteur.email as acheteur_email,
                       p.nom as produit_nom
                FROM conversations c
                LEFT JOIN utilisateurs u_acheteur ON c.acheteur_id = u_acheteur.id
                LEFT JOIN produits p ON c.produit_id = p.id
                WHERE c.id = ? AND c.fournisseur_id = ?
            `;
            conversationParams = [conversationId, req.user.id];
        } else {
            return res.status(403).json({ 
                error: 'Type d\'utilisateur non supporté pour cette opération' 
            });
        }

        const [conversationResult] = await db.execute(conversationQuery, conversationParams);
        
        if (conversationResult.length === 0) {
            return res.status(403).json({ error: 'Accès non autorisé à cette conversation' });
        }

        const conversation = conversationResult[0];

        // Récupérer les messages avec pagination
        const messagesQuery = `
            SELECT 
                m.id,
                m.conversation_id,
                m.expediteur_id,
                m.contenu,
                m.type,
                m.metadata,
                m.lu,
                m.created_at,
                m.updated_at,
                u.nom as expediteur_nom,
                u.prenom as expediteur_prenom,
                u.email as expediteur_email,
                CASE 
                    WHEN m.expediteur_id = ? THEN 'me'
                    WHEN m.expediteur_id = c.acheteur_id THEN 'buyer'
                    ELSE 'supplier'
                END as expediteur_type
            FROM messages m
            INNER JOIN utilisateurs u ON m.expediteur_id = u.id
            INNER JOIN conversations c ON m.conversation_id = c.id
            WHERE m.conversation_id = ?
            ORDER BY m.created_at DESC
            LIMIT ? OFFSET ?
        `;

        const [messages] = await db.execute(messagesQuery, [
            req.user.id, 
            conversationId, 
            limit, 
            offset
        ]);

        // Inverser l'ordre pour avoir les plus anciens en premier (ordre chronologique)
        const orderedMessages = messages.reverse();

        // Compter le total des messages pour la pagination
        const [countResult] = await db.execute(
            'SELECT COUNT(*) as total FROM messages WHERE conversation_id = ?',
            [conversationId]
        );
        const totalMessages = countResult[0].total;

        // Calculer les métadonnées de pagination
        const totalPages = Math.ceil(totalMessages / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        // Marquer les messages comme lus si demandé
        if (markAsRead && orderedMessages.length > 0) {
            const messageIds = orderedMessages
                .filter(msg => msg.expediteur_id !== req.user.id && !msg.lu)
                .map(msg => msg.id);
            
            if (messageIds.length > 0) {
                await db.execute(
                    `UPDATE messages SET lu = 1 WHERE id IN (${messageIds.map(() => '?').join(',')})`,
                    messageIds
                );
                
                // Mettre à jour les messages dans la réponse
                orderedMessages.forEach(msg => {
                    if (messageIds.includes(msg.id)) {
                        msg.lu = 1;
                    }
                });
            }
        }

        // Calculer les statistiques des messages non lus
        const [unreadStats] = await db.execute(`
            SELECT 
                COUNT(*) as total_unread,
                SUM(CASE WHEN expediteur_id != ? THEN 1 ELSE 0 END) as unread_from_others
            FROM messages 
            WHERE conversation_id = ? AND lu = 0
        `, [req.user.id, conversationId]);

        console.log('✅ Messages récupérés:', {
            conversationId,
            messagesCount: orderedMessages.length,
            totalMessages,
            page,
            totalPages,
            unreadCount: unreadStats[0].unread_from_others
        });

        res.json({
            conversation,
            messages: orderedMessages,
            pagination: {
                page,
                limit,
                total: totalMessages,
                pages: totalPages,
                hasNext: hasNextPage,
                hasPrev: hasPrevPage
            },
            stats: {
                totalMessages,
                unreadMessages: unreadStats[0].unread_from_others,
                messagesMarkedAsRead: markAsRead ? (orderedMessages.filter(msg => 
                    msg.expediteur_id !== req.user.id && msg.lu
                ).length) : 0
            }
        });

    } catch (error) {
        console.error('Erreur récupération messages:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération des messages',
            details: error.message 
        });
    }
});

// Marquer les messages comme lus
router.patch('/:id/messages/read', authenticateToken, [
    body('messageIds').optional().isArray(),
    body('markAll').optional().isBoolean()
], async (req, res) => {
    try {
        const conversationId = parseInt(req.params.id);
        const { messageIds, markAll = false } = req.body;

        console.log('📖 Marquage messages comme lus:', {
            conversationId,
            userId: req.user.id,
            messageIds,
            markAll
        });

        // Vérifier l'accès à la conversation
        let checkQuery, checkParams;

        if (req.user.role_id === 1) { // Acheteur
            checkQuery = 'SELECT id FROM conversations WHERE id = ? AND acheteur_id = ?';
            checkParams = [conversationId, req.user.id];
        } else if (req.user.role_id === 2) { // Fournisseur
            checkQuery = `
                SELECT c.id FROM conversations c
                INNER JOIN entreprises e ON c.fournisseur_id = e.id
                WHERE c.id = ? AND e.utilisateur_id = ?
            `;
            checkParams = [conversationId, req.user.id];
        } else {
            return res.status(403).json({ 
                error: 'Type d\'utilisateur non supporté pour cette opération' 
            });
        }

        const [access] = await db.execute(checkQuery, checkParams);
        if (access.length === 0) {
            return res.status(403).json({ error: 'Accès non autorisé à cette conversation' });
        }

        let updateQuery, updateParams;
        let affectedMessages = 0;

        if (markAll) {
            // Marquer tous les messages non lus de la conversation (sauf ceux de l'utilisateur)
            updateQuery = `
                UPDATE messages 
                SET lu = 1, updated_at = NOW() 
                WHERE conversation_id = ? AND expediteur_id != ? AND lu = 0
            `;
            updateParams = [conversationId, req.user.id];
        } else if (messageIds && messageIds.length > 0) {
            // Marquer des messages spécifiques
            // Vérifier que les messages appartiennent à la conversation et ne sont pas de l'utilisateur
            const placeholders = messageIds.map(() => '?').join(',');
            updateQuery = `
                UPDATE messages 
                SET lu = 1, updated_at = NOW() 
                WHERE conversation_id = ? AND expediteur_id != ? AND id IN (${placeholders})
            `;
            updateParams = [conversationId, req.user.id, ...messageIds];
        } else {
            return res.status(400).json({ 
                error: 'Vous devez spécifier des messageIds ou markAll=true' 
            });
        }

        const [result] = await db.execute(updateQuery, updateParams);
        affectedMessages = result.affectedRows;

        // Récupérer les statistiques mises à jour
        const [unreadStats] = await db.execute(`
            SELECT COUNT(*) as remaining_unread
            FROM messages 
            WHERE conversation_id = ? AND expediteur_id != ? AND lu = 0
        `, [conversationId, req.user.id]);

        console.log('✅ Messages marqués comme lus:', {
            conversationId,
            affectedMessages,
            remainingUnread: unreadStats[0].remaining_unread
        });

        res.json({
            success: true,
            messagesMarked: affectedMessages,
            remainingUnread: unreadStats[0].remaining_unread
        });

    } catch (error) {
        console.error('Erreur marquage messages comme lus:', error);
        res.status(500).json({ 
            error: 'Erreur lors du marquage des messages comme lus',
            details: error.message 
        });
    }
});

// Envoyer un message
router.post('/:id/messages', authenticateToken, [
    body('contenu').notEmpty().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Vérifier l'accès à la conversation
        let checkQuery, checkParams;

        if (req.user.role_id === 1) {
            checkQuery = 'SELECT id FROM conversations WHERE id = ? AND acheteur_id = ?';
            checkParams = [req.params.id, req.user.id];
        } else if (req.user.role_id === 2) {
            checkQuery = 'SELECT id FROM conversations WHERE id = ? AND fournisseur_id = ?';
            checkParams = [req.params.id, req.user.id];
        }

        const [access] = await db.execute(checkQuery, checkParams);
        if (access.length === 0) {
            return res.status(403).json({ error: 'Accès non autorisé à cette conversation' });
        }

        const { contenu } = req.body;

        const [result] = await db.execute(`
            INSERT INTO messages (conversation_id, expediteur_id, contenu)
            VALUES (?, ?, ?)
        `, [req.params.id, req.user.id, contenu]);

        // Mettre à jour la conversation
        await db.execute(
            'UPDATE conversations SET updated_at = NOW() WHERE id = ?',
            [req.params.id]
        );

        // Créer une notification pour le destinataire
        try {
            // Récupérer les informations de la conversation pour identifier le destinataire
            const [conversation] = await db.execute(`
                SELECT c.*, u.nom as expediteur_nom, u.prenom as expediteur_prenom
                FROM conversations c
                JOIN utilisateurs u ON u.id = ?
                WHERE c.id = ?
            `, [req.user.id, req.params.id]);

            if (conversation.length > 0) {
                const conv = conversation[0];
                let destinataireId;
                let titreNotification;
                
                if (req.user.role_id === 1) { // Acheteur envoie à fournisseur
                    // Récupérer l'ID utilisateur du fournisseur
                    const [fournisseur] = await db.execute(`
                        SELECT e.utilisateur_id FROM entreprises e WHERE e.id = ?
                    `, [conv.fournisseur_id]);
                    
                    if (fournisseur.length > 0) {
                        destinataireId = fournisseur[0].utilisateur_id;
                        titreNotification = `Nouveau message de ${conv.expediteur_nom} ${conv.expediteur_prenom || ''}`;
                    }
                } else if (req.user.role_id === 2) { // Fournisseur envoie à acheteur
                    destinataireId = conv.acheteur_id;
                    titreNotification = `Nouveau message de ${conv.expediteur_nom} ${conv.expediteur_prenom || ''}`;
                }

                if (destinataireId) {
                    await userNotificationService.createNotification({
                        userId: destinataireId,
                        type: 'message',
                        category: 'conversation',
                        title: titreNotification,
                        message: contenu.length > 100 ? contenu.substring(0, 100) + '...' : contenu,
                        relatedConversationId: conv.id
                    });
                }
            }
        } catch (notifError) {
            console.error('Erreur création notification:', notifError);
            // Ne pas faire échouer l'envoi du message si la notification échoue
        }

        res.status(201).json({
            message: 'Message envoyé avec succès',
            messageId: result.insertId
        });

    } catch (error) {
        console.error('Erreur envoi message:', error);
        res.status(500).json({ error: 'Erreur lors de l\'envoi du message' });
    }
});

// Route pour les demandes de contact (utilisateurs non connectés ou fournisseurs)
router.post('/contact-request', [
    body('supplier_id').isInt({ min: 1 }),
    body('message').optional().trim(),
    body('contact_email').optional().isEmail(),
    body('contact_name').optional().trim()
], async (req, res) => {
    try {
        console.log('=== DEMANDE DE CONTACT ===');
        console.log('Données reçues:', req.body);
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('❌ ERREUR: Validation échouée:', errors.array());
            return res.status(400).json({ errors: errors.array() });
        }

        const { supplier_id, message, contact_email, contact_name } = req.body;

        // Vérifier que le fournisseur existe
        const [supplier] = await db.execute(`
            SELECT e.id, e.nom_entreprise, e.utilisateur_id, u.email as supplier_email
            FROM entreprises e
            JOIN utilisateurs u ON e.utilisateur_id = u.id
            WHERE e.id = ?
        `, [supplier_id]);

        if (supplier.length === 0) {
            console.log('❌ ERREUR: Fournisseur non trouvé pour ID:', supplier_id);
            return res.status(404).json({ error: 'Fournisseur non trouvé' });
        }

        console.log('✅ Fournisseur trouvé:', supplier[0]);

        // Pour l'instant, on simule la création d'une demande de contact
        // Dans un vrai système, on pourrait :
        // 1. Envoyer un email au fournisseur
        // 2. Créer une notification
        // 3. Stocker la demande dans une table dédiée

        res.status(200).json({
            message: 'Demande de contact enregistrée avec succès',
            supplier_name: supplier[0].nom_entreprise,
            next_steps: 'Le fournisseur sera notifié de votre demande de contact'
        });

    } catch (error) {
        console.error('❌ ERREUR DEMANDE DE CONTACT:', error);
        res.status(500).json({ 
            error: 'Erreur lors de l\'enregistrement de la demande de contact',
            details: error.message 
        });
    }
});

module.exports = router;