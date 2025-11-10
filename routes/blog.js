const express = require('express');
const db = require('../config/database');
const router = express.Router();

// Fonction pour obtenir une image par défaut selon la catégorie
const getDefaultBlogImage = (category) => {
  const defaultImages = {
    'Conseils': 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800&h=400&fit=crop',
    'Tendances': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop',
    'Actualités': 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=400&fit=crop',
    'Technologie': 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=400&fit=crop',
    'Business': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop',
    'Marketing': 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=400&fit=crop',
    'Finance': 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=400&fit=crop',
    'Développement': 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=400&fit=crop'
  };
  
  return defaultImages[category] || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=400&fit=crop';
};

// Articles de blog mock pour le fallback (en cas d'erreur)
const mockArticles = [
  {
    id: 1,
    title: "Guide Complet du Commerce B2B au Gabon",
    slug: "guide-commerce-b2b-gabon",
    excerpt: "Découvrez les meilleures pratiques pour réussir dans le commerce B2B au Gabon. Conseils d'experts et stratégies éprouvées.",
    content: "Contenu complet de l'article...",
    author: "Équipe Gabon Market Hub",
    publishedAt: "2025-09-15",
    category: "Conseils",
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=400&fit=crop",
    views: 1250,
    readTime: 8,
    featured: true,
    tags: ["B2B", "Commerce", "Gabon", "Stratégie"]
  },
  {
    id: 2,
    title: "Comment Choisir le Bon Fournisseur B2B",
    slug: "choisir-fournisseur-b2b",
    excerpt: "Les critères essentiels pour sélectionner des fournisseurs fiables et performants pour votre entreprise.",
    content: "Contenu complet de l'article...",
    author: "Marie Nguema",
    publishedAt: "2025-09-14",
    category: "Conseils",
    image: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=400&fit=crop",
    views: 890,
    readTime: 6,
    featured: false,
    tags: ["Fournisseur", "Sélection", "B2B", "Qualité"]
  },
  {
    id: 3,
    title: "Tendances du E-commerce en Afrique Centrale",
    slug: "tendances-ecommerce-afrique-centrale",
    excerpt: "Analyse des dernières tendances du commerce électronique dans la région et opportunités pour les entreprises gabonaises.",
    content: "Contenu complet de l'article...",
    author: "Dr. Jean-Baptiste",
    publishedAt: "2025-09-13",
    category: "Actualités",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop",
    views: 2100,
    readTime: 10,
    featured: true,
    tags: ["E-commerce", "Afrique", "Tendances", "Innovation"]
  },
  {
    id: 4,
    title: "Stratégies de Marketing Digital pour les PME",
    slug: "strategies-marketing-digital-pme",
    excerpt: "Comment les petites et moyennes entreprises peuvent tirer parti du marketing digital pour développer leur activité.",
    content: "Contenu complet de l'article...",
    author: "Sarah Mboumba",
    publishedAt: "2025-09-12",
    category: "Marketing",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop",
    views: 750,
    readTime: 7,
    featured: false,
    tags: ["Marketing", "Digital", "PME", "Stratégie"]
  },
  {
    id: 5,
    title: "L'Importance de la Logistique dans le B2B",
    slug: "importance-logistique-b2b",
    excerpt: "Comment optimiser votre chaîne logistique pour améliorer la satisfaction client et réduire les coûts.",
    content: "Contenu complet de l'article...",
    author: "Pierre Ondo",
    publishedAt: "2025-09-11",
    category: "Logistique",
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&h=400&fit=crop",
    views: 980,
    readTime: 9,
    featured: false,
    tags: ["Logistique", "B2B", "Optimisation", "Coûts"]
  }
];

const mockCategories = [
  { id: 1, name: "Conseils", slug: "conseils", articleCount: 15 },
  { id: 2, name: "Actualités", slug: "actualites", articleCount: 8 },
  { id: 3, name: "Tendances", slug: "tendances", articleCount: 12 },
  { id: 4, name: "Technologie", slug: "technologie", articleCount: 6 },
  { id: 5, name: "Marketing", slug: "marketing", articleCount: 10 },
  { id: 6, name: "Logistique", slug: "logistique", articleCount: 7 }
];

// GET /api/blog/featured - Articles à la une
router.get('/featured', (req, res) => {
  try {
    const featuredArticles = mockArticles.filter(article => article.featured);
    res.json({
      success: true,
      articles: featuredArticles,
      total: featuredArticles.length
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des articles à la une:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des articles à la une'
    });
  }
});

