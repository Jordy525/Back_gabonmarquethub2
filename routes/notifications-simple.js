const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// GET /api/notifications - Récupérer les notifications de l'utilisateur
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20, type, unread } = req.query;
        
        console.log('📬 Récupération notifications pour utilisateur:', userId);
        
        const pageNum = parseInt(page);
        const limitNum = Math.min(parseInt(limit), 50);
        const offset = (pageNum - 1) * limitNum;
        
        // Requête avec champs cohérents pour le frontend
        let query = `
            SELECT 
                n.id,
                n.utilisateur_id,
                n.titre,
                n.message,
                n.type,
                n.lu,
                COALESCE(n.created_at, n.date_creation) as created_at,
                n.url
            FROM notifications n
            WHERE n.utilisateur_id = ?
        `;
        let params = [userId];

        if (type) {
            query += ' AND n.type = ?';
            params.push(type);
        }

        if (unread === 'true') {
            query += ' AND n.lu = 0';
        }

        query += ' ORDER BY COALESCE(n.created_at, n.date_creation) DESC LIMIT ? OFFSET ?';
        params.push(limitNum, offset);

        const [notifications] = await db.execute(query, params);

        // Compter le total pour la pagination
        let countQuery = 'SELECT COUNT(*) as total FROM notifications WHERE utilisateur_id = ?';
        let countParams = [userId];

        if (type) {
            countQuery += ' AND type = ?';
            countParams.push(type);
        }

        if (unread === 'true') {
            countQuery += ' AND lu = 0';
        }

        const [countResult] = await db.execute(countQuery, countParams);
        const total = countResult[0].total;

        // Compter les notifications non lues
        const [unreadResult] = await db.execute(
            'SELECT COUNT(*) as unread FROM notifications WHERE utilisateur_id = ? AND lu = 0',
            [userId]
        );
        const unreadCount = unreadResult[0].unread;

        console.log('✅ Notifications récupérées:', notifications.length, 'pour utilisateur:', userId);

        res.json({
            success: true,
            data: notifications,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            },
            unreadCount
        });
        
    } catch (error) {
        console.error('❌ Erreur récupération notifications:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erreur lors de la récupération des notifications' 
        });
    }
});

// GET /api/notifications/unread-count - Nombre de notifications non lues
router.get('/unread-count', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const [result] = await db.execute(
            'SELECT COUNT(*) as count FROM notifications WHERE utilisateur_id = ? AND lu = 0',
            [userId]
        );
        
        res.json({
            success: true,
            count: result[0].count
        });
        
    } catch (error) {
        console.error('❌ Erreur comptage notifications:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erreur lors du comptage des notifications' 
        });
    }
});

// PATCH /api/notifications/:id/read - Marquer une notification comme lue
router.patch('/:id/read', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const notificationId = req.params.id;
        
        const [result] = await db.execute(
            'UPDATE notifications SET lu = 1 WHERE id = ? AND utilisateur_id = ?',
            [notificationId, userId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: 'Notification non trouvée'
            });
        }
        
        res.json({
            success: true,
            message: 'Notification marquée comme lue'
        });
        
    } catch (error) {
        console.error('❌ Erreur marquage notification:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erreur lors du marquage de la notification' 
        });
    }
});

// PATCH /api/notifications/read-all - Marquer toutes les notifications comme lues
router.patch('/read-all', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        await db.execute(
            'UPDATE notifications SET lu = 1 WHERE utilisateur_id = ? AND lu = 0',
            [userId]
        );
        
        res.json({
            success: true,
            message: 'Toutes les notifications marquées comme lues'
        });
        
    } catch (error) {
        console.error('❌ Erreur marquage toutes notifications:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erreur lors du marquage de toutes les notifications' 
        });
    }
});

// DELETE /api/notifications/:id - Supprimer une notification
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const notificationId = req.params.id;
        
        const [result] = await db.execute(
            'DELETE FROM notifications WHERE id = ? AND utilisateur_id = ?',
            [notificationId, userId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: 'Notification non trouvée'
            });
        }
        
        res.json({
            success: true,
            message: 'Notification supprimée'
        });
        
    } catch (error) {
        console.error('❌ Erreur suppression notification:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erreur lors de la suppression de la notification' 
        });
    }
});

// Fonctions utilitaires pour créer des notifications
const createNotification = async (utilisateurId, titre, message, type = 'systeme') => {
    try {
        // Vérifier que le type est valide selon l'enum de la base
        const validTypes = ['commande', 'message', 'promotion', 'systeme'];
        if (!validTypes.includes(type)) {
            type = 'systeme';
        }
        
        const [result] = await db.execute(`
            INSERT INTO notifications (utilisateur_id, titre, message, type, lu)
            VALUES (?, ?, ?, ?, 0)
        `, [utilisateurId, titre, message, type]);

        return result.insertId;
    } catch (error) {
        console.error('Erreur création notification:', error);
        throw error;
    }
};

module.exports = {
    router,
    createNotification
};