const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { requireActiveSupplier } = require('../middleware/supplierStatus');
const supplierNotificationService = require('../services/supplierNotificationService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Configuration multer pour l'upload d'images de produits
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = 'uploads/products/';
        // Créer le dossier s'il n'existe pas
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB par image
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Seules les images (JPEG, PNG, WebP) sont autorisées'));
        }
    }
});

// Route de test simple
router.get('/test-simple', async (req, res) => {
    res.json({ message: 'Route products fonctionne', timestamp: new Date().toISOString() });
});

// Route pour produits vedettes (version simplifiée)
router.get('/featured', async (req, res) => {
    try {
        // D'abord, vérifier si les tables existent
        const [produits] = await db.execute('SELECT COUNT(*) as count FROM produits');
        const [categories] = await db.execute('SELECT COUNT(*) as count FROM categories');
        const [entreprises] = await db.execute('SELECT COUNT(*) as count FROM entreprises');

        if (produits[0].count === 0) {
            return res.json({ products: [] });
        }

        const query = `
            SELECT p.*, c.nom as categorie_nom, e.nom_entreprise,
                   ip.url as image_principale,
                   0 as note_moyenne,
                   0 as nombre_avis
            FROM produits p
            JOIN categories c ON p.categorie_id = c.id
            JOIN entreprises e ON p.fournisseur_id = e.id
            LEFT JOIN images_produits ip ON p.id = ip.produit_id AND ip.principale = 1
            WHERE p.statut = 'actif'
            ORDER BY p.created_at DESC
            LIMIT 8
        `;

        const [products] = await db.execute(query);
        res.json({ products });
    } catch (error) {
        console.error('Erreur featured products:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des produits vedettes', details: error.message });
    }
});

