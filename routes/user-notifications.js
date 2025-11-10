const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const userNotificationService = require('../services/userNotificationService');
const router = express.Router();

// ==================== ROUTES NOTIFICATIONS UTILISATEURS ====================

// GET /api/notifications - Récupérer les notifications de l'utilisateur connecté
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 50, type, category, unread } = req.query;
        const userId = req.user.id;

        const result = await userNotificationService.getUserNotifications(userId, {
            page: parseInt(page),
            limit: Math.min(parseInt(limit), 100),
            type,
            category,
            unread
        });

        res.json(result);

    } catch (error) {
        console.error('❌ Erreur récupération notifications utilisateur:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des notifications' });
    }
});

// GET /api/notifications/counts - Récupérer les compteurs de notifications
router.get('/counts', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const counts = await userNotificationService.getNotificationCounts(userId);

        res.json(counts);

    } catch (error) {
        console.error('❌ Erreur récupération compteurs notifications:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des compteurs' });
    }
});

// PATCH /api/notifications/:id/read - Marquer une notification comme lue
router.patch('/:id/read', authenticateToken, async (req, res) => {
    try {
        const notificationId = parseInt(req.params.id);
        const userId = req.user.id;

        if (isNaN(notificationId)) {
            return res.status(400).json({ error: 'ID de notification invalide' });
        }

        await userNotificationService.markAsRead(notificationId, userId);

        res.json({ message: 'Notification marquée comme lue' });

    } catch (error) {
        console.error('❌ Erreur marquage notification:', error);
        res.status(500).json({ error: 'Erreur lors du marquage de la notification' });
    }
});

// PATCH /api/notifications/mark-all-read - Marquer toutes les notifications comme lues
router.patch('/mark-all-read', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        await userNotificationService.markAllAsRead(userId);

        res.json({ message: 'Toutes les notifications marquées comme lues' });

    } catch (error) {
        console.error('❌ Erreur marquage toutes notifications:', error);
        res.status(500).json({ error: 'Erreur lors du marquage des notifications' });
    }
});

// DELETE /api/notifications/delete-read - Supprimer toutes les notifications lues
router.delete('/delete-read', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const connection = await db.getConnection();

        try {
            const [result] = await connection.execute(`
                DELETE FROM notifications 
                WHERE utilisateur_id = ? AND lu = 1
            `, [userId]);

            res.json({ 
                message: 'Notifications lues supprimées',
                deletedCount: result.affectedRows
            });

        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('❌ Erreur suppression notifications lues:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression des notifications' });
    }
});

// DELETE /api/notifications/:id - Supprimer une notification
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const notificationId = parseInt(req.params.id);
        const userId = req.user.id;

        if (isNaN(notificationId)) {
            return res.status(400).json({ error: 'ID de notification invalide' });
        }

        await userNotificationService.deleteNotification(notificationId, userId);

        res.json({ message: 'Notification supprimée' });

    } catch (error) {
        console.error('❌ Erreur suppression notification:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression de la notification' });
    }
});

// ==================== ROUTES DE TEST (À SUPPRIMER EN PRODUCTION) ====================

// POST /api/notifications/test - Créer des notifications de test
router.post('/test', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, count = 5 } = req.body;

        const testNotifications = [];

        // Créer des notifications de test selon le type d'utilisateur
        if (req.user.role_id === 1) { // Acheteur
            for (let i = 0; i < count; i++) {
                const notificationId = await userNotificationService.notifyNewMessageFromSupplier(
                    userId,
                    {
                        supplierId: 1,
                        supplierName: `Fournisseur Test ${i + 1}`,
                        conversationId: 100 + i
                    },
                    {
                        message: `Message de test ${i + 1} - Bonjour, j'ai une question sur votre produit.`,
                        messageId: 200 + i
                    }
                );
                testNotifications.push(notificationId);
            }
        } else if (req.user.role_id === 2) { // Fournisseur
            for (let i = 0; i < count; i++) {
                const notificationId = await userNotificationService.notifyNewMessageFromBuyer(
                    userId,
                    {
                        buyerId: 1,
                        buyerName: `Acheteur Test ${i + 1}`,
                        conversationId: 100 + i
                    },
                    {
                        message: `Message de test ${i + 1} - Je suis intéressé par votre produit.`,
                        messageId: 200 + i
                    }
                );
                testNotifications.push(notificationId);
            }
        }

        res.json({
            message: `${count} notifications de test créées`,
            notificationIds: testNotifications
        });

    } catch (error) {
        console.error('❌ Erreur création notifications test:', error);
        res.status(500).json({ error: 'Erreur lors de la création des notifications de test' });
    }
});

module.exports = router;
