const jwt = require('jsonwebtoken');

/**
 * Gestionnaire Socket.IO optimisé pour la messagerie
 * Implémente les rooms par conversation, gestion des événements de typing,
 * et optimise les broadcasts pour éviter les messages inutiles
 */
class SocketManager {
    constructor(io) {
        this.io = io;
        this.connectedUsers = new Map(); // userId -> Set of socket IDs
        this.userSockets = new Map(); // socketId -> user info
        this.conversationRooms = new Map(); // conversationId -> Set of user IDs
        this.typingUsers = new Map(); // conversationId -> Set of user IDs currently typing
        this.typingTimeouts = new Map(); // userId-conversationId -> timeout ID
        
        this.setupMiddleware();
        this.setupEventHandlers();
    }

    setupMiddleware() {
        // Middleware d'authentification renforcé avec validation JWT
        this.io.use((socket, next) => {
            const token = socket.handshake.auth.token || socket.handshake.query.token;
            const origin = socket.handshake.headers.origin;
            const userAgent = socket.handshake.headers['user-agent'];
            const ip = socket.handshake.address;
            
            console.log('🔐 Tentative d\\'authentification Socket.IO:', {
                socketId: socket.id,
                hasToken: !!token,
                origin,
                ip,
                userAgent: userAgent?.substring(0, 100),
                timestamp: new Date().toISOString()
            });

            // Vérifier l'origine en production
            const allowedOrigins = [
                'http://localhost:5173',
                'http://localhost:8080', 
                'http://localhost:3000',
                process.env.FRONTEND_URL
            ].filter(Boolean);

            const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
            
            if (!isDevelopment && origin && !allowedOrigins.includes(origin)) {
                console.log('🚫 Origine non autorisée:', origin);
                return next(new Error('Origine non autorisée'));
            }

            // Mode développement - authentification simplifiée mais sécurisée
            if (isDevelopment && !token) {
                console.log('🔧 MODE DEV - Génération token temporaire');
                socket.userId = `dev-user-${Math.floor(Math.random() * 10000)}`;
                socket.userRole = 1;
                socket.userName = `DevUser${socket.userId.split('-')[2]}`;
                socket.isDevMode = true;
                return next();
            }

            if (!token) {
                console.log('❌ Token manquant - Connexion refusée');
                return next(new Error('Token d\\'authentification requis'));
            }

            // Validation JWT renforcée
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET, {
                    algorithms: ['HS256'], // Forcer l'algorithme
                    maxAge: '24h', // Token expire après 24h max
                    clockTolerance: 30 // Tolérance de 30 secondes pour l'horloge
                });

                // Vérifications supplémentaires
                if (!decoded.id || !decoded.role_id) {
                    throw new Error('Token incomplet - données utilisateur manquantes');
                }

                // Vérifier que le token n'est pas trop ancien
                const tokenAge = Date.now() / 1000 - decoded.iat;
                if (tokenAge > 24 * 60 * 60) { // 24 heures
                    throw new Error('Token expiré - reconnexion requise');
                }

                socket.userId = decoded.id;
                socket.userRole = decoded.role_id;
                socket.userName = decoded.nom || `User${decoded.id}`;
                socket.userEmail = decoded.email;
                socket.tokenIssued = decoded.iat;
                socket.isDevMode = false;
                
                console.log('✅ Authentification JWT réussie:', {
                    userId: socket.userId,
                    role: socket.userRole,
                    name: socket.userName,
                    tokenAge: Math.round(tokenAge / 60) + ' minutes'
                });
                
                next();
            } catch (error) {
                console.log('❌ Erreur validation JWT:', {
                    error: error.message,
                    tokenStart: token ? token.substring(0, 20) + '...' : 'null',
                    ip,
                    timestamp: new Date().toISOString()
                });
                
                // Messages d'erreur spécifiques
                let errorMessage = 'Token invalide';
                if (error.name === 'TokenExpiredError') {
                    errorMessage = 'Token expiré - veuillez vous reconnecter';
                } else if (error.name === 'JsonWebTokenError') {
                    errorMessage = 'Token malformé';
                } else if (error.name === 'NotBeforeError') {
                    errorMessage = 'Token pas encore valide';
                }
                
                next(new Error(errorMessage));
            }
        });

        // Middleware de rate limiting pour les connexions
        this.io.use((socket, next) => {
            const ip = socket.handshake.address;
            const now = Date.now();
            
            // Simple rate limiting en mémoire (en production, utiliser Redis)
            if (!this.connectionAttempts) {
                this.connectionAttempts = new Map();
            }
            
            const attempts = this.connectionAttempts.get(ip) || [];
            const recentAttempts = attempts.filter(time => now - time < 60000); // 1 minute
            
            if (recentAttempts.length >= 10) { // Max 10 connexions par minute par IP
                console.log('🚫 Rate limit dépassé pour IP:', ip);
                return next(new Error('Trop de tentatives de connexion'));
            }
            
            recentAttempts.push(now);
            this.connectionAttempts.set(ip, recentAttempts);
            
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
        const socketId = socket.id;
        
        console.log(`✅ Connexion Socket.IO établie:`, {
            socketId,
            userId,
            role: socket.userRole,
            name: socket.userName,
            transport: socket.conn.transport.name,
            timestamp: new Date().toISOString()
        });

        // Enregistrer la connexion utilisateur
        this.registerUserConnection(userId, socketId, socket);

        // Confirmer la connexion au client
        socket.emit('connected', {
            message: 'Connexion Socket.IO établie',
            userId,
            socketId,
            transport: socket.conn.transport.name,
            serverTime: new Date().toISOString()
        });

        // Événements de conversation
        socket.on('join_conversation', (data) => this.handleJoinConversation(socket, data));\n        socket.on('leave_conversation', (data) => this.handleLeaveConversation(socket, data));\n\n        // Événements de messages\n        socket.on('new_message', (data) => this.handleNewMessage(socket, data));\n        socket.on('message_sent', (data) => this.handleMessageSent(socket, data));\n\n        // Événements de typing\n        socket.on('typing_start', (data) => this.handleTypingStart(socket, data));\n        socket.on('typing_stop', (data) => this.handleTypingStop(socket, data));\n        socket.on('user_typing', (data) => this.handleUserTyping(socket, data)); // Compatibilité\n\n        // Événements de statut des messages\n        socket.on('mark_as_read', (data) => this.handleMarkAsRead(socket, data));\n        socket.on('message_delivered', (data) => this.handleMessageDelivered(socket, data));\n\n        // Événements de déconnexion\n        socket.on('disconnect', (reason) => this.handleDisconnection(socket, reason));\n        socket.on('error', (error) => this.handleError(socket, error));\n\n        // Événements de debug (mode développement)\n        if (process.env.NODE_ENV === 'development') {\n            socket.on('debug_info', () => this.handleDebugInfo(socket));\n        }\n    }\n\n    registerUserConnection(userId, socketId, socket) {\n        // Ajouter le socket à la liste des connexions utilisateur\n        if (!this.connectedUsers.has(userId)) {\n            this.connectedUsers.set(userId, new Set());\n        }\n        this.connectedUsers.get(userId).add(socketId);\n\n        // Enregistrer les infos du socket\n        this.userSockets.set(socketId, {\n            userId,\n            role: socket.userRole,\n            name: socket.userName,\n            connectedAt: new Date(),\n            lastActivity: new Date()\n        });\n\n        console.log(`📊 Utilisateur ${userId} maintenant connecté avec ${this.connectedUsers.get(userId).size} socket(s)`);\n    }\n\n    handleJoinConversation(socket, data) {\n        const { conversation_id } = data;\n        const userId = socket.userId;\n        const roomName = `conversation_${conversation_id}`;\n\n        if (!conversation_id) {\n            socket.emit('error', { message: 'ID de conversation requis' });\n            return;\n        }\n\n        // Rejoindre la room Socket.IO\n        socket.join(roomName);\n\n        // Enregistrer l'utilisateur dans la conversation\n        if (!this.conversationRooms.has(conversation_id)) {\n            this.conversationRooms.set(conversation_id, new Set());\n        }\n        this.conversationRooms.get(conversation_id).add(userId);\n\n        console.log(`🏠 Utilisateur ${userId} a rejoint la conversation ${conversation_id}`);\n\n        // Notifier les autres participants\n        socket.to(roomName).emit('user_joined_conversation', {\n            conversation_id,\n            user_id: userId,\n            user_name: socket.userName,\n            timestamp: new Date().toISOString()\n        });\n\n        // Confirmer au client\n        socket.emit('conversation_joined', {\n            conversation_id,\n            room_name: roomName,\n            participants_count: this.conversationRooms.get(conversation_id).size,\n            timestamp: new Date().toISOString()\n        });\n    }\n\n    handleLeaveConversation(socket, data) {\n        const { conversation_id } = data;\n        const userId = socket.userId;\n        const roomName = `conversation_${conversation_id}`;\n\n        if (!conversation_id) {\n            return;\n        }\n\n        // Quitter la room Socket.IO\n        socket.leave(roomName);\n\n        // Retirer l'utilisateur de la conversation\n        if (this.conversationRooms.has(conversation_id)) {\n            this.conversationRooms.get(conversation_id).delete(userId);\n            \n            // Nettoyer si plus personne dans la conversation\n            if (this.conversationRooms.get(conversation_id).size === 0) {\n                this.conversationRooms.delete(conversation_id);\n            }\n        }\n\n        // Arrêter le typing si en cours\n        this.stopTyping(userId, conversation_id);\n\n        console.log(`🚪 Utilisateur ${userId} a quitté la conversation ${conversation_id}`);\n\n        // Notifier les autres participants\n        socket.to(roomName).emit('user_left_conversation', {\n            conversation_id,\n            user_id: userId,\n            user_name: socket.userName,\n            timestamp: new Date().toISOString()\n        });\n    }\n\n    handleNewMessage(socket, data) {\n        const { conversation_id, message } = data;\n        const userId = socket.userId;\n        const roomName = `conversation_${conversation_id}`;\n\n        if (!conversation_id || !message) {\n            socket.emit('error', { message: 'Données de message invalides' });\n            return;\n        }\n\n        console.log(`📨 Nouveau message dans conversation ${conversation_id} par utilisateur ${userId}`);\n\n        // Arrêter le typing de l'expéditeur\n        this.stopTyping(userId, conversation_id);\n\n        // Diffuser le message aux autres participants de la conversation\n        socket.to(roomName).emit('message_received', {\n            conversation_id,\n            message: {\n                ...message,\n                sender_id: userId,\n                sender_name: socket.userName,\n                timestamp: new Date().toISOString()\n            }\n        });\n\n        // Confirmer la réception au sender\n        socket.emit('message_delivered', {\n            conversation_id,\n            message_id: message.id,\n            delivered_at: new Date().toISOString()\n        });\n    }\n\n    handleMessageSent(socket, data) {\n        const { conversation_id, message_id, temp_id } = data;\n        const roomName = `conversation_${conversation_id}`;\n\n        // Notifier que le message a été envoyé avec succès\n        socket.to(roomName).emit('message_status_update', {\n            conversation_id,\n            message_id,\n            temp_id,\n            status: 'sent',\n            timestamp: new Date().toISOString()\n        });\n    }\n\n    handleTypingStart(socket, data) {\n        const { conversation_id } = data;\n        const userId = socket.userId;\n\n        this.startTyping(userId, conversation_id, socket);\n    }\n\n    handleTypingStop(socket, data) {\n        const { conversation_id } = data;\n        const userId = socket.userId;\n\n        this.stopTyping(userId, conversation_id);\n    }\n\n    handleUserTyping(socket, data) {\n        // Compatibilité avec l'ancien système\n        const { conversation_id, is_typing } = data;\n        \n        if (is_typing) {\n            this.handleTypingStart(socket, { conversation_id });\n        } else {\n            this.handleTypingStop(socket, { conversation_id });\n        }\n    }\n\n    startTyping(userId, conversationId, socket) {\n        const roomName = `conversation_${conversationId}`;\n        const timeoutKey = `${userId}-${conversationId}`;\n\n        // Ajouter l'utilisateur à la liste des typeurs\n        if (!this.typingUsers.has(conversationId)) {\n            this.typingUsers.set(conversationId, new Set());\n        }\n        \n        const wasTyping = this.typingUsers.get(conversationId).has(userId);\n        this.typingUsers.get(conversationId).add(userId);\n\n        // Annuler le timeout précédent\n        if (this.typingTimeouts.has(timeoutKey)) {\n            clearTimeout(this.typingTimeouts.get(timeoutKey));\n        }\n\n        // Notifier seulement si l'utilisateur n'était pas déjà en train de taper\n        if (!wasTyping) {\n            socket.to(roomName).emit('user_typing', {\n                conversation_id: conversationId,\n                user_id: userId,\n                user_name: socket.userName,\n                is_typing: true,\n                timestamp: new Date().toISOString()\n            });\n\n            console.log(`⌨️ Utilisateur ${userId} commence à taper dans conversation ${conversationId}`);\n        }\n\n        // Auto-stop après 3 secondes d'inactivité\n        const timeout = setTimeout(() => {\n            this.stopTyping(userId, conversationId);\n        }, 3000);\n        \n        this.typingTimeouts.set(timeoutKey, timeout);\n    }\n\n    stopTyping(userId, conversationId) {\n        const roomName = `conversation_${conversationId}`;\n        const timeoutKey = `${userId}-${conversationId}`;\n\n        // Retirer l'utilisateur de la liste des typeurs\n        if (this.typingUsers.has(conversationId)) {\n            const wasTyping = this.typingUsers.get(conversationId).has(userId);\n            this.typingUsers.get(conversationId).delete(userId);\n\n            // Nettoyer si plus personne ne tape\n            if (this.typingUsers.get(conversationId).size === 0) {\n                this.typingUsers.delete(conversationId);\n            }\n\n            // Notifier seulement si l'utilisateur était en train de taper\n            if (wasTyping) {\n                // Trouver le socket de l'utilisateur pour obtenir son nom\n                const userSocketId = Array.from(this.connectedUsers.get(userId) || []).find(socketId => \n                    this.userSockets.has(socketId)\n                );\n                const userName = userSocketId ? this.userSockets.get(userSocketId).name : `User${userId}`;\n\n                this.io.to(roomName).emit('user_typing', {\n                    conversation_id: conversationId,\n                    user_id: userId,\n                    user_name: userName,\n                    is_typing: false,\n                    timestamp: new Date().toISOString()\n                });\n\n                console.log(`⌨️ Utilisateur ${userId} arrête de taper dans conversation ${conversationId}`);\n            }\n        }\n\n        // Annuler le timeout\n        if (this.typingTimeouts.has(timeoutKey)) {\n            clearTimeout(this.typingTimeouts.get(timeoutKey));\n            this.typingTimeouts.delete(timeoutKey);\n        }\n    }\n\n    handleMarkAsRead(socket, data) {\n        const { conversation_id, message_id, messages_ids } = data;\n        const userId = socket.userId;\n        const roomName = `conversation_${conversation_id}`;\n\n        // Supporter le marquage de plusieurs messages\n        const messageIds = messages_ids || (message_id ? [message_id] : []);\n\n        if (messageIds.length === 0) {\n            socket.emit('error', { message: 'Aucun message à marquer comme lu' });\n            return;\n        }\n\n        console.log(`👁️ Utilisateur ${userId} marque ${messageIds.length} message(s) comme lu(s) dans conversation ${conversation_id}`);\n\n        // Notifier les autres participants\n        socket.to(roomName).emit('messages_read', {\n            conversation_id,\n            message_ids: messageIds,\n            reader_id: userId,\n            reader_name: socket.userName,\n            timestamp: new Date().toISOString()\n        });\n    }\n\n    handleMessageDelivered(socket, data) {\n        const { conversation_id, message_id } = data;\n        const roomName = `conversation_${conversation_id}`;\n\n        // Notifier que le message a été livré\n        socket.to(roomName).emit('message_delivered', {\n            conversation_id,\n            message_id,\n            delivered_at: new Date().toISOString()\n        });\n    }\n\n    handleDisconnection(socket, reason) {\n        const userId = socket.userId;\n        const socketId = socket.id;\n\n        console.log(`❌ Déconnexion Socket.IO:`, {\n            socketId,\n            userId,\n            reason,\n            timestamp: new Date().toISOString()\n        });\n\n        // Nettoyer les connexions utilisateur\n        if (this.connectedUsers.has(userId)) {\n            this.connectedUsers.get(userId).delete(socketId);\n            \n            // Si plus aucune connexion pour cet utilisateur\n            if (this.connectedUsers.get(userId).size === 0) {\n                this.connectedUsers.delete(userId);\n                \n                // Arrêter tous les typing de cet utilisateur\n                this.cleanupUserTyping(userId);\n                \n                console.log(`🔌 Utilisateur ${userId} complètement déconnecté`);\n            }\n        }\n\n        // Nettoyer les infos du socket\n        this.userSockets.delete(socketId);\n    }\n\n    handleError(socket, error) {\n        const userId = socket.userId;\n        \n        console.error(`🚨 Erreur Socket.IO pour utilisateur ${userId}:`, {\n            error: error.message || error,\n            socketId: socket.id,\n            timestamp: new Date().toISOString()\n        });\n    }\n\n    handleDebugInfo(socket) {\n        const debugInfo = {\n            connectedUsers: Array.from(this.connectedUsers.keys()),\n            totalConnections: Array.from(this.connectedUsers.values()).reduce((sum, sockets) => sum + sockets.size, 0),\n            activeConversations: Array.from(this.conversationRooms.keys()),\n            typingUsers: Object.fromEntries(\n                Array.from(this.typingUsers.entries()).map(([convId, users]) => [\n                    convId, Array.from(users)\n                ])\n            ),\n            serverTime: new Date().toISOString()\n        };\n\n        socket.emit('debug_info_response', debugInfo);\n    }\n\n    cleanupUserTyping(userId) {\n        // Arrêter tous les typing de cet utilisateur\n        for (const [conversationId, typingUsersSet] of this.typingUsers.entries()) {\n            if (typingUsersSet.has(userId)) {\n                this.stopTyping(userId, conversationId);\n            }\n        }\n\n        // Nettoyer les timeouts\n        for (const [key, timeout] of this.typingTimeouts.entries()) {\n            if (key.startsWith(`${userId}-`)) {\n                clearTimeout(timeout);\n                this.typingTimeouts.delete(key);\n            }\n        }\n    }\n\n    // Méthodes utilitaires publiques\n    \n    /**\n     * Envoyer un message à tous les participants d'une conversation\n     */\n    broadcastToConversation(conversationId, event, data) {\n        const roomName = `conversation_${conversationId}`;\n        this.io.to(roomName).emit(event, {\n            conversation_id: conversationId,\n            ...data,\n            timestamp: new Date().toISOString()\n        });\n    }\n\n    /**\n     * Envoyer un message à un utilisateur spécifique (toutes ses connexions)\n     */\n    sendToUser(userId, event, data) {\n        const userSockets = this.connectedUsers.get(userId);\n        if (userSockets) {\n            userSockets.forEach(socketId => {\n                this.io.to(socketId).emit(event, {\n                    ...data,\n                    timestamp: new Date().toISOString()\n                });\n            });\n        }\n    }\n\n    /**\n     * Obtenir les statistiques de connexion\n     */\n    getStats() {\n        return {\n            connectedUsers: this.connectedUsers.size,\n            totalConnections: Array.from(this.connectedUsers.values()).reduce((sum, sockets) => sum + sockets.size, 0),\n            activeConversations: this.conversationRooms.size,\n            typingUsers: this.typingUsers.size,\n            timestamp: new Date().toISOString()\n        };\n    }\n\n    /**\n     * Vérifier si un utilisateur est connecté\n     */\n    isUserConnected(userId) {\n        return this.connectedUsers.has(userId) && this.connectedUsers.get(userId).size > 0;\n    }\n\n    /**\n     * Obtenir les participants d'une conversation\n     */\n    getConversationParticipants(conversationId) {\n        return Array.from(this.conversationRooms.get(conversationId) || []);\n    }\n}\n\nmodule.exports = SocketManager;"