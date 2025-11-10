const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const {
    authenticateSocket,
    checkSocketConversationAccess,
    applySocketRateLimit,
    handleSocketError,
    sanitizeSocketData,
    logSocketActivity
} = require('../middleware/socketAuth');
const { validateSocketData } = require('../middleware/validation');

class SecureSocketServer {
    constructor(server) {
        this.io = new Server(server, {
            cors: {
                origin: process.env.FRONTEND_URL || "http://localhost:3000",
                methods: ["GET", "POST"],
                credentials: true
            },
            transports: ['websocket', 'polling']
        });

        this.connectedUsers = new Map(); // userId -> Set of socketIds
        this.userRooms = new Map(); // userId -> Set of conversationIds
        this.typingUsers = new Map(); // conversationId -> Set of userIds

        this.setupMiddleware();
        this.setupEventHandlers();
    }

    setupMiddleware() {
        // Authentification obligatoire pour tous les sockets
        this.io.use(authenticateSocket);

        // Logging des connexions
        this.io.use((socket, next) => {
            logSocketActivity(socket, 'connection_attempt');
            next();
        });
    }

    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            this.handleConnection(socket);
        });
    }

    handleConnection(socket) {
        const userId = socket.userId;
        
        console.log(`✅ Utilisateur connecté: ${userId} (Socket: ${socket.id})`);
        
        // Ajouter l'utilisateur à la liste des connectés
        if (!this.connectedUsers.has(userId)) {
            this.connectedUsers.set(userId, new Set());
        }
        this.connectedUsers.get(userId).add(socket.id);

        // Événements de gestion des conversations
        socket.on('join_conversation', (data) => {
            this.handleJoinConversation(socket, data);
        });

        socket.on('leave_conversation', (data) => {
            this.handleLeaveConversation(socket, data);
        });

        socket.on('send_message', (data) => {
            this.handleSendMessage(socket, data);
        });

        socket.on('typing_start', (data) => {
            this.handleTypingStart(socket, data);
        });

        socket.on('typing_stop', (data) => {
            this.handleTypingStop(socket, data);
        });

        socket.on('mark_messages_read', (data) => {
            this.handleMarkMessagesRead(socket, data);
        });

        // Gestion de la déconnexion
        socket.on('disconnect', () => {
            this.handleDisconnection(socket);
        });

        // Gestion des erreurs
        socket.on('error', (error) => {
            handleSocketError(socket, error, 'socket_error');
        });
    }

    async handleJoinConversation(socket, data) {
        try {
            // Rate limiting
            applySocketRateLimit(socket, 'join_conversation');

            // Validation des données
            validateSocketData.joinConversation(data);

            // Sanitization
            const sanitizedData = sanitizeSocketData(data);
            const { conversationId } = sanitizedData;

            logSocketActivity(socket, 'join_conversation', { conversationId });

            // Vérifier l'accès à la conversation
            const conversation = await checkSocketConversationAccess(socket, conversationId);

            // Quitter les anciennes rooms
            const userId = socket.userId;
            if (this.userRooms.has(userId)) {
                for (const oldRoomId of this.userRooms.get(userId)) {
                    socket.leave(`conversation_${oldRoomId}`);
                }
            }

            // Rejoindre la nouvelle room
            const roomName = `conversation_${conversationId}`;
            socket.join(roomName);

            // Mettre à jour le tracking des rooms
            if (!this.userRooms.has(userId)) {
                this.userRooms.set(userId, new Set());
            }
            this.userRooms.get(userId).clear();
            this.userRooms.get(userId).add(conversationId);

            // Notifier les autres participants
            socket.to(roomName).emit('user_joined', {
                userId,
                conversationId,
                timestamp: new Date().toISOString()
            });

            // Confirmer la connexion
            socket.emit('conversation_joined', {
                conversationId,
                conversation,
                timestamp: new Date().toISOString()
            });

            console.log(`👥 Utilisateur ${userId} a rejoint la conversation ${conversationId}`);

        } catch (error) {
            handleSocketError(socket, error, 'join_conversation');
        }
    }

    async handleLeaveConversation(socket, data) {
        try {
            applySocketRateLimit(socket, 'leave_conversation');
            validateSocketData.joinConversation(data); // Même validation

            const sanitizedData = sanitizeSocketData(data);
            const { conversationId } = sanitizedData;

            logSocketActivity(socket, 'leave_conversation', { conversationId });

            const userId = socket.userId;
            const roomName = `conversation_${conversationId}`;

            // Quitter la room
            socket.leave(roomName);

            // Mettre à jour le tracking
            if (this.userRooms.has(userId)) {
                this.userRooms.get(userId).delete(conversationId);
            }

            // Arrêter le typing si en cours
            this.stopTyping(conversationId, userId);

            // Notifier les autres participants
            socket.to(roomName).emit('user_left', {
                userId,
                conversationId,
                timestamp: new Date().toISOString()
            });

            socket.emit('conversation_left', {
                conversationId,
                timestamp: new Date().toISOString()
            });

            console.log(`👋 Utilisateur ${userId} a quitté la conversation ${conversationId}`);

        } catch (error) {
            handleSocketError(socket, error, 'leave_conversation');
        }
    }

    async handleSendMessage(socket, data) {
        try {
            // Rate limiting plus strict pour l'envoi de messages
            applySocketRateLimit(socket, 'send_message');

            // Validation des données
            validateSocketData.sendMessage(data);

            // Sanitization
            const sanitizedData = sanitizeSocketData(data);
            const { conversationId, contenu, type_message = 'text', metadata } = sanitizedData;

            logSocketActivity(socket, 'send_message', { conversationId, contentLength: contenu.length });

            // Vérifier l'accès à la conversation
            const conversation = await checkSocketConversationAccess(socket, conversationId);

            const userId = socket.userId;

            // Insérer le message en base de données
            const [result] = await db.execute(
                `INSERT INTO messages (conversation_id, expediteur_id, contenu, type_message, metadata, created_at) 
                 VALUES (?, ?, ?, ?, ?, NOW())`,
                [conversationId, userId, contenu, type_message, metadata || null]
            );

            const messageId = result.insertId;

            // Récupérer le message complet avec les infos utilisateur
            const [messageRows] = await db.execute(
                `SELECT m.*, u.nom, u.prenom, u.email 
                 FROM messages m 
                 JOIN utilisateurs u ON m.expediteur_id = u.id 
                 WHERE m.id = ?`,
                [messageId]
            );

            const message = messageRows[0];

            // Mettre à jour la conversation
            await db.execute(
                'UPDATE conversations SET updated_at = NOW() WHERE id = ?',
                [conversationId]
            );

            // Arrêter le typing
            this.stopTyping(conversationId, userId);

            // Émettre le message à tous les participants
            const roomName = `conversation_${conversationId}`;
            this.io.to(roomName).emit('new_message', {
                message,
                conversationId,
                timestamp: new Date().toISOString()
            });

            // Confirmer l'envoi à l'expéditeur
            socket.emit('message_sent', {
                messageId,
                conversationId,
                timestamp: new Date().toISOString()
            });

            console.log(`💬 Message envoyé par ${userId} dans conversation ${conversationId}`);

        } catch (error) {
            handleSocketError(socket, error, 'send_message');
        }
    }

    async handleTypingStart(socket, data) {
        try {
            applySocketRateLimit(socket, 'typing');
            validateSocketData.typing({ ...data, isTyping: true });

            const sanitizedData = sanitizeSocketData(data);
            const { conversationId } = sanitizedData;

            // Vérifier l'accès
            await checkSocketConversationAccess(socket, conversationId);

            const userId = socket.userId;

            // Ajouter à la liste des utilisateurs en train d'écrire
            if (!this.typingUsers.has(conversationId)) {
                this.typingUsers.set(conversationId, new Set());
            }
            this.typingUsers.get(conversationId).add(userId);

            // Notifier les autres participants
            const roomName = `conversation_${conversationId}`;
            socket.to(roomName).emit('user_typing', {
                userId,
                conversationId,
                isTyping: true,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            handleSocketError(socket, error, 'typing_start');
        }
    }

    async handleTypingStop(socket, data) {
        try {
            applySocketRateLimit(socket, 'typing');
            validateSocketData.typing({ ...data, isTyping: false });

            const sanitizedData = sanitizeSocketData(data);
            const { conversationId } = sanitizedData;

            const userId = socket.userId;
            this.stopTyping(conversationId, userId);

        } catch (error) {
            handleSocketError(socket, error, 'typing_stop');
        }
    }

    stopTyping(conversationId, userId) {
        if (this.typingUsers.has(conversationId)) {
            this.typingUsers.get(conversationId).delete(userId);
            
            // Nettoyer si plus personne n'écrit
            if (this.typingUsers.get(conversationId).size === 0) {
                this.typingUsers.delete(conversationId);
            }
        }

        // Notifier les autres participants
        const roomName = `conversation_${conversationId}`;
        this.io.to(roomName).emit('user_typing', {
            userId,
            conversationId,
            isTyping: false,
            timestamp: new Date().toISOString()
        });
    }

    async handleMarkMessagesRead(socket, data) {
        try {
            applySocketRateLimit(socket, 'mark_read');

            const sanitizedData = sanitizeSocketData(data);
            const { conversationId, messageIds } = sanitizedData;

            // Vérifier l'accès
            await checkSocketConversationAccess(socket, conversationId);

            const userId = socket.userId;

            // Marquer les messages comme lus
            let query, params;
            if (messageIds && messageIds.length > 0) {
                const placeholders = messageIds.map(() => '?').join(',');
                query = `UPDATE messages SET lu = 1 
                         WHERE conversation_id = ? AND expediteur_id != ? AND id IN (${placeholders})`;
                params = [conversationId, userId, ...messageIds];
            } else {
                query = 'UPDATE messages SET lu = 1 WHERE conversation_id = ? AND expediteur_id != ?';
                params = [conversationId, userId];
            }

            const [result] = await db.execute(query, params);

            // Notifier les autres participants
            const roomName = `conversation_${conversationId}`;
            socket.to(roomName).emit('messages_read', {
                userId,
                conversationId,
                messageIds: messageIds || 'all',
                affectedRows: result.affectedRows,
                timestamp: new Date().toISOString()
            });

            socket.emit('messages_marked_read', {
                conversationId,
                affectedRows: result.affectedRows,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            handleSocketError(socket, error, 'mark_messages_read');
        }
    }

    handleDisconnection(socket) {
        const userId = socket.userId;
        
        console.log(`❌ Utilisateur déconnecté: ${userId} (Socket: ${socket.id})`);
        
        // Nettoyer les structures de données
        if (this.connectedUsers.has(userId)) {
            this.connectedUsers.get(userId).delete(socket.id);
            if (this.connectedUsers.get(userId).size === 0) {
                this.connectedUsers.delete(userId);
            }
        }

        // Arrêter tous les typing en cours
        if (this.userRooms.has(userId)) {
            for (const conversationId of this.userRooms.get(userId)) {
                this.stopTyping(conversationId, userId);
            }
            this.userRooms.delete(userId);
        }

        logSocketActivity(socket, 'disconnection');
    }

    // Méthodes utilitaires
    isUserOnline(userId) {
        return this.connectedUsers.has(userId) && this.connectedUsers.get(userId).size > 0;
    }

    getUserSocketIds(userId) {
        return this.connectedUsers.get(userId) || new Set();
    }

    getOnlineUsersInConversation(conversationId) {
        const onlineUsers = new Set();
        for (const [userId, rooms] of this.userRooms.entries()) {
            if (rooms.has(conversationId) && this.isUserOnline(userId)) {
                onlineUsers.add(userId);
            }
        }
        return onlineUsers;
    }

    // Méthode pour envoyer des notifications système
    async sendSystemNotification(conversationId, message, excludeUserId = null) {
        const roomName = `conversation_${conversationId}`;
        const notification = {
            type: 'system',
            message,
            conversationId,
            timestamp: new Date().toISOString()
        };

        if (excludeUserId) {
            const excludeSocketIds = this.getUserSocketIds(excludeUserId);
            for (const socketId of excludeSocketIds) {
                this.io.to(roomName).except(socketId).emit('system_notification', notification);
            }
        } else {
            this.io.to(roomName).emit('system_notification', notification);
        }
    }

    // Méthode pour envoyer une notification à un utilisateur spécifique
    async sendNotificationToUser(userId, notification) {
        try {
            const userSocketIds = this.getUserSocketIds(userId);
            
            if (userSocketIds.size > 0) {
                // Envoyer à tous les sockets de l'utilisateur (multi-device support)
                for (const socketId of userSocketIds) {
                    this.io.to(socketId).emit('notification', {
                        ...notification,
                        timestamp: new Date().toISOString()
                    });
                }

                console.log(`📢 Notification envoyée à l'utilisateur ${userId} (${userSocketIds.size} connexions)`);
                return true;
            } else {
                console.log(`📢 Utilisateur ${userId} hors ligne, notification stockée en base`);
                return false;
            }
        } catch (error) {
            console.error('Erreur envoi notification utilisateur:', error);
            return false;
        }
    }

    // Méthode pour envoyer le nombre de notifications non lues
    async sendUnreadCountUpdate(userId) {
        try {
            const [result] = await db.execute(
                'SELECT COUNT(*) as count FROM notifications WHERE utilisateur_id = ? AND lu = 0',
                [userId]
            );

            const unreadCount = result[0].count;
            const userSocketIds = this.getUserSocketIds(userId);

            for (const socketId of userSocketIds) {
                this.io.to(socketId).emit('unread_count_update', {
                    unreadCount,
                    timestamp: new Date().toISOString()
                });
            }

            return unreadCount;
        } catch (error) {
            console.error('Erreur mise à jour compteur non lus:', error);
            return 0;
        }
    }

    // Méthode pour marquer les notifications comme lues et notifier
    async markNotificationsAsRead(userId, notificationIds = null) {
        try {
            let query, params;
            if (notificationIds && notificationIds.length > 0) {
                const placeholders = notificationIds.map(() => '?').join(',');
                query = `UPDATE notifications SET lu = 1 WHERE utilisateur_id = ? AND id IN (${placeholders})`;
                params = [userId, ...notificationIds];
            } else {
                query = 'UPDATE notifications SET lu = 1 WHERE utilisateur_id = ?';
                params = [userId];
            }

            await db.execute(query, params);

            // Mettre à jour le compteur
            await this.sendUnreadCountUpdate(userId);

            return true;
        } catch (error) {
            console.error('Erreur marquage notifications lues:', error);
            return false;
        }
    }

    getIO() {
        return this.io;
    }
}

module.exports = SecureSocketServer;