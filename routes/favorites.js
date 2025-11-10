const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Récupérer les favoris de l'utilisateur
router.get('/', authenticateToken, async (req, res) => {
    try {
        // Créer la table favoris si elle n'existe pas
        await db.execute(`
            CREATE TABLE IF NOT EXISTS favoris (
                id INT PRIMARY KEY AUTO_INCREMENT,
                utilisateur_id INT NOT NULL,
                produit_id INT NOT NULL,
                date_ajout TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
                FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user_product (utilisateur_id, produit_id)
            )
        `);


        const [favoris] = await db.execute(`
            SELECT p.*, f.date_ajout,
                   (SELECT url FROM images_produits WHERE produit_id = p.id AND principale = 1 LIMIT 1) as image_principale
            FROM favoris f
            JOIN produits p ON f.produit_id = p.id
            WHERE f.utilisateur_id = ?
            ORDER BY f.date_ajout DESC
        `, [req.user.id]);

        res.json(favoris || []);
    } catch (error) {
        console.error('Erreur favoris:', error);
        res.status(200).json([]);
    }
});

// Ajouter un produit aux favoris
router.post('/', authenticateToken, [
    body('produit_id').isInt({ min: 1 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { produit_id } = req.body;

        // Créer la table favoris si elle n'existe pas
        await db.execute(`
            CREATE TABLE IF NOT EXISTS favoris (
                id INT PRIMARY KEY AUTO_INCREMENT,
                utilisateur_id INT NOT NULL,
                produit_id INT NOT NULL,
                date_ajout TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
                FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user_product (utilisateur_id, produit_id)
            )
        `);

        // Ajouter aux favoris (ignore si déjà présent)
        await db.execute(`
            INSERT IGNORE INTO favoris (utilisateur_id, produit_id)
            VALUES (?, ?)
        `, [req.user.id, produit_id]);

        // Enregistrer l'ajout aux favoris dans les statistiques
        const today = new Date().toISOString().split('T')[0];
        await db.execute(`
            INSERT INTO statistiques_produits (produit_id, date, ajouts_favoris, created_at)
            VALUES (?, ?, 1, NOW())
            ON DUPLICATE KEY UPDATE ajouts_favoris = ajouts_favoris + 1
        `, [produit_id, today]);

        res.status(201).json({ message: 'Produit ajouté aux favoris' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de l\'ajout aux favoris' });
    }
});

// Vérifier si un produit est en favori
router.get('/check/:productId', authenticateToken, async (req, res) => {
    try {
        // Créer la table si elle n'existe pas
        await db.execute(`
            CREATE TABLE IF NOT EXISTS favoris (
                id INT PRIMARY KEY AUTO_INCREMENT,
                utilisateur_id INT NOT NULL,
                produit_id INT NOT NULL,
                date_ajout TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
                FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user_product (utilisateur_id, produit_id)
            )
        `);

        const [favoris] = await db.execute(
            'SELECT id FROM favoris WHERE utilisateur_id = ? AND produit_id = ?',
            [req.user.id, req.params.productId]
        );

        res.json({ is_favorite: favoris.length > 0 });

    } catch (error) {
        console.error(error);
        res.json({ is_favorite: false });
    }
});

// Supprimer un produit des favoris
router.delete('/:productId', authenticateToken, async (req, res) => {
    try {
        const productId = req.params.productId;
        
        // Vérifier que le favori existe avant de le supprimer
        const [favorite] = await db.execute(
            'SELECT id FROM favoris WHERE utilisateur_id = ? AND produit_id = ?',
            [req.user.id, productId]
        );

        if (favorite.length === 0) {
            return res.status(404).json({ error: 'Produit non trouvé dans les favoris' });
        }

        await db.execute(
            'DELETE FROM favoris WHERE utilisateur_id = ? AND produit_id = ?',
            [req.user.id, productId]
        );

        // Mettre à jour les statistiques (décrémenter le compteur)
        const today = new Date().toISOString().split('T')[0];
        await db.execute(`
            UPDATE statistiques_produits 
            SET ajouts_favoris = GREATEST(ajouts_favoris - 1, 0)
            WHERE produit_id = ? AND date = ?
        `, [productId, today]);

        res.json({ message: 'Produit retiré des favoris' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});

// Récupérer les statistiques des favoris d'un produit
router.get('/stats/:productId', async (req, res) => {
    try {
        const productId = req.params.productId;
        const { period = '30d' } = req.query;

        let dateCondition = '';
        if (period === '7d') {
            dateCondition = 'AND date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
        } else if (period === '30d') {
            dateCondition = 'AND date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
        } else if (period === '90d') {
            dateCondition = 'AND date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)';
        }

        // Statistiques des favoris
        const [favoriteStats] = await db.execute(`
            SELECT 
                COALESCE(SUM(ajouts_favoris), 0) as total_favoris,
                COUNT(DISTINCT date) as jours_actifs
            FROM statistiques_produits 
            WHERE produit_id = ? ${dateCondition}
        `, [productId]);

        // Nombre total de favoris actuels
        const [totalFavorites] = await db.execute(
            'SELECT COUNT(*) as total FROM favoris WHERE produit_id = ?',
            [productId]
        );

        res.json({
            productId: parseInt(productId),
            totalFavorites: totalFavorites[0]?.total || 0,
            periodStats: favoriteStats[0] || {
                total_favoris: 0,
                jours_actifs: 0
            },
            period
        });

    } catch (error) {
        console.error('Erreur stats favoris:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
    }
});

module.exports = router;