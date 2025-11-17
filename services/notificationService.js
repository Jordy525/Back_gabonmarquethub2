const db = require('../config/database');

class NotificationService {
  // Créer une notification admin
  async createAdminNotification(notificationData) {
    const connection = await db.getConnection();
    
    try {
      const {
        type,
        category,
        title,
        message,
        priority = 'medium',
        data = null,
        userId = null,
        productId = null,
        orderId = null
      } = notificationData;

      const [result] = await connection.execute(`
        INSERT INTO admin_notifications (
          type, category, title, message, priority, data, 
          user_id, product_id, order_id, is_read, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW())
      `, [
        type, category, title, message, priority, 
        data ? JSON.stringify(data) : null,
        userId, productId, orderId
      ]);

      console.log(`🔔 Notification admin créée: ${title} (ID: ${result.insertId})`);
      return result.insertId;

    } catch (error) {
      console.error('❌ Erreur création notification admin:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Notifier un nouvel utilisateur inscrit
  async notifyNewUser(userData) {
    const { id, nom, prenom, email, role_id } = userData;
    const roleName = role_id === 1 ? 'Acheteur' : role_id === 2 ? 'Fournisseur' : 'Utilisateur';
    
    return this.createAdminNotification({
      type: 'user_management',
      category: 'new_user',
      title: 'Nouvel utilisateur inscrit',
      message: `${roleName}: ${prenom} ${nom} (${email}) s'est inscrit sur la plateforme`,
      priority: 'medium',
      data: { user: userData },
      userId: id
    });
  }

  // Notifier une demande de vérification d'entreprise
  async notifyVerificationRequest(entrepriseData) {
    const { id, nom_entreprise, secteur, utilisateur_id } = entrepriseData;
    
    return this.createAdminNotification({
      type: 'user_management',
      category: 'verification_request',
      title: 'Demande de vérification d\'entreprise',
      message: `L'entreprise "${nom_entreprise}" (${secteur}) demande une vérification`,
      priority: 'high',
      data: { entreprise: entrepriseData },
      userId: utilisateur_id
    });
  }

  // Notifier un nouveau produit à modérer
  async notifyNewProduct(productData) {
    const { id, nom, prix_unitaire, fournisseur_id } = productData;
    
    return this.createAdminNotification({
      type: 'product_management',
      category: 'product_moderation',
      title: 'Nouveau produit à modérer',
      message: `Produit "${nom}" (${prix_unitaire}FCFA) nécessite une modération`,
      priority: 'medium',
      data: { product: productData },
      productId: id
    });
  }

  // Notifier un produit signalé
  async notifyProductReport(productData, reportReason) {
    const { id, nom } = productData;
    
    return this.createAdminNotification({
      type: 'product_management',
      category: 'product_report',
      title: 'Produit signalé',
      message: `Le produit "${nom}" a été signalé: ${reportReason}`,
      priority: 'high',
      data: { product: productData, reason: reportReason },
      productId: id
    });
  }

  // Notifier une erreur système
  async notifySystemError(errorData) {
    const { module, error, severity = 'medium' } = errorData;
    const priority = severity === 'critical' ? 'urgent' : 
                   severity === 'high' ? 'high' : 'medium';
    
    return this.createAdminNotification({
      type: 'system',
      category: 'system_error',
      title: 'Erreur système',
      message: `Erreur dans le module ${module}: ${error}`,
      priority,
      data: errorData
    });
  }

  // Notifier une alerte de sécurité
  async notifySecurityAlert(alertData) {
    const { type, description, ip, userId } = alertData;
    
    return this.createAdminNotification({
      type: 'system',
      category: 'security_alert',
      title: 'Alerte de sécurité',
      message: `${type}: ${description}${ip ? ` (IP: ${ip})` : ''}`,
      priority: 'urgent',
      data: alertData,
      userId
    });
  }

  // Notifier une commande en attente
  async notifyOrderIssue(orderData) {
    const { id, total, status, userId } = orderData;
    
    return this.createAdminNotification({
      type: 'order_management',
      category: 'order_issue',
      title: 'Commande en attente',
      message: `Commande #${id} (${total}FCFA) - Statut: ${status}`,
      priority: 'high',
      data: orderData,
      orderId: id,
      userId
    });
  }

  // Notifier des statistiques de performance
  async notifyPerformanceStats(statsData) {
    const { responseTime, memoryUsage, cpuUsage } = statsData;
    
    return this.createAdminNotification({
      type: 'system',
      category: 'performance_stats',
      title: 'Rapport de performance',
      message: `Temps de réponse: ${responseTime}s, Mémoire: ${memoryUsage}%, CPU: ${cpuUsage}%`,
      priority: 'low',
      data: statsData
    });
  }
}

module.exports = new NotificationService();