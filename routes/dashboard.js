const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Statistiques du tableau de bord
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const roleId = req.user.role_id;

        let stats = {};

        if (roleId === 1) { // Acheteur
            // Nombre de commandes
            const [commandesCount] = await db.execute(
                'SELECT COUNT(*) as count FROM commandes WHERE acheteur_id = ?',
                [userId]
            );

            // Nombre de fournisseurs distincts
            const [fournisseursCount] = await db.execute(`
                SELECT COUNT(DISTINCT c.fournisseur_id) as count 
                FROM commandes c 
                WHERE c.acheteur_id = ?
            `, [userId]);

            // Nombre de favoris
            let favorisCount = [{ count: 0 }];
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

                [favorisCount] = await db.execute(
                    'SELECT COUNT(*) as count FROM favoris WHERE utilisateur_id = ?',
                    [userId]
                );
            } catch (favError) {
                console.log('Erreur favoris stats:', favError);
            }

            // Économies (simulation basée sur les commandes)
            const [economies] = await db.execute(`
                SELECT COALESCE(SUM(total_ttc * 0.1), 0) as economies 
                FROM commandes 
                WHERE acheteur_id = ? AND statut = 'livree'
            `, [userId]);

            stats = {
                commandes: commandesCount[0].count,
                fournisseurs: fournisseursCount[0].count,
                favoris: favorisCount[0].count,
                economies: Math.round(economies[0].economies)
            };

        } else if (roleId === 2) { // Fournisseur
            // Récupérer l'ID de l'entreprise
            const [entreprise] = await db.execute(
                'SELECT id FROM entreprises WHERE utilisateur_id = ?',
                [userId]
            );

            if (entreprise.length === 0) {
                // Retourner des statistiques vides si l'entreprise n'est pas encore créée
                return res.json({
                    commandes: 0,
                    produits: 0,
                    clients: 0,
                    chiffre_affaires: 0
                });
            }

            const entrepriseId = entreprise[0].id;

            // Nombre de commandes reçues
            const [commandesCount] = await db.execute(
                'SELECT COUNT(*) as count FROM commandes WHERE fournisseur_id = ?',
                [entrepriseId]
            );

            // Nombre de produits
            const [produitsCount] = await db.execute(
                'SELECT COUNT(*) as count FROM produits WHERE fournisseur_id = ?',
                [entrepriseId]
            );

            // Nombre de clients distincts
            const [clientsCount] = await db.execute(`
                SELECT COUNT(DISTINCT c.acheteur_id) as count 
                FROM commandes c 
                WHERE c.fournisseur_id = ?
            `, [entrepriseId]);

            // Chiffre d'affaires
            const [chiffreAffaires] = await db.execute(`
                SELECT COALESCE(SUM(total_ttc), 0) as ca 
                FROM commandes 
                WHERE fournisseur_id = ? AND statut IN ('livree', 'expediee')
            `, [entrepriseId]);

            stats = {
                commandes: commandesCount[0].count,
                produits: produitsCount[0].count,
                clients: clientsCount[0].count,
                chiffre_affaires: Math.round(chiffreAffaires[0].ca)
            };
        }

        res.json(stats);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
    }
});

// Notifications utilisateur
router.get('/notifications', authenticateToken, async (req, res) => {
    try {
        const [notifications] = await db.execute(`
            SELECT * FROM notifications 
            WHERE utilisateur_id = ? 
            ORDER BY created_at DESC 
            LIMIT 10
        `, [req.user.id]);

        res.json({ notifications });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la récupération des notifications' });
    }
});

// Marquer une notification comme lue
router.patch('/notifications/:id/read', authenticateToken, async (req, res) => {
    try {
        await db.execute(
            'UPDATE notifications SET lu = 1 WHERE id = ? AND utilisateur_id = ?',
            [req.params.id, req.user.id]
        );

        res.json({ message: 'Notification marquée comme lue' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour de la notification' });
    }
});

// Favoris utilisateur
router.get('/favorites', authenticateToken, async (req, res) => {
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
            SELECT f.*, p.nom, p.prix_unitaire, p.image_url, e.nom_entreprise as fournisseur
            FROM favoris f
            JOIN produits p ON f.produit_id = p.id
            LEFT JOIN entreprises e ON p.fournisseur_id = e.id
            WHERE f.utilisateur_id = ?
            ORDER BY f.date_ajout DESC
        `, [req.user.id]);

        res.json({ favoris: favoris || [] });

    } catch (error) {
        console.error('Erreur favoris dashboard:', error);
        res.status(200).json({ favoris: [] });
    }
});

// Supprimer un favori
router.delete('/favorites/:productId', authenticateToken, async (req, res) => {
    try {
        await db.execute(
            'DELETE FROM favoris WHERE utilisateur_id = ? AND produit_id = ?',
            [req.user.id, req.params.productId]
        );

        res.json({ message: 'Produit retiré des favoris' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la suppression du favori' });
    }
});

module.exports = router;