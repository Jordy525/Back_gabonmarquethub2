const express = require('express');
const db = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const router = express.Router();

// Enregistrer une vue de produit
router.post('/products/:id/view', optionalAuth, async (req, res) => {
    try {
        const productId = req.params.id;
        const userId = req.user?.id || null;
        const userAgent = req.get('User-Agent') || '';
        const ipAddress = req.ip || req.connection.remoteAddress;

        // Vérifier que le produit existe
        const [product] = await db.execute(
            'SELECT id FROM produits WHERE id = ? AND statut = "actif"',
            [productId]
        );

        if (product.length === 0) {
            return res.status(404).json({ error: 'Produit non trouvé' });
        }

        // Enregistrer la vue dans la table des statistiques
        const today = new Date().toISOString().split('T')[0];
        
        await db.execute(`
            INSERT INTO statistiques_produits (produit_id, date, vues, created_at)
            VALUES (?, ?, 1, NOW())
            ON DUPLICATE KEY UPDATE vues = vues + 1
        `, [productId, today]);

        // Enregistrer la vue détaillée (optionnel, pour analytics avancées)
        try {
            // La table existe déjà, pas besoin de la créer

            await db.execute(`
                INSERT INTO vues_produits_detaillees (produit_id, utilisateur_id, ip_address, user_agent)
                VALUES (?, ?, ?, ?)
            `, [productId, userId, ipAddress, userAgent]);
        } catch (error) {
            console.log('Erreur enregistrement vue détaillée:', error.message);
        }

        // Mettre à jour seulement la dernière activité (le trigger s'occupe du reste)
        await db.execute(`
            UPDATE produits 
            SET derniere_activite = NOW()
            WHERE id = ?
        `, [productId]);

        res.json({ 
            success: true, 
            message: 'Vue enregistrée',
            productId: parseInt(productId)
        });

    } catch (error) {
        console.error('Erreur enregistrement vue:', error);
        res.status(500).json({ error: 'Erreur lors de l\'enregistrement de la vue' });
    }
});

// Enregistrer un clic sur un produit
router.post('/products/:id/click', optionalAuth, async (req, res) => {
    try {
        const productId = req.params.id;
        const userId = req.user?.id || null;
        const { action = 'view' } = req.body; // 'view', 'favorite', 'share', etc.

        // Vérifier que le produit existe
        const [product] = await db.execute(
            'SELECT id FROM produits WHERE id = ? AND statut = "actif"',
            [productId]
        );

        if (product.length === 0) {
            return res.status(404).json({ error: 'Produit non trouvé' });
        }

        const today = new Date().toISOString().split('T')[0];
        
        // Enregistrer le clic selon l'action
        let updateField = 'clics';
        if (action === 'favorite') {
            updateField = 'ajouts_favoris';
        } else if (action === 'share') {
            updateField = 'partages';
        }

        await db.execute(`
            INSERT INTO statistiques_produits (produit_id, date, ${updateField}, created_at)
            VALUES (?, ?, 1, NOW())
            ON DUPLICATE KEY UPDATE ${updateField} = ${updateField} + 1
        `, [productId, today]);

        res.json({ 
            success: true, 
            message: 'Clic enregistré',
            action,
            productId: parseInt(productId)
        });

    } catch (error) {
        console.error('Erreur enregistrement clic:', error);
        res.status(500).json({ error: 'Erreur lors de l\'enregistrement du clic' });
    }
});

