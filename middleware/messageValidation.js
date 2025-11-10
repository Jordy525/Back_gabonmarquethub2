const { body, param, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const DOMPurify = require('isomorphic-dompurify');
const validator = require('validator');
const path = require('path'); // 🔥 manquait !

/**
 * Middleware de validation et sécurité pour les routes de messagerie
 */

// Rate limiting pour les messages (plus permissif en développement)
const messageRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: process.env.NODE_ENV === 'development' ? 100 : 30, // 100 en dev, 30 en prod
    keyGenerator: (req) => {
        return req.user ? `messages_${req.user.id}` : req.ip;
    },
    message: {
        error: 'Trop de messages envoyés. Veuillez patienter avant d\'envoyer un nouveau message.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip complètement en développement si DISABLE_RATE_LIMIT est défini
        return process.env.NODE_ENV === 'development' && process.env.DISABLE_RATE_LIMIT === 'true';
    }
});

// Rate limiting pour les conversations (plus permissif en développement)
const conversationRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 heure
    max: process.env.NODE_ENV === 'development' ? 50 : 10, // 50 en dev, 10 en prod
    keyGenerator: (req) => req.user ? `conversations_${req.user.id}` : req.ip,
    message: {
        error: 'Trop de nouvelles conversations créées. Veuillez patienter.',
        code: 'CONVERSATION_RATE_LIMIT_EXCEEDED',
        retryAfter: 3600
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip complètement en développement si DISABLE_RATE_LIMIT est défini
        return process.env.NODE_ENV === 'development' && process.env.DISABLE_RATE_LIMIT === 'true';
    }
});

/**
 * Sanitize le contenu des messages
 */
function sanitizeMessageContent(content) {
    if (!content || typeof content !== 'string') return '';

    let sanitized = DOMPurify.sanitize(content, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true
    });

    sanitized = validator.escape(sanitized);

    if (sanitized.length > 5000) {
        sanitized = sanitized.substring(0, 5000);
    }

    return sanitized.trim();
}

/**
 * Validation pour l'envoi de messages
 */
const validateSendMessage = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('ID de conversation invalide'),

    body('contenu')
        .notEmpty().withMessage('Le contenu du message est requis')
        .isLength({ min: 1, max: 5000 }).withMessage('1 à 5000 caractères max')
        .custom((value) => {
            if (!value || value.trim().length === 0) {
                throw new Error('Le message ne peut pas être vide');
            }
            return true;
        }),

    body('type_message')
        .optional()
        .isIn(['text', 'image', 'file', 'audio'])
        .withMessage('Type de message invalide'),

    body('metadata')
        .optional()
        .custom((value) => {
            if (value) {
                try {
                    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
                    if (JSON.stringify(parsed).length > 1000) {
                        throw new Error('Métadonnées trop volumineuses');
                    }
                } catch (e) {
                    throw new Error('Métadonnées JSON invalides');
                }
            }
            return true;
        }),

    // Sanitize
    (req, res, next) => {
        if (req.body.contenu) {
            req.body.contenu = sanitizeMessageContent(req.body.contenu);
        }
        next();
    }
];

/**
 * Validation pour la création de conversations
 */
