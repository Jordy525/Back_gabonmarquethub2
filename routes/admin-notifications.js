const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// ==================== NOTIFICATIONS ADMIN ====================

// GET /api/admin/notifications - Récupérer toutes les notifications admin
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // Vérifier si la table existe
        const [tables] = await db.execute(`
            SELECT TABLE_NAME 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'admin_notifications'
        `, [process.env.DB_NAME || 'gabon_trade_hub']);

        if (tables.length === 0) {
            return res.json({
                notifications: [],
                total: 0,
                page: 1,
                limit: 50,
                totalPages: 0,
                message: 'Table admin_notifications non trouvée. Exécutez la migration.'
            });
        }

        const { page = 1, limit = 50, type, priority, unread } = req.query;
        const pageNum = parseInt(page);
        const limitNum = Math.min(parseInt(limit), 100);
        const offset = (pageNum - 1) * limitNum;

        let whereClause = 'WHERE 1=1';
        let params = [];

        if (type) {
            whereClause += ' AND type = ?';
            params.push(type);
        }

        if (priority) {
            whereClause += ' AND priority = ?';
            params.push(priority);
        }

        if (unread === 'true') {
            whereClause += ' AND is_read = 0';
        }

        // Vérifier si la table commandes existe
        const [commandesTable] = await db.execute(`
            SELECT TABLE_NAME 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'commandes'
        `, [process.env.DB_NAME || 'gabon_trade_hub']);

        let sqlQuery;
        if (commandesTable.length > 0) {
            // Table commandes existe, inclure le JOIN
            sqlQuery = `
                SELECT 
                    an.*,
                    u.nom as user_nom,
                    u.prenom as user_prenom,
                    u.email as user_email,
                    p.nom as product_nom,
                    c.id as commande_id,
                    c.total as commande_total
                FROM admin_notifications an
                LEFT JOIN utilisateurs u ON an.user_id = u.id
                LEFT JOIN produits p ON an.product_id = p.id
                LEFT JOIN commandes c ON an.order_id = c.id
                ${whereClause}
                ORDER BY an.priority DESC, an.created_at DESC
                LIMIT ? OFFSET ?
            `;
        } else {
            // Table commandes n'existe pas, exclure le JOIN
            sqlQuery = `
                SELECT 
                    an.*,
                    u.nom as user_nom,
                    u.prenom as user_prenom,
                    u.email as user_email,
                    p.nom as product_nom,
                    NULL as commande_id,
                    NULL as commande_total
                FROM admin_notifications an
                LEFT JOIN utilisateurs u ON an.user_id = u.id
                LEFT JOIN produits p ON an.product_id = p.id
                ${whereClause}
                ORDER BY an.priority DESC, an.created_at DESC
                LIMIT ? OFFSET ?
            `;
        }

        const [notifications] = await db.execute(sqlQuery, [...params, limitNum, offset]);

        // Compter le total
        let countQuery = 'SELECT COUNT(*) as total FROM admin_notifications';
        let countParams = [];
        
        if (type) {
            countQuery += ' WHERE type = ?';
            countParams.push(type);
        }

        if (priority) {
            countQuery += (type ? ' AND' : ' WHERE') + ' priority = ?';
            countParams.push(priority);
        }

        if (unread === 'true') {
            countQuery += (type || priority ? ' AND' : ' WHERE') + ' is_read = 0';
        }

        const [countResult] = await db.execute(countQuery, countParams);

        res.json({
            notifications,
            total: countResult[0].total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(countResult[0].total / limitNum)
        });

    } catch (error) {
        console.error('❌ Erreur récupération notifications admin:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des notifications' });
    }
});

