// Exemples d'intégration des notifications admin dans les routes existantes

const { 
  notifyNewUser,
  notifyVerificationRequest,
  notifyUserSuspension,
  notifyUserReport,
  notifyProductModeration,
  notifyProductReport,
  notifyProductModificationRequest,
  notifySystemError,
  notifySecurityAlert,
  notifyPerformanceStats,
  notifyMaintenance
} = require('../routes/admin-notifications');

// ==================== EXEMPLES D'INTÉGRATION ====================

// 1. Dans la route d'inscription d'utilisateur (auth.js)
async function handleUserRegistration(userData) {
  try {
    // ... logique d'inscription existante ...
    
    // Créer une notification pour l'admin
    await notifyNewUser(userData.id, {
      nom: userData.nom,
      prenom: userData.prenom,
      email: userData.email,
      role: userData.role
    });
    
    console.log('✅ Notification nouveau utilisateur créée');
  } catch (error) {
    console.error('❌ Erreur notification nouveau utilisateur:', error);
  }
}

// 2. Dans la route de demande de vérification d'entreprise (entreprises.js)
async function handleVerificationRequest(entrepriseData) {
  try {
    // ... logique de demande de vérification existante ...
    
    // Créer une notification pour l'admin
    await notifyVerificationRequest(entrepriseData.id, {
      nom_entreprise: entrepriseData.nom_entreprise,
      utilisateur_id: entrepriseData.utilisateur_id,
      secteur_activite: entrepriseData.secteur_activite
    });
    
    console.log('✅ Notification demande vérification créée');
  } catch (error) {
    console.error('❌ Erreur notification demande vérification:', error);
  }
}

// 3. Dans la route de suspension d'utilisateur (admin.js)
async function handleUserSuspension(userId, reason, adminId) {
  try {
    // ... logique de suspension existante ...
    
    // Créer une notification pour l'admin
    await notifyUserSuspension(userId, {
      id: userId,
      nom: userData.nom,
      prenom: userData.prenom
    }, reason);
    
    console.log('✅ Notification suspension utilisateur créée');
  } catch (error) {
    console.error('❌ Erreur notification suspension utilisateur:', error);
  }
}

// 4. Dans la route de signalement d'utilisateur
async function handleUserReport(reportedUserId, reporterId, reason, reportData) {
  try {
    // ... logique de signalement existante ...
    
    // Créer une notification pour l'admin
    await notifyUserReport(reportedUserId, reporterId, reason, {
      reportedUser: reportData.reportedUser,
      reporter: reportData.reporter,
      context: reportData.context
    });
    
    console.log('✅ Notification signalement utilisateur créée');
  } catch (error) {
    console.error('❌ Erreur notification signalement utilisateur:', error);
  }
}

// 5. Dans la route d'ajout de produit (products.js)
async function handleNewProduct(productData) {
  try {
    // ... logique d'ajout de produit existante ...
    
    // Créer une notification pour l'admin
    await notifyProductModeration(productData.id, {
      nom: productData.nom,
      description: productData.description,
      prix: productData.prix,
      fournisseur_id: productData.fournisseur_id,
      categorie: productData.categorie
    });
    
    console.log('✅ Notification modération produit créée');
  } catch (error) {
    console.error('❌ Erreur notification modération produit:', error);
  }
}

// 6. Dans la route de signalement de produit
async function handleProductReport(productId, reporterId, reason, productData) {
  try {
    // ... logique de signalement existante ...
    
    // Créer une notification pour l'admin
    await notifyProductReport(productId, reporterId, reason, {
      nom: productData.nom,
      fournisseur: productData.fournisseur,
      description: productData.description
    });
    
    console.log('✅ Notification signalement produit créée');
  } catch (error) {
    console.error('❌ Erreur notification signalement produit:', error);
  }
}

// 7. Dans la route de demande de modification de produit
async function handleProductModificationRequest(productId, changes, productData) {
  try {
    // ... logique de demande de modification existante ...
    
    // Créer une notification pour l'admin
    await notifyProductModificationRequest(productId, {
      nom: productData.nom,
      currentData: productData,
      requestedChanges: changes
    }, changes);
    
    console.log('✅ Notification modification produit créée');
  } catch (error) {
    console.error('❌ Erreur notification modification produit:', error);
  }
}

// 8. Dans le gestionnaire d'erreurs global
async function handleSystemError(error, context) {
  try {
    // ... logique de gestion d'erreur existante ...
    
    // Créer une notification pour l'admin
    await notifySystemError(error, {
      context: context,
      timestamp: new Date().toISOString(),
      stack: error.stack
    });
    
    console.log('✅ Notification erreur système créée');
  } catch (notifError) {
    console.error('❌ Erreur notification erreur système:', notifError);
  }
}

// 9. Dans le système de sécurité
async function handleSecurityAlert(alert, context) {
  try {
    // ... logique de sécurité existante ...
    
    // Créer une notification pour l'admin
    await notifySecurityAlert(alert, {
      context: context,
      timestamp: new Date().toISOString(),
      severity: alert.severity
    });
    
    console.log('✅ Notification alerte sécurité créée');
  } catch (error) {
    console.error('❌ Erreur notification alerte sécurité:', error);
  }
}

// 10. Dans le système de monitoring
async function handlePerformanceStats(stats) {
  try {
    // ... logique de monitoring existante ...
    
    // Créer une notification pour l'admin
    await notifyPerformanceStats({
      responseTime: stats.avgResponseTime,
      memoryUsage: stats.memoryUsage,
      cpuUsage: stats.cpuUsage,
      activeUsers: stats.activeUsers,
      timestamp: new Date().toISOString()
    });
    
    console.log('✅ Notification statistiques performance créée');
  } catch (error) {
    console.error('❌ Erreur notification statistiques performance:', error);
  }
}

// 11. Dans le système de maintenance
async function handleMaintenance(maintenanceData) {
  try {
    // ... logique de maintenance existante ...
    
    // Créer une notification pour l'admin
    await notifyMaintenance({
      type: maintenanceData.type,
      scheduledDate: maintenanceData.scheduledDate,
      duration: maintenanceData.duration,
      description: maintenanceData.description,
      affectedServices: maintenanceData.affectedServices
    });
    
    console.log('✅ Notification maintenance créée');
  } catch (error) {
    console.error('❌ Erreur notification maintenance:', error);
  }
}

// ==================== MIDDLEWARE D'INTÉGRATION ====================

// Middleware pour capturer les erreurs et créer des notifications
function errorNotificationMiddleware(error, req, res, next) {
  // Créer une notification d'erreur système
  handleSystemError(error, {
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id
  });
  
  next(error);
}

// Middleware pour capturer les tentatives de sécurité
function securityNotificationMiddleware(req, res, next) {
  // Détecter les tentatives suspectes
  const suspiciousPatterns = [
    /\.\.\//, // Path traversal
    /<script/i, // XSS
    /union.*select/i, // SQL injection
    /admin.*login/i // Admin brute force
  ];
  
  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(req.url) || pattern.test(req.body?.toString() || '')
  );
  
  if (isSuspicious) {
    handleSecurityAlert({
      type: 'suspicious_request',
      message: 'Tentative de requête suspecte détectée',
      severity: 'high'
    }, {
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  }
  
  next();
}

module.exports = {
  handleUserRegistration,
  handleVerificationRequest,
  handleUserSuspension,
  handleUserReport,
  handleNewProduct,
  handleProductReport,
  handleProductModificationRequest,
  handleSystemError,
  handleSecurityAlert,
  handlePerformanceStats,
  handleMaintenance,
  errorNotificationMiddleware,
  securityNotificationMiddleware
};
