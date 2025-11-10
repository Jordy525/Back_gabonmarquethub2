const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/supplier/products/categories - Récupérer les catégories de produits du fournisseur
router.get('/products/categories', authenticateToken, async (req, res) => {
  try {
    // Récupérer l'ID de l'entreprise
    const [entreprise] = await db.execute(
      'SELECT id FROM entreprises WHERE utilisateur_id = ?',
      [req.user.id]
    );

    if (entreprise.length === 0) {
      return res.json([]);
    }

    // Récupérer les catégories uniques des produits du fournisseur
    const [categories] = await db.execute(`
      SELECT DISTINCT c.id, c.nom, c.slug
      FROM categories c
      INNER JOIN produits p ON c.id = p.categorie_id
      WHERE p.fournisseur_id = ?
      ORDER BY c.nom
    `, [entreprise[0].id]);

    res.json(categories);

  } catch (error) {
    console.error('Erreur récupération catégories produits:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/supplier/status - Récupérer le statut du fournisseur
router.get('/status', authenticateToken, async (req, res) => {
  try {
    // Récupérer les informations de l'utilisateur et de l'entreprise
    const [userRows] = await db.execute(`
      SELECT 
        u.id, u.statut, u.documents_valides,
        e.nom_entreprise
      FROM utilisateurs u 
      LEFT JOIN entreprises e ON u.id = e.utilisateur_id 
      WHERE u.id = ? AND u.role_id = 2
    `, [req.user.id]);

    if (userRows.length === 0) {
      return res.status(404).json({ error: 'Fournisseur non trouvé' });
    }

    const user = userRows[0];

    // Récupérer les documents uploadés
    const [documents] = await db.execute(`
      SELECT type_document, statut_verification
      FROM documents_entreprise 
      WHERE entreprise_id = (
        SELECT id FROM entreprises WHERE utilisateur_id = ?
      )
    `, [req.user.id]);

    // Récupérer les catégories de produits du fournisseur pour déterminer les documents requis
    const [categoriesRows] = await db.execute(`
      SELECT DISTINCT c.slug
      FROM produits p
      JOIN categories c ON p.categorie_id = c.id
      WHERE p.fournisseur_id = (
        SELECT id FROM entreprises WHERE utilisateur_id = ?
      )
    `, [req.user.id]);

    const categorySlugs = categoriesRows.map(row => row.slug);
    
    // Calculer les documents requis basés sur les catégories (logique simplifiée)
    const documentsRequired = [];
    
    // Documents obligatoires pour tous
    documentsRequired.push('certificat_enregistrement', 'certificat_fiscal', 'piece_identite_representant');
    
    // Documents conditionnels basés sur les catégories
    if (categorySlugs.some(slug => 
      ['pharmaceutique', 'alcool', 'agroalimentaire-sensible', 'electronique-soumis-autorisation'].includes(slug)
    )) {
      documentsRequired.push('licence_commerciale');
    }
    
    if (categorySlugs.some(slug => 
      ['alimentaire', 'agricole', 'manufacture'].includes(slug)
    )) {
      documentsRequired.push('certificat_origine');
    }
    
    if (categorySlugs.some(slug => 
      ['electronique', 'jouets', 'cosmetiques', 'equipements-protection'].includes(slug)
    )) {
      documentsRequired.push('conformite_ce');
    }
    
    if (categorySlugs.some(slug => 
      ['alimentaire-frais', 'cosmetiques', 'pharmaceutique'].includes(slug)
    )) {
      documentsRequired.push('certificat_sanitaire');
    }

    const documentsUploaded = documents.map(doc => doc.type_document);
    const documentsValidated = documents
      .filter(doc => doc.statut_verification === 'verifie')
      .map(doc => doc.type_document);

    // Vérifier si tous les documents requis sont validés
    const allRequiredDocumentsValidated = documentsRequired.every(docType => 
      documentsValidated.includes(docType)
    );

    // Le statut est "actif" seulement si l'utilisateur est actif ET tous les documents requis sont validés
    const effectiveStatus = (user.statut === 'actif' && allRequiredDocumentsValidated) ? 'actif' : 'inactif';

    res.json({
      status: effectiveStatus,
      documentsValidated: allRequiredDocumentsValidated,
      companyName: user.nom_entreprise,
      documentsRequired,
      documentsUploaded,
      documentsValidated
    });

  } catch (error) {
    console.error('Erreur supplier status:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/supplier/profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    // Récupérer les informations de l'utilisateur et de l'entreprise
    const [userRows] = await db.execute(`
      SELECT 
        u.id, u.email, u.nom, u.prenom, u.telephone,
        CONCAT(u.nom, ' ', COALESCE(u.prenom, '')) as nom_complet,
        u.telephone as telephone_personnel,
        e.nom_entreprise, e.description, e.site_web, e.logo,
        e.telephone_professionnel, e.adresse_ligne1, e.adresse_ligne2,
        e.ville, e.code_postal, e.pays, e.numero_siret, e.numero_tva,
        e.statut_verification, e.created_at as date_inscription,
        s.nom as secteur_activite, t.nom as type_entreprise,
        e.annee_creation, e.nombre_employes, e.capacite_production,
        e.certifications, e.nom_banque, e.iban, e.nom_titulaire_compte
      FROM utilisateurs u 
      LEFT JOIN entreprises e ON u.id = e.utilisateur_id 
      LEFT JOIN secteurs_activite s ON e.secteur_activite_id = s.id
      LEFT JOIN types_entreprise t ON e.type_entreprise_id = t.id
      WHERE u.id = ? AND u.role_id = 2
    `, [req.user.id]);

    if (userRows.length === 0) {
      return res.status(404).json({ error: 'Profil fournisseur non trouvé' });
    }

    const userData = userRows[0];
    
    // Convertir les dates en chaînes pour éviter les problèmes de sérialisation
    if (userData.date_inscription) {
      userData.date_inscription = userData.date_inscription instanceof Date 
        ? userData.date_inscription.toISOString() 
        : userData.date_inscription.toString();
    }

    res.json({ data: userData });
  } catch (error) {
    console.error('Erreur supplier profile:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/supplier/profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const updates = req.body;
    
    await db.execute(`
      UPDATE entreprises 
      SET nom_entreprise = COALESCE(?, nom_entreprise),
          telephone_professionnel = COALESCE(?, telephone_professionnel),
          site_web = COALESCE(?, site_web),
          description = COALESCE(?, description),
          adresse_ligne1 = COALESCE(?, adresse_ligne1),
          ville = COALESCE(?, ville),
          code_postal = COALESCE(?, code_postal)
      WHERE fournisseur_id = ?
    `, [
      updates.nom_entreprise,
      updates.telephone_professionnel, 
      updates.site_web,
      updates.description,
      updates.adresse_ligne1,
      updates.ville,
      updates.code_postal,
      req.user.id
    ]);

    res.json({ message: 'Profil mis à jour' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/supplier/documents
router.get('/documents', authenticateToken, async (req, res) => {
  try {
    // Récupérer l'ID de l'entreprise
    const [entreprise] = await db.execute(
      'SELECT id FROM entreprises WHERE utilisateur_id = ?',
      [req.user.id]
    );

    if (entreprise.length === 0) {
      return res.json({ documents: [], stats: { total: 0, en_attente: 0, valides: 0, rejetes: 0 } });
    }

    const [rows] = await db.execute(`
      SELECT * FROM documents_entreprise 
      WHERE entreprise_id = ?
      ORDER BY uploaded_at DESC
    `, [entreprise[0].id]);

    // Calculer les statistiques (exclure les documents rejetés du total)
    const activeDocuments = rows.filter(doc => doc.statut_verification !== 'rejete');
    const stats = {
      total: activeDocuments.length, // Seulement les documents actifs (non rejetés)
      en_attente: rows.filter(doc => doc.statut_verification === 'en_attente').length,
      valides: rows.filter(doc => doc.statut_verification === 'verifie').length,
      rejetes: rows.filter(doc => doc.statut_verification === 'rejete').length
    };

    res.json({ documents: rows, stats });
  } catch (error) {
    console.error('Erreur documents:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/supplier/dashboard/stats
router.get('/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Supplier Stats Debug: Début récupération stats pour utilisateur:', req.user.id);
    
    // Récupérer l'ID de l'entreprise
    const [entreprise] = await db.execute(
      'SELECT id FROM entreprises WHERE utilisateur_id = ?',
      [req.user.id]
    );

    console.log('🔍 Supplier Stats Debug: Entreprises trouvées:', entreprise.length);

    if (entreprise.length === 0) {
      console.log('🔍 Supplier Stats Debug: Aucune entreprise trouvée, retour stats vides');
      return res.json({ 
        commandes: 0, 
        produits: 0, 
        clients: 0, 
        chiffre_affaires: 0,
        messages: 0,
        vues: 0
      });
    }

    const entrepriseId = entreprise[0].id;
    console.log('🔍 Supplier Stats Debug: ID entreprise:', entrepriseId);

    // Initialiser les stats par défaut
    let stats = {
      commandes: 0,
      produits: 0,
      clients: 0,
      chiffre_affaires: 0,
      messages: 0,
      vues: 0
    };

    // Statistiques produits (toujours disponible)
    try {
      const [produitsCount] = await db.execute(
        'SELECT COUNT(*) as count FROM produits WHERE fournisseur_id = ?',
        [entrepriseId]
      );
      stats.produits = produitsCount[0].count;
      console.log('🔍 Supplier Stats Debug: Produits:', stats.produits);
    } catch (error) {
      console.log('🔍 Supplier Stats Debug: Erreur produits:', error.message);
    }

    // Statistiques commandes (peut ne pas exister)
    try {
      const [commandesCount] = await db.execute(
        'SELECT COUNT(*) as count FROM commandes WHERE fournisseur_id = ?',
        [entrepriseId]
      );
      stats.commandes = commandesCount[0].count;
      console.log('🔍 Supplier Stats Debug: Commandes:', stats.commandes);
    } catch (error) {
      console.log('🔍 Supplier Stats Debug: Table commandes non trouvée ou erreur:', error.message);
    }

    // Statistiques clients (peut ne pas exister)
    try {
      const [clientsCount] = await db.execute(`
        SELECT COUNT(DISTINCT c.acheteur_id) as count 
        FROM commandes c 
        WHERE c.fournisseur_id = ?
      `, [entrepriseId]);
      stats.clients = clientsCount[0].count;
      console.log('🔍 Supplier Stats Debug: Clients:', stats.clients);
    } catch (error) {
      console.log('🔍 Supplier Stats Debug: Erreur clients:', error.message);
    }

    // Chiffre d'affaires (peut ne pas exister)
    try {
      const [chiffreAffaires] = await db.execute(`
        SELECT COALESCE(SUM(total_ttc), 0) as ca 
        FROM commandes 
        WHERE fournisseur_id = ? AND statut IN ('livree', 'expediee')
      `, [entrepriseId]);
      stats.chiffre_affaires = Math.round(chiffreAffaires[0].ca);
      console.log('🔍 Supplier Stats Debug: CA:', stats.chiffre_affaires);
    } catch (error) {
      console.log('🔍 Supplier Stats Debug: Erreur CA:', error.message);
    }

    // Messages reçus (peut ne pas exister)
    try {
      const [messagesCount] = await db.execute(`
        SELECT COUNT(*) as count 
        FROM conversations c
        WHERE c.fournisseur_id = ?
      `, [entrepriseId]);
      stats.messages = messagesCount[0].count;
      console.log('🔍 Supplier Stats Debug: Messages:', stats.messages);
    } catch (error) {
      console.log('🔍 Supplier Stats Debug: Erreur messages:', error.message);
    }

    // Vues produits (utiliser la table statistiques_vues)
    try {
      const [vuesCount] = await db.execute(`
        SELECT COUNT(*) as total_vues
        FROM statistiques_vues sv
        JOIN produits p ON sv.record_id = p.id
        WHERE sv.table_name = 'produits' AND p.fournisseur_id = ?
      `, [entrepriseId]);
      stats.vues = vuesCount[0].total_vues || 0;
      console.log('🔍 Supplier Stats Debug: Vues:', stats.vues);
    } catch (error) {
      console.log('🔍 Supplier Stats Debug: Erreur vues:', error.message);
    }

    console.log('🔍 Supplier Stats Debug: Stats finales:', stats);
    res.json(stats);

  } catch (error) {
    console.error('🔍 Supplier Stats Debug: ERREUR CRITIQUE:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// GET /api/supplier/products - Route spécifique pour les produits du fournisseur
router.get('/products', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Supplier Products Debug: Début récupération produits pour utilisateur:', req.user.id);
    
    // Récupérer l'ID de l'entreprise
    const [entreprise] = await db.execute(
      'SELECT id FROM entreprises WHERE utilisateur_id = ?',
      [req.user.id]
    );

    console.log('🔍 Supplier Products Debug: Entreprises trouvées:', entreprise.length);
    if (entreprise.length > 0) {
      console.log('🔍 Supplier Products Debug: ID entreprise:', entreprise[0].id);
    }

    if (entreprise.length === 0) {
      console.log('🔍 Supplier Products Debug: Aucune entreprise trouvée pour cet utilisateur');
      return res.json({ products: [] });
    }

    const entrepriseId = entreprise[0].id;

    // Récupérer les produits du fournisseur avec des informations détaillées pour la gestion
    console.log('🔍 Supplier Products Debug: Recherche produits pour entreprise ID:', entrepriseId);
    
    const [products] = await db.execute(`
      SELECT p.*, c.nom as categorie_nom,
             (SELECT url FROM images_produits WHERE produit_id = p.id AND principale = 1 LIMIT 1) as image_principale,
             COALESCE(AVG(r.note), 0) as note_moyenne,
             COUNT(DISTINCT r.id) as nombre_avis,
             p.created_at as date_creation,
             p.updated_at as derniere_modification
      FROM produits p
      JOIN categories c ON p.categorie_id = c.id
      LEFT JOIN avis_produits r ON p.id = r.produit_id
      WHERE p.fournisseur_id = ?
      GROUP BY p.id, p.nom, p.prix_unitaire, p.stock_disponible, p.moq, p.unite, p.statut, p.created_at, p.updated_at, c.nom
      ORDER BY p.created_at DESC
    `, [entrepriseId]);

    console.log('🔍 Supplier Products Debug: Produits trouvés:', products.length);
    if (products.length > 0) {
      console.log('🔍 Supplier Products Debug: Premier produit:', {
        id: products[0].id,
        nom: products[0].nom,
        prix: products[0].prix_unitaire,
        statut: products[0].statut
      });
    }

    res.json({ products });

  } catch (error) {
    console.error('🔍 Supplier Products Debug: ERREUR:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des produits' });
  }
});

// GET /api/supplier/secteurs
router.get('/secteurs', authenticateToken, async (req, res) => {
  try {
    const [secteurs] = await db.execute('SELECT id, nom FROM secteurs_activite ORDER BY nom');
    res.json({ secteurs });
  } catch (error) {
    console.error('Erreur secteurs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/supplier/types-entreprise
router.get('/types-entreprise', authenticateToken, async (req, res) => {
  try {
    const [types] = await db.execute('SELECT id, nom FROM types_entreprise ORDER BY nom');
    res.json({ types });
  } catch (error) {
    console.error('Erreur types entreprise:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/supplier/debug - Route de debug temporaire
router.get('/debug', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Debug Route: Utilisateur connecté:', req.user.id);
    
    // Vérifier l'utilisateur
    const [user] = await db.execute(
      'SELECT id, nom, prenom, email, role_id FROM utilisateurs WHERE id = ?',
      [req.user.id]
    );
    
    // Vérifier l'entreprise
    const [entreprise] = await db.execute(
      'SELECT id, utilisateur_id, nom_entreprise FROM entreprises WHERE utilisateur_id = ?',
      [req.user.id]
    );
    
    // Vérifier tous les produits
    const [allProducts] = await db.execute('SELECT id, fournisseur_id, nom, statut FROM produits');
    
    // Vérifier les produits de cette entreprise si elle existe
    let myProducts = [];
    if (entreprise.length > 0) {
      const [products] = await db.execute(
        'SELECT id, nom, prix_unitaire, stock_disponible, statut FROM produits WHERE fournisseur_id = ?',
        [entreprise[0].id]
      );
      myProducts = products;
    }

    // Vérifier les tables disponibles
    const [tables] = await db.execute("SHOW TABLES");
    const availableTables = tables.map(row => Object.values(row)[0]);
    
    res.json({
      user: user[0] || null,
      entreprise: entreprise[0] || null,
      allProducts: allProducts,
      myProducts: myProducts,
      availableTables: availableTables,
      debug: {
        userId: req.user.id,
        entrepriseFound: entreprise.length > 0,
        entrepriseId: entreprise.length > 0 ? entreprise[0].id : null,
        totalProducts: allProducts.length,
        myProductsCount: myProducts.length,
        hasCommandes: availableTables.includes('commandes'),
        hasConversations: availableTables.includes('conversations'),
        hasStatistiquesVues: availableTables.includes('statistiques_vues')
      }
    });
    
  } catch (error) {
    console.error('Erreur debug:', error);
    res.status(500).json({ error: 'Erreur debug', details: error.message });
  }
});

// GET /api/supplier/stats - Statistiques du fournisseur
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // Récupérer l'ID de l'entreprise
    const [entreprise] = await db.execute(
      'SELECT id FROM entreprises WHERE utilisateur_id = ?',
      [req.user.id]
    );

    if (entreprise.length === 0) {
      return res.json({ 
        totalProducts: 0,
        activeProducts: 0,
        totalViews: 0,
        newMessages: 0,
        averageRating: 0,
        totalReviews: 0
      });
    }

    const entrepriseId = entreprise[0].id;

    // Compter les produits
    const [productsResult] = await db.execute(
      'SELECT COUNT(*) as total, COUNT(CASE WHEN statut = "actif" THEN 1 END) as actifs FROM produits WHERE fournisseur_id = ?',
      [entrepriseId]
    );

    // Compter les vues totales (utiliser la table statistiques_vues)
    const [viewsResult] = await db.execute(
      'SELECT COUNT(*) as total_vues FROM statistiques_vues sp JOIN produits p ON sp.record_id = p.id WHERE sp.table_name = "produits" AND p.fournisseur_id = ?',
      [entrepriseId]
    );

    // Compter les messages non lus via les conversations
    const [messagesResult] = await db.execute(`
      SELECT COUNT(*) as nouveaux 
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE c.fournisseur_id = ? AND m.lu = 0 AND m.expediteur_id != ?
    `, [entrepriseId, req.user.id]);

    // Calculer la note moyenne et nombre d'avis
    const [reviewsResult] = await db.execute(
      'SELECT COALESCE(AVG(note), 0) as note_moyenne, COUNT(*) as total_avis FROM avis_produits ap JOIN produits p ON ap.produit_id = p.id WHERE p.fournisseur_id = ?',
      [entrepriseId]
    );

    res.json({
      totalProducts: productsResult[0].total || 0,
      activeProducts: productsResult[0].actifs || 0,
      totalViews: viewsResult[0].total_vues || 0,
      newMessages: messagesResult[0].nouveaux || 0,
      averageRating: reviewsResult[0].note_moyenne || 0,
      totalReviews: reviewsResult[0].total_avis || 0
    });

  } catch (error) {
    console.error('Erreur stats fournisseur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/supplier/stats-simple - Version simplifiée des stats
router.get('/stats-simple', authenticateToken, async (req, res) => {
  try {
    // Récupérer l'ID de l'entreprise
    const [entreprise] = await db.execute(
      'SELECT id FROM entreprises WHERE utilisateur_id = ?',
      [req.user.id]
    );

    if (entreprise.length === 0) {
      return res.json({ 
        commandes: 0, 
        produits: 0, 
        clients: 0, 
        chiffre_affaires: 0,
        messages: 0,
        vues: 0
      });
    }

    const entrepriseId = entreprise[0].id;

    // Seulement les statistiques de base (produits)
    const [produitsCount] = await db.execute(
      'SELECT COUNT(*) as count FROM produits WHERE fournisseur_id = ?',
      [entrepriseId]
    );

    res.json({
      commandes: 0, // Temporaire
      produits: produitsCount[0].count,
      clients: 0, // Temporaire
      chiffre_affaires: 0, // Temporaire
      messages: 0, // Temporaire
      vues: 0 // Temporaire
    });

  } catch (error) {
    console.error('Erreur stats simple:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/supplier/documents/upload
const multer = require('multer');
const path = require('path');

// Configuration multer pour les documents
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/documents/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'doc-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadDocument = multer({ 
  storage: documentStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format non supporté. Utilisez PDF, JPG ou PNG'));
    }
  }
});

router.post('/documents/upload', authenticateToken, uploadDocument.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    const { type_document } = req.body;
    if (!type_document) {
      return res.status(400).json({ error: 'Type de document requis' });
    }

    // Récupérer l'ID de l'entreprise
    const [entreprise] = await db.execute(
      'SELECT id FROM entreprises WHERE utilisateur_id = ?',
      [req.user.id]
    );

    if (entreprise.length === 0) {
      return res.status(400).json({ error: 'Profil entreprise non trouvé' });
    }

    // Vérifier si un document de ce type existe déjà
    const [existingDoc] = await db.execute(
      'SELECT id FROM documents_entreprise WHERE entreprise_id = ? AND type_document = ?',
      [entreprise[0].id, type_document]
    );

    if (existingDoc.length > 0) {
      // Mettre à jour le document existant
      await db.execute(`
        UPDATE documents_entreprise 
        SET nom_fichier = ?, chemin_fichier = ?, taille_fichier = ?, 
            type_mime = ?, statut_verification = 'en_attente', 
            uploaded_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        req.file.originalname,
        `/uploads/documents/${req.file.filename}`,
        req.file.size,
        req.file.mimetype,
        existingDoc[0].id
      ]);
    } else {
      // Créer un nouveau document
      await db.execute(`
        INSERT INTO documents_entreprise 
        (entreprise_id, type_document, nom_fichier, chemin_fichier, 
         taille_fichier, type_mime, statut_verification)
        VALUES (?, ?, ?, ?, ?, ?, 'en_attente')
      `, [
        entreprise[0].id,
        type_document,
        req.file.originalname,
        `/uploads/documents/${req.file.filename}`,
        req.file.size,
        req.file.mimetype
      ]);
    }

    res.json({ 
      message: 'Document uploadé avec succès',
      filename: req.file.filename
    });

  } catch (error) {
    console.error('Erreur upload document:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload du document' });
  }
});

// GET /api/supplier/messages - Récupérer les messages du fournisseur
router.get('/messages', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    // Récupérer l'ID de l'entreprise
    const [entreprise] = await db.execute(
      'SELECT id FROM entreprises WHERE utilisateur_id = ?',
      [req.user.id]
    );

    if (entreprise.length === 0) {
      return res.json([]);
    }

    const entrepriseId = entreprise[0].id;
    
    // Récupérer les messages récents du fournisseur via les conversations
    const [messages] = await db.execute(`
      SELECT 
        m.id,
        m.conversation_id,
        m.contenu,
        m.expediteur_id,
        m.created_at,
        m.lu,
        m.type,
        m.fichier_url,
        u.nom as expediteur_nom,
        u.prenom as expediteur_prenom,
        c.acheteur_id,
        c.fournisseur_id
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      LEFT JOIN utilisateurs u ON m.expediteur_id = u.id
      WHERE c.fournisseur_id = ?
      ORDER BY m.created_at DESC
      LIMIT ?
    `, [entrepriseId, limit]);

    // Formater les messages pour le frontend
    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      conversation_id: msg.conversation_id,
      contenu: msg.contenu,
      expediteur_id: msg.expediteur_id,
      created_at: msg.created_at,
      lu: Boolean(msg.lu),
      type: msg.type || 'texte',
      fichier_url: msg.fichier_url,
      expediteur: {
        nom: msg.expediteur_nom,
        prenom: msg.expediteur_prenom
      },
      conversation: {
        acheteur_id: msg.acheteur_id,
        fournisseur_id: msg.fournisseur_id
      }
    }));

    res.json(formattedMessages);

  } catch (error) {
    console.error('Erreur récupération messages fournisseur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/supplier/documents/:id/download - Télécharger un document
router.get('/documents/:id/download', authenticateToken, async (req, res) => {
  try {
    const documentId = req.params.id;

    // Récupérer l'ID de l'entreprise
    const [entreprise] = await db.execute(
      'SELECT id FROM entreprises WHERE utilisateur_id = ?',
      [req.user.id]
    );

    if (entreprise.length === 0) {
      return res.status(400).json({ error: 'Profil entreprise non trouvé' });
    }

    // Vérifier que le document appartient à cette entreprise
    const [document] = await db.execute(
      'SELECT * FROM documents_entreprise WHERE id = ? AND entreprise_id = ?',
      [documentId, entreprise[0].id]
    );

    if (document.length === 0) {
      return res.status(404).json({ error: 'Document non trouvé' });
    }

    const path = require('path');
    const filePath = path.join(__dirname, '..', document[0].chemin_fichier);
    
    res.download(filePath, document[0].nom_fichier);

  } catch (error) {
    console.error('Erreur téléchargement document:', error);
    res.status(500).json({ error: 'Erreur lors du téléchargement du document' });
  }
});

// DELETE /api/supplier/documents/:id
router.delete('/documents/:id', authenticateToken, async (req, res) => {
  try {
    const documentId = req.params.id;

    // Récupérer l'ID de l'entreprise
    const [entreprise] = await db.execute(
      'SELECT id FROM entreprises WHERE utilisateur_id = ?',
      [req.user.id]
    );

    if (entreprise.length === 0) {
      return res.status(400).json({ error: 'Profil entreprise non trouvé' });
    }

    // Vérifier que le document appartient à cette entreprise
    const [document] = await db.execute(
      'SELECT * FROM documents_entreprise WHERE id = ? AND entreprise_id = ?',
      [documentId, entreprise[0].id]
    );

    if (document.length === 0) {
      return res.status(404).json({ error: 'Document non trouvé' });
    }

    // Supprimer le fichier physique
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '..', document[0].chemin_fichier);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Supprimer l'enregistrement de la base de données
    await db.execute(
      'DELETE FROM documents_entreprise WHERE id = ?',
      [documentId]
    );

    res.json({ message: 'Document supprimé avec succès' });

  } catch (error) {
    console.error('Erreur suppression document:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du document' });
  }
});

module.exports = router;