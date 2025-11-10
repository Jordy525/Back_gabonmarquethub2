const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Profil utilisateur
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const [users] = await db.execute(`
            SELECT u.id, u.email, u.nom, u.prenom, u.telephone, u.role_id, u.date_inscription as created_at,
                   r.nom as role_nom
            FROM utilisateurs u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = ?
        `, [req.user.id]);

        if (users.length === 0) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        const user = users[0];

        // Si c'est un fournisseur, récupérer les infos entreprise avec relations
        if (user.role_id === 2) {
            const [entreprises] = await db.execute(`
                SELECT e.*, 
                       sa.nom as secteur_activite_nom,
                       te.nom as type_entreprise_nom
                FROM entreprises e
                LEFT JOIN secteurs_activite sa ON e.secteur_activite_id = sa.id
                LEFT JOIN types_entreprise te ON e.type_entreprise_id = te.id
                WHERE e.utilisateur_id = ?
            `, [user.id]);
            
            if (entreprises.length > 0) {
                const entreprise = entreprises[0];
                // Ajouter les objets de relation pour compatibilité frontend
                if (entreprise.secteur_activite_nom) {
                    entreprise.secteur_activite = {
                        id: entreprise.secteur_activite_id,
                        nom: entreprise.secteur_activite_nom
                    };
                }
                if (entreprise.type_entreprise_nom) {
                    entreprise.type_entreprise = {
                        id: entreprise.type_entreprise_id,
                        nom: entreprise.type_entreprise_nom
                    };
                }
                user.entreprise = entreprise;
            }
        }

        // Récupérer les adresses
        const [adresses] = await db.execute(
            'SELECT * FROM adresses WHERE utilisateur_id = ? ORDER BY par_defaut DESC',
            [user.id]
        );
        
        user.adresses = adresses;

        // Convertir les dates en chaînes pour éviter les problèmes de sérialisation
        if (user.created_at) {
            user.created_at = user.created_at instanceof Date 
                ? user.created_at.toISOString() 
                : user.created_at.toString();
        }

        res.json(user);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la récupération du profil' });
    }
});

// Mettre à jour le profil
router.put('/profile', authenticateToken, [
    body('nom').optional().notEmpty().trim(),
    body('prenom').optional().trim(),
    body('telephone').optional().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { nom, prenom, telephone } = req.body;
        const updates = [];
        const params = [];

        if (nom !== undefined) {
            updates.push('nom = ?');
            params.push(nom);
        }
        if (prenom !== undefined) {
            updates.push('prenom = ?');
            params.push(prenom);
        }
        if (telephone !== undefined) {
            updates.push('telephone = ?');
            params.push(telephone);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
        }

        params.push(req.user.id);

        await db.execute(
            `UPDATE utilisateurs SET ${updates.join(', ')} WHERE id = ?`,
            params
        );

        // Récupérer les données mises à jour pour les retourner
        const [users] = await db.execute(`
            SELECT u.id, u.email, u.nom, u.prenom, u.telephone, u.role_id, u.date_inscription as created_at,
                   r.nom as role_nom
            FROM utilisateurs u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = ?
        `, [req.user.id]);

        if (users.length === 0) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        const user = users[0];

        // Si c'est un fournisseur, récupérer les infos entreprise
        if (user.role_id === 2) {
            const [entreprises] = await db.execute(`
                SELECT e.*, 
                       sa.nom as secteur_activite_nom,
                       te.nom as type_entreprise_nom
                FROM entreprises e
                LEFT JOIN secteurs_activite sa ON e.secteur_activite_id = sa.id
                LEFT JOIN types_entreprise te ON e.type_entreprise_id = te.id
                WHERE e.utilisateur_id = ?
            `, [user.id]);
            
            if (entreprises.length > 0) {
                const entreprise = entreprises[0];
                if (entreprise.secteur_activite_nom) {
                    entreprise.secteur_activite = {
                        id: entreprise.secteur_activite_id,
                        nom: entreprise.secteur_activite_nom
                    };
                }
                if (entreprise.type_entreprise_nom) {
                    entreprise.type_entreprise = {
                        id: entreprise.type_entreprise_id,
                        nom: entreprise.type_entreprise_nom
                    };
                }
                user.entreprise = entreprise;
            }
        }

        // Convertir les dates en chaînes pour éviter les problèmes de sérialisation
        if (user.created_at) {
            user.created_at = user.created_at instanceof Date 
                ? user.created_at.toISOString() 
                : user.created_at.toString();
        }

        res.json(user);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour du profil' });
    }
});

// Ajouter une adresse
router.post('/addresses', authenticateToken, [
    body('type').isIn(['facturation', 'livraison']),
    body('adresse_ligne1').notEmpty().trim(),
    body('ville').notEmpty().trim(),
    body('code_postal').notEmpty().trim(),
    body('pays').notEmpty().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { type, nom_complet, adresse_ligne1, adresse_ligne2, ville, code_postal, pays, telephone, par_defaut } = req.body;

        // Si c'est l'adresse par défaut, désactiver les autres
        if (par_defaut) {
            await db.execute(
                'UPDATE adresses SET par_defaut = 0 WHERE utilisateur_id = ? AND type = ?',
                [req.user.id, type]
            );
        }

        const [result] = await db.execute(`
            INSERT INTO adresses (utilisateur_id, type, nom_complet, adresse_ligne1, adresse_ligne2, ville, code_postal, pays, telephone, par_defaut)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [req.user.id, type, nom_complet, adresse_ligne1, adresse_ligne2, ville, code_postal, pays, telephone, par_defaut || false]);

        res.status(201).json({
            message: 'Adresse ajoutée avec succès',
            addressId: result.insertId
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de l\'ajout de l\'adresse' });
    }
});

module.exports = router;