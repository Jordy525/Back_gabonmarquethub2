const { body, param, query, validationResult } = require('express-validator');
const DOMPurify = require('isomorphic-dompurify');
const rateLimit = require('express-rate-limit');

// Middleware pour gérer les erreurs de validation
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Erreurs de validation',
      errors: errors.array()
    });
  }
  next();
};

// Sanitization du contenu des messages
const sanitizeMessageContent = (req, res, next) => {
  if (req.body.contenu) {
    // Nettoyer le contenu pour prévenir les attaques XSS
    req.body.contenu = DOMPurify.sanitize(req.body.contenu, {
      ALLOWED_TAGS: [], // Pas de HTML autorisé
      ALLOWED_ATTR: []
    });
    
    // Limiter la longueur du contenu
    if (req.body.contenu.length > 10000) {
      return res.status(400).json({
        message: 'Le contenu du message est trop long (maximum 10000 caractères)'
      });
    }
  }
  
  if (req.body.sujet) {
    req.body.sujet = DOMPurify.sanitize(req.body.sujet, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    });
  }
  
  next();
};

// Rate limiting pour les messages
const messageRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 messages par minute
  message: {
    message: 'Trop de messages envoyés. Veuillez patienter avant de renvoyer un message.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit par utilisateur
    return req.user ? req.user.id.toString() : req.ip;
  }
});

// Rate limiting pour la création de conversations
const conversationRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 conversations par 5 minutes
  message: {
    message: 'Trop de conversations créées. Veuillez patienter avant de créer une nouvelle conversation.',
    retryAfter: 300
  },
  keyGenerator: (req) => {
    return req.user ? req.user.id.toString() : req.ip;
  }
});

// Validations pour les conversations
const validateConversationCreation = [
  body('acheteur_id')
    .isInt({ min: 1 })
    .withMessage('ID acheteur invalide'),
  body('fournisseur_id')
    .isInt({ min: 1 })
    .withMessage('ID fournisseur invalide'),
  body('produit_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID produit invalide'),
  body('sujet')
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage('Le sujet doit contenir entre 1 et 255 caractères')
    .trim(),
  // Validation personnalisée pour éviter l'auto-conversation
  body().custom((value, { req }) => {
    if (req.body.acheteur_id === req.body.fournisseur_id) {
      throw new Error('Un utilisateur ne peut pas créer une conversation avec lui-même');
    }
    return true;
  }),
  sanitizeMessageContent,
  handleValidationErrors
];

const validateConversationAccess = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID de conversation invalide'),
  handleValidationErrors
];

const validateUserConversations = [
  param('userId')
    .isInt({ min: 1 })
    .withMessage('ID utilisateur invalide'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Numéro de page invalide'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limite invalide (1-100)'),
  handleValidationErrors
];

const validateConversationStatusUpdate = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID de conversation invalide'),
  body('statut')
    .isIn(['ouverte', 'fermee', 'archivee'])
    .withMessage('Statut invalide (ouverte, fermee, archivee)'),
  handleValidationErrors
];

// Validations pour les messages
const validateMessageCreation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID de conversation invalide'),
  body('contenu')
    .isLength({ min: 1, max: 10000 })
    .withMessage('Le contenu doit contenir entre 1 et 10000 caractères')
    .trim(),
  body('type_message')
    .optional()
    .isIn(['text', 'image', 'file', 'system'])
    .withMessage('Type de message invalide'),
  body('fichier_url')
    .optional()
    .isURL()
    .withMessage('URL de fichier invalide'),
  body('metadata')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          JSON.parse(value);
        } catch (e) {
          throw new Error('Métadonnées JSON invalides');
        }
      }
      return true;
    }),
  sanitizeMessageContent,
  handleValidationErrors
];

const validateMessageAccess = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID de message invalide'),
  handleValidationErrors
];

const validateMessageUpdate = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID de message invalide'),
  body('contenu')
    .isLength({ min: 1, max: 10000 })
    .withMessage('Le contenu doit contenir entre 1 et 10000 caractères')
    .trim(),
  sanitizeMessageContent,
  handleValidationErrors
];

const validateMessagesRetrieval = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID de conversation invalide'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Numéro de page invalide'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limite invalide (1-100)'),
  handleValidationErrors
];

