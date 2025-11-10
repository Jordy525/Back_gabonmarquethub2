const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configuration du stockage des documents
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/documents');
    
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `${req.user.id}-${file.fieldname}-${uniqueSuffix}${extension}`);
  }
});

// Filtres pour les types de fichiers acceptés
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non autorisé. Seuls les PDF, images et documents Word sont acceptés.'), false);
  }
};

// Configuration de multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
    files: 10 // Maximum 10 fichiers
  },
  fileFilter: fileFilter
});

// Middleware pour valider les documents requis selon le type d'utilisateur
const validateRequiredDocuments = (req, res, next) => {
  const { role_id } = req.user;
  const requiredFields = [];

  if (role_id === 2) { // Fournisseur
    requiredFields.push(
      'registre_commerce',
      'piece_identite',
      'justificatif_domicile'
    );
  } else if (role_id === 3) { // Acheteur professionnel
    requiredFields.push(
      'piece_identite',
      'justificatif_domicile'
    );
  }

  // Vérifier que tous les champs requis sont présents
  const missingFields = requiredFields.filter(field => !req.files[field]);
  
  if (missingFields.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Documents manquants',
      missingFields: missingFields
    });
  }

  next();
};

// Middleware pour valider la taille et le format des documents
const validateDocumentFormat = (req, res, next) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Aucun document fourni'
    });
  }

  // Valider chaque fichier
  for (const [fieldName, files] of Object.entries(req.files)) {
    const fileArray = Array.isArray(files) ? files : [files];
    
    for (const file of fileArray) {
      // Vérifier la taille
      if (file.size > 5 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message: `Le fichier ${file.originalname} dépasse la taille maximale de 5MB`
        });
      }

      // Vérifier l'extension
      const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
      const fileExtension = path.extname(file.originalname).toLowerCase();
      
      if (!allowedExtensions.includes(fileExtension)) {
        return res.status(400).json({
          success: false,
          message: `Extension de fichier non autorisée pour ${file.originalname}`
        });
      }
    }
  }

  next();
};

// Middleware pour nettoyer les fichiers en cas d'erreur
const cleanupFiles = async (req, res, next) => {
  if (req.files) {
    const filesToCleanup = [];
    
    for (const files of Object.values(req.files)) {
      const fileArray = Array.isArray(files) ? files : [files];
      filesToCleanup.push(...fileArray.map(file => file.path));
    }

    // Nettoyer les fichiers si une erreur survient
    res.on('error', async () => {
      for (const filePath of filesToCleanup) {
        try {
          await fs.unlink(filePath);
        } catch (error) {
          console.error('Erreur lors de la suppression du fichier:', error);
        }
      }
    });
  }

  next();
};

// Types de documents par rôle
const getRequiredDocumentTypes = (roleId) => {
  const documentTypes = {
    2: [ // Fournisseur
      {
        field: 'registre_commerce',
        name: 'Registre de commerce',
        required: true,
        description: 'Document officiel d\'enregistrement de votre entreprise'
      },
      {
        field: 'piece_identite',
        name: 'Pièce d\'identité',
        required: true,
        description: 'Carte d\'identité nationale ou passeport'
      },
      {
        field: 'justificatif_domicile',
        name: 'Justificatif de domicile',
        required: true,
        description: 'Facture d\'électricité, d\'eau ou de téléphone récente'
      },
      {
        field: 'autorisation_commerciale',
        name: 'Autorisation commerciale',
        required: false,
        description: 'Licence ou autorisation spécifique à votre secteur d\'activité'
      }
    ],
    3: [ // Acheteur professionnel
      {
        field: 'piece_identite',
        name: 'Pièce d\'identité',
        required: true,
        description: 'Carte d\'identité nationale ou passeport'
      },
      {
        field: 'justificatif_domicile',
        name: 'Justificatif de domicile',
        required: true,
        description: 'Facture d\'électricité, d\'eau ou de téléphone récente'
      },
      {
        field: 'registre_commerce',
        name: 'Registre de commerce',
        required: false,
        description: 'Document d\'enregistrement de votre entreprise (optionnel)'
      }
    ]
  };

  return documentTypes[roleId] || [];
};

module.exports = {
  upload,
  validateRequiredDocuments,
  validateDocumentFormat,
  cleanupFiles,
  getRequiredDocumentTypes
};