const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Configuration CORS sécurisée
const corsOptions = {
  origin: function (origin, callback) {
    // Liste des domaines autorisés
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'http://localhost:8080',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:8080',
      'https://front-gabonmarkethub1.vercel.app',
      'https://gabon-trade-hub.vercel.app',
      'https://your-production-domain.com'
    ];
    
    // Autoriser les URLs de preview Vercel (pattern: *.vercel.app)
    const isVercelPreview = origin && origin.includes('.vercel.app');
    
    // ✅ Permettre les requêtes sans origin (requêtes preflight, mobile apps, Postman, OAuth, etc.)
    if (!origin) {
      console.log('🔓 CORS: Requête sans origin autorisée (preflight/mobile/API/OAuth)');
      return callback(null, true);
    }
    
    // ✅ Vérifier si l'origin est dans la liste autorisée
    if (allowedOrigins.includes(origin)) {
      console.log('🔓 CORS: Origin autorisé:', origin);
      callback(null, true);
    } else if (isVercelPreview) {
      console.log('🔓 CORS: URL de preview Vercel autorisée:', origin);
      callback(null, true);
    } else {
      console.warn('🚫 CORS: Origin non autorisé:', origin);
      // ⚠️ En développement, on peut être plus permissif
      if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
        console.log('🔧 CORS: Mode développement - Origin autorisé temporairement');
        callback(null, true);
      } else {
        callback(new Error('Non autorisé par la politique CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining'],
  optionsSuccessStatus: 200, // ✅ Pour les anciens navigateurs
  maxAge: 86400 // Cache preflight pour 24h (améliore les performances OAuth)
};

// Rate limiting global (plus permissif en développement)
const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 5000 : 1000, // 5000 en dev, 1000 en prod
  message: {
    error: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting pour les requêtes de santé et en dev si désactivé
    const healthPaths = ['/health', '/api/health'];
    const isHealthPath = healthPaths.includes(req.path);
    const isDevDisabled = process.env.NODE_ENV === 'development' && process.env.DISABLE_RATE_LIMIT === 'true';
    
    return isHealthPath || isDevDisabled;
  }
});

// Rate limiting strict pour l'authentification (plus permissif en développement)
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 100 : 20, // 100 en dev, 20 en prod
  message: {
    error: 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Ne compter que les échecs
  skip: (req) => {
    // Skip complètement en développement si DISABLE_RATE_LIMIT est défini
    return process.env.NODE_ENV === 'development' && process.env.DISABLE_RATE_LIMIT === 'true';
  }
});

// Configuration Helmet pour la sécurité des headers
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false, // Désactivé pour Socket.IO
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Middleware de logging de sécurité
const securityLogger = (eventType) => {
  return (req, res, next) => {
    const logData = {
      timestamp: new Date().toISOString(),
      eventType,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      method: req.method,
      url: req.originalUrl,
      userId: req.user ? req.user.id : null,
      sessionId: req.sessionID
    };
    
    // En production, envoyer à un service de logging sécurisé
    console.log('Security Event:', JSON.stringify(logData));
    
    next();
  };
};

// Middleware de détection d'attaques
const attackDetection = (req, res, next) => {
  const suspiciousPatterns = [
    /(\<script\>|\<\/script\>)/gi,
    /(javascript:|vbscript:|onload=|onerror=)/gi,
    /(union.*select|select.*from|insert.*into|delete.*from|drop.*table)/gi,
    /(\.\.\/)|(\.\.\\)/gi, // Path traversal
    /(exec\(|eval\(|system\()/gi
  ];
  
  const checkString = JSON.stringify(req.body) + req.originalUrl + JSON.stringify(req.query);
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(checkString)) {
      console.warn('🚨 Tentative d\'attaque détectée:', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
        pattern: pattern.toString(),
        userId: req.user ? req.user.id : null
      });
      
      return res.status(400).json({
        error: 'Requête suspecte détectée',
        code: 'SUSPICIOUS_REQUEST'
      });
    }
  }
  
  next();
};

// Middleware de validation des headers
const validateHeaders = (req, res, next) => {
  // Vérifier la taille des headers
  const headerSize = JSON.stringify(req.headers).length;
  if (headerSize > 8192) { // 8KB max
    return res.status(400).json({
      error: 'Headers trop volumineux',
      code: 'HEADERS_TOO_LARGE'
    });
  }
  
  // Vérifier les headers suspects
  const suspiciousHeaders = ['x-forwarded-host', 'x-original-url', 'x-rewrite-url'];
  for (const header of suspiciousHeaders) {
    if (req.headers[header]) {
      console.warn('🚨 Header suspect détecté:', {
        header,
        value: req.headers[header],
        ip: req.ip
      });
    }
  }
  
  next();
};

// Middleware de protection contre les attaques de timing
const timingAttackProtection = async (req, res, next) => {
  // Ajouter un délai aléatoire pour masquer les temps de réponse
  const delay = Math.random() * 50; // 0-50ms
  
  setTimeout(() => {
    next();
  }, delay);
};

// Middleware de nettoyage des données sensibles dans les réponses
const sanitizeResponse = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    // Supprimer les champs sensibles
    if (data && typeof data === 'object') {
      // Permettre les tokens sur les routes d'authentification
      const isAuthRoute = req.originalUrl.includes('/auth/login') || req.originalUrl.includes('/auth/register');
      const sanitized = sanitizeObject(data, isAuthRoute);
      return originalJson.call(this, sanitized);
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

function sanitizeObject(obj, allowToken = false) {
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, allowToken));
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Supprimer les champs sensibles, mais permettre le token pour l'auth
      const sensitiveFields = ['mot_de_passe', 'password', 'secret', 'private_key'];
      if (!allowToken) {
        sensitiveFields.push('token');
      }
      
      if (sensitiveFields.includes(key.toLowerCase())) {
        continue;
      }
      
      sanitized[key] = sanitizeObject(value, allowToken);
    }
    
    return sanitized;
  }
  
  return obj;
}

// Middleware de protection contre les attaques par déni de service
const dosProtection = (req, res, next) => {
  // Limiter la taille du body
  const contentLength = parseInt(req.get('content-length') || '0');
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (contentLength > maxSize) {
    return res.status(413).json({
      error: 'Payload trop volumineux',
      code: 'PAYLOAD_TOO_LARGE',
      maxSize: maxSize
    });
  }
  
  next();
};

// Configuration de sécurité pour Socket.IO
const socketSecurityConfig = {
  cors: corsOptions,
  allowEIO3: false, // Forcer Engine.IO v4
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6, // 1MB
  allowRequest: (req, callback) => {
    // Vérifications de sécurité supplémentaires pour Socket.IO
    const origin = req.headers.origin;
    const allowedOrigins = corsOptions.origin;
    
    if (typeof allowedOrigins === 'function') {
      allowedOrigins(origin, callback);
    } else {
      callback(null, true);
    }
  }
};

module.exports = {
  corsOptions,
  globalRateLimit,
  authRateLimit,
  helmetConfig,
  securityLogger,
  attackDetection,
  validateHeaders,
  timingAttackProtection,
  sanitizeResponse,
  dosProtection,
  socketSecurityConfig
};
