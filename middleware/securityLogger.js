const fs = require('fs');
const path = require('path');

// ===========================================
// SYSTÈME DE LOGGING DE SÉCURITÉ AVANCÉ
// ===========================================

class SecurityLogger {
    constructor() {
        this.logDir = './logs/security';
        this.ensureLogDirectory();
        this.logFile = path.join(this.logDir, `security-${new Date().toISOString().split('T')[0]}.log`);
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    log(level, event, data) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: level.toUpperCase(),
            event: event,
            data: data,
            pid: process.pid
        };

        // Log dans la console en développement
        if (process.env.NODE_ENV === 'development') {
            console.log(`🔒 [${level.toUpperCase()}] ${event}:`, data);
        }

        // Log dans le fichier
        if (process.env.ENABLE_SECURITY_LOGGING !== 'false') {
            fs.appendFileSync(this.logFile, JSON.stringify(logEntry) + '\n');
        }

        // En production, envoyer à un service de monitoring
        if (process.env.NODE_ENV === 'production') {
            this.sendToMonitoring(logEntry);
        }
    }

    sendToMonitoring(logEntry) {
        // Ici, vous pouvez intégrer avec des services comme:
        // - Sentry
        // - LogRocket
        // - DataDog
        // - CloudWatch
        // - Elasticsearch
        
        // Pour l'instant, on log juste dans un fichier séparé
        const monitoringFile = path.join(this.logDir, 'monitoring.log');
        fs.appendFileSync(monitoringFile, JSON.stringify(logEntry) + '\n');
    }

    // Méthodes spécifiques pour différents types d'événements
    logLoginAttempt(req, success, reason = null) {
        this.log('info', 'LOGIN_ATTEMPT', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            email: req.body?.email || 'unknown',
            success: success,
            reason: reason,
            timestamp: new Date().toISOString()
        });
    }

    logSecurityViolation(req, violationType, details) {
        this.log('warn', 'SECURITY_VIOLATION', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            url: req.originalUrl,
            method: req.method,
            violationType: violationType,
            details: details,
            userId: req.user?.id || null,
            timestamp: new Date().toISOString()
        });
    }

    logAttackAttempt(req, attackType, details) {
        this.log('error', 'ATTACK_ATTEMPT', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            url: req.originalUrl,
            method: req.method,
            attackType: attackType,
            details: details,
            userId: req.user?.id || null,
            timestamp: new Date().toISOString()
        });
    }

    logDataAccess(req, dataType, action, details) {
        this.log('info', 'DATA_ACCESS', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            userId: req.user?.id || null,
            dataType: dataType,
            action: action,
            details: details,
            timestamp: new Date().toISOString()
        });
    }

    logSystemEvent(event, details) {
        this.log('info', 'SYSTEM_EVENT', {
            event: event,
            details: details,
            timestamp: new Date().toISOString()
        });
    }

    logError(error, req = null) {
        this.log('error', 'SYSTEM_ERROR', {
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name
            },
            request: req ? {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                url: req.originalUrl,
                method: req.method,
                userId: req.user?.id || null
            } : null,
            timestamp: new Date().toISOString()
        });
    }
}

const securityLogger = new SecurityLogger();

// ===========================================
// MIDDLEWARE DE LOGGING DE SÉCURITÉ
// ===========================================

const securityLoggingMiddleware = (req, res, next) => {
    // Log de la requête
    securityLogger.log('info', 'REQUEST_RECEIVED', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
        method: req.method,
        contentLength: req.get('content-length'),
        timestamp: new Date().toISOString()
    });

    // Intercepter les réponses pour logger les erreurs
    const originalSend = res.send;
    const originalJson = res.json;

    res.send = function(data) {
        if (res.statusCode >= 400) {
            securityLogger.log('warn', 'ERROR_RESPONSE', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                url: req.originalUrl,
                method: req.method,
                statusCode: res.statusCode,
                response: typeof data === 'string' ? data.substring(0, 200) : data,
                userId: req.user?.id || null,
                timestamp: new Date().toISOString()
            });
        }
        return originalSend.call(this, data);
    };

    res.json = function(data) {
        if (res.statusCode >= 400) {
            securityLogger.log('warn', 'ERROR_RESPONSE', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                url: req.originalUrl,
                method: req.method,
                statusCode: res.statusCode,
                response: data,
                userId: req.user?.id || null,
                timestamp: new Date().toISOString()
            });
        }
        return originalJson.call(this, data);
    };

    next();
};

// ===========================================
// MIDDLEWARE DE DÉTECTION D'ANOMALIES
// ===========================================