const validateMarkAsRead = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID de conversation invalide'),
  body('message_ids')
    .optional()
    .isArray()
    .withMessage('message_ids doit être un tableau')
    .custom((value) => {
      if (value && value.some(id => !Number.isInteger(id) || id < 1)) {
        throw new Error('Tous les IDs de messages doivent être des entiers positifs');
      }
      return true;
    }),
  handleValidationErrors
];

// Middleware de sécurité pour vérifier l'accès aux ressources
const checkConversationParticipant = async (req, res, next) => {
  try {
    const conversationId = req.params.id;
    const userId = req.user.id;
    
    const db = require('../config/database');
    const [rows] = await db.execute(
      'SELECT acheteur_id, fournisseur_id FROM conversations WHERE id = ?',
      [conversationId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Conversation non trouvée' });
    }
    
    const conversation = rows[0];
    if (conversation.acheteur_id !== userId && conversation.fournisseur_id !== userId) {
      return res.status(403).json({ 
        message: 'Accès non autorisé à cette conversation' 
      });
    }
    
    req.conversation = conversation;
    next();
  } catch (error) {
    console.error('Erreur lors de la vérification des participants:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

const checkMessageOwnership = async (req, res, next) => {
  try {
    const messageId = req.params.id;
    const userId = req.user.id;
    
    const db = require('../config/database');
    const [rows] = await db.execute(
      `SELECT m.expediteur_id, m.conversation_id, c.acheteur_id, c.fournisseur_id 
       FROM messages m 
       JOIN conversations c ON m.conversation_id = c.id 
       WHERE m.id = ?`,
      [messageId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Message non trouvé' });
    }
    
    const message = rows[0];
    
    // Pour la lecture, vérifier que l'utilisateur est participant
    if (req.method === 'GET') {
      if (message.acheteur_id !== userId && message.fournisseur_id !== userId) {
        return res.status(403).json({ 
          message: 'Accès non autorisé à ce message' 
        });
      }
    } else {
      // Pour la modification/suppression, vérifier que l'utilisateur est l'expéditeur
      if (message.expediteur_id !== userId) {
        return res.status(403).json({ 
          message: 'Vous ne pouvez modifier que vos propres messages' 
        });
      }
    }
    
    req.message = message;
    next();
  } catch (error) {
    console.error('Erreur lors de la vérification du propriétaire du message:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

const checkUserAccess = (req, res, next) => {
  const requestedUserId = parseInt(req.params.userId);
  const currentUserId = req.user.id;
  
  if (requestedUserId !== currentUserId) {
    return res.status(403).json({ 
      message: 'Vous ne pouvez accéder qu\'à vos propres conversations' 
    });
  }
  
  next();
};

// Validation des données Socket.IO
const validateSocketData = {
  joinConversation: (data) => {
    if (!data || typeof data.conversationId !== 'number' || data.conversationId < 1) {
      throw new Error('ID de conversation invalide');
    }
    return true;
  },
  
  sendMessage: (data) => {
    if (!data || typeof data.conversationId !== 'number' || data.conversationId < 1) {
      throw new Error('ID de conversation invalide');
    }
    if (!data.contenu || typeof data.contenu !== 'string' || data.contenu.trim().length === 0) {
      throw new Error('Contenu du message requis');
    }
    if (data.contenu.length > 10000) {
      throw new Error('Contenu du message trop long');
    }
    return true;
  },
  
  typing: (data) => {
    if (!data || typeof data.conversationId !== 'number' || data.conversationId < 1) {
      throw new Error('ID de conversation invalide');
    }
    if (typeof data.isTyping !== 'boolean') {
      throw new Error('État de frappe invalide');
    }
    return true;
  }
};

module.exports = {
  handleValidationErrors,
  sanitizeMessageContent,
  messageRateLimit,
  conversationRateLimit,
  validateConversationCreation,
  validateConversationAccess,
  validateUserConversations,
  validateConversationStatusUpdate,
  validateMessageCreation,
  validateMessageAccess,
  validateMessageUpdate,
  validateMessagesRetrieval,
  validateMarkAsRead,
  checkConversationParticipant,
  checkMessageOwnership,
  checkUserAccess,
  validateSocketData
};