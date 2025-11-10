const userNotificationService = require('./userNotificationService');

class SupplierNotificationService {
  // ==================== NOTIFICATIONS MESSAGES ====================

  // Nouveau message d'un acheteur
  async notifyNewMessageFromBuyer(supplierId, buyerData, messageData) {
    const { buyerId, buyerName, conversationId } = buyerData;
    const { message, messageId } = messageData;

    return userNotificationService.createNotification({
      userId: supplierId,
      type: 'message',
      category: 'new_message',
      title: `Nouveau message de ${buyerName}`,
      message: message.length > 100 ? message.substring(0, 100) + '...' : message,
      priority: 'high',
      data: { buyer: buyerData, message: messageData },
      relatedUserId: buyerId,
      relatedConversationId: conversationId
    });
  }

  // Demande de contact d'un acheteur
  async notifyContactRequest(supplierId, contactData) {
    const { buyerId, buyerName, productId, productName } = contactData;

    return userNotificationService.createNotification({
      userId: supplierId,
      type: 'message',
      category: 'contact_request',
      title: `Demande de contact de ${buyerName}`,
      message: `Intéressé par: ${productName}`,
      priority: 'high',
      data: contactData,
      relatedUserId: buyerId,
      relatedProductId: productId
    });
  }

  // ==================== NOTIFICATIONS PRODUITS ====================

  // Approbation de produit par l'admin
  async notifyProductApproval(supplierId, productData) {
    const { productId, productName, adminNotes } = productData;

    return userNotificationService.createNotification({
      userId: supplierId,
      type: 'produit',
      category: 'product_approved',
      title: `✅ Produit approuvé: ${productName}`,
      message: `Votre produit a été approuvé par l'administrateur`,
      priority: 'high',
      data: productData,
      relatedProductId: productId
    });
  }

  // Rejet de produit par l'admin
  async notifyProductRejection(supplierId, productData) {
    const { productId, productName, rejectionReason } = productData;

    return userNotificationService.createNotification({
      userId: supplierId,
      type: 'produit',
      category: 'product_rejected',
      title: `❌ Produit rejeté: ${productName}`,
      message: `Raison: ${rejectionReason || 'Non spécifiée'}`,
      priority: 'high',
      data: productData,
      relatedProductId: productId
    });
  }

  // Demande de modification de produit
  async notifyProductModificationRequest(supplierId, productData) {
    const { productId, productName, modificationReason } = productData;

    return userNotificationService.createNotification({
      userId: supplierId,
      type: 'produit',
      category: 'modification_request',
      title: `⚠️ Modification demandée: ${productName}`,
      message: `L'administrateur demande des modifications`,
      priority: 'medium',
      data: productData,
      relatedProductId: productId
    });
  }

  // Produit en attente de modération
  async notifyProductPendingModeration(supplierId, productData) {
    const { productId, productName } = productData;

    return userNotificationService.createNotification({
      userId: supplierId,
      type: 'produit',
      category: 'pending_moderation',
      title: `⏳ Produit en attente: ${productName}`,
      message: `Votre produit attend la modération de l'administrateur`,
      priority: 'low',
      data: productData,
      relatedProductId: productId
    });
  }

  // ==================== NOTIFICATIONS SYSTÈME ====================

  // Message système de la plateforme
  async notifySystemMessage(supplierId, systemData) {
    const { title, message, priority = 'medium' } = systemData;

    return userNotificationService.createNotification({
      userId: supplierId,
      type: 'systeme',
      category: 'system_message',
      title: title,
      message: message,
      priority: priority,
      data: systemData
    });
  }

  // Notification de maintenance
  async notifyMaintenance(supplierId, maintenanceData) {
    const { startTime, endTime, description } = maintenanceData;

    return userNotificationService.createNotification({
      userId: supplierId,
      type: 'systeme',
      category: 'maintenance',
      title: '🔧 Maintenance programmée',
      message: `Maintenance prévue du ${startTime} au ${endTime}`,
      priority: 'high',
      data: maintenanceData
    });
  }

  // Mise à jour importante
  async notifyImportantUpdate(supplierId, updateData) {
    const { version, features, description } = updateData;

    return userNotificationService.createNotification({
      userId: supplierId,
      type: 'systeme',
      category: 'important_update',
      title: `🚀 Mise à jour ${version}`,
      message: description || 'Nouvelle version disponible avec de nouvelles fonctionnalités',
      priority: 'medium',
      data: updateData
    });
  }

  // ==================== NOTIFICATIONS COMMANDES ====================

  // Nouvelle commande reçue
  async notifyNewOrder(supplierId, orderData) {
    const { orderId, buyerName, total, productCount } = orderData;

    return userNotificationService.createNotification({
      userId: supplierId,
      type: 'commande',
      category: 'new_order',
      title: `🛒 Nouvelle commande de ${buyerName}`,
      message: `${productCount} produit(s) - Total: ${total}€`,
      priority: 'high',
      data: orderData,
      relatedOrderId: orderId
    });
  }

  // Commande annulée
  async notifyOrderCancelled(supplierId, orderData) {
    const { orderId, buyerName, reason } = orderData;

    return userNotificationService.createNotification({
      userId: supplierId,
      type: 'commande',
      category: 'order_cancelled',
      title: `❌ Commande annulée`,
      message: `Commande de ${buyerName} annulée${reason ? ` - Raison: ${reason}` : ''}`,
      priority: 'medium',
      data: orderData,
      relatedOrderId: orderId
    });
  }

  // ==================== MÉTHODES UTILITAIRES ====================

  // Récupérer les notifications d'un fournisseur
  async getSupplierNotifications(supplierId, options = {}) {
    return userNotificationService.getUserNotifications(supplierId, options);
  }

  // Récupérer les compteurs de notifications d'un fournisseur
  async getSupplierNotificationCounts(supplierId) {
    return userNotificationService.getNotificationCounts(supplierId);
  }

  // Marquer une notification comme lue
  async markAsRead(notificationId, supplierId) {
    return userNotificationService.markAsRead(notificationId, supplierId);
  }

  // Marquer toutes les notifications comme lues
  async markAllAsRead(supplierId) {
    return userNotificationService.markAllAsRead(supplierId);
  }

  // Supprimer une notification
  async deleteNotification(notificationId, supplierId) {
    return userNotificationService.deleteNotification(notificationId, supplierId);
  }
}

module.exports = new SupplierNotificationService();