// Route publique pour acheteurs (version simplifiée)
router.get('/public', async (req, res) => {
    try {
        const { page = 1, limit = 20, categorie, search } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT p.*, c.nom as categorie_nom, e.nom_entreprise,
                   ip.url as image_principale
            FROM produits p
            JOIN categories c ON p.categorie_id = c.id
            JOIN entreprises e ON p.fournisseur_id = e.id
            LEFT JOIN images_produits ip ON p.id = ip.produit_id AND ip.principale = 1
            WHERE p.statut = 'actif'
        `;
        const params = [];

        if (categorie) {
            query += ' AND c.slug = ?';
            params.push(categorie);
        }
        if (search) {
            query += ' AND (p.nom LIKE ? OR p.description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [products] = await db.execute(query, params);

        res.json({ products });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la récupération des produits' });
    }
});

// Route principale avec filtrage par rôle (version simplifiée)
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let userRole = null;
        let userEntrepriseId = null;

        if (req.headers.authorization) {
            try {
                const token = req.headers.authorization.split(' ')[1];
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

                const [userRows] = await db.execute(
                    'SELECT role_id FROM utilisateurs WHERE id = ?',
                    [decoded.id]
                );

                if (userRows.length > 0) {
                    userRole = userRows[0].role_id;

                    if (userRole === 2) {
                        const [entrepriseRows] = await db.execute(
                            'SELECT id FROM entreprises WHERE utilisateur_id = ?',
                            [decoded.id]
                        );
                        if (entrepriseRows.length > 0) {
                            userEntrepriseId = entrepriseRows[0].id;
                        }
                    }
                }
            } catch (error) {
                // Token invalide
            }
        }

        let query = `
            SELECT p.*, c.nom as categorie_nom, e.nom_entreprise,
                   ip.url as image_principale
            FROM produits p
            JOIN categories c ON p.categorie_id = c.id
            JOIN entreprises e ON p.fournisseur_id = e.id
            LEFT JOIN images_produits ip ON p.id = ip.produit_id AND ip.principale = 1
            WHERE p.statut = 'actif'
        `;
        const params = [];

        if (userRole === 2 && userEntrepriseId) {
            query += ' AND p.fournisseur_id = ?';
            params.push(userEntrepriseId);
        }

        query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [products] = await db.execute(query, params);

        res.json({ products });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la récupération des produits' });
    }
});

// Détail d'un produit (version simplifiée)
router.get('/:id', async (req, res) => {
    try {
        const [products] = await db.execute(`
            SELECT p.*, c.nom as categorie_nom, e.nom_entreprise
            FROM produits p
            JOIN categories c ON p.categorie_id = c.id
            JOIN entreprises e ON p.fournisseur_id = e.id
            WHERE p.id = ?
        `, [req.params.id]);

        if (products.length === 0) {
            return res.status(404).json({ error: 'Produit non trouvé' });
        }

        // Récupérer les images du produit
        const [images] = await db.execute(`
            SELECT * FROM images_produits 
            WHERE produit_id = ? 
            ORDER BY ordre
        `, [req.params.id]);

        const product = {
            ...products[0],
            images: images, // Images réelles du produit
            prix_degressifs: [] // Pas de prix dégressifs pour l'instant
        };

        // Parser les champs JSON s'ils existent
        try {
            if (product.couleurs_disponibles) {
                product.couleurs_disponibles = JSON.parse(product.couleurs_disponibles);
            }
            if (product.certifications) {
                product.certifications = JSON.parse(product.certifications);
            }

        } catch (jsonError) {
            console.error('Erreur parsing JSON:', jsonError);
        }

        res.json({ data: product });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la récupération du produit' });
    }
});

// Créer un produit avec support des images
router.post('/', upload.array('images', 10), authenticateToken, requireRole([2]), requireActiveSupplier, async (req, res) => {
    const connection = await db.getConnection();

    try {
        // DEBUG: Vérifier les images reçues
        console.log('🔍 DEBUG BACKEND - Images reçues:');
        console.log('req.files:', req.files);
        console.log('Nombre d\'images:', req.files ? req.files.length : 0);
        if (req.files && req.files.length > 0) {
            req.files.forEach((file, index) => {
                console.log(`Image ${index + 1}:`, {
                    originalname: file.originalname,
                    filename: file.filename,
                    size: file.size,
                    mimetype: file.mimetype,
                    path: file.path
                });
            });
        }

        await connection.beginTransaction();

        const [entreprises] = await connection.execute(
            'SELECT id FROM entreprises WHERE utilisateur_id = ?',
            [req.user.id]
        );

        if (entreprises.length === 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'Profil entreprise non trouvé' });
        }

        const {
            nom, marque, reference_produit, description, description_longue,
            prix_unitaire, moq, stock_disponible, unite, categorie_id,
            fonctionnalites, instructions_utilisation, materiaux,
            couleurs_disponibles, certifications, delai_traitement,
            capacite_approvisionnement, port_depart,
            delai_livraison_estime, politique_retour, garantie,
            video_url, poids, dimensions
        } = req.body;

        if (!nom || !prix_unitaire || !categorie_id || !description_longue) {
            await connection.rollback();
            return res.status(400).json({ error: 'Champs obligatoires manquants' });
        }

        const slug = nom.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        // Traitement des champs JSON
        let couleursJson = null;
        let certificationsJson = null;

        try {
            if (couleurs_disponibles) {
                couleursJson = typeof couleurs_disponibles === 'string'
                    ? couleurs_disponibles
                    : JSON.stringify(couleurs_disponibles);
            }
            if (certifications) {
                certificationsJson = typeof certifications === 'string'
                    ? certifications
                    : JSON.stringify(certifications);
            }

        } catch (jsonError) {
            await connection.rollback();
            return res.status(400).json({ error: 'Erreur dans le format des données JSON' });
        }

        const [result] = await connection.execute(`
            INSERT INTO produits (
                fournisseur_id, categorie_id, nom, slug, marque, reference_produit, 
                description, description_longue, fonctionnalites, instructions_utilisation,
                materiaux, couleurs_disponibles, certifications, delai_traitement,
                capacite_approvisionnement, port_depart,
                delai_livraison_estime, politique_retour, garantie, video_url,
                prix_unitaire, moq, stock_disponible, unite, poids, dimensions, statut
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            entreprises[0].id,
            parseInt(categorie_id),
            nom,
            slug,
            marque || null,
            reference_produit || null,
            description || null,
            description_longue,
            fonctionnalites || null,
            instructions_utilisation || null,
            materiaux || null,
            couleursJson,
            certificationsJson,
            parseInt(delai_traitement) || 7,
            parseInt(capacite_approvisionnement) || null,
            port_depart || null,
            delai_livraison_estime || null,
            politique_retour || null,
            garantie || null,
            video_url || null,
            parseFloat(prix_unitaire),
            parseInt(moq) || 1,
            parseInt(stock_disponible) || 0,
            unite || 'pièce',
            poids ? parseFloat(poids) : null,
            dimensions || null,
            'actif'
        ]);

        const productId = result.insertId;

        // Traitement des images uploadées
        if (req.files && req.files.length > 0) {
            console.log(`📸 ${req.files.length} images uploadées pour le produit ${productId}`);

            // Vérifier que le dossier uploads existe
            const uploadPath = 'uploads/products/';
            if (!fs.existsSync(uploadPath)) {
                console.log('⚠️ Création du dossier uploads/products/');
                fs.mkdirSync(uploadPath, { recursive: true });
            }

            // Insérer les images avec la structure existante
            for (let i = 0; i < req.files.length; i++) {
                const file = req.files[i];
                // Convertir le chemin Windows en URL web
                const webUrl = '/' + file.path.replace(/\\/g, '/');

                console.log(`💾 Insertion image ${i + 1} en base:`, {
                    produit_id: productId,
                    url: webUrl,
                    alt_text: file.originalname,
                    taille_fichier: file.size
                });

                const [imageResult] = await connection.execute(`
                    INSERT INTO images_produits (
                        produit_id, url, alt_text, type_image, taille_fichier, 
                        ordre, principale
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    productId,
                    webUrl,
                    file.originalname,
                    i === 0 ? 'principale' : 'galerie',
                    file.size,
                    i,
                    i === 0 ? 1 : 0 // La première image est principale
                ]);

                console.log(`✅ Image ${i + 1} insérée avec ID:`, imageResult.insertId);
            }
        }

        await connection.commit();

        // Créer une notification admin pour le nouveau produit
        try {
            await notificationService.notifyNewProduct({
                id: productId,
                nom,
                prix_unitaire: parseFloat(prix_unitaire),
                fournisseur_id: entreprises[0].id
            });
            console.log(`🔔 Notification admin créée pour nouveau produit: ${nom}`);
        } catch (notificationError) {
            console.error('❌ Erreur création notification admin:', notificationError);
            // Ne pas faire échouer la création du produit si la notification échoue
        }

        // Créer une notification fournisseur pour le produit en attente
        try {
            await supplierNotificationService.notifyProductPendingModeration(req.user.id, {
                productId: productId,
                productName: nom
            });
            console.log(`🔔 Notification fournisseur créée pour produit en attente: ${nom}`);
        } catch (notificationError) {
            console.error('❌ Erreur création notification fournisseur:', notificationError);
            // Ne pas faire échouer la création du produit si la notification échoue
        }

        res.status(201).json({
            message: 'Produit créé avec succès',
            productId: productId,
            imagesCount: req.files ? req.files.length : 0
        });

    } catch (error) {
        await connection.rollback();
        console.error('🚨 ERREUR CRÉATION PRODUIT - Détails complets:', {
            message: error.message,
            code: error.code,
            errno: error.errno,
            sqlState: error.sqlState,
            sqlMessage: error.sqlMessage,
            sql: error.sql,
            stack: error.stack
        });
        res.status(500).json({
            error: 'Erreur lors de la création du produit',
            details: error.message,
            code: error.code,
            sqlMessage: error.sqlMessage
        });
    } finally {
        connection.release();
    }
});

// Mettre à jour un produit (version simplifiée)
router.put('/:id', authenticateToken, requireRole([2]), requireActiveSupplier, async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [entreprises] = await connection.execute(
            'SELECT id FROM entreprises WHERE utilisateur_id = ?',
            [req.user.id]
        );

        const [produits] = await connection.execute(
            'SELECT id FROM produits WHERE id = ? AND fournisseur_id = ?',
            [req.params.id, entreprises[0].id]
        );

        if (produits.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Produit non trouvé' });
        }

        const updateData = req.body;
        const allowedFields = [
            'nom', 'marque', 'reference_produit', 'description', 'description_longue',
            'prix_unitaire', 'moq', 'stock_disponible', 'unite', 'fonctionnalites',
            'instructions_utilisation', 'materiaux', 'couleurs_disponibles',
            'certifications', 'delai_traitement', 'capacite_approvisionnement',
            'port_depart', 'delai_livraison_estime',
            'politique_retour', 'garantie', 'video_url', 'poids', 'dimensions'
        ];

        const updateFields = [];
        const updateValues = [];

        for (const field of allowedFields) {
            if (updateData[field] !== undefined && updateData[field] !== '') {
                updateFields.push(`${field} = ?`);

                if (field === 'prix_unitaire' || field === 'poids') {
                    updateValues.push(parseFloat(updateData[field]));
                } else if (field === 'moq' || field === 'stock_disponible' || field === 'delai_traitement' || field === 'capacite_approvisionnement') {
                    updateValues.push(parseInt(updateData[field]) || 0);
                } else if (field === 'couleurs_disponibles' || field === 'certifications') {
                    // Traitement des champs JSON
                    try {
                        const jsonValue = typeof updateData[field] === 'string'
                            ? updateData[field]
                            : JSON.stringify(updateData[field]);
                        updateValues.push(jsonValue);
                    } catch (jsonError) {
                        updateValues.push(null);
                    }
                } else {
                    updateValues.push(updateData[field]);
                }
            }
        }

        if (updateFields.length > 0) {
            updateFields.push('updated_at = CURRENT_TIMESTAMP');
            updateValues.push(req.params.id);

            await connection.execute(
                `UPDATE produits SET ${updateFields.join(', ')} WHERE id = ?`,
                updateValues
            );
        }

        await connection.commit();
        res.json({ message: 'Produit mis à jour avec succès' });

    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour du produit' });
    } finally {
        connection.release();
    }
});

// Route pour récupérer les images d'un produit (DEBUG)
router.get('/:id/images', async (req, res) => {
    try {
        const [images] = await db.execute(`
            SELECT * FROM images_produits 
            WHERE produit_id = ? 
            ORDER BY ordre
        `, [req.params.id]);

        console.log(`🖼️ Images trouvées pour produit ${req.params.id}:`, images.length);

        res.json({
            productId: req.params.id,
            images: images,
            count: images.length
        });
    } catch (error) {
        console.error('Erreur récupération images:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des images' });
    }
});

// Supprimer un produit (version simplifiée)
router.delete('/:id', authenticateToken, requireRole([2]), async (req, res) => {
    try {
        // Vérifier que le produit appartient au fournisseur
        const [entreprises] = await db.execute(
            'SELECT id FROM entreprises WHERE utilisateur_id = ?',
            [req.user.id]
        );

        if (entreprises.length === 0) {
            return res.status(400).json({ error: 'Profil entreprise non trouvé' });
        }

        const [produits] = await db.execute(
            'SELECT id, nom FROM produits WHERE id = ? AND fournisseur_id = ?',
            [req.params.id, entreprises[0].id]
        );

        if (produits.length === 0) {
            return res.status(404).json({ error: 'Produit non trouvé ou vous n\'avez pas les droits pour le supprimer' });
        }

        const produit = produits[0];

        // Supprimer le produit
        await db.execute('DELETE FROM produits WHERE id = ?', [req.params.id]);

        res.json({
            message: `Produit "${produit.nom}" supprimé avec succès`,
            productId: req.params.id
        });

    } catch (error) {
        console.error('Erreur suppression produit:', error);
        res.status(500).json({
            error: 'Erreur lors de la suppression du produit',
            details: error.message
        });
    }
});

// Route pour ajouter des images à un produit existant
router.post('/:id/images', upload.array('images', 10), authenticateToken, requireRole([2]), requireActiveSupplier, async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // Vérifier que le produit existe et appartient au fournisseur
        const [entreprises] = await connection.execute(
            'SELECT id FROM entreprises WHERE utilisateur_id = ?',
            [req.user.id]
        );

        if (entreprises.length === 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'Profil entreprise non trouvé' });
        }

        const [produits] = await connection.execute(
            'SELECT id FROM produits WHERE id = ? AND fournisseur_id = ?',
            [req.params.id, entreprises[0].id]
        );

        if (produits.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Produit non trouvé ou vous n\'avez pas les droits' });
        }

        // DEBUG: Vérifier les images reçues
        console.log('🔍 DEBUG BACKEND - Upload images pour produit existant:');
        console.log('Produit ID:', req.params.id);
        console.log('req.files:', req.files);
        console.log('Nombre d\'images:', req.files ? req.files.length : 0);

        if (!req.files || req.files.length === 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'Aucune image fournie' });
        }

        // Récupérer le nombre d'images existantes et vérifier s'il y a une image principale
        const [existingImages] = await connection.execute(
            'SELECT COUNT(*) as count FROM images_produits WHERE produit_id = ?',
            [req.params.id]
        );

        const [principaleImages] = await connection.execute(
            'SELECT COUNT(*) as count FROM images_produits WHERE produit_id = ? AND principale = 1',
            [req.params.id]
        );

        let startOrder = existingImages[0].count;
        let hasMainImage = principaleImages[0].count > 0;

        console.log(`📊 Produit ${req.params.id} - Images existantes: ${startOrder}, Image principale: ${hasMainImage ? 'OUI' : 'NON'}`);

        // Insérer les nouvelles images avec la structure existante
        for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            // Convertir le chemin Windows en URL web
            const webUrl = '/' + file.path.replace(/\\/g, '/');

            // Si pas d'image principale et c'est la première image ajoutée, elle devient principale
            const estPrincipale = !hasMainImage && i === 0;
            const typeImage = estPrincipale ? 'principale' : 'galerie';

            console.log(`💾 Insertion image ${i + 1} pour produit ${req.params.id}:`, {
                url: webUrl,
                alt_text: file.originalname,
                taille_fichier: file.size,
                est_principale: estPrincipale,
                type_image: typeImage
            });

            const [imageResult] = await connection.execute(`
                INSERT INTO images_produits (
                    produit_id, url, alt_text, type_image, taille_fichier, 
                    ordre, principale
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                req.params.id,
                webUrl,
                file.originalname,
                typeImage,
                file.size,
                startOrder + i,
                estPrincipale ? 1 : 0
            ]);

            console.log(`✅ Image ${i + 1} insérée avec ID:`, imageResult.insertId);

            // Après avoir inséré la première image comme principale, les suivantes ne le seront pas
            if (estPrincipale) {
                hasMainImage = true;
            }
        }

        await connection.commit();

        res.status(201).json({
            message: 'Images ajoutées avec succès',
            productId: req.params.id,
            imagesCount: req.files.length
        });

    } catch (error) {
        await connection.rollback();
        console.error('Erreur upload images produit:', error);
        res.status(500).json({
            error: 'Erreur lors de l\'upload des images',
            details: error.message
        });
    } finally {
        connection.release();
    }
});

module.exports = router;