const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

// Créer les tables améliorées pour les avis
async function createReviewTables() {
    try {
        // Table principale des avis avec modération
        await db.execute(`
            CREATE TABLE IF NOT EXISTS avis_produits (
                id INT PRIMARY KEY AUTO_INCREMENT,
                produit_id INT NOT NULL,
                utilisateur_id INT NOT NULL,
                note INT NOT NULL CHECK (note >= 1 AND note <= 5),
                commentaire TEXT,
                achat_verifie BOOLEAN DEFAULT FALSE,
                statut ENUM('en_attente', 'approuve', 'rejete') DEFAULT 'en_attente',
                date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                date_moderation TIMESTAMP NULL,
                moderateur_id INT NULL,
                raison_rejet TEXT NULL,
                ip_address VARCHAR(45),
                user_agent TEXT,
                FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE CASCADE,
                FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
                FOREIGN KEY (moderateur_id) REFERENCES utilisateurs(id) ON DELETE SET NULL,
                UNIQUE KEY unique_user_product_review (produit_id, utilisateur_id),
                INDEX idx_statut (statut),
                INDEX idx_produit_statut (produit_id, statut),
                INDEX idx_date_creation (date_creation)
            )
        `);

        // Table pour les réponses aux avis (fournisseurs)
        await db.execute(`
            CREATE TABLE IF NOT EXISTS reponses_avis (
                id INT PRIMARY KEY AUTO_INCREMENT,
                avis_id INT NOT NULL,
                fournisseur_id INT NOT NULL,
                reponse TEXT NOT NULL,
                date_reponse TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                statut ENUM('en_attente', 'approuve', 'rejete') DEFAULT 'en_attente',
                FOREIGN KEY (avis_id) REFERENCES avis_produits(id) ON DELETE CASCADE,
                FOREIGN KEY (fournisseur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
                INDEX idx_avis (avis_id),
                INDEX idx_fournisseur (fournisseur_id)
            )
        `);

        // Table pour les signalements d'avis
        await db.execute(`
            CREATE TABLE IF NOT EXISTS signalements_avis (
                id INT PRIMARY KEY AUTO_INCREMENT,
                avis_id INT NOT NULL,
                utilisateur_id INT NOT NULL,
                raison ENUM('inapproprié', 'faux', 'spam', 'autre') NOT NULL,
                description TEXT,
                date_signalement TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                statut ENUM('en_attente', 'traite', 'rejete') DEFAULT 'en_attente',
                FOREIGN KEY (avis_id) REFERENCES avis_produits(id) ON DELETE CASCADE,
                FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user_review_report (avis_id, utilisateur_id),
                INDEX idx_avis (avis_id),
                INDEX idx_statut (statut)
            )
        `);

        // Ajouter les colonnes aux produits si elles n'existent pas
        try {
            await db.execute('ALTER TABLE produits ADD COLUMN note_moyenne DECIMAL(3,2) DEFAULT 0.00');
            await db.execute('ALTER TABLE produits ADD COLUMN nombre_avis INT DEFAULT 0');
            await db.execute('ALTER TABLE produits ADD COLUMN nombre_avis_verifies INT DEFAULT 0');
            await db.execute('ALTER TABLE produits ADD COLUMN note_moyenne_verifiee DECIMAL(3,2) DEFAULT 0.00');
        } catch (e) {
            // Colonnes existent déjà
        }

    } catch (error) {
        console.error('Erreur création tables avis:', error);
    }
}