// GET /api/admin/notifications/counts - Récupérer les compteurs de notifications
router.get('/counts', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // Vérifier si la table existe
        const [tables] = await db.execute(`
            SELECT TABLE_NAME 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'admin_notifications'
        `, [process.env.DB_NAME || 'gabon_trade_hub']);

        if (tables.length === 0) {
            return res.json({
                total: 0,
                unread: 0,
                byType: {
                    user_management: 0,
                    product_management: 0,
                    system: 0,
                    order_management: 0
                },
                byPriority: {
                    urgent: 0,
                    high: 0,
                    medium: 0,
                    low: 0
                },
                message: 'Table admin_notifications non trouvée. Exécutez la migration.'
            });
        }

        const [counts] = await db.execute(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread,
                SUM(CASE WHEN type = 'user_management' THEN 1 ELSE 0 END) as user_management,
                SUM(CASE WHEN type = 'product_management' THEN 1 ELSE 0 END) as product_management,
                SUM(CASE WHEN type = 'system' THEN 1 ELSE 0 END) as system,
                SUM(CASE WHEN type = 'order_management' THEN 1 ELSE 0 END) as order_management,
                SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as urgent,
                SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high,
                SUM(CASE WHEN priority = 'medium' THEN 1 ELSE 0 END) as medium,
                SUM(CASE WHEN priority = 'low' THEN 1 ELSE 0 END) as low
            FROM admin_notifications
        `);

        const result = counts[0];
        res.json({
            total: result.total || 0,
            unread: result.unread || 0,
            byType: {
                user_management: result.user_management || 0,
                product_management: result.product_management || 0,
                system: result.system || 0,
                order_management: result.order_management || 0
            },
            byPriority: {
                urgent: result.urgent || 0,
                high: result.high || 0,
                medium: result.medium || 0,
                low: result.low || 0
            }
        });

    } catch (error) {
        console.error('❌ Erreur récupération compteurs admin:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des compteurs' });
    }
});

// PATCH /api/admin/notifications/:id/read - Marquer une notification comme lue
router.patch('/:id/read', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const notificationId = req.params.id;
        const adminId = req.user.id;

        const [result] = await db.execute(`
            UPDATE admin_notifications 
            SET is_read = 1, read_at = NOW(), admin_id = ?
            WHERE id = ? AND is_read = 0
        `, [adminId, notificationId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Notification non trouvée ou déjà lue' });
        }

        res.json({ message: 'Notification marquée comme lue' });

    } catch (error) {
        console.error('❌ Erreur marquage notification admin:', error);
        res.status(500).json({ error: 'Erreur lors du marquage de la notification' });
    }
});

// PATCH /api/admin/notifications/mark-all-read - Marquer toutes les notifications comme lues
router.patch('/mark-all-read', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const adminId = req.user.id;

        const [result] = await db.execute(`
            UPDATE admin_notifications 
            SET is_read = 1, read_at = NOW(), admin_id = ?
            WHERE is_read = 0
        `, [adminId]);

        res.json({ 
            message: 'Toutes les notifications marquées comme lues',
            updated: result.affectedRows
        });

    } catch (error) {
        console.error('❌ Erreur marquage toutes notifications admin:', error);
        res.status(500).json({ error: 'Erreur lors du marquage des notifications' });
    }
});

// DELETE /api/admin/notifications/:id - Supprimer une notification
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const notificationId = req.params.id;

        const [result] = await db.execute(`
            DELETE FROM admin_notifications WHERE id = ?
        `, [notificationId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Notification non trouvée' });
        }

        res.json({ message: 'Notification supprimée' });

    } catch (error) {
        console.error('❌ Erreur suppression notification admin:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression de la notification' });
    }
});

// DELETE /api/admin/notifications/delete-read - Supprimer toutes les notifications lues
router.delete('/delete-read', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [result] = await db.execute(`
            DELETE FROM admin_notifications WHERE is_read = 1
        `);

        res.json({ 
            message: 'Notifications lues supprimées',
            deleted: result.affectedRows
        });

    } catch (error) {
        console.error('❌ Erreur suppression notifications lues admin:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression des notifications' });
    }
});

// ==================== FONCTIONS UTILITAIRES ====================

// Créer une notification admin
const createAdminNotification = async (type, category, title, message, priority = 'medium', data = null, userId = null, productId = null, orderId = null) => {
    try {
        const [result] = await db.execute(`
            INSERT INTO admin_notifications (type, category, title, message, priority, data, user_id, product_id, order_id, is_read, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW())
        `, [type, category, title, message, priority, data ? JSON.stringify(data) : null, userId, productId, orderId]);

        return result.insertId;
    } catch (error) {
        console.error('❌ Erreur création notification admin:', error);
        throw error;
    }
};

// ==================== NOTIFICATIONS AUTOMATIQUES ====================

// Notification pour nouveau utilisateur
const notifyNewUser = async (userId, userData) => {
    try {
        await createAdminNotification(
            'user_management',
            'new_user',
            'Nouvel utilisateur inscrit',
            `Un nouvel utilisateur s'est inscrit: ${userData.prenom} ${userData.nom} (${userData.email})`,
            'medium',
            { user: userData },
            userId
        );
        console.log('✅ Notification nouveau utilisateur créée');
    } catch (error) {
        console.error('❌ Erreur notification nouveau utilisateur:', error);
    }
};

// Notification pour demande de vérification d'entreprise
const notifyVerificationRequest = async (entrepriseId, entrepriseData) => {
    try {
        await createAdminNotification(
            'user_management',
            'verification_request',
            'Demande de vérification d\'entreprise',
            `L'entreprise "${entrepriseData.nom_entreprise}" demande une vérification`,
            'high',
            { entreprise: entrepriseData },
            entrepriseData.utilisateur_id
        );
        console.log('✅ Notification demande vérification créée');
    } catch (error) {
        console.error('❌ Erreur notification demande vérification:', error);
    }
};

