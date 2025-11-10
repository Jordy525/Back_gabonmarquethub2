const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const db = require('../config/database');

const router = express.Router();

// Configuration de multer pour l'upload d'images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/profiles');
    
    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Générer un nom unique : userId_timestamp.extension
    const userId = req.user.id;
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    const filename = `profile_${userId}_${timestamp}${extension}`;
    cb(null, filename);
  }
});

// Filtre pour accepter seulement les images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Seules les images (JPEG, JPG, PNG, GIF, WEBP) sont autorisées'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  }
});

// Route pour uploader une photo de profil
router.post('/upload', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Aucun fichier fourni'
      });
    }

    const userId = req.user.id;
    const photoPath = `/uploads/profiles/${req.file.filename}`;

    // Supprimer l'ancienne photo si elle existe
    const [existingUser] = await db.execute(
      'SELECT photo_profil FROM utilisateurs WHERE id = ?',
      [userId]
    );

    if (existingUser.length > 0 && existingUser[0].photo_profil) {
      const oldPhotoPath = path.join(__dirname, '..', existingUser[0].photo_profil);
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }

    // Mettre à jour la base de données
    await db.execute(
      'UPDATE utilisateurs SET photo_profil = ? WHERE id = ?',
      [photoPath, userId]
    );

    res.json({
      success: true,
      message: 'Photo de profil mise à jour avec succès',
      data: {
        photo_profil: photoPath,
        filename: req.file.filename
      }
    });

  } catch (error) {
    console.error('Erreur upload photo profil:', error);
    
    // Supprimer le fichier uploadé en cas d'erreur
    if (req.file) {
      const filePath = path.join(__dirname, '../uploads/profiles', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'upload de la photo de profil'
    });
  }
});

// Route pour récupérer la photo de profil d'un utilisateur
router.get('/:userId?', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    
    const [users] = await db.execute(
      'SELECT id, nom, prenom, email, photo_profil FROM utilisateurs WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }

    const user = users[0];
    
    res.json({
      success: true,
      data: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        photo_profil: user.photo_profil
      }
    });

  } catch (error) {
    console.error('Erreur récupération photo profil:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de la photo de profil'
    });
  }
});

// Route pour supprimer la photo de profil
router.delete('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Récupérer le chemin de l'ancienne photo
    const [existingUser] = await db.execute(
      'SELECT photo_profil FROM utilisateurs WHERE id = ?',
      [userId]
    );

    if (existingUser.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }

    const oldPhotoPath = existingUser[0].photo_profil;

    // Supprimer le fichier physique
    if (oldPhotoPath) {
      const fullPath = path.join(__dirname, '..', oldPhotoPath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    // Mettre à jour la base de données
    await db.execute(
      'UPDATE utilisateurs SET photo_profil = NULL WHERE id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: 'Photo de profil supprimée avec succès'
    });

  } catch (error) {
    console.error('Erreur suppression photo profil:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression de la photo de profil'
    });
  }
});

// Route pour servir les images de profil
router.get('/image/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const imagePath = path.join(__dirname, '../uploads/profiles', filename);

    // Vérifier que le fichier existe
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({
        success: false,
        error: 'Image non trouvée'
      });
    }

    // Déterminer le type MIME
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'image/jpeg';
    
    switch (ext) {
      case '.png':
        contentType = 'image/png';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
    }

    res.setHeader('Content-Type', contentType);
    res.sendFile(imagePath);

  } catch (error) {
    console.error('Erreur serveur image:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du chargement de l\'image'
    });
  }
});

module.exports = router;
