const mysql = require('mysql2/promise');
const crypto = require('crypto');

// ===========================================
// SÉCURITÉ AVANCÉE DE LA BASE DE DONNÉES
// ===========================================

class DatabaseSecurity {
    constructor() {
        this.connectionPool = null;
        this.failedConnections = new Map();
        this.suspiciousQueries = [];
        this.maxFailedConnections = 5;
        this.queryTimeout = 30000; // 30 secondes
    }

    // ===========================================
    // CONFIGURATION SÉCURISÉE DE LA CONNEXION
    // ===========================================
    createSecureConnection() {
        const config = {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306,
            
            // Configuration de sécurité
            ssl: process.env.DB_SSL === 'true' ? {
                rejectUnauthorized: false
            } : false,
            
            // Timeouts de sécurité
            connectTimeout: 60000,
            acquireTimeout: 60000,
            timeout: 30000,
            
            // Limites de connexion
            connectionLimit: 10,
            queueLimit: 0,
            waitForConnections: true,
            
            // Configuration de sécurité MySQL
            multipleStatements: false, // Désactiver les requêtes multiples
            dateStrings: false,
            supportBigNumbers: true,
            bigNumberStrings: true,
            
            // Charset sécurisé
            charset: 'utf8mb4',
            
            // Configuration de reconnexion
            reconnect: true,
            maxReconnects: 3,
            reconnectDelay: 2000,
            
            // Configuration de logging
            debug: process.env.NODE_ENV === 'development' ? ['ComProtocol'] : false,
            
            // Configuration de sécurité avancée
            flags: [
                'COMPRESS',
                'FOUND_ROWS',
                'IGNORE_SPACE',
                'LONG_PASSWORD',
                'LONG_FLAG',
                'TRANSACTIONS',
                'PROTOCOL_41',
                'SECURE_CONNECTION'
            ]
        };

        this.connectionPool = mysql.createPool(config);
        return this.connectionPool;
    }

    // ===========================================
    // EXÉCUTION SÉCURISÉE DE REQUÊTES
    // ===========================================
    async executeSecureQuery(query, params = [], options = {}) {
        const startTime = Date.now();
        const queryId = crypto.randomUUID();
        
        try {
            // Vérifier la validité de la requête
            this.validateQuery(query, params);
            
            // Logger la requête
            this.logQuery(queryId, query, params, 'START');
            
            // Exécuter avec timeout
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Query timeout')), this.queryTimeout);
            });
            
            const queryPromise = this.connectionPool.execute(query, params);
            const result = await Promise.race([queryPromise, timeoutPromise]);
            
            // Logger le succès
            this.logQuery(queryId, query, params, 'SUCCESS', Date.now() - startTime);
            
