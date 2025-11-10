const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

// ===========================================
// CHIFFREMENT DES DONNÉES SENSIBLES
// ===========================================

class EncryptionService {
    constructor() {
        this.algorithm = process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm';
        this.key = process.env.ENCRYPTION_KEY || this.generateKey();
        
        if (!process.env.ENCRYPTION_KEY) {
            console.warn('⚠️  ENCRYPTION_KEY non définie, génération d\'une clé temporaire');
        }
    }

    generateKey() {
        return crypto.randomBytes(32).toString('hex');
    }

    encrypt(text) {
        try {
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipher(this.algorithm, this.key);
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            return iv.toString('hex') + ':' + encrypted;
        } catch (error) {
            console.error('Erreur de chiffrement:', error);
            throw new Error('Erreur de chiffrement des données');
        }
    }

    decrypt(encryptedText) {
        try {
            const textParts = encryptedText.split(':');
            const iv = Buffer.from(textParts.shift(), 'hex');
            const encrypted = textParts.join(':');
            const decipher = crypto.createDecipher(this.algorithm, this.key);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (error) {
            console.error('Erreur de déchiffrement:', error);
            throw new Error('Erreur de déchiffrement des données');
        }
    }
}

const encryptionService = new EncryptionService();

// ===========================================
// PROTECTION CONTRE LES ATTAQUES SQL INJECTION
// ===========================================

const sqlInjectionProtection = (req, res, next) => {
    if (!process.env.ENABLE_SQL_INJECTION_PROTECTION || process.env.ENABLE_SQL_INJECTION_PROTECTION === 'true') {
        const sqlPatterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
            /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
            /(\b(OR|AND)\s+['"]\s*=\s*['"])/gi,
            /(UNION\s+SELECT)/gi,
            /(DROP\s+TABLE)/gi,
            /(INSERT\s+INTO)/gi,
            /(DELETE\s+FROM)/gi,
            /(UPDATE\s+SET)/gi,
            /(ALTER\s+TABLE)/gi,
            /(EXEC\s*\()/gi,
            /(SCRIPT\s*\()/gi,
            /(WAITFOR\s+DELAY)/gi,
            /(BENCHMARK\s*\()/gi,
            /(SLEEP\s*\()/gi
        ];

        const checkData = (data, path = '') => {
            if (typeof data === 'string') {
                for (const pattern of sqlPatterns) {
                    if (pattern.test(data)) {
                        console.warn('🚨 Tentative d\'injection SQL détectée:', {
                            ip: req.ip,
                            userAgent: req.get('User-Agent'),
                            path: path,
                            pattern: pattern.toString(),
                            data: data.substring(0, 100) + '...',
                            userId: req.user ? req.user.id : null
                        });
                        return true;
                    }
                }
            } else if (typeof data === 'object' && data !== null) {
                for (const [key, value] of Object.entries(data)) {
                    if (checkData(value, `${path}.${key}`)) {
                        return true;
                    }
                }
            }
            return false;
        };

        if (checkData(req.body, 'body') || checkData(req.query, 'query') || checkData(req.params, 'params')) {
            return res.status(400).json({
                error: 'Requête suspecte détectée',
                code: 'SQL_INJECTION_ATTEMPT',
                message: 'Tentative d\'injection SQL détectée et bloquée'
            });
        }
    }
    
    next();
};

// ===========================================
// PROTECTION CONTRE LES ATTAQUES XSS
// ===========================================

const xssProtection = (req, res, next) => {
    const xssPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
        /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
        /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
        /<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi,
        /<meta\b[^<]*(?:(?!<\/meta>)<[^<]*)*<\/meta>/gi,
        /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
        /javascript:/gi,
        /vbscript:/gi,
        /onload\s*=/gi,
        /onerror\s*=/gi,
        /onclick\s*=/gi,
        /onmouseover\s*=/gi,
        /onfocus\s*=/gi,
        /onblur\s*=/gi,
        /onchange\s*=/gi,
        /onsubmit\s*=/gi,
        /onreset\s*=/gi,
        /onselect\s*=/gi,
        /onkeydown\s*=/gi,
        /onkeyup\s*=/gi,
        /onkeypress\s*=/gi,
        /onmousedown\s*=/gi,
        /onmouseup\s*=/gi,
        /onmousemove\s*=/gi,
        /onmouseout\s*=/gi,
        /onmouseenter\s*=/gi,
        /onmouseleave\s*=/gi,
        /oncontextmenu\s*=/gi,
        /ondblclick\s*=/gi,
        /onabort\s*=/gi,
        /onbeforeunload\s*=/gi,
        /onerror\s*=/gi,
        /onhashchange\s*=/gi,
        /onload\s*=/gi,
        /onmessage\s*=/gi,
        /onoffline\s*=/gi,
        /ononline\s*=/gi,
        /onpagehide\s*=/gi,
        /onpageshow\s*=/gi,
        /onpopstate\s*=/gi,
        /onresize\s*=/gi,
        /onstorage\s*=/gi,
        /onunload\s*=/gi
    ];

    const sanitizeData = (data, path = '') => {
        if (typeof data === 'string') {
            for (const pattern of xssPatterns) {
                if (pattern.test(data)) {
                    console.warn('🚨 Tentative d\'attaque XSS détectée:', {
                        ip: req.ip,
                        userAgent: req.get('User-Agent'),
                        path: path,
                        pattern: pattern.toString(),
                        data: data.substring(0, 100) + '...',
                        userId: req.user ? req.user.id : null
                    });
                    return true;
                }
            }
        } else if (typeof data === 'object' && data !== null) {
            for (const [key, value] of Object.entries(data)) {
                if (sanitizeData(value, `${path}.${key}`)) {
                    return true;
                }
            }
        }
        return false;
    };

    if (sanitizeData(req.body, 'body') || sanitizeData(req.query, 'query') || sanitizeData(req.params, 'params')) {
        return res.status(400).json({
            error: 'Requête suspecte détectée',
            code: 'XSS_ATTEMPT',
            message: 'Tentative d\'attaque XSS détectée et bloquée'
        });
    }
    
    next();
};

// ===========================================
// PROTECTION CONTRE LES ATTAQUES DE FORCE BRUTE
// ===========================================

const bruteForceProtection = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 5 : 50, // Plus de tentatives en développement
    message: {
        error: 'Trop de tentatives de connexion échouées',
        code: 'BRUTE_FORCE_BLOCKED',
        retryAfter: 900,
        message: 'Votre IP a été temporairement bloquée. Réessayez dans 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => {
        return req.ip + ':' + (req.body?.email || 'unknown');
    }
});

// ===========================================
// PROTECTION CONTRE LES ATTAQUES DE DICTIONNAIRE
// ===========================================

const dictionaryAttackProtection = (req, res, next) => {
    const commonPasswords = [
        'password', '123456', '123456789', 'qwerty', 'abc123',
        'password123', 'admin', 'root', 'toor', 'pass',
        'test', 'guest', 'user', 'login', 'welcome',
        'monkey', 'dragon', 'master', 'hello', 'freedom',
        'whatever', 'qazwsx', 'trustno1', 'jordan', 'harley',
        'ranger', 'hunter', 'buster', 'soccer', 'hockey',
        'killer', 'george', 'sexy', 'andrew', 'charlie',
        'superman', 'asshole', 'fuckyou', 'dallas', 'jessica',
        'panties', 'pepper', '1234', 'fuck', 'magic',
        'matrix', 'jordan23', 'killer', 'trustno1', 'jordan',
        'jennifer', 'zxcvbn', 'asdf', 'qwertyuiop', '1q2w3e4r'
    ];

    if (req.body?.mot_de_passe || req.body?.password) {
        const password = req.body.mot_de_passe || req.body.password;
        
        if (commonPasswords.includes(password.toLowerCase())) {
            console.warn('🚨 Tentative d\'utilisation de mot de passe faible:', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                password: password,
                userId: req.user ? req.user.id : null
            });
            
            return res.status(400).json({
                error: 'Mot de passe trop faible',
                code: 'WEAK_PASSWORD',
                message: 'Ce mot de passe est trop commun et facilement devinable'
            });
        }
    }
    
    next();
};

// ===========================================
// VALIDATION RENFORCÉE DES DONNÉES
// ===========================================

const enhancedValidation = {
    // Validation des emails
    email: body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email invalide')
        .isLength({ min: 5, max: 255 })
        .withMessage('Email doit contenir entre 5 et 255 caractères'),

    // Validation des mots de passe
    password: body('mot_de_passe')
        .isLength({ min: 8, max: 128 })
        .withMessage('Le mot de passe doit contenir entre 8 et 128 caractères')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Le mot de passe doit contenir au moins une minuscule, une majuscule, un chiffre et un caractère spécial'),

    // Validation des noms
    name: body('nom')
        .isLength({ min: 2, max: 50 })
        .withMessage('Le nom doit contenir entre 2 et 50 caractères')
        .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
        .withMessage('Le nom ne peut contenir que des lettres, espaces, apostrophes et tirets'),

    // Validation des téléphones
    phone: body('telephone')
        .optional()
        .isMobilePhone('fr-FR')
        .withMessage('Numéro de téléphone invalide'),

    // Validation des URLs
    url: body('url')
        .optional()
        .isURL({ protocols: ['http', 'https'] })
        .withMessage('URL invalide')
};

// ===========================================
// MIDDLEWARE DE CHIFFREMENT DES RÉPONSES
// ===========================================

const encryptSensitiveData = (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
        if (data && typeof data === 'object') {
            // Chiffrer les données sensibles avant envoi
            const sensitiveFields = ['mot_de_passe', 'password', 'secret', 'private_key', 'api_key'];
            
            const encryptSensitiveFields = (obj) => {
                if (Array.isArray(obj)) {
                    return obj.map(encryptSensitiveFields);
                }
                
                if (obj && typeof obj === 'object') {
                    const encrypted = {};
                    for (const [key, value] of Object.entries(obj)) {
                        if (sensitiveFields.includes(key.toLowerCase()) && typeof value === 'string') {
                            try {
                                encrypted[key] = encryptionService.encrypt(value);
                            } catch (error) {
                                console.error('Erreur de chiffrement:', error);
                                encrypted[key] = '[CHIFFRÉ]';
                            }
                        } else {
                            encrypted[key] = encryptSensitiveFields(value);
                        }
                    }
                    return encrypted;
                }
                
                return obj;
            };
            
            const encryptedData = encryptSensitiveFields(data);
            return originalJson.call(this, encryptedData);
        }
        
        return originalJson.call(this, data);
    };
    
    next();
};

// ===========================================
// MIDDLEWARE DE DÉTECTION D'INTRUSION
// ===========================================

const intrusionDetection = (req, res, next) => {
    const suspiciousActivities = [];
    
    // Détecter les tentatives de scan de ports (mais autoriser /api/admin pour les utilisateurs authentifiés)
    if ((req.originalUrl.includes('wp-admin') || req.originalUrl.includes('phpmyadmin') || 
         req.originalUrl.includes('.env')) ||
        (req.originalUrl.includes('admin') && !req.originalUrl.startsWith('/api/admin'))) {
        suspiciousActivities.push('PORT_SCAN_ATTEMPT');
    }
    
    // Détecter les tentatives d'accès aux fichiers système
    if (req.originalUrl.includes('..') || req.originalUrl.includes('etc/passwd') || 
        req.originalUrl.includes('proc/version')) {
        suspiciousActivities.push('FILE_ACCESS_ATTEMPT');
    }
    
    // Détecter les User-Agents suspects
    const userAgent = req.get('User-Agent') || '';
    if (userAgent.includes('sqlmap') || userAgent.includes('nikto') || 
        userAgent.includes('nmap') || userAgent.includes('masscan')) {
        suspiciousActivities.push('MALICIOUS_USER_AGENT');
    }
    
    // Détecter les requêtes avec des paramètres suspects
    const queryString = req.originalUrl;
    if (queryString.includes('cmd=') || queryString.includes('exec=') || 
        queryString.includes('eval=') || queryString.includes('system=')) {
        suspiciousActivities.push('COMMAND_INJECTION_ATTEMPT');
    }
    
    if (suspiciousActivities.length > 0) {
        console.warn('🚨 Activité suspecte détectée:', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            url: req.originalUrl,
            activities: suspiciousActivities,
            timestamp: new Date().toISOString()
        });
        
        // Bloquer l'IP temporairement (en production, utiliser Redis)
        return res.status(403).json({
            error: 'Accès refusé',
            code: 'INTRUSION_DETECTED',
            message: 'Activité suspecte détectée et bloquée'
        });
    }
    
    next();
};

// ===========================================
// MIDDLEWARE DE PROTECTION CSRF
// ===========================================

const csrfProtection = (req, res, next) => {
    // Vérifier la présence du token CSRF pour les requêtes modifiantes
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const csrfToken = req.headers['x-csrf-token'] || req.body._csrf;
        const sessionToken = req.session?.csrfToken;
        
        if (!csrfToken || !sessionToken || csrfToken !== sessionToken) {
            return res.status(403).json({
                error: 'Token CSRF manquant ou invalide',
                code: 'CSRF_TOKEN_MISSING',
                message: 'Requête rejetée pour des raisons de sécurité'
            });
        }
    }
    
    next();
};

// ===========================================
// EXPORT DES MIDDLEWARES
// ===========================================

module.exports = {
    encryptionService,
    sqlInjectionProtection,
    xssProtection,
    bruteForceProtection,
    dictionaryAttackProtection,
    enhancedValidation,
    encryptSensitiveData,
    intrusionDetection,
    csrfProtection
};