// Ajouter un avis (utilisateur connecté)
router.post('/', [
    authenticateToken,
    body('produit_id').isInt({ min: 1 }),
    body('note').isInt({ min: 1, max: 5 }),
    body('commentaire').isLength({ min: 10, max: 1000 }).trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        await createReviewTables();

        const { produit_id, note, commentaire } = req.body;
        const utilisateur_id = req.user.id;
        const ip_address = req.ip || req.connection.remoteAddress;
        const user_agent = req.get('User-Agent') || '';

        // Vérifier que le produit existe
        const [product] = await db.execute(
            'SELECT id, fournisseur_id FROM produits WHERE id = ? AND statut = "actif"',
            [produit_id]
        );

        if (product.length === 0) {
            return res.status(404).json({ error: 'Produit non trouvé' });
        }

        // Vérifier si l'utilisateur a déjà donné un avis
        const [existingReview] = await db.execute(
            'SELECT id FROM avis_produits WHERE produit_id = ? AND utilisateur_id = ?',
            [produit_id, utilisateur_id]
        );

        if (existingReview.length > 0) {
            return res.status(400).json({ error: 'Vous avez déjà donné un avis pour ce produit' });
        }

        // Vérifier si l'utilisateur a acheté le produit (optionnel)
        let achat_verifie = false;
        try {
            // Ici vous pouvez ajouter une vérification d'achat si vous avez une table de commandes
            // const [purchase] = await db.execute(
            //     'SELECT id FROM commandes WHERE utilisateur_id = ? AND produit_id = ? AND statut = "livre"',
            //     [utilisateur_id, produit_id]
            // );
            // achat_verifie = purchase.length > 0;
        } catch (e) {
            // Pas de système de commandes pour l'instant
        }

        // Insérer l'avis
        const [result] = await db.execute(`
            INSERT INTO avis_produits 
            (produit_id, utilisateur_id, note, commentaire, achat_verifie, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [produit_id, utilisateur_id, note, commentaire, achat_verifie, ip_address, user_agent]);

        // Mettre à jour les statistiques du produit
        await updateProductReviewStats(produit_id);

        res.status(201).json({ 
            message: 'Avis soumis avec succès',
            reviewId: result.insertId,
            status: 'en_attente',
            needsModeration: !achat_verifie
        });

    } catch (error) {
        console.error('Erreur ajout avis:', error);
        res.status(500).json({ error: 'Erreur lors de l\'ajout de l\'avis' });
    }
});

// Récupérer les avis d'un produit (public)
router.get('/product/:id', async (req, res) => {
    try {
        await createReviewTables();

        const { id } = req.params;
        const { page = 1, limit = 10, sort = 'recent' } = req.query;
        const offset = (page - 1) * limit;

        let orderBy = 'a.date_creation DESC';
        if (sort === 'rating_high') {
            orderBy = 'a.note DESC, a.date_creation DESC';
        } else if (sort === 'rating_low') {
            orderBy = 'a.note ASC, a.date_creation DESC';
        } else if (sort === 'verified') {
            orderBy = 'a.achat_verifie DESC, a.date_creation DESC';
        }

        const [reviews] = await db.execute(`
            SELECT 
                a.id,
                a.note,
                a.commentaire,
                a.achat_verifie,
                a.date_creation,
                a.statut,
                CONCAT(u.nom, ' ', COALESCE(u.prenom, '')) as utilisateur_nom,
                NULL as avatar_url,
                r.reponse,
                r.date_reponse,
                e.nom_entreprise as fournisseur_nom
            FROM avis_produits a
            JOIN utilisateurs u ON a.utilisateur_id = u.id
            LEFT JOIN reponses_avis r ON a.id = r.avis_id
            LEFT JOIN entreprises e ON r.fournisseur_id = e.id
            WHERE a.produit_id = ? AND a.statut = 'approuve'
            ORDER BY ${orderBy}
            LIMIT ? OFFSET ?
        `, [id, parseInt(limit), offset]);

        // Compter le total d'avis
        const [totalCount] = await db.execute(
            'SELECT COUNT(*) as total FROM avis_produits WHERE produit_id = ? AND statut = "approuve"',
            [id]
        );

        // Statistiques des notes
        const [ratingStats] = await db.execute(`
            SELECT 
                note,
                COUNT(*) as count
            FROM avis_produits 
            WHERE produit_id = ? AND statut = 'approuve'
            GROUP BY note
            ORDER BY note DESC
        `, [id]);

        res.json({
            reviews: reviews || [],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalCount[0]?.total || 0,
                pages: Math.ceil((totalCount[0]?.total || 0) / limit)
            },
            ratingStats: ratingStats || [],
            sort
        });

    } catch (error) {
        console.error('Erreur récupération avis:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des avis' });
    }
});

// Modérer un avis (admin)
router.put('/:id/moderate', [
    requireRole(3), // Admin seulement
    body('action').isIn(['approve', 'reject']),
    body('reason').optional().isString()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { action, reason } = req.body;
        const moderateur_id = req.user.id;

        const statut = action === 'approve' ? 'approuve' : 'rejete';

        await db.execute(`
            UPDATE avis_produits 
            SET statut = ?, date_moderation = NOW(), moderateur_id = ?, raison_rejet = ?
            WHERE id = ?
        `, [statut, moderateur_id, reason || null, id]);

        // Mettre à jour les statistiques du produit
        const [review] = await db.execute(
            'SELECT produit_id FROM avis_produits WHERE id = ?',
            [id]
        );

        if (review.length > 0) {
            await updateProductReviewStats(review[0].produit_id);
        }

        res.json({ 
            message: `Avis ${action === 'approve' ? 'approuvé' : 'rejeté'} avec succès`,
            status: statut
        });

    } catch (error) {
        console.error('Erreur modération avis:', error);
        res.status(500).json({ error: 'Erreur lors de la modération de l\'avis' });
    }
});

// Répondre à un avis (fournisseur)
router.post('/:id/reply', [
    authenticateToken,
    requireRole(2), // Fournisseur seulement
    body('reponse').isLength({ min: 10, max: 500 }).trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { reponse } = req.body;
        const fournisseur_id = req.user.id;

        // Vérifier que l'avis existe et que le fournisseur peut y répondre
        const [review] = await db.execute(`
            SELECT a.id, p.fournisseur_id 
            FROM avis_produits a
            JOIN produits p ON a.produit_id = p.id
            WHERE a.id = ? AND p.fournisseur_id = ? AND a.statut = 'approuve'
        `, [id, fournisseur_id]);

        if (review.length === 0) {
            return res.status(404).json({ error: 'Avis non trouvé ou accès non autorisé' });
        }

        // Vérifier qu'il n'y a pas déjà une réponse
        const [existingReply] = await db.execute(
            'SELECT id FROM reponses_avis WHERE avis_id = ?',
            [id]
        );

        if (existingReply.length > 0) {
            return res.status(400).json({ error: 'Une réponse existe déjà pour cet avis' });
        }

        await db.execute(`
            INSERT INTO reponses_avis (avis_id, fournisseur_id, reponse)
            VALUES (?, ?, ?)
        `, [id, fournisseur_id, reponse]);

        res.status(201).json({ message: 'Réponse ajoutée avec succès' });

    } catch (error) {
        console.error('Erreur réponse avis:', error);
        res.status(500).json({ error: 'Erreur lors de l\'ajout de la réponse' });
    }
});

// Signaler un avis
router.post('/:id/report', [
    authenticateToken,
    body('raison').isIn(['inapproprié', 'faux', 'spam', 'autre']),
    body('description').optional().isString()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { raison, description } = req.body;
        const utilisateur_id = req.user.id;

        // Vérifier que l'avis existe
        const [review] = await db.execute(
            'SELECT id FROM avis_produits WHERE id = ?',
            [id]
        );

        if (review.length === 0) {
            return res.status(404).json({ error: 'Avis non trouvé' });
        }

        // Vérifier que l'utilisateur n'a pas déjà signalé cet avis
        const [existingReport] = await db.execute(
            'SELECT id FROM signalements_avis WHERE avis_id = ? AND utilisateur_id = ?',
            [id, utilisateur_id]
        );

        if (existingReport.length > 0) {
            return res.status(400).json({ error: 'Vous avez déjà signalé cet avis' });
        }

        await db.execute(`
            INSERT INTO signalements_avis (avis_id, utilisateur_id, raison, description)
            VALUES (?, ?, ?, ?)
        `, [id, utilisateur_id, raison, description || null]);

        res.status(201).json({ message: 'Avis signalé avec succès' });

    } catch (error) {
        console.error('Erreur signalement avis:', error);
        res.status(500).json({ error: 'Erreur lors du signalement de l\'avis' });
    }
});

// Récupérer les avis en attente de modération (admin)
router.get('/pending', requireRole(3), async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const [pendingReviews] = await db.execute(`
            SELECT 
                a.id,
                a.note,
                a.commentaire,
                a.achat_verifie,
                a.date_creation,
                a.ip_address,
                p.nom as produit_nom,
                CONCAT(u.nom, ' ', COALESCE(u.prenom, '')) as utilisateur_nom,
                e.nom_entreprise as fournisseur_nom
            FROM avis_produits a
            JOIN produits p ON a.produit_id = p.id
            JOIN utilisateurs u ON a.utilisateur_id = u.id
            LEFT JOIN entreprises e ON p.fournisseur_id = e.id
            WHERE a.statut = 'en_attente'
            ORDER BY a.date_creation ASC
            LIMIT ? OFFSET ?
        `, [parseInt(limit), offset]);

        const [totalCount] = await db.execute(
            'SELECT COUNT(*) as total FROM avis_produits WHERE statut = "en_attente"'
        );

        res.json({
            reviews: pendingReviews || [],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalCount[0]?.total || 0,
                pages: Math.ceil((totalCount[0]?.total || 0) / limit)
            }
        });

    } catch (error) {
        console.error('Erreur récupération avis en attente:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des avis en attente' });
    }
});

// Fonction utilitaire pour mettre à jour les statistiques d'avis d'un produit
async function updateProductReviewStats(produit_id) {
    try {
        await db.execute(`
            UPDATE produits 
            SET 
                note_moyenne = (
                    SELECT COALESCE(AVG(note), 0)
                    FROM avis_produits 
                    WHERE produit_id = ? AND statut = 'approuve'
                ),
                nombre_avis = (
                    SELECT COUNT(*)
                    FROM avis_produits 
                    WHERE produit_id = ? AND statut = 'approuve'
                ),
                nombre_avis_verifies = (
                    SELECT COUNT(*)
                    FROM avis_produits 
                    WHERE produit_id = ? AND statut = 'approuve' AND achat_verifie = TRUE
                ),
                note_moyenne_verifiee = (
                    SELECT COALESCE(AVG(note), 0)
                    FROM avis_produits 
                    WHERE produit_id = ? AND statut = 'approuve' AND achat_verifie = TRUE
                )
            WHERE id = ?
        `, [produit_id, produit_id, produit_id, produit_id, produit_id]);
    } catch (error) {
        console.error('Erreur mise à jour stats avis:', error);
    }
}

module.exports = router;