            return result;
            
        } catch (error) {
            // Logger l'erreur
            this.logQuery(queryId, query, params, 'ERROR', Date.now() - startTime, error);
            
            // Gérer les erreurs de sécurité
            this.handleQueryError(error, query, params);
            
            throw error;
        }
    }

    // ===========================================
    // VALIDATION DES REQUÊTES
    // ===========================================
    validateQuery(query, params) {
        // Vérifier la longueur de la requête
        if (query.length > 10000) {
            throw new Error('Query too long - potential DoS attack');
        }
        
        // Vérifier les patterns suspects
        const suspiciousPatterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b.*\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
            /(UNION\s+SELECT)/gi,
            /(DROP\s+TABLE)/gi,
            /(INSERT\s+INTO.*VALUES.*INSERT\s+INTO)/gi,
            /(UPDATE.*SET.*WHERE.*UPDATE)/gi,
            /(DELETE.*FROM.*WHERE.*DELETE)/gi,
            /(ALTER\s+TABLE.*ALTER\s+TABLE)/gi,
            /(EXEC\s*\(.*EXEC\s*\()/gi,
            /(SCRIPT\s*\(.*SCRIPT\s*\()/gi,
            /(WAITFOR\s+DELAY.*WAITFOR\s+DELAY)/gi,
            /(BENCHMARK\s*\(.*BENCHMARK\s*\()/gi,
            /(SLEEP\s*\(.*SLEEP\s*\()/gi,
            /(LOAD_FILE\s*\(.*LOAD_FILE\s*\()/gi,
            /(INTO\s+OUTFILE.*INTO\s+OUTFILE)/gi,
            /(INTO\s+DUMPFILE.*INTO\s+DUMPFILE)/gi
        ];
        
        for (const pattern of suspiciousPatterns) {
            if (pattern.test(query)) {
                this.recordSuspiciousQuery(query, params, 'SUSPICIOUS_PATTERN');
                throw new Error('Suspicious query pattern detected');
            }
        }
        
        // Vérifier les paramètres
        this.validateParameters(params);
    }

    // ===========================================
    // VALIDATION DES PARAMÈTRES
    // ===========================================
    validateParameters(params) {
        if (!Array.isArray(params)) {
            throw new Error('Parameters must be an array');
        }
        
        for (let i = 0; i < params.length; i++) {
            const param = params[i];
            
            // Vérifier la longueur des paramètres
            if (typeof param === 'string' && param.length > 1000) {
                throw new Error(`Parameter ${i} too long - potential DoS attack`);
            }
            
            // Vérifier les patterns suspects dans les paramètres
            const suspiciousParamPatterns = [
                /(\<script\>|\<\/script\>)/gi,
                /(javascript:|vbscript:|onload=|onerror=)/gi,
                /(union.*select|select.*from|insert.*into|delete.*from|drop.*table)/gi,
                /(\.\.\/)|(\.\.\\)/gi,
                /(exec\(|eval\(|system\()/gi,
                /(LOAD_FILE\s*\()/gi,
                /(INTO\s+OUTFILE)/gi,
                /(INTO\s+DUMPFILE)/gi
            ];
            
            for (const pattern of suspiciousParamPatterns) {
                if (pattern.test(String(param))) {
                    this.recordSuspiciousQuery('PARAMETER_VALIDATION', params, 'SUSPICIOUS_PARAMETER');
                    throw new Error(`Suspicious parameter ${i} detected`);
                }
            }
        }
    }

    // ===========================================
    // GESTION DES ERREURS DE REQUÊTES
    // ===========================================
    handleQueryError(error, query, params) {
        const errorCode = error.code;
        const errorMessage = error.message;
        
        // Erreurs de sécurité
        if (errorCode === 'ER_ACCESS_DENIED_ERROR') {
            this.recordSuspiciousQuery(query, params, 'ACCESS_DENIED');
            throw new Error('Database access denied - potential security breach');
        }
        
        if (errorCode === 'ER_BAD_DB_ERROR') {
            this.recordSuspiciousQuery(query, params, 'BAD_DATABASE');
            throw new Error('Database not found - potential security breach');
        }
        
        if (errorCode === 'ER_DUP_ENTRY') {
            // Erreur normale, pas de sécurité
            return;
        }
        
        if (errorCode === 'ER_NO_SUCH_TABLE') {
            this.recordSuspiciousQuery(query, params, 'NO_SUCH_TABLE');
            throw new Error('Table not found - potential security breach');
        }
        
        // Erreurs de syntaxe suspectes
        if (errorMessage.includes('syntax error') && query.includes('UNION')) {
            this.recordSuspiciousQuery(query, params, 'SQL_INJECTION_ATTEMPT');
            throw new Error('SQL injection attempt detected');
        }
        
        // Timeout
        if (errorMessage.includes('timeout')) {
            this.recordSuspiciousQuery(query, params, 'QUERY_TIMEOUT');
            throw new Error('Query timeout - potential DoS attack');
        }
    }

    // ===========================================
    // ENREGISTREMENT DES REQUÊTES SUSPECTES
    // ===========================================
    recordSuspiciousQuery(query, params, reason) {
        const suspiciousQuery = {
            id: crypto.randomUUID(),
            query: query.substring(0, 500), // Limiter la taille
            params: params.map(p => String(p).substring(0, 100)), // Limiter la taille
            reason: reason,
            timestamp: new Date(),
            ip: 'unknown' // Sera rempli par le middleware
        };
        
        this.suspiciousQueries.push(suspiciousQuery);
        
        // Garder seulement les 1000 dernières requêtes suspectes
        if (this.suspiciousQueries.length > 1000) {
            this.suspiciousQueries = this.suspiciousQueries.slice(-1000);
        }
        
        console.warn('🚨 Requête suspecte détectée:', {
            reason: reason,
            query: query.substring(0, 100) + '...',
            timestamp: suspiciousQuery.timestamp
        });
    }

    // ===========================================
    // LOGGING DES REQUÊTES
    // ===========================================
    logQuery(queryId, query, params, status, duration = null, error = null) {
        const logEntry = {
            queryId,
            query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
            params: params.map(p => String(p).substring(0, 50)),
            status,
            duration,
            error: error ? error.message : null,
            timestamp: new Date().toISOString()
        };
        
        if (process.env.NODE_ENV === 'development') {
            console.log(`🔍 DB Query [${status}]:`, logEntry);
        }
    }

    // ===========================================
    // CONNEXION SÉCURISÉE AVEC RETRY
    // ===========================================
    async getSecureConnection() {
        try {
            if (!this.connectionPool) {
                this.createSecureConnection();
            }
            
            const connection = await this.connectionPool.getConnection();
            return connection;
            
        } catch (error) {
            console.error('Erreur de connexion à la base de données:', error);
            throw new Error('Impossible de se connecter à la base de données');
        }
    }

    // ===========================================
    // FERMETURE SÉCURISÉE DE LA CONNEXION
    // ===========================================
    async closeSecureConnection(connection) {
        try {
            if (connection && typeof connection.release === 'function') {
                await connection.release();
            }
        } catch (error) {
            console.error('Erreur lors de la fermeture de la connexion:', error);
        }
    }

    // ===========================================
    // NETTOYAGE DES CONNEXIONS
    // ===========================================
    async cleanup() {
        try {
            if (this.connectionPool) {
                await this.connectionPool.end();
                this.connectionPool = null;
            }
        } catch (error) {
            console.error('Erreur lors du nettoyage des connexions:', error);
        }
    }

    // ===========================================
    // OBTENIR LES STATISTIQUES DE SÉCURITÉ
    // ===========================================
    getSecurityStats() {
        return {
            suspiciousQueries: this.suspiciousQueries.length,
            recentSuspiciousQueries: this.suspiciousQueries.filter(
                q => Date.now() - q.timestamp.getTime() < 24 * 60 * 60 * 1000
            ).length,
            connectionPool: this.connectionPool ? {
                totalConnections: this.connectionPool.pool._allConnections.length,
                freeConnections: this.connectionPool.pool._freeConnections.length,
                acquiringConnections: this.connectionPool.pool._acquiringConnections.length
            } : null
        };
    }
}

// Instance globale de sécurité de base de données
const databaseSecurity = new DatabaseSecurity();

// ===========================================
// MIDDLEWARE DE SÉCURITÉ DE BASE DE DONNÉES
// ===========================================

const databaseSecurityMiddleware = (req, res, next) => {
    // Ajouter les méthodes sécurisées à la requête
    req.db = {
        execute: (query, params) => databaseSecurity.executeSecureQuery(query, params),
        getConnection: () => databaseSecurity.getSecureConnection(),
        closeConnection: (connection) => databaseSecurity.closeSecureConnection(connection)
    };
    
    next();
};

module.exports = {
    databaseSecurity,
    databaseSecurityMiddleware
};