const anomalyDetection = (req, res, next) => {
    const ip = req.ip;
    const userAgent = req.get('User-Agent');
    const url = req.originalUrl;

    // Détecter les patterns suspects
    const suspiciousPatterns = [
        // Tentatives d'accès aux fichiers système
        /\.\.\//,
        /\.env/,
        /wp-admin/,
        /phpmyadmin/,
        /admin\.php/,
        /config\.php/,
        
        // Tentatives d'injection
        /union.*select/i,
        /select.*from/i,
        /insert.*into/i,
        /delete.*from/i,
        /drop.*table/i,
        /script.*src/i,
        /javascript:/i,
        /vbscript:/i,
        
        // Tentatives de bypass
        /%00/,
        /%0a/,
        /%0d/,
        /%20/,
        /%2e%2e/,
        
        // User agents suspects
        /sqlmap/i,
        /nikto/i,
        /nmap/i,
        /masscan/i,
        /zap/i,
        /burp/i
    ];

    let detectedThreats = [];

    // Vérifier l'URL
    for (const pattern of suspiciousPatterns) {
        if (pattern.test(url)) {
            detectedThreats.push(`SUSPICIOUS_URL: ${pattern.toString()}`);
        }
    }

    // Vérifier le User-Agent
    for (const pattern of suspiciousPatterns) {
        if (pattern.test(userAgent)) {
            detectedThreats.push(`SUSPICIOUS_USER_AGENT: ${pattern.toString()}`);
        }
    }

    // Vérifier les paramètres de requête
    const queryString = req.originalUrl;
    for (const pattern of suspiciousPatterns) {
        if (pattern.test(queryString)) {
            detectedThreats.push(`SUSPICIOUS_QUERY: ${pattern.toString()}`);
        }
    }

    // Si des menaces sont détectées
    if (detectedThreats.length > 0) {
        securityLogger.logAttackAttempt(req, 'ANOMALY_DETECTED', {
            threats: detectedThreats,
            ip: ip,
            userAgent: userAgent,
            url: url
        });

        return res.status(403).json({
            error: 'Accès refusé',
            code: 'ANOMALY_DETECTED',
            message: 'Activité suspecte détectée'
        });
    }

    next();
};

// ===========================================
// MIDDLEWARE DE RATE LIMITING AVANCÉ
// ===========================================

const advancedRateLimit = (options = {}) => {
    const defaultOptions = {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // 100 requêtes par fenêtre
        message: {
            error: 'Trop de requêtes',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: 900
        },
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => {
            // Skip pour les requêtes de santé
            return req.originalUrl.includes('/health') || req.originalUrl.includes('/ping');
        },
        keyGenerator: (req) => {
            // Utiliser l'IP et l'User-Agent pour une identification plus précise
            return `${req.ip}:${req.get('User-Agent')?.substring(0, 50) || 'unknown'}`;
        },
        onLimitReached: (req, res, options) => {
            securityLogger.logSecurityViolation(req, 'RATE_LIMIT_EXCEEDED', {
                limit: options.max,
                windowMs: options.windowMs,
                key: options.keyGenerator(req)
            });
        }
    };

    const rateLimit = require('express-rate-limit');
    return rateLimit({ ...defaultOptions, ...options });
};

// ===========================================
// MIDDLEWARE DE PROTECTION DES HEADERS
// ===========================================

const secureHeaders = (req, res, next) => {
    // Headers de sécurité supplémentaires
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // Headers personnalisés pour le monitoring
    res.setHeader('X-Request-ID', crypto.randomUUID());
    res.setHeader('X-Response-Time', Date.now());
    
    next();
};

// ===========================================
// MIDDLEWARE DE VALIDATION DES REQUÊTES
// ===========================================

const requestValidation = (req, res, next) => {
    // Vérifier la taille de la requête
    const contentLength = parseInt(req.get('content-length') || '0');
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (contentLength > maxSize) {
        securityLogger.logSecurityViolation(req, 'REQUEST_TOO_LARGE', {
            contentLength: contentLength,
            maxSize: maxSize
        });
        
        return res.status(413).json({
            error: 'Requête trop volumineuse',
            code: 'REQUEST_TOO_LARGE',
            maxSize: maxSize
        });
    }

    // Vérifier les headers suspects
    const suspiciousHeaders = [
        'x-forwarded-host',
        'x-original-url',
        'x-rewrite-url',
        'x-cluster-client-ip',
        'x-real-ip'
    ];

    for (const header of suspiciousHeaders) {
        if (req.headers[header]) {
            securityLogger.logSecurityViolation(req, 'SUSPICIOUS_HEADER', {
                header: header,
                value: req.headers[header]
            });
        }
    }

    next();
};

module.exports = {
    securityLogger,
    securityLoggingMiddleware,
    anomalyDetection,
    advancedRateLimit,
    secureHeaders,
    requestValidation
};
