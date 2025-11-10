const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Middleware d'authentification pour Socket.IO
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return next(new Error('Token d\'authentification requis'));
    }
    
    // Vérifier le token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Vérifier que l'utilisateur existe toujours en base
    const [userRows] = await db.execute(
      'SELECT id, nom, prenom, email, role_id FROM utilisateurs WHERE id = ?',
      [decoded.id]
    );
    
    if (userRows.length === 0) {
      return next(new Error('Utilisateur non trouvé'));
    }
    
    const user = userRows[0];
    
    // Vérifier que le rôle correspond
    if (user.role_id !== decoded.role_id) {
      return next(new Error('Rôle utilisateur modifié, veuillez vous reconnecter'));
    }
    
    // Attacher les informations utilisateur au socket
    socket.user = user;
    socket.userId = user.id;
    socket.userRole = user.role_id;
    
    next();
  } catch (error) {
    console.error('Erreur d\'authentification Socket.IO:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return next(new Error('Token invalide'));
    } else if (error.name === 'TokenExpiredError') {
      return next(new Error('Token expiré'));
    } else {
      return next(new Error('Erreur d\'authentification'));
    }
  }
};

// Middleware pour vérifier l'accès à une conversation via Socket.IO
const checkSocketConversationAccess = async (socket, conversationId) => {
  try {
    const userId = socket.userId;
    
    const [rows] = await db.execute(
      'SELECT acheteur_id, fournisseur_id, statut FROM conversations WHERE id = ?',
      [conversationId]
    );
    
    if (rows.length === 0) {
      throw new Error('Conversation non trouvée');
    }
    
    const conversation = rows[0];
    
    // Vérifier que l'utilisateur est participant
    if (conversation.acheteur_id !== userId && conversation.fournisseur_id !== userId) {
      throw new Error('Accès non autorisé à cette conversation');
    }
    
    // Vérifier que la conversation n'est pas fermée pour l'envoi de messages
    if (conversation.statut === 'fermee') {
      throw new Error('Cette conversation est fermée');
    }
    
    return conversation;
  } catch (error) {
    console.error('Erreur de vérification d\'accès conversation Socket.IO:', error);
    throw error;
  }
};

// Rate limiting pour Socket.IO
class SocketRateLimiter {
  constructor() {
    this.userLimits = new Map();
    this.windowMs = 60 * 1000; // 1 minute
    this.maxRequests = 60; // 60 actions par minute
    
    // Nettoyer les anciens enregistrements toutes les minutes
    setInterval(() => {
      this.cleanup();
    }, this.windowMs);
  }
  
  isAllowed(userId, action = 'default') {
    const now = Date.now();
    const key = `${userId}:${action}`;
    
    if (!this.userLimits.has(key)) {
      this.userLimits.set(key, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return true;
    }
    
    const limit = this.userLimits.get(key);
    
    if (now > limit.resetTime) {
      // Réinitialiser le compteur
      limit.count = 1;
      limit.resetTime = now + this.windowMs;
      return true;
    }
    
    if (limit.count >= this.maxRequests) {
      return false;
    }
    
    limit.count++;
    return true;
  }
  
  cleanup() {
    const now = Date.now();
    for (const [key, limit] of this.userLimits.entries()) {
      if (now > limit.resetTime) {
        this.userLimits.delete(key);
      }
    }
  }
}

const socketRateLimiter = new SocketRateLimiter();

// Middleware pour appliquer le rate limiting
const applySocketRateLimit = (socket, action = 'default') => {
  const userId = socket.userId;
  
  if (!socketRateLimiter.isAllowed(userId, action)) {
    throw new Error(`Trop de requêtes ${action}. Veuillez patienter.`);
  }
  
  return true;
};

// Gestionnaire d'erreurs Socket.IO
const handleSocketError = (socket, error, eventName) => {
  console.error(`Erreur Socket.IO [${eventName}]:`, error);
  
  socket.emit('error', {
    event: eventName,
    message: error.message || 'Une erreur est survenue',
    timestamp: new Date().toISOString()
  });
};

// Validation et sanitization des données Socket.IO
const sanitizeSocketData = (data) => {
  if (typeof data === 'object' && data !== null) {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        // Nettoyer les chaînes de caractères
        sanitized[key] = value.trim().substring(0, 10000);
      } else if (typeof value === 'number' && isFinite(value)) {
        sanitized[key] = value;
      } else if (typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (Array.isArray(value)) {
        sanitized[key] = value.slice(0, 100); // Limiter les tableaux
      }
    }
    
    return sanitized;
  }
  
  return data;
};

// Logging des activités Socket.IO pour la sécurité
const logSocketActivity = (socket, eventName, data = {}) => {
  const logData = {
    timestamp: new Date().toISOString(),
    userId: socket.userId,
    userRole: socket.userRole,
    socketId: socket.id,
    event: eventName,
    ip: socket.handshake.address,
    userAgent: socket.handshake.headers['user-agent'],
    data: typeof data === 'object' ? JSON.stringify(data) : data
  };
  
  // En production, vous pourriez vouloir envoyer ceci à un service de logging
  console.log('Socket Activity:', logData);
};

module.exports = {
  authenticateSocket,
  checkSocketConversationAccess,
  applySocketRateLimit,
  handleSocketError,
  sanitizeSocketData,
  logSocketActivity,
  SocketRateLimiter
};