// Middleware de fallback pour les erreurs de base de données
const dbFallback = (req, res, next) => {
    // Wrapper pour les requêtes de base de données
    const originalSend = res.send;
    const originalJson = res.json;
    
    // Intercepter les erreurs de base de données
    res.send = function(data) {
        if (res.statusCode === 500 && typeof data === 'string' && 
            (data.includes('Base') || data.includes('max_user_connections') || data.includes('HY000/1203'))) {
            console.log('🔧 Erreur DB détectée, utilisation du fallback pour:', req.path);
            return res.status(200).json(getFallbackData(req.path));
        }
        return originalSend.call(this, data);
    };
    
    res.json = function(data) {
        if (res.statusCode === 500 && data.error && 
            (data.error.includes('Base') || data.error.includes('max_user_connections') || data.error.includes('HY000/1203'))) {
            console.log('🔧 Erreur DB détectée, utilisation du fallback pour:', req.path);
            return res.status(200).json(getFallbackData(req.path));
        }
        return originalJson.call(this, data);
    };
    
    next();
};

// Données de fallback selon l'endpoint
function getFallbackData(path) {
    console.log('📦 Génération de données fallback pour:', path);
    
    if (path.includes('/products/public')) {
        return {
            products: [],
            total: 0,
            message: 'Mode développement - Base de données non configurée'
        };
    }
    
    if (path.includes('/entreprises') || path.includes('/suppliers')) {
        return {
            entreprises: [],
            data: [],
            total: 0,
            message: 'Mode développement - Base de données non configurée'
        };
    }
    
    if (path.includes('/categories')) {
        return {
            categories: [
                { id: 1, nom: 'Électronique', description: 'Produits électroniques' },
                { id: 2, nom: 'Mode', description: 'Vêtements et accessoires' },
                { id: 3, nom: 'Maison', description: 'Articles pour la maison' }
            ],
            total: 3,
            message: 'Mode développement - Données de test'
        };
    }
    
    if (path.includes('/conversations')) {
        return {
            data: [],
            conversations: [],
            pagination: {
                total: 0,
                pages: 1,
                page: 1,
                limit: 20
            },
            message: 'Mode développement - Base de données non configurée'
        };
    }
    
    // Fallback générique
    return {
        data: [],
        total: 0,
        message: 'Mode développement - Base de données non configurée',
        fallback: true
    };
}

module.exports = dbFallback;