// GET /api/blog/recent - Articles récents
router.get('/recent', async (req, res) => {
  try {
    const { search, category, limit = 10, page = 1 } = req.query;
    
    // Construction de la requête SQL
    let whereConditions = ['est_publie = 1'];
    let queryParams = [];
    
    // Filtrer par catégorie
    if (category) {
      whereConditions.push('categorie = ?');
      queryParams.push(category);
    }
    
    // Filtrer par recherche
    if (search) {
      whereConditions.push('(titre LIKE ? OR extrait LIKE ? OR contenu LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Requête pour compter le total
    const countQuery = `SELECT COUNT(*) as total FROM articles_blog ${whereClause}`;
    const [countResult] = await db.execute(countQuery, queryParams);
    const total = countResult[0].total;
    
    // Requête pour récupérer les articles avec pagination
    const offset = (page - 1) * limit;
    const articlesQuery = `
      SELECT 
        id, titre as title, slug, extrait as excerpt, contenu as content,
        auteur_nom as author, categorie as category, image_principale as image,
        nombre_vues as views, temps_lecture as readTime, est_a_la_une as featured,
        tags, date_publication as publishedAt
      FROM articles_blog 
      ${whereClause}
      ORDER BY date_publication DESC
      LIMIT ? OFFSET ?
    `;
    
    const [articles] = await db.execute(articlesQuery, [...queryParams, parseInt(limit), offset]);
    
    // Transformer les données pour correspondre au format attendu
    const transformedArticles = articles.map(article => ({
      id: article.id,
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt || '',
      content: article.content,
      author: article.author,
      publishedAt: article.publishedAt ? new Date(article.publishedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      category: article.category,
      image: article.image || getDefaultBlogImage(article.category),
      views: article.views || 0,
      readTime: article.readTime || 5,
      featured: Boolean(article.featured),
      tags: article.tags ? JSON.parse(article.tags) : []
    }));
    
    res.json({
      success: true,
      articles: transformedArticles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des articles récents:', error);
    
    // Fallback vers les données mock en cas d'erreur
    const { search, category, limit = 10, page = 1 } = req.query;
    let filteredArticles = [...mockArticles];
    
    if (category) {
      filteredArticles = filteredArticles.filter(article => 
        article.category.toLowerCase() === category.toLowerCase()
      );
    }
    
    if (search) {
      const searchTerm = search.toLowerCase();
      filteredArticles = filteredArticles.filter(article =>
        article.title.toLowerCase().includes(searchTerm) ||
        article.excerpt.toLowerCase().includes(searchTerm) ||
        article.content.toLowerCase().includes(searchTerm)
      );
    }
    
    filteredArticles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedArticles = filteredArticles.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      articles: paginatedArticles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredArticles.length,
        totalPages: Math.ceil(filteredArticles.length / limit)
      }
    });
  }
});

// GET /api/blog/categories - Catégories d'articles
router.get('/categories', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT DISTINCT categorie FROM articles_blog WHERE est_publie = 1 AND categorie IS NOT NULL'
    );
    
    const categories = rows.map(row => row.categorie).filter(Boolean);
    
    res.json({
      success: true,
      categories: categories,
      total: categories.length
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories:', error);
    
    // Fallback vers les données mock
    res.json({
      success: true,
      categories: mockCategories,
      total: mockCategories.length
    });
  }
});

// GET /api/blog/article/:slug - Article individuel
router.get('/article/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Récupérer l'article depuis la base de données
    const [rows] = await db.execute(
      'SELECT * FROM articles_blog WHERE slug = ? AND est_publie = 1',
      [slug]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Article non trouvé'
      });
    }
    
    const article = rows[0];
    
    // Incrémenter le nombre de vues
    await db.execute(
      'UPDATE articles_blog SET nombre_vues = nombre_vues + 1 WHERE id = ?',
      [article.id]
    );
    
    // Transformer les données pour correspondre au format attendu
    const transformedArticle = {
      id: article.id,
      title: article.titre,
      slug: article.slug,
      excerpt: article.extrait || '',
      content: article.contenu,
      author: article.auteur_nom,
      publishedAt: article.date_publication ? new Date(article.date_publication).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      category: article.categorie,
      image: article.image_principale || getDefaultBlogImage(article.category),
      views: (article.nombre_vues || 0) + 1,
      readTime: article.temps_lecture || 5,
      featured: Boolean(article.est_a_la_une),
      tags: article.tags ? JSON.parse(article.tags) : []
    };
    
    res.json({
      success: true,
      article: transformedArticle
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'article:', error);
    
    // Fallback vers les données mock
    const { slug } = req.params;
    const article = mockArticles.find(article => article.slug === slug);
    
    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article non trouvé'
      });
    }
    
    article.views += 1;
    
    res.json({
      success: true,
      article: article
    });
  }
});

// GET /api/blog/popular - Articles populaires
router.get('/popular', async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const [rows] = await db.execute(
      `SELECT 
        id, titre as title, slug, extrait as excerpt, contenu as content,
        auteur_nom as author, categorie as category, image_principale as image,
        nombre_vues as views, temps_lecture as readTime, est_a_la_une as featured,
        tags, date_publication as publishedAt
      FROM articles_blog 
      WHERE est_publie = 1
      ORDER BY nombre_vues DESC
      LIMIT ?`,
      [parseInt(limit)]
    );
    
    // Transformer les données pour correspondre au format attendu
    const transformedArticles = rows.map(article => ({
      id: article.id,
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt || '',
      content: article.content,
      author: article.author,
      publishedAt: article.publishedAt ? new Date(article.publishedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      category: article.category,
      image: article.image || getDefaultBlogImage(article.category),
      views: article.views || 0,
      readTime: article.readTime || 5,
      featured: Boolean(article.featured),
      tags: article.tags ? JSON.parse(article.tags) : []
    }));
    
    res.json({
      success: true,
      articles: transformedArticles,
      total: transformedArticles.length
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des articles populaires:', error);
    
    // Fallback vers les données mock
    const { limit = 5 } = req.query;
    const popularArticles = [...mockArticles]
      .sort((a, b) => b.views - a.views)
      .slice(0, parseInt(limit));
    
    res.json({
      success: true,
      articles: popularArticles,
      total: popularArticles.length
    });
  }
});

module.exports = router;