// Récupérer les statistiques d'un produit
router.get('/products/:id/stats', async (req, res) => {
    try {
        const productId = req.params.id;
        const { period = '30d' } = req.query;

        let dateCondition = '';
        if (period === '7d') {
            dateCondition = 'AND date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
        } else if (period === '30d') {
            dateCondition = 'AND date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
        } else if (period === '90d') {
            dateCondition = 'AND date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)';
        }

        // Statistiques agrégées
        const [stats] = await db.execute(`
            SELECT 
                COALESCE(SUM(vues), 0) as total_vues,
                COALESCE(SUM(clics), 0) as total_clics,
                COALESCE(SUM(ajouts_favoris), 0) as total_favoris,
                COALESCE(SUM(partages), 0) as total_partages
            FROM statistiques_produits 
            WHERE produit_id = ? ${dateCondition}
        `, [productId]);

        // Statistiques par jour (derniers 30 jours)
        const [dailyStats] = await db.execute(`
            SELECT 
                date,
                vues,
                clics,
                ajouts_favoris,
                partages
            FROM statistiques_produits 
            WHERE produit_id = ? 
            AND date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            ORDER BY date DESC
        `, [productId]);

        // Informations du produit
        const [product] = await db.execute(`
            SELECT 
                id,
                nom,
                vues_30j,
                score_popularite,
                note_moyenne,
                nombre_avis,
                derniere_activite
            FROM produits 
            WHERE id = ?
        `, [productId]);

        const statsData = stats[0] || {
            total_vues: 0,
            total_clics: 0,
            total_favoris: 0,
            total_partages: 0
        };

        // Convertir les chaînes en nombres
        statsData.total_vues = parseInt(statsData.total_vues) || 0;
        statsData.total_clics = parseInt(statsData.total_clics) || 0;
        statsData.total_favoris = parseInt(statsData.total_favoris) || 0;
        statsData.total_partages = parseInt(statsData.total_partages) || 0;

        res.json({
            product: product[0] || null,
            stats: statsData,
            dailyStats: dailyStats || [],
            period
        });

    } catch (error) {
        console.error('Erreur récupération stats:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
    }
});

// Récupérer les statistiques globales
router.get('/stats/global', async (req, res) => {
    try {
        const { period = '30d' } = req.query;

        let dateCondition = '';
        if (period === '7d') {
            dateCondition = 'AND date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
        } else if (period === '30d') {
            dateCondition = 'AND date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
        } else if (period === '90d') {
            dateCondition = 'AND date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)';
        }

        // Statistiques globales
        const [globalStats] = await db.execute(`
            SELECT 
                COUNT(DISTINCT produit_id) as produits_vus,
                COALESCE(SUM(vues), 0) as total_vues,
                COALESCE(SUM(clics), 0) as total_clics,
                COALESCE(SUM(ajouts_favoris), 0) as total_favoris,
                COALESCE(SUM(partages), 0) as total_partages
            FROM statistiques_produits 
            WHERE 1=1 ${dateCondition}
        `);

        // Top produits par vues
        const [topProducts] = await db.execute(`
            SELECT 
                p.id,
                p.nom,
                p.vues_30j,
                p.score_popularite,
                p.note_moyenne,
                p.nombre_avis,
                e.nom_entreprise as fournisseur
            FROM produits p
            LEFT JOIN entreprises e ON p.fournisseur_id = e.id
            WHERE p.statut = 'actif'
            ORDER BY p.vues_30j DESC, p.score_popularite DESC
            LIMIT 10
        `);

        // Statistiques par catégorie
        const [categoryStats] = await db.execute(`
            SELECT 
                c.nom as categorie,
                COUNT(DISTINCT p.id) as nombre_produits,
                COALESCE(COUNT(sp.id), 0) as total_vues,
                COALESCE(AVG(p.note_moyenne), 0) as note_moyenne
            FROM categories c
            LEFT JOIN produits p ON c.id = p.categorie_id
            LEFT JOIN statistiques_produits sp ON p.id = sp.produit_id ${dateCondition}
            WHERE p.statut = 'actif' OR p.statut IS NULL
            GROUP BY c.id, c.nom
            ORDER BY total_vues DESC
        `);

        res.json({
            global: globalStats[0] || {
                produits_vus: 0,
                total_vues: 0,
                total_clics: 0,
                total_favoris: 0,
                total_partages: 0
            },
            topProducts: topProducts || [],
            categoryStats: categoryStats || [],
            period
        });

    } catch (error) {
        console.error('Erreur récupération stats globales:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des statistiques globales' });
    }
});

// Récupérer les statistiques d'un utilisateur (pour les fournisseurs)
router.get('/user/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { period = '30d' } = req.query;

        let dateCondition = '';
        if (period === '7d') {
            dateCondition = 'AND date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
        } else if (period === '30d') {
            dateCondition = 'AND date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
        } else if (period === '90d') {
            dateCondition = 'AND date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)';
        }

        // Vérifier si l'utilisateur est un fournisseur
        const [user] = await db.execute(
            'SELECT role_id FROM utilisateurs WHERE id = ?',
            [userId]
        );

        if (user.length === 0 || user[0].role_id !== 2) {
            return res.status(403).json({ error: 'Accès non autorisé' });
        }

        // Statistiques des produits du fournisseur
        const [supplierStats] = await db.execute(`
            SELECT 
                COUNT(DISTINCT p.id) as nombre_produits,
                COALESCE(COUNT(sp.id), 0) as total_vues,
                COALESCE(SUM(sp.clics), 0) as total_clics,
                COALESCE(SUM(sp.ajouts_favoris), 0) as total_favoris,
                COALESCE(SUM(sp.partages), 0) as total_partages,
                COALESCE(AVG(p.note_moyenne), 0) as note_moyenne,
                COALESCE(SUM(p.nombre_avis), 0) as total_avis
            FROM produits p
            LEFT JOIN statistiques_produits sp ON p.id = sp.produit_id ${dateCondition}
            WHERE p.fournisseur_id = ? AND p.statut = 'actif'
        `, [userId]);

        // Top produits du fournisseur
        const [topProducts] = await db.execute(`
            SELECT 
                p.id,
                p.nom,
                p.vues_30j,
                p.score_popularite,
                p.note_moyenne,
                p.nombre_avis
            FROM produits p
            WHERE p.fournisseur_id = ? AND p.statut = 'actif'
            ORDER BY p.vues_30j DESC, p.score_popularite DESC
            LIMIT 10
        `, [userId]);

        res.json({
            supplier: supplierStats[0] || {
                nombre_produits: 0,
                total_vues: 0,
                total_clics: 0,
                total_favoris: 0,
                total_partages: 0,
                note_moyenne: 0,
                total_avis: 0
            },
            topProducts: topProducts || [],
            period
        });

    } catch (error) {
        console.error('Erreur récupération stats utilisateur:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des statistiques utilisateur' });
    }
});

module.exports = router;
