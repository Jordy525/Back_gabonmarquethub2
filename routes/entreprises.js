const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Récupérer une entreprise
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const [entreprises] = await db.execute(`
            SELECT e.*, s.nom as secteur_nom, t.nom as type_nom
            FROM entreprises e
            LEFT JOIN secteurs_activite s ON e.secteur_activite_id = s.id
            LEFT JOIN types_entreprise t ON e.type_entreprise_id = t.id
            WHERE e.id = ?
        `, [req.params.id]);

        if (entreprises.length === 0) {
            return res.status(404).json({ error: 'Entreprise non trouvée' });
        }

        res.json({ entreprise: entreprises[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la récupération de l\'entreprise' });
    }
});

// Mettre à jour une entreprise
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const updates = [];
        const params = [];
        
        Object.keys(req.body).forEach(key => {
            if (req.body[key] !== undefined) {
                updates.push(`${key} = ?`);
                params.push(req.body[key]);
            }
        });
        
        if (updates.length === 0) {
            return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
        }
        
        params.push(req.params.id);
        
        await db.execute(
            `UPDATE entreprises SET ${updates.join(', ')} WHERE id = ?`,
            params
        );

        res.json({ message: 'Entreprise mise à jour avec succès' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }
});

// Route pour récupérer tous les fournisseurs avec statistiques
router.get('/', async (req, res) => {
    try {
        const { search, category, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        
        // Requête simplifiée sans la table reviews qui n'existe pas encore
        let query = `


            SELECT e.*, u.nom, u.prenom, u.id as utilisateur_id,
                   COALESCE(stats.nombre_produits, 0) as nombre_produits,
                   COALESCE(e.note_moyenne, 0) as note_moyenne,
                   COALESCE(e.nombre_avis, 0) as nombre_avis
            FROM entreprises e
            JOIN utilisateurs u ON e.utilisateur_id = u.id
            LEFT JOIN (
                SELECT p.fournisseur_id,
                       COUNT(DISTINCT p.id) as nombre_produits
                FROM produits p
                WHERE p.statut = 'actif' OR p.statut IS NULL
                GROUP BY p.fournisseur_id
            ) stats ON e.id = stats.fournisseur_id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (search) {
            query += ' AND (e.nom_entreprise LIKE ? OR e.description LIKE ? OR u.nom LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        if (category) {
            query += ` AND EXISTS (
                SELECT 1 FROM produits p2 
                JOIN categories c ON p2.categorie_id = c.id 
                WHERE p2.fournisseur_id = e.id AND c.slug = ? AND (p2.statut = 'actif' OR p2.statut IS NULL)
            )`;
            params.push(category);
        }
        
        query += `
            ORDER BY 
                CASE WHEN e.statut_verification = 'verifie' THEN 1 ELSE 2 END,
                COALESCE(e.note_moyenne, 0) DESC, 
                stats.nombre_produits DESC,
                e.created_at DESC
            LIMIT ? OFFSET ?
        `;
        
        params.push(parseInt(limit), parseInt(offset));
        
        console.log('Executing query:', query);
        console.log('With params:', params);
        
        const [entreprises] = await db.execute(query, params);
        
        // Compter le total avec une requête simplifiée
        let countQuery = `
            SELECT COUNT(DISTINCT e.id) as total
            FROM entreprises e
            JOIN utilisateurs u ON e.utilisateur_id = u.id
            WHERE 1=1
        `;
        
        const countParams = [];
        
        if (search) {
            countQuery += ' AND (e.nom_entreprise LIKE ? OR e.description LIKE ? OR u.nom LIKE ?)';
            countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        if (category) {
            countQuery += ` AND EXISTS (
                SELECT 1 FROM produits p2 
                JOIN categories c ON p2.categorie_id = c.id 
                WHERE p2.fournisseur_id = e.id AND c.slug = ? AND (p2.statut = 'actif' OR p2.statut IS NULL)
            )`;
            countParams.push(category);
        }
        
        const [countResult] = await db.execute(countQuery, countParams);
        
        console.log('Found', entreprises.length, 'entreprises');
        
        res.json({
            entreprises,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total,
                pages: Math.ceil(countResult[0].total / limit)
            }
        });
        
    } catch (error) {
        console.error('Erreur détaillée:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération des fournisseurs',
            details: error.message 
        });
    }
});

// GET /api/entreprises/sectors - Récupérer tous les secteurs d'activité (public)
router.get('/sectors', async (req, res) => {
    try {
        const [sectors] = await db.execute(`
            SELECT DISTINCT secteur_activite 
            FROM entreprises 
            WHERE secteur_activite IS NOT NULL AND secteur_activite != ''
            ORDER BY secteur_activite
        `);
        
        const sectorList = sectors.map(row => row.secteur_activite);
        res.json({ sectors: sectorList });
    } catch (error) {
        console.error('Erreur récupération secteurs:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des secteurs' });
    }
});

// GET /api/entreprises/cities - Récupérer toutes les villes (public)
router.get('/cities', async (req, res) => {
    try {
        const [cities] = await db.execute(`
            SELECT DISTINCT ville 
            FROM entreprises 
            WHERE ville IS NOT NULL AND ville != ''
            ORDER BY ville
        `);
        
        const cityList = cities.map(row => row.ville);
        res.json({ cities: cityList });
    } catch (error) {
        console.error('Erreur récupération villes:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des villes' });
    }
});

module.exports = router;