const validateCreateConversation = [
    body('acheteur_id')
        .isInt({ min: 1 })
        .withMessage('ID acheteur invalide'),

    body('fournisseur_id')
        .isInt({ min: 1 })
        .withMessage('ID fournisseur invalide')
        .custom((value, { req }) => {
            if (value === req.body.acheteur_id) {
                throw new Error('Impossible de créer une conversation avec soi-même');
            }
            return true;
        }),

    body('produit_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('ID produit invalide'),

    body('sujet')
        .optional()
        .isLength({ max: 200 })
        .withMessage('Le sujet ne peut pas dépasser 200 caractères')
        .customSanitizer((value) => sanitizeMessageContent(value)) // 🔥 correction
];

/**
 * Vérifier accès conversation
 */
const validateConversationAccess = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                error: 'Utilisateur non authentifié',
                code: 'UNAUTHORIZED'
            });
        }

        const conversationId = req.params.id;
        const userId = req.user.id;

        const [rows] = await req.app.get('db').execute(
            `SELECT c.*, 
                    CASE 
                        WHEN c.acheteur_id = ? THEN 'acheteur'
                        WHEN c.fournisseur_id = ? THEN 'fournisseur'
                        ELSE 'none'
                    END as user_role_in_conversation
             FROM conversations c 
             WHERE c.id = ? AND (c.acheteur_id = ? OR c.fournisseur_id = ?)`,
            [userId, userId, conversationId, userId, userId]
        );

        if (rows.length === 0) {
            return res.status(403).json({
                error: 'Accès non autorisé à cette conversation',
                code: 'CONVERSATION_ACCESS_DENIED'
            });
        }

        req.conversation = rows[0];
        req.userRoleInConversation = rows[0].user_role_in_conversation;

        next();
    } catch (error) {
        console.error('Erreur accès conversation:', error);
        res.status(500).json({
            error: 'Erreur vérification des permissions',
            code: 'ACCESS_CHECK_ERROR'
        });
    }
};

/**
 * Logger sécurisé
 */
const securityLogger = (action) => {
    return (req, res, next) => {
        console.log('🔒 Action sécurisée:', {
            action,
            userId: req.user?.id || null,
            userRole: req.user?.role_id || null,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            conversationId: req.params?.id || null,
            timestamp: new Date().toISOString()
        });
        next();
    };
};

/**
 * Validation pour les paramètres de conversation
 */
const validateConversationParams = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('ID de conversation invalide')
];

/**
 * Validation pour la pagination
 */
const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Numéro de page invalide'),
    
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limite invalide (1-100)')
];

/**
 * Validation pour les filtres de conversation
 */
const validateConversationFilters = [
    query('statut')
        .optional()
        .isIn(['ouverte', 'fermee', 'archivee'])
        .withMessage('Statut invalide'),
    
    query('priorite')
        .optional()
        .isIn(['normale', 'haute', 'urgente'])
        .withMessage('Priorité invalide'),
    
    query('archivee')
        .optional()
        .isBoolean()
        .withMessage('Valeur archivée invalide')
];

/**
 * Validation pour marquer comme lu
 */
const validateMarkAsRead = [
    body('message_ids')
        .optional()
        .isArray()
        .withMessage('message_ids doit être un tableau'),
    
    body('message_ids.*')
        .optional()
        .isInt({ min: 1 })
        .withMessage('ID de message invalide')
];

/**
 * Validation pour la recherche
 */
const validateSearch = [
    query('q')
        .notEmpty()
        .isLength({ min: 2, max: 100 })
        .withMessage('Terme de recherche requis (2-100 caractères)'),
    
    query('type')
        .optional()
        .isIn(['conversations', 'messages', 'all'])
        .withMessage('Type de recherche invalide')
];

/**
 * Validation pour l'upload de fichiers
 */
const validateFileUpload = (req, res, next) => {
    if (req.file) {
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf', 'text/plain',
            'application/msword', 
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        
        if (!allowedTypes.includes(req.file.mimetype)) {
            return res.status(400).json({
                error: 'Type de fichier non autorisé',
                code: 'INVALID_FILE_TYPE'
            });
        }
        
        if (req.file.size > 10 * 1024 * 1024) { // 10MB
            return res.status(400).json({
                error: 'Fichier trop volumineux (max 10MB)',
                code: 'FILE_TOO_LARGE'
            });
        }
    }
    next();
};

/**
 * Gestionnaire d'erreurs de validation
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Données invalides',
            code: 'VALIDATION_ERROR',
            details: errors.array()
        });
    }
    next();
};

module.exports = {
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
};
