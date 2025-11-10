const db = require('../config/database');

/**
 * Middleware pour vérifier le statut d'un fournisseur
 * @param {string} requiredStatus - Statut requis ('actif', 'inactif', 'suspendu')
 * @param {string} action - Action tentée (pour les logs)
 */
const checkSupplierStatus = (requiredStatus = 'actif', action = 'action') => {
    return async (req, res, next) => {
        try {
            // Récupérer l'utilisateur avec son statut
            const [users] = await db.execute(`
                SELECT u.id, u.statut, u.documents_valides, e.nom_entreprise
                FROM utilisateurs u
                LEFT JOIN entreprises e ON u.id = e.utilisateur_id
                WHERE u.id = ? AND u.role_id = 2
            `, [req.user.id]);

            if (users.length === 0) {
                return res.status(404).json({ 
                    error: 'Fournisseur non trouvé',
                    code: 'SUPPLIER_NOT_FOUND'
                });
            }

            const user = users[0];
            const currentStatus = user.statut;

            // Vérifier le statut
            if (currentStatus !== requiredStatus) {
                let message = '';
                let code = '';

                switch (currentStatus) {
                    case 'inactif':
                        message = 'Votre compte est en attente de validation. Veuillez uploader et faire valider vos documents pour accéder à cette fonctionnalité.';
                        code = 'ACCOUNT_INACTIVE';
                        break;
                    case 'suspendu':
                        message = 'Votre compte a été suspendu. Contactez l\'administrateur pour plus d\'informations.';
                        code = 'ACCOUNT_SUSPENDED';
                        break;
                    default:
                        message = `Cette action nécessite un compte ${requiredStatus}.`;
                        code = 'INVALID_STATUS';
                }

                console.log(`🚫 [checkSupplierStatus] Accès refusé pour ${action}:`, {
                    userId: req.user.id,
                    currentStatus,
                    requiredStatus,
                    action
                });

                return res.status(403).json({
                    error: message,
                    code,
                    currentStatus,
                    requiredStatus,
                    documentsValidated: user.documents_valides
                });
            }

            // Ajouter les informations du statut à la requête
            req.supplierStatus = {
                status: currentStatus,
                documentsValidated: user.documents_valides,
                companyName: user.nom_entreprise
            };

            next();

        } catch (error) {
            console.error('Erreur vérification statut fournisseur:', error);
            res.status(500).json({ 
                error: 'Erreur lors de la vérification du statut',
                code: 'STATUS_CHECK_ERROR'
            });
        }
    };
};

/**
 * Middleware spécifique pour vérifier qu'un fournisseur est actif
 */
const requireActiveSupplier = checkSupplierStatus('actif', 'publication de produits');

/**
 * Middleware pour vérifier qu'un fournisseur n'est pas suspendu
 */
const requireNotSuspended = async (req, res, next) => {
    try {
        const [users] = await db.execute(`
            SELECT u.statut, e.nom_entreprise
            FROM utilisateurs u
            LEFT JOIN entreprises e ON u.id = e.utilisateur_id
            WHERE u.id = ? AND u.role_id = 2
        `, [req.user.id]);

        if (users.length === 0) {
            return res.status(404).json({ 
                error: 'Fournisseur non trouvé',
                code: 'SUPPLIER_NOT_FOUND'
            });
        }

        const user = users[0];

        if (user.statut === 'suspendu') {
            return res.status(403).json({
                error: 'Votre compte a été suspendu. Contactez l\'administrateur pour plus d\'informations.',
                code: 'ACCOUNT_SUSPENDED',
                currentStatus: user.statut
            });
        }

        req.supplierStatus = {
            status: user.statut,
            companyName: user.nom_entreprise
        };

        next();

    } catch (error) {
        console.error('Erreur vérification suspension fournisseur:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la vérification du statut',
            code: 'STATUS_CHECK_ERROR'
        });
    }
};

module.exports = {
    checkSupplierStatus,
    requireActiveSupplier,
    requireNotSuspended
};