// Notification pour suspension d'utilisateur
const notifyUserSuspension = async (userId, userData, reason) => {
    try {
        await createAdminNotification(
            'user_management',
            'user_suspension',
            'Utilisateur suspendu',
            `L'utilisateur ${userData.prenom} ${userData.nom} a été suspendu. Raison: ${reason}`,
            'high',
            { user: userData, reason },
            userId
        );
        console.log('✅ Notification suspension utilisateur créée');
    } catch (error) {
        console.error('❌ Erreur notification suspension utilisateur:', error);
    }
};

// Notification pour signalement d'utilisateur
const notifyUserReport = async (reportedUserId, reporterId, reason, reportData) => {
    try {
        await createAdminNotification(
            'user_management',
            'user_report',
            'Signalement d\'utilisateur',
            `Un utilisateur a été signalé. Raison: ${reason}`,
            'urgent',
            { reportedUserId, reporterId, reason, reportData },
            reportedUserId
        );
        console.log('✅ Notification signalement utilisateur créée');
    } catch (error) {
        console.error('❌ Erreur notification signalement utilisateur:', error);
    }
};

// Notification pour nouveau produit à modérer
const notifyProductModeration = async (productId, productData) => {
    try {
        await createAdminNotification(
            'product_management',
            'product_moderation',
            'Nouveau produit à modérer',
            `Un nouveau produit "${productData.nom}" nécessite une modération`,
            'medium',
            { product: productData },
            null,
            productId
        );
        console.log('✅ Notification modération produit créée');
    } catch (error) {
        console.error('❌ Erreur notification modération produit:', error);
    }
};

// Notification pour produit signalé
const notifyProductReport = async (productId, reporterId, reason, productData) => {
    try {
        await createAdminNotification(
            'product_management',
            'product_report',
            'Produit signalé',
            `Le produit "${productData.nom}" a été signalé. Raison: ${reason}`,
            'high',
            { product: productData, reporterId, reason },
            null,
            productId
        );
        console.log('✅ Notification signalement produit créée');
    } catch (error) {
        console.error('❌ Erreur notification signalement produit:', error);
    }
};

// Notification pour demande de modification de produit
const notifyProductModificationRequest = async (productId, productData, changes) => {
    try {
        await createAdminNotification(
            'product_management',
            'product_modification_request',
            'Demande de modification de produit',
            `Le produit "${productData.nom}" nécessite des modifications`,
            'medium',
            { product: productData, changes },
            null,
            productId
        );
        console.log('✅ Notification modification produit créée');
    } catch (error) {
        console.error('❌ Erreur notification modification produit:', error);
    }
};

// Notification pour erreur système
const notifySystemError = async (error, context) => {
    try {
        await createAdminNotification(
            'system',
            'system_error',
            'Erreur système',
            `Une erreur système s'est produite: ${error.message}`,
            'urgent',
            { error: error.message, stack: error.stack, context }
        );
        console.log('✅ Notification erreur système créée');
    } catch (err) {
        console.error('❌ Erreur notification erreur système:', err);
    }
};

// Notification pour alerte de sécurité
const notifySecurityAlert = async (alert, context) => {
    try {
        await createAdminNotification(
            'system',
            'security_alert',
            'Alerte de sécurité',
            `Alerte de sécurité: ${alert.message}`,
            'urgent',
            { alert, context }
        );
        console.log('✅ Notification alerte sécurité créée');
    } catch (error) {
        console.error('❌ Erreur notification alerte sécurité:', error);
    }
};

// Notification pour statistiques de performance
const notifyPerformanceStats = async (stats) => {
    try {
        await createAdminNotification(
            'system',
            'performance_stats',
            'Statistiques de performance',
            `Rapport de performance: ${stats.message}`,
            'low',
            { stats }
        );
        console.log('✅ Notification statistiques performance créée');
    } catch (error) {
        console.error('❌ Erreur notification statistiques performance:', error);
    }
};

// Notification pour maintenance
const notifyMaintenance = async (maintenanceData) => {
    try {
        await createAdminNotification(
            'system',
            'maintenance',
            'Maintenance programmée',
            `Maintenance programmée: ${maintenanceData.message}`,
            'medium',
            { maintenance: maintenanceData }
        );
        console.log('✅ Notification maintenance créée');
    } catch (error) {
        console.error('❌ Erreur notification maintenance:', error);
    }
};

module.exports = {
    router,
    createAdminNotification,
    notifyNewUser,
    notifyVerificationRequest,
    notifyUserSuspension,
    notifyUserReport,
    notifyProductModeration,
    notifyProductReport,
    notifyProductModificationRequest,
    notifySystemError,
    notifySecurityAlert,
    notifyPerformanceStats,
    notifyMaintenance
};
