const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    console.log('🔍 Auth Debug - Headers reçus:', {
        authorization: req.headers['authorization'] ? 'Présent' : 'Absent',
        authHeaderValue: authHeader ? authHeader.substring(0, 20) + '...' : 'Aucun',
        tokenExtracted: token ? 'Oui' : 'Non',
        url: req.originalUrl,
        method: req.method
    });

    if (!token) {
        console.log('🔍 Auth Debug: Aucun token fourni pour', req.originalUrl);
        return res.status(401).json({ error: 'Token d\'accès requis' });
    }

    try {
        console.log('🔍 Auth Debug: Vérification du token...');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('🔍 Auth Debug: Token décodé:', { id: decoded.id, email: decoded.email });
        
        const [users] = await db.execute(
            'SELECT id, email, nom, prenom, role_id FROM utilisateurs WHERE id = ? AND statut = "actif"',
            [decoded.id]
        );

        if (users.length === 0) {
            console.log('🔍 Auth Debug: Utilisateur non trouvé ou inactif pour ID:', decoded.id);
            return res.status(401).json({ error: 'Utilisateur non trouvé ou inactif' });
        }

        console.log('🔍 Auth Debug: Utilisateur authentifié:', users[0].email);
        req.user = users[0];
        next();
    } catch (error) {
        console.log('🔍 Auth Debug: Erreur de validation du token:', error.message);
        return res.status(403).json({ error: 'Token invalide' });
    }
};

const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        // Pas de token, on continue sans utilisateur
        req.user = null;
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const [users] = await db.execute(
            'SELECT id, email, nom, prenom, role_id FROM utilisateurs WHERE id = ? AND statut = "actif"',
            [decoded.id]
        );

        if (users.length > 0) {
            req.user = users[0];
        } else {
            req.user = null;
        }
        
        next();
    } catch (error) {
        // Token invalide, on continue sans utilisateur
        req.user = null;
        next();
    }
};

const requireRole = (roles) => {
    return (req, res, next) => {
        console.log('🔍 RequireRole Debug:', {
            userExists: !!req.user,
            userRoleId: req.user?.role_id,
            requiredRoles: roles,
            hasAccess: req.user && roles.includes(req.user.role_id),
            url: req.originalUrl
        });

        if (!req.user || !roles.includes(req.user.role_id)) {
            console.log('❌ Accès refusé pour:', {
                user: req.user?.email || 'Aucun utilisateur',
                roleId: req.user?.role_id || 'Aucun rôle',
                requiredRoles: roles,
                url: req.originalUrl
            });
            return res.status(403).json({ error: 'Accès refusé' });
        }
        
        console.log('✅ Accès autorisé pour:', req.user.email, 'sur', req.originalUrl);
        next();
    };
};

// Alias pour les administrateurs (role_id = 3)
const requireAdmin = requireRole([3]);

module.exports = { authenticateToken, optionalAuth, requireRole, requireAdmin };
