const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { 
  upload, 
  validateRequiredDocuments, 
  validateDocumentFormat,
  cleanupFiles,
  getRequiredDocumentTypes 
} = require('../middleware/documentValidation');
const emailService = require('../services/emailService');
const path = require('path');
const fs = require('fs').promises;

// Obtenir les types de documents requis pour un rôle
router.get('/required-types', authenticateToken, (req, res) => {
  try {
    const requiredTypes = getRequiredDocumentTypes(req.user.role_id);
    
    res.json({
      success: true,
      data: requiredTypes
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des types de documents:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Obtenir les documents de l'utilisateur connecté
router.get('/my-documents', authenticateToken, async (req, res) => {
  try {
    const [documents] = await db.execute(`
      SELECT 
        id,
        type_document,
        nom_fichier,
        chemin_fichier,
        statut_validation,
        commentaire_admin,
        date_soumission,
        date_validation
      FROM documents_utilisateur 
      WHERE utilisateur_id = ?
      ORDER BY date_soumission DESC
    `, [req.user.id]);

    res.json({
      success: true,
      data: documents
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des documents:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Soumettre des documents
router.post('/upload', 
  authenticateToken,
  upload.fields([
    { name: 'registre_commerce', maxCount: 1 },
    { name: 'piece_identite', maxCount: 1 },
    { name: 'justificatif_domicile', maxCount: 1 },
    { name: 'autorisation_commerciale', maxCount: 1 }
  ]),
  cleanupFiles,
  validateDocumentFormat,
  async (req, res) => {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const uploadedDocuments = [];

      // Traiter chaque fichier uploadé
      for (const [fieldName, files] of Object.entries(req.files)) {
        const fileArray = Array.isArray(files) ? files : [files];
        
        for (const file of fileArray) {
          // Vérifier si un document de ce type existe déjà
          const [existingDoc] = await connection.execute(`
            SELECT id FROM documents_utilisateur 
            WHERE utilisateur_id = ? AND type_document = ?
          `, [req.user.id, fieldName]);

          if (existingDoc.length > 0) {
            // Mettre à jour le document existant
            await connection.execute(`
              UPDATE documents_utilisateur 
              SET nom_fichier = ?, chemin_fichier = ?, statut_validation = 'en_attente',
                  commentaire_admin = NULL, date_soumission = NOW(), date_validation = NULL
              WHERE id = ?
            `, [file.originalname, file.path, existingDoc[0].id]);

            uploadedDocuments.push({
              id: existingDoc[0].id,
              type: fieldName,
              filename: file.originalname,
              status: 'updated'
            });
          } else {
            // Créer un nouveau document
            const [result] = await connection.execute(`
              INSERT INTO documents_utilisateur 
              (utilisateur_id, type_document, nom_fichier, chemin_fichier, statut_validation, date_soumission)
              VALUES (?, ?, ?, ?, 'en_attente', NOW())
            `, [req.user.id, fieldName, file.originalname, file.path]);

            uploadedDocuments.push({
              id: result.insertId,
              type: fieldName,
              filename: file.originalname,
              status: 'created'
            });
          }
        }
      }

      await connection.commit();

      res.json({
        success: true,
        message: 'Documents soumis avec succès',
        data: uploadedDocuments
      });

    } catch (error) {
      await connection.rollback();
      console.error('Erreur lors de l\'upload des documents:', error);
      
      // Nettoyer les fichiers en cas d'erreur
      if (req.files) {
        for (const files of Object.values(req.files)) {
          const fileArray = Array.isArray(files) ? files : [files];
          for (const file of fileArray) {
            try {
              await fs.unlink(file.path);
            } catch (unlinkError) {
              console.error('Erreur lors de la suppression du fichier:', unlinkError);
            }
          }
        }
      }

      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'upload des documents'
      });
    } finally {
      connection.release();
    }
  }
);

// Télécharger un document (pour l'utilisateur propriétaire)
router.get('/download/:documentId', authenticateToken, async (req, res) => {
  try {
    const [documents] = await db.execute(`
      SELECT chemin_fichier, nom_fichier, type_document
      FROM documents_utilisateur 
      WHERE id = ? AND utilisateur_id = ?
    `, [req.params.documentId, req.user.id]);

    if (documents.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }

    const document = documents[0];
    const filePath = document.chemin_fichier;

    // Vérifier que le fichier existe
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Fichier non trouvé sur le serveur'
      });
    }

    // Définir les headers pour le téléchargement
    res.setHeader('Content-Disposition', `attachment; filename="${document.nom_fichier}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    // Envoyer le fichier
    res.sendFile(path.resolve(filePath));

  } catch (error) {
    console.error('Erreur lors du téléchargement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Supprimer un document
router.delete('/:documentId', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // Récupérer les informations du document
    const [documents] = await connection.execute(`
      SELECT chemin_fichier, statut_validation
      FROM documents_utilisateur 
      WHERE id = ? AND utilisateur_id = ?
    `, [req.params.documentId, req.user.id]);

    if (documents.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }

    const document = documents[0];

    // Vérifier que le document n'est pas déjà validé
    if (document.statut_validation === 'approuve') {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer un document déjà approuvé'
      });
    }

    // Supprimer le document de la base de données
    await connection.execute(`
      DELETE FROM documents_utilisateur 
      WHERE id = ? AND utilisateur_id = ?
    `, [req.params.documentId, req.user.id]);

    // Supprimer le fichier physique
    try {
      await fs.unlink(document.chemin_fichier);
    } catch (fileError) {
      console.error('Erreur lors de la suppression du fichier:', fileError);
      // Ne pas faire échouer la transaction si le fichier n'existe pas
    }

    await connection.commit();

    res.json({
      success: true,
      message: 'Document supprimé avec succès'
    });

  } catch (error) {
    await connection.rollback();
    console.error('Erreur lors de la suppression du document:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  } finally {
    connection.release();
  }
});

// Obtenir le statut de validation des documents
router.get('/validation-status', authenticateToken, async (req, res) => {
  try {
    const [documents] = await db.execute(`
      SELECT 
        type_document,
        statut_validation,
        commentaire_admin,
        date_validation
      FROM documents_utilisateur 
      WHERE utilisateur_id = ?
    `, [req.user.id]);

    const requiredTypes = getRequiredDocumentTypes(req.user.role_id);
    const requiredDocuments = requiredTypes.filter(type => type.required);

    // Calculer le statut global
    let globalStatus = 'incomplete';
    const submittedDocs = documents.map(doc => doc.type_document);
    const missingRequired = requiredDocuments.filter(req => !submittedDocs.includes(req.field));

    if (missingRequired.length === 0) {
      const allApproved = requiredDocuments.every(req => {
        const doc = documents.find(d => d.type_document === req.field);
        return doc && doc.statut_validation === 'approuve';
      });

      const hasRejected = documents.some(doc => doc.statut_validation === 'rejete');
      const hasPending = documents.some(doc => doc.statut_validation === 'en_attente');

      if (allApproved) {
        globalStatus = 'approved';
      } else if (hasRejected) {
        globalStatus = 'rejected';
      } else if (hasPending) {
        globalStatus = 'pending';
      }
    }

    res.json({
      success: true,
      data: {
        globalStatus,
        documents,
        missingRequired: missingRequired.map(req => req.field),
        requiredDocuments: requiredDocuments.map(req => req.field)
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération du statut:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

module.exports = router;