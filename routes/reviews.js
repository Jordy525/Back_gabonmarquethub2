const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Ajouter un avis
router.post('/', [
    authenticateToken,
    body('produit_id').isInt(),
    body('note').isInt({ min: 1, max: 5 }),
    body('commentaire').notEmpty().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { produit_id, note, commentaire } = req.body;
        const utilisateur_id = req.user.id;

        // Créer la table si elle n'existe pas
        await db.execute(`
            CREATE TABLE IF NOT EXISTS avis_produits (
                id INT PRIMARY KEY AUTO_INCREMENT,
                produit_id INT NOT NULL,
                utilisateur_id INT NOT NULL,
                note INT NOT NULL CHECK (note >= 1 AND note <= 5),
                commentaire TEXT,
                achat_verifie BOOLEAN DEFAULT FALSE,
                date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE CASCADE,
                FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user_product_review (produit_id, utilisateur_id)
            )
        `);

        // Ajouter les colonnes aux produits si elles n'existent pas
        try {
            await db.execute('ALTER TABLE produits ADD COLUMN note_moyenne DECIMAL(2,1) DEFAULT 0.0');
            await db.execute('ALTER TABLE produits ADD COLUMN nombre_avis INT DEFAULT 0');
        } catch (e) {
            // Colonnes existent déjà
        }

        await db.execute(
            'INSERT INTO avis_produits (produit_id, utilisateur_id, note, commentaire) VALUES (?, ?, ?, ?)',
            [produit_id, utilisateur_id, note, commentaire]
        );

        // Mettre à jour les stats du produit
        await db.execute(`
            UPDATE produits 
            SET note_moyenne = (SELECT AVG(note) FROM avis_produits WHERE produit_id = ?),
                nombre_avis = (SELECT COUNT(*) FROM avis_produits WHERE produit_id = ?)
            WHERE id = ?
        `, [produit_id, produit_id, produit_id]);

        res.status(201).json({ message: 'Avis ajouté avec succès' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Vous avez déjà donné un avis pour ce produit' });
        }
        console.error('Erreur ajout avis:', error);
        res.status(500).json({ error: 'Erreur lors de l\'ajout de l\'avis' });
    }
});

// Récupérer les avis d'un produit
router.get('/product/:id', async (req, res) => {
    try {
        // Créer la table si elle n'existe pas
        await db.execute(`
            CREATE TABLE IF NOT EXISTS avis_produits (
                id INT PRIMARY KEY AUTO_INCREMENT,
                produit_id INT NOT NULL,
                utilisateur_id INT NOT NULL,
                note INT NOT NULL CHECK (note >= 1 AND note <= 5),
                commentaire TEXT,
                achat_verifie BOOLEAN DEFAULT FALSE,
                date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE CASCADE,
                FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user_product_review (produit_id, utilisateur_id)
            )
        `);

        const [reviews] = await db.execute(`
            SELECT a.*, CONCAT(u.nom, ' ', COALESCE(u.prenom, '')) as utilisateur_nom
            FROM avis_produits a
            JOIN utilisateurs u ON a.utilisateur_id = u.id
            WHERE a.produit_id = ?
            ORDER BY a.date_creation DESC
        `, [req.params.id]);

        res.json(reviews);
    } catch (error) {
        console.error('Erreur avis:', error);
        res.json([]);
    }
});

module.exports = router;