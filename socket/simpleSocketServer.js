// Serveur Socket.IO SIMPLE et FONCTIONNEL

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

class SimpleSocketServer {
    constructor(server) {
        // Construire les origins CORS depuis les variables d'environnement
        const corsOrigins = [];
        
        // Ajouter les URLs depuis les variables d'environnement
        if (process.env.FRONTEND_URL) corsOrigins.push(process.env.FRONTEND_URL);
        if (process.env.ADMIN_URL) corsOrigins.push(process.env.ADMIN_URL);
        if (process.env.API_BASE_URL) corsOrigins.push(process.env.API_BASE_URL);
        
        // Ajouter les origins depuis CORS_ORIGIN si défini
        if (process.env.CORS_ORIGIN) {
            const additionalOrigins = process.env.CORS_ORIGIN.split(',').map(origin => origin.trim());
            corsOrigins.push(...additionalOrigins);
        }
        
        // Fallbacks pour le développement si aucune variable n'est définie
        if (corsOrigins.length === 0) {
            corsOrigins.push("http://localhost:8080", "http://localhost:3000", "http://localhost:5173");
        }

        this.io = new Server(server, {
            cors: {
                origin: corsOrigins,
                methods: ["GET", "POST"],
                credentials: true
            },
            transports: ['websocket', 'polling'],
            pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT) || 60000,
            pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL) || 25000
        });

        this.connectedUsers = new Map(); // userId -> Set of socketIds
        this.typingUsers = new Map(); // conversationId -> Set of userIds

        this.setupAuthentication();
        this.setupEventHandlers();
        
        console.log('🚀 Serveur Socket.IO initialisé avec CORS:', this.io.engine.opts.cors.origin);
    }

    setupAuthentication() {
        // Authentification simple
        this.io.use((socket, next) => {
            try {
                const token = socket.handshake.auth.token;
                if (!token) {
                    console.log('❌ Token manquant pour socket:', socket.id);
                    return next(new Error('Token manquant'));
                }

                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                socket.userId = decoded.id;
                socket.userRole = decoded.role_id;
                
                console.log(`🔐 Socket authentifié pour utilisateur: ${decoded.id} (rôle: ${decoded.role_id})`);
                next();
            } catch (error) {
                console.error('❌ Erreur authentification Socket:', error.message);
                next(new Error('Token invalide'));
            }
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

        // Événements de conversation
        socket.on('conversation:join', (conversationId) => {
            this.handleJoinConversation(socket, conversationId);
        });

        socket.on('conversation:leave', (conversationId) => {
            this.handleLeaveConversation(socket, conversationId);
        });

        // Événements de frappe
        socket.on('typing:start', (data) => {
            this.handleTypingStart(socket, data);
        });

        socket.on('typing:stop', (data) => {
            this.handleTypingStop(socket, data);
        });

        // Événements de message
        socket.on('message:typing', (data) => {
            this.handleTypingStart(socket, data);
        });

        // Déconnexion
        socket.on('disconnect', () => {
            this.handleDisconnection(socket);
        });

        // Gestion des erreurs
        socket.on('error', (error) => {
            console.error('❌ Erreur socket:', error);
        });

        // Événement de test
        socket.on('ping', () => {
            socket.emit('pong', { timestamp: new Date().toISOString() });
        });
    }

    handleJoinConversation(socket, conversationId) {
        try {
            const roomName = `conversation_${conversationId}`;
            socket.join(roomName);
            
            console.log(`🏠 Utilisateur ${socket.userId} a rejoint la conversation ${conversationId}`);
            
            // Notifier les autres participants
            socket.to(roomName).emit('user:joined', {
                user_id: socket.userId,
                conversation_id: conversationId,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('❌ Erreur rejoindre conversation:', error);
        }
    }

    handleLeaveConversation(socket, conversationId) {
        try {
            const roomName = `conversation_${conversationId}`;
            socket.leave(roomName);
            
            console.log(`🚪 Utilisateur ${socket.userId} a quitté la conversation ${conversationId}`);
            
            // Arrêter la frappe si en cours
            this.stopTyping(conversationId, socket.userId);
            
            // Notifier les autres participants
            socket.to(roomName).emit('user:left', {
                user_id: socket.userId,
                conversation_id: conversationId,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('❌ Erreur quitter conversation:', error);
        }
    }

    handleTypingStart(socket, data) {
        try {
            const { conversation_id } = data;
            const userId = socket.userId;
            
            if (!this.typingUsers.has(conversation_id)) {
                this.typingUsers.set(conversation_id, new Set());
            }
            
            this.typingUsers.get(conversation_id).add(userId);
            
            // Notifier les autres participants
            const roomName = `conversation_${conversation_id}`;
            socket.to(roomName).emit('typing:start', {
                user_id: userId,
                conversation_id: conversation_id,
                is_typing: true,
                timestamp: new Date().toISOString()
            });
            
            console.log(`⌨️ Utilisateur ${userId} tape dans conversation ${conversation_id}`);
            
        } catch (error) {
            console.error('❌ Erreur démarrage frappe:', error);
        }
    }

    handleTypingStop(socket, data) {
        try {
            const { conversation_id } = data;
            const userId = socket.userId;
            
            this.stopTyping(conversation_id, userId);
            
            // Notifier les autres participants
            const roomName = `conversation_${conversation_id}`;
            socket.to(roomName).emit('typing:stop', {
                user_id: userId,
                conversation_id: conversation_id,
                is_typing: false,
                timestamp: new Date().toISOString()
            });
            
            console.log(`⌨️ Utilisateur ${userId} a arrêté de taper dans conversation ${conversation_id}`);
            
        } catch (error) {
            console.error('❌ Erreur arrêt frappe:', error);
        }
    }

    handleDisconnection(socket) {
        const userId = socket.userId;
        
        console.log(`❌ Utilisateur déconnecté: ${userId} (Socket: ${socket.id})`);
        
        // Retirer de la liste des connectés
        if (this.connectedUsers.has(userId)) {
            this.connectedUsers.get(userId).delete(socket.id);
            if (this.connectedUsers.get(userId).size === 0) {
                this.connectedUsers.delete(userId);
            }
        }
        
        // Arrêter toutes les frappes de cet utilisateur
        for (const [conversationId, typingSet] of this.typingUsers.entries()) {
            if (typingSet.has(userId)) {
                this.stopTyping(conversationId, userId);
                
                // Notifier les autres
                const roomName = `conversation_${conversationId}`;
                socket.to(roomName).emit('typing:stop', {
                    user_id: userId,
                    conversation_id: conversationId,
                    is_typing: false,
                    timestamp: new Date().toISOString()
                });
            }
        }
    }

    stopTyping(conversationId, userId) {
        if (this.typingUsers.has(conversationId)) {
            this.typingUsers.get(conversationId).delete(userId);
            if (this.typingUsers.get(conversationId).size === 0) {
                this.typingUsers.delete(conversationId);
            }
        }
    }

    // Méthode pour émettre un nouveau message
    emitNewMessage(conversationId, message) {
        const roomName = `conversation_${conversationId}`;
        this.io.to(roomName).emit('message:new', {
            ...message,
            timestamp: new Date().toISOString()
        });
        console.log(`📨 Message émis dans conversation ${conversationId}`);
    }

    // Méthode pour émettre une notification de frappe
    emitTypingStatus(conversationId, userId, isTyping) {
        const roomName = `conversation_${conversationId}`;
        this.io.to(roomName).emit(isTyping ? 'typing:start' : 'typing:stop', {
            user_id: userId,
            conversation_id: conversationId,
            is_typing: isTyping,
            timestamp: new Date().toISOString()
        });
    }

    // Méthode pour obtenir l'instance IO
    getIO() {
        return this.io;
    }

    // Vérifier si un utilisateur est connecté
    isUserConnected(userId) {
        return this.connectedUsers.has(userId);
    }

    // Obtenir le nombre d'utilisateurs connectés
    getConnectedUsersCount() {
        return this.connectedUsers.size;
    }

    // Obtenir les statistiques du serveur
    getServerStats() {
        return {
            connectedUsers: this.connectedUsers.size,
            totalSockets: this.io.engine.clientsCount,
            typingConversations: this.typingUsers.size,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = SimpleSocketServer;