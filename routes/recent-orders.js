const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Commandes récentes pour le tableau de bord
router.get('/recent', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const roleId = req.user.role_id;

        let query, params;

        if (roleId === 1) { // Acheteur
            query = `
                SELECT c.id, c.total_ttc as montant, c.statut, c.date_commande as date,
                       e.nom_entreprise as fournisseur,
                       GROUP_CONCAT(p.nom SEPARATOR ', ') as produit
                FROM commandes c
                JOIN entreprises e ON c.fournisseur_id = e.id
                JOIN details_commande dc ON c.id = dc.commande_id
                JOIN produits p ON dc.produit_id = p.id
                WHERE c.acheteur_id = ?
                GROUP BY c.id
                ORDER BY c.date_commande DESC
                LIMIT 5
            `;
            params = [userId];
        } else if (roleId === 2) { // Fournisseur
            // Récupérer l'ID de l'entreprise
            const [entreprise] = await db.execute(
                'SELECT id FROM entreprises WHERE utilisateur_id = ?',
                [userId]
            );

            if (entreprise.length === 0) {
                return res.status(404).json({ error: 'Entreprise non trouvée' });
            }

            query = `
                SELECT c.id, c.total_ttc as montant, c.statut, c.date_commande as date,
                       CONCAT(u.nom, ' ', u.prenom) as fournisseur,
                       GROUP_CONCAT(p.nom SEPARATOR ', ') as produit
                FROM commandes c
                JOIN utilisateurs u ON c.acheteur_id = u.id
                JOIN details_commande dc ON c.id = dc.commande_id
                JOIN produits p ON dc.produit_id = p.id
                WHERE c.fournisseur_id = ?
                GROUP BY c.id
                ORDER BY c.date_commande DESC
                LIMIT 5
            `;
            params = [entreprise[0].id];
        }

        const [commandes] = await db.execute(query, params);

        // Formater les données
        const commandesFormatees = commandes.map(cmd => ({
            id: `CMD-${cmd.id.toString().padStart(3, '0')}`,
            fournisseur: cmd.fournisseur,
            produit: cmd.produit,
            montant: parseFloat(cmd.montant),
            statut: cmd.statut,
            date: cmd.date
        }));

        res.json({ commandes: commandesFormatees });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la récupération des commandes récentes' });
    }
});

module.exports = router;