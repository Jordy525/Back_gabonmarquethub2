const db = require('../config/database');

class UserNotificationService {
  // Créer une notification utilisateur
  async createNotification(notificationData) {
    const connection = await db.getConnection();
    
    try {
      const {
        userId,
        type,
        category,
        title,
        message,
        priority = 'medium',
        data = null,
        relatedUserId = null,
        relatedProductId = null,
        relatedConversationId = null,
        relatedOrderId = null
      } = notificationData;

      const [result] = await connection.execute(`
        INSERT INTO notifications (
          utilisateur_id, type, category, titre, message, priority, data,
          related_user_id, related_product_id, related_conversation_id, related_order_id,
          lu, date_creation, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())
      `, [
        userId, type, category, title, message, priority,
        data ? JSON.stringify(data) : null,
        relatedUserId, relatedProductId, relatedConversationId, relatedOrderId
      ]);

      console.log(`🔔 Notification utilisateur créée: ${title} (ID: ${result.insertId})`);
      return result.insertId;

    } catch (error) {
      console.error('❌ Erreur création notification utilisateur:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // ==================== NOTIFICATIONS ACHETEURS ====================

  // Nouveau message d'un fournisseur
  async notifyNewMessageFromSupplier(userId, supplierData, messageData) {
    const { supplierId, supplierName, conversationId } = supplierData;
    const { message, messageId } = messageData;

    return this.createNotification({
      userId,
      type: 'message',
      category: 'new_message',
      title: `Nouveau message de ${supplierName}`,
      message: message.length > 100 ? message.substring(0, 100) + '...' : message,
      priority: 'high',
      data: { supplier: supplierData, message: messageData },
      relatedUserId: supplierId,
      relatedConversationId: conversationId
    });
  }

  // Nouvelle conversation créée
  async notifyNewConversation(userId, conversationData) {
    const { conversationId, supplierName, productName } = conversationData;

    return this.createNotification({
      userId,
      type: 'message',
      category: 'conversation_created',
      title: `Nouvelle conversation avec ${supplierName}`,
      message: `Conversation créée pour le produit: ${productName}`,
      priority: 'medium',
      data: conversationData,
      relatedConversationId: conversationId
    });
  }

  // Nouveau produit ajouté par un fournisseur suivi
  async notifyNewProductFromFollowedSupplier(userId, productData) {
    const { productId, productName, supplierName, price } = productData;

    return this.createNotification({
      userId,
      type: 'produit',
      category: 'new_product',
      title: `Nouveau produit de ${supplierName}`,
      message: `${productName} - ${price}€`,
      priority: 'medium',
      data: productData,
      relatedProductId: productId
    });
  }

  // Modification de prix d'un produit suivi
  async notifyPriceChange(userId, productData) {
    const { productId, productName, oldPrice, newPrice, supplierName } = productData;

    return this.createNotification({
      userId,
      type: 'produit',
      category: 'price_change',
      title: `Prix modifié: ${productName}`,
      message: `${oldPrice}€ → ${newPrice}€ par ${supplierName}`,
      priority: 'medium',
      data: productData,
      relatedProductId: productId
    });
  }

  // Produit en rupture de stock
  async notifyOutOfStock(userId, productData) {
    const { productId, productName, supplierName } = productData;

    return this.createNotification({
      userId,
      type: 'produit',
      category: 'out_of_stock',
      title: `Produit en rupture: ${productName}`,
      message: `Le produit de ${supplierName} n'est plus disponible`,
      priority: 'low',
      data: productData,
      relatedProductId: productId
    });
  }

  // ==================== NOTIFICATIONS FOURNISSEURS ====================

  // Nouveau message d'un acheteur
  async notifyNewMessageFromBuyer(userId, buyerData, messageData) {
    const { buyerId, buyerName, conversationId } = buyerData;
    const { message, messageId } = messageData;

    return this.createNotification({
      userId,
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
  async notifyContactRequest(userId, contactData) {
    const { buyerId, buyerName, productId, productName } = contactData;

    return this.createNotification({
      userId,
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

  // Approbation de produit par l'admin
  async notifyProductApproval(userId, productData) {
    const { productId, productName, adminNotes } = productData;

    return this.createNotification({
      userId,
      type: 'produit',
      category: 'product_approved',
      title: `Produit approuvé: ${productName}`,
      message: `Votre produit a été approuvé par l'administrateur`,
      priority: 'high',
      data: productData,
      relatedProductId: productId
    });
  }

  // Rejet de produit par l'admin
  async notifyProductRejection(userId, productData) {
    const { productId, productName, rejectionReason } = productData;

    return this.createNotification({
      userId,
      type: 'produit',
      category: 'product_rejected',
      title: `Produit rejeté: ${productName}`,
      message: `Raison: ${rejectionReason || 'Non spécifiée'}`,
      priority: 'high',
      data: productData,
      relatedProductId: productId
    });
  }

  // Demande de modification de produit
  async notifyProductModificationRequest(userId, productData) {
    const { productId, productName, modificationReason } = productData;

    return this.createNotification({
      userId,
      type: 'produit',
      category: 'modification_request',
      title: `Modification demandée: ${productName}`,
      message: `L'administrateur demande des modifications`,
      priority: 'medium',
      data: productData,
      relatedProductId: productId
    });
  }

  // Produit en attente de modération
  async notifyProductPendingModeration(userId, productData) {
    const { productId, productName } = productData;

    return this.createNotification({
      userId,
      type: 'produit',
      category: 'pending_moderation',
      title: `Produit en attente: ${productName}`,
      message: `Votre produit attend la modération de l'administrateur`,
      priority: 'low',
      data: productData,
      relatedProductId: productId
    });
  }

  // ==================== NOTIFICATIONS SYSTÈME ====================

  // Message système de la plateforme
  async notifySystemMessage(userId, systemData) {
    const { title, message, priority = 'medium' } = systemData;

    return this.createNotification({
      userId,
      type: 'systeme',
      category: 'system_message',
      title: title,
      message: message,
      priority: priority,
      data: systemData
    });
  }

  // Notification de maintenance
  async notifyMaintenance(userId, maintenanceData) {
    const { startTime, endTime, description } = maintenanceData;

    return this.createNotification({
      userId,
      type: 'systeme',
      category: 'maintenance',
      title: 'Maintenance programmée',
      message: `Maintenance prévue du ${startTime} au ${endTime}`,
      priority: 'high',
      data: maintenanceData
    });
  }

  // Mise à jour importante
  async notifyImportantUpdate(userId, updateData) {
    const { version, features, description } = updateData;

    return this.createNotification({
      userId,
      type: 'systeme',
      category: 'important_update',
      title: `Mise à jour ${version}`,
      message: description || 'Nouvelle version disponible avec de nouvelles fonctionnalités',
      priority: 'medium',
      data: updateData
    });
  }

  // ==================== MÉTHODES UTILITAIRES ====================

  // Récupérer les notifications d'un utilisateur
  async getUserNotifications(userId, options = {}) {
    const connection = await db.getConnection();
    
    try {
      const { page = 1, limit = 50, type, category, unread } = options;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE utilisateur_id = ?';
      let params = [userId];

      if (type) {
        whereClause += ' AND type = ?';
        params.push(type);
      }

      if (category) {
        whereClause += ' AND category = ?';
        params.push(category);
      }

      if (unread === 'true') {
        whereClause += ' AND lu = 0';
      }

      const [notifications] = await connection.execute(`
        SELECT 
          n.*,
          u.nom as related_user_nom,
          u.prenom as related_user_prenom,
          p.nom as related_product_nom
        FROM notifications n
        LEFT JOIN utilisateurs u ON n.related_user_id = u.id
        LEFT JOIN produits p ON n.related_product_id = p.id
        ${whereClause}
        ORDER BY n.priority DESC, n.date_creation DESC
        LIMIT ? OFFSET ?
      `, [...params, limit, offset]);

      // Compter le total
      const [countResult] = await connection.execute(`
        SELECT COUNT(*) as total FROM notifications ${whereClause}
      `, params);

      return {
        notifications,
        total: countResult[0].total,
        page,
        limit,
        totalPages: Math.ceil(countResult[0].total / limit)
      };

    } catch (error) {
      console.error('❌ Erreur récupération notifications utilisateur:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Marquer une notification comme lue
  async markAsRead(notificationId, userId) {
    const connection = await db.getConnection();
    
    try {
      await connection.execute(`
        UPDATE notifications 
        SET lu = 1, read_at = NOW() 
        WHERE id = ? AND utilisateur_id = ?
      `, [notificationId, userId]);

      console.log(`✅ Notification ${notificationId} marquée comme lue`);
    } catch (error) {
      console.error('❌ Erreur marquage notification:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Marquer toutes les notifications comme lues
  async markAllAsRead(userId) {
    const connection = await db.getConnection();
    
    try {
      await connection.execute(`
        UPDATE notifications 
        SET lu = 1, read_at = NOW() 
        WHERE utilisateur_id = ? AND lu = 0
      `, [userId]);

      console.log(`✅ Toutes les notifications de l'utilisateur ${userId} marquées comme lues`);
    } catch (error) {
      console.error('❌ Erreur marquage toutes notifications:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Supprimer une notification
  async deleteNotification(notificationId, userId) {
    const connection = await db.getConnection();
    
    try {
      await connection.execute(`
        DELETE FROM notifications 
        WHERE id = ? AND utilisateur_id = ?
      `, [notificationId, userId]);

      console.log(`✅ Notification ${notificationId} supprimée`);
    } catch (error) {
      console.error('❌ Erreur suppression notification:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Récupérer les compteurs de notifications
  async getNotificationCounts(userId) {
    const connection = await db.getConnection();
    
    try {
      const [counts] = await connection.execute(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN lu = 0 THEN 1 ELSE 0 END) as unread,
          SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as urgent,
          SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high,
          SUM(CASE WHEN type = 'message' THEN 1 ELSE 0 END) as messages,
          SUM(CASE WHEN type = 'produit' THEN 1 ELSE 0 END) as products,
          SUM(CASE WHEN type = 'systeme' THEN 1 ELSE 0 END) as system
        FROM notifications 
        WHERE utilisateur_id = ?
      `, [userId]);

      return counts[0];
    } catch (error) {
      console.error('❌ Erreur récupération compteurs:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = new UserNotificationService();
