const express = require('express');
const db = require('../config/database');
const router = express.Router();

// Lister toutes les catégories
router.get('/', async (req, res) => {
    try {
        const [categories] = await db.execute(`
            SELECT c.*, 
                   (SELECT COUNT(*) FROM produits p WHERE p.categorie_id = c.id AND p.statut = 'actif') as nb_produits,
                   parent.nom as parent_nom
            FROM categories c
            LEFT JOIN categories parent ON c.parent_id = parent.id
            WHERE c.actif = 1
            ORDER BY c.ordre, c.nom
        `);

        res.json({ categories });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la récupération des catégories' });
    }
});

// Catégories hiérarchiques (DOIT être avant /:slug)
router.get('/tree', async (req, res) => {
    try {
        const [categories] = await db.execute(`
            SELECT * FROM categories WHERE actif = 1 ORDER BY ordre, nom
        `);

        // Construire l'arbre hiérarchique
        const buildTree = (items, parentId = null) => {
            return items
                .filter(item => item.parent_id === parentId)
                .map(item => ({
                    ...item,
                    children: buildTree(items, item.id)
                }));
        };

        const tree = buildTree(categories);
        res.json({ categories: tree });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la récupération de l\'arbre des catégories' });
    }
});

// Récupérer une catégorie par slug (DOIT être après /tree)
router.get('/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        
        // Récupérer la catégorie principale
        const [categories] = await db.execute(`
            SELECT c.*, 
                   (SELECT COUNT(*) FROM produits p WHERE p.categorie_id = c.id AND p.statut = 'actif') as nb_produits,
                   parent.nom as parent_nom
            FROM categories c
            LEFT JOIN categories parent ON c.parent_id = parent.id
            WHERE c.slug = ? AND c.actif = 1
        `, [slug]);

        if (categories.length === 0) {
            return res.status(404).json({ error: 'Catégorie non trouvée' });
        }

        const category = categories[0];

        // Récupérer les sous-catégories
        const [children] = await db.execute(`
            SELECT c.*, 
                   (SELECT COUNT(*) FROM produits p WHERE p.categorie_id = c.id AND p.statut = 'actif') as nb_produits
            FROM categories c
            WHERE c.parent_id = ? AND c.actif = 1
            ORDER BY c.ordre, c.nom
        `, [category.id]);

        category.children = children;

        res.json({ category });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la récupération de la catégorie' });
    }
});

module.exports = router;