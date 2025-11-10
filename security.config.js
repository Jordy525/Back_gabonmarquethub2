// ===========================================
// CONFIGURATION DE SÉCURITÉ CENTRALISÉE
// ===========================================

const securityConfig = {
    // ===========================================
    // CONFIGURATION GÉNÉRALE
    // ===========================================
    environment: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',

    // ===========================================
    // CONFIGURATION JWT
    // ===========================================
    jwt: {
        secret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        algorithm: 'HS256',
        issuer: 'ecommerce-gabon',
        audience: 'ecommerce-gabon-users'
    },

    // ===========================================
    // CONFIGURATION SESSION
    // ===========================================
    session: {
        secret: process.env.SESSION_SECRET || 'fallback-session-secret-change-in-production',
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 24 heures
            sameSite: 'strict'
        },
        resave: false,
        saveUninitialized: false
    },

    // ===========================================
    // CONFIGURATION CORS
    // ===========================================
    cors: {
        origin: process.env.CORS_ORIGIN 
            ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
            : [
                'http://localhost:3000',
                'http://localhost:3001',
                'http://localhost:5173',
                'http://localhost:8080',
                'http://127.0.0.1:3000',
                'http://127.0.0.1:3001',
                'http://127.0.0.1:5173',
                'http://127.0.0.1:8080'
              ],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'X-Requested-With',
            'Accept',
            'Origin',
            'X-CSRF-Token'
        ],
        exposedHeaders: [
            'X-Total-Count',
            'X-Rate-Limit-Remaining',
            'X-Request-ID'
        ]
    },

    // ===========================================
    // CONFIGURATION RATE LIMITING
    // ===========================================
    rateLimit: {
        global: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: process.env.RATE_LIMIT_MAX 
                ? parseInt(process.env.RATE_LIMIT_MAX) 
                : (process.env.NODE_ENV === 'production' ? 1000 : 5000),
            message: {
                error: 'Trop de requêtes depuis cette IP',
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: 900
            },
            standardHeaders: true,
            legacyHeaders: false
        },
        auth: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: process.env.AUTH_RATE_LIMIT_MAX 
                ? parseInt(process.env.AUTH_RATE_LIMIT_MAX) 
                : (process.env.NODE_ENV === 'production' ? 20 : 200),
            message: {
                error: 'Trop de tentatives de connexion',
                code: 'AUTH_RATE_LIMIT_EXCEEDED',
                retryAfter: 900
            },
            standardHeaders: true,
            legacyHeaders: false,
            skipSuccessfulRequests: true
        },
        bruteForce: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 5,
            message: {
                error: 'Trop de tentatives de connexion échouées',
                code: 'BRUTE_FORCE_BLOCKED',
                retryAfter: 900
            },
            standardHeaders: true,
            legacyHeaders: false,
            skipSuccessfulRequests: true
        }
    },

    // ===========================================
    // CONFIGURATION CHIFFREMENT
    // ===========================================
    encryption: {
        algorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm',
        key: process.env.ENCRYPTION_KEY || 'fallback-encryption-key-change-in-production',
        ivLength: 16,
        tagLength: 16
    },

    // ===========================================
    // CONFIGURATION BASE DE DONNÉES
    // ===========================================
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'ecommerce_gabon',
        ssl: process.env.DB_SSL === 'true',
        connectionLimit: 10,
        queueLimit: 0,
        acquireTimeout: 60000,
        timeout: 30000,
        reconnect: true,
        maxReconnects: 3,
        reconnectDelay: 2000
    },

    // ===========================================
    // CONFIGURATION SÉCURITÉ
    // ===========================================
    security: {
        // Protection contre les attaques
        enableAttackDetection: process.env.ENABLE_ATTACK_DETECTION !== 'false',
        enableSQLInjectionProtection: process.env.ENABLE_SQL_INJECTION_PROTECTION !== 'false',
        enableXSSProtection: true,
        enableCSRFProtection: true,
        
        // Logging de sécurité
        enableSecurityLogging: process.env.ENABLE_SECURITY_LOGGING !== 'false',
        logLevel: process.env.LOG_LEVEL || 'info',
        logFile: process.env.LOG_FILE || './logs/security.log',
        
        // Monitoring
        enableHealthChecks: process.env.ENABLE_HEALTH_CHECKS !== 'false',
        healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000,
        
        // Rate limiting
        disableRateLimit: process.env.DISABLE_RATE_LIMIT === 'true',
        
        // Headers de sécurité
        securityHeaders: {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
        }
    },

    // ===========================================
    // CONFIGURATION UPLOAD
    // ===========================================
    upload: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
        allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,pdf,doc,docx').split(','),
        uploadPath: process.env.UPLOAD_PATH || './uploads',
        tempPath: './uploads/temp'
    },

    // ===========================================
    // CONFIGURATION EMAIL
    // ===========================================
    email: {
        host: process.env.EMAIL_HOST || 'localhost',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        user: process.env.EMAIL_USER || '',
        password: process.env.EMAIL_PASSWORD || '',
        from: process.env.EMAIL_FROM || 'noreply@ecommerce-gabon.com'
    },

    // ===========================================
    // CONFIGURATION OAUTH
    // ===========================================
    oauth: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
            callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback'
        },
        facebook: {
            appId: process.env.FACEBOOK_APP_ID || '',
            appSecret: process.env.FACEBOOK_APP_SECRET || '',
            callbackURL: process.env.FACEBOOK_CALLBACK_URL || '/api/auth/facebook/callback'
        }
    },

    // ===========================================
    // CONFIGURATION MONITORING
    // ===========================================
    monitoring: {
        alertThresholds: {
            maxFailedLogins: 5,
            maxSuspiciousRequests: 10,
            maxAttackAttempts: 3
        },
        monitoringInterval: 30000, // 30 secondes
        logRetentionDays: 30,
        alertEmail: process.env.ALERT_EMAIL || 'admin@ecommerce-gabon.com'
    },

    // ===========================================
    // CONFIGURATION BACKUP
    // ===========================================
    backup: {
        enabled: process.env.BACKUP_ENABLED === 'true',
        interval: process.env.BACKUP_INTERVAL || '24h',
        retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30,
        path: process.env.BACKUP_PATH || './backups',
        encryptionKey: process.env.BACKUP_ENCRYPTION_KEY || ''
    },

    // ===========================================
    // CONFIGURATION PAYMENT
    // ===========================================
    payment: {
        singpay: {
            apiUrl: process.env.SINGPAY_API_URL || 'https://api.singpay.ga',
            apiKey: process.env.SINGPAY_API_KEY || '',
            secretKey: process.env.SINGPAY_SECRET_KEY || '',
            merchantId: process.env.SINGPAY_MERCHANT_ID || ''
        }
    },

    // ===========================================
    // MÉTHODES UTILITAIRES
    // ===========================================
    utils: {
        // Vérifier si une fonctionnalité est activée
        isFeatureEnabled: (feature) => {
            return securityConfig.security[feature] === true;
        },

        // Obtenir la configuration pour un environnement
        getEnvironmentConfig: () => {
            return {
                isProduction: securityConfig.isProduction,
                isDevelopment: securityConfig.isDevelopment,
                environment: securityConfig.environment
            };
        },

        // Valider la configuration
        validateConfig: () => {
            const errors = [];

            if (securityConfig.isProduction) {
                if (securityConfig.jwt.secret === 'fallback-secret-change-in-production') {
                    errors.push('JWT_SECRET doit être défini en production');
                }
                if (securityConfig.session.secret === 'fallback-session-secret-change-in-production') {
                    errors.push('SESSION_SECRET doit être défini en production');
                }
                if (securityConfig.encryption.key === 'fallback-encryption-key-change-in-production') {
                    errors.push('ENCRYPTION_KEY doit être définie en production');
                }
            }

            return {
                isValid: errors.length === 0,
                errors: errors
            };
        }
    }
};

module.exports = securityConfig;
