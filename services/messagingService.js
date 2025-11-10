// Service centralisé pour la messagerie

const db = require('../config/database');

class MessagingService {
    
    async createConversation(acheteurId, fournisseurId, sujet, produitId = null) {
        try {
            const [fournisseurCheck] = await db.execute(
                'SELECT id FROM utilisateurs WHERE id = ? AND role_id = 2',
                [fournisseurId]
            );

            if (fournisseurCheck.length === 0) {
                throw new Error('Fournisseur non trouvé');
            }

            const [existingConv] = await db.execute(
                'SELECT id FROM conversations WHERE acheteur_id = ? AND fournisseur_id = ?',
                [acheteurId, fournisseurId]
            );

            if (existingConv.length > 0) {
                return {
                    exists: true,
                    conversationId: existingConv[0].id
                };
            }

            const [result] = await db.execute(
                `INSERT INTO conversations (acheteur_id, fournisseur_id, produit_id, sujet, statut, created_at, updated_at, derniere_activite)
                 VALUES (?, ?, ?, ?, 'ouverte', NOW(), NOW(), NOW())`,
                [acheteurId, fournisseurId, produitId, sujet]
            );

            const conversationId = result.insertId;

            const [newConversation] = await db.execute(`
                SELECT 
                    c.id,
                    c.acheteur_id,
                    c.fournisseur_id,
                    c.produit_id,
                    c.sujet,
                    c.statut,
                    c.created_at,
                    c.updated_at,
                    c.derniere_activite,
                    e.nom_entreprise,
                    u_fournisseur.nom as fournisseur_nom,
                    u_fournisseur.prenom as fournisseur_prenom,
                    0 as messages_non_lus_acheteur
                FROM conversations c
                JOIN utilisateurs u_fournisseur ON c.fournisseur_id = u_fournisseur.id
                LEFT JOIN entreprises e ON u_fournisseur.id = e.utilisateur_id
                WHERE c.id = ?
            `, [conversationId]);

            return {
                exists: false,
                conversationId,
                conversation: newConversation[0]
            };

        } catch (error) {
            console.error('❌ Erreur création conversation:', error);
            throw error;
        }
    }

    async sendMessage(conversationId, expediteurId, contenu, type = 'texte', fichier = null) {
        try {
            const [convCheck] = await db.execute(
                'SELECT id FROM conversations WHERE id = ? AND (acheteur_id = ? OR fournisseur_id = ?)',
                [conversationId, expediteurId, expediteurId]
            );

            if (convCheck.length === 0) {
                throw new Error('Accès non autorisé à cette conversation');
            }

            const messageData = {
                conversation_id: conversationId,
                expediteur_id: expediteurId,
                contenu,
                type,
                created_at: new Date(),
                lu: 0
            };

            if (fichier && type !== 'texte') {
                messageData.fichier_url = fichier.url;
                messageData.fichier_nom = fichier.nom;
                messageData.fichier_taille = fichier.taille;
                messageData.fichier_type = fichier.type;
            }

            const fields = Object.keys(messageData);
            const placeholders = fields.map(() => '?').join(', ');
            const values = Object.values(messageData);

            const [result] = await db.execute(
                `INSERT INTO messages (${fields.join(', ')}) VALUES (${placeholders})`,
                values
            );

            const messageId = result.insertId;

            await db.execute(
                'UPDATE conversations SET updated_at = NOW(), derniere_activite = NOW() WHERE id = ?',
                [conversationId]
            );

            const [newMessage] = await db.execute(`
                SELECT 
                    m.id,
                    m.conversation_id,
                    m.expediteur_id,
                    m.contenu,
                    m.created_at,
                    m.lu,
                    m.type,
                    m.fichier_url,
                    m.fichier_nom,
                    m.fichier_taille,
                    m.fichier_type,
                    u.nom,
                    u.prenom,
                    u.email
                FROM messages m
                JOIN utilisateurs u ON m.expediteur_id = u.id
                WHERE m.id = ?
            `, [messageId]);

            const formattedMessage = {
                id: newMessage[0].id,
                conversation_id: newMessage[0].conversation_id,
                expediteur_id: newMessage[0].expediteur_id,
                contenu: newMessage[0].contenu,
                created_at: newMessage[0].created_at,
                lu: Boolean(newMessage[0].lu),
                type: newMessage[0].type || 'texte',
                fichier: newMessage[0].fichier_url ? {
                    url: newMessage[0].fichier_url,
                    nom: newMessage[0].fichier_nom,
                    taille: newMessage[0].fichier_taille,
                    type: newMessage[0].fichier_type
                } : null,
                expediteur: {
                    id: newMessage[0].expediteur_id,
                    nom: newMessage[0].nom,
                    prenom: newMessage[0].prenom,
                    email: newMessage[0].email
                }
            };

            return formattedMessage;

        } catch (error) {
            console.error('❌ Erreur envoi message:', error);
            throw error;
        }
    }

    async getConversationMessages(conversationId, userId) {
        try {
            const [convCheck] = await db.execute(
                'SELECT id FROM conversations WHERE id = ? AND (acheteur_id = ? OR fournisseur_id = ?)',
                [conversationId, userId, userId]
            );

            if (convCheck.length === 0) {
                throw new Error('Accès non autorisé à cette conversation');
            }

            const [messages] = await db.execute(`
                SELECT 
                    m.id,
                    m.conversation_id,
                    m.expediteur_id,
                    m.contenu,
                    m.created_at,
                    m.lu,
                    m.type,
                    m.fichier_url,
                    m.fichier_nom,
                    m.fichier_taille,
                    m.fichier_type,
                    u.nom,
                    u.prenom,
                    u.email
                FROM messages m
                JOIN utilisateurs u ON m.expediteur_id = u.id
                WHERE m.conversation_id = ? AND m.deleted_at IS NULL
                ORDER BY m.created_at ASC
            `, [conversationId]);

            const formattedMessages = messages.map(msg => ({
                id: msg.id,
                conversation_id: msg.conversation_id,
                expediteur_id: msg.expediteur_id,
                contenu: msg.contenu,
                created_at: msg.created_at,
                lu: Boolean(msg.lu),
                type: msg.type || 'texte',
                fichier: msg.fichier_url ? {
                    url: msg.fichier_url,
                    nom: msg.fichier_nom,
                    taille: msg.fichier_taille,
                    type: msg.fichier_type
                } : null,
                expediteur: {
                    id: msg.expediteur_id,
                    nom: msg.nom,
                    prenom: msg.prenom,
                    email: msg.email
                }
            }));

            return formattedMessages;

        } catch (error) {
            console.error('❌ Erreur récupération messages:', error);
            throw error;
        }
    }

    async markMessagesAsRead(conversationId, userId, messageIds) {
        try {
            const [convCheck] = await db.execute(
                'SELECT id FROM conversations WHERE id = ? AND (acheteur_id = ? OR fournisseur_id = ?)',
                [conversationId, userId, userId]
            );

            if (convCheck.length === 0) {
                throw new Error('Accès non autorisé à cette conversation');
            }

            if (messageIds.length === 0) {
                return { affected: 0 };
            }

            const placeholders = messageIds.map(() => '?').join(',');
            const params = [...messageIds, conversationId, userId];

            const [result] = await db.execute(
                `UPDATE messages 
                 SET lu = 1 
                 WHERE id IN (${placeholders}) 
                 AND conversation_id = ? 
                 AND expediteur_id != ?`,
                params
            );

            return { affected: result.affectedRows };

        } catch (error) {
            console.error('❌ Erreur marquage messages lus:', error);
            throw error;
        }
    }

    async getUserConversations(userId, userRole) {
        try {
            let query, params;

            if (userRole === 1) {
                query = `
                    SELECT 
                        c.id,
                        c.acheteur_id,
                        c.fournisseur_id,
                        c.produit_id,
                        c.sujet,
                        c.statut,
                        c.created_at,
                        c.updated_at,
                        c.derniere_activite,
                        e.nom_entreprise,
                        u_fournisseur.nom as fournisseur_nom,
                        u_fournisseur.prenom as fournisseur_prenom,
                        COALESCE(
                            (SELECT COUNT(*) FROM messages m 
                             WHERE m.conversation_id = c.id 
                             AND m.lu = 0 
                             AND m.expediteur_id != c.acheteur_id
                             AND m.deleted_at IS NULL), 0
                        ) as messages_non_lus_acheteur,
                        (SELECT contenu FROM messages m2 
                         WHERE m2.conversation_id = c.id 
                         AND m2.deleted_at IS NULL
                         ORDER BY m2.created_at DESC LIMIT 1) as dernier_message,
                        (SELECT created_at FROM messages m3 
                         WHERE m3.conversation_id = c.id 
                         AND m3.deleted_at IS NULL
                         ORDER BY m3.created_at DESC LIMIT 1) as derniere_activite
                    FROM conversations c
                    JOIN utilisateurs u_fournisseur ON c.fournisseur_id = u_fournisseur.id
                    LEFT JOIN entreprises e ON u_fournisseur.id = e.utilisateur_id
                    WHERE c.acheteur_id = ?
                    ORDER BY 
                        COALESCE(
                            (SELECT created_at FROM messages m4 
                             WHERE m4.conversation_id = c.id 
                             AND m4.deleted_at IS NULL
                             ORDER BY m4.created_at DESC LIMIT 1), 
                            c.created_at
                        ) DESC
                `;
                params = [userId];

            } else if (userRole === 2) {
                query = `
                    SELECT 
                        c.id,
                        c.acheteur_id,
                        c.fournisseur_id,
                        c.produit_id,
                        c.sujet,
                        c.statut,
                        c.created_at,
                        c.updated_at,
                        c.derniere_activite,
                        u_acheteur.nom as acheteur_nom,
                        u_acheteur.prenom as acheteur_prenom,
                        COALESCE(
                            (SELECT COUNT(*) FROM messages m 
                             WHERE m.conversation_id = c.id 
                             AND m.lu = 0 
                             AND m.expediteur_id != c.fournisseur_id
                             AND m.deleted_at IS NULL), 0
                        ) as messages_non_lus_fournisseur,
                        (SELECT contenu FROM messages m2 
                         WHERE m2.conversation_id = c.id 
                         AND m2.deleted_at IS NULL
                         ORDER BY m2.created_at DESC LIMIT 1) as dernier_message,
                        (SELECT created_at FROM messages m3 
                         WHERE m3.conversation_id = c.id 
                         AND m3.deleted_at IS NULL
                         ORDER BY m3.created_at DESC LIMIT 1) as derniere_activite
                    FROM conversations c
                    JOIN utilisateurs u_acheteur ON c.acheteur_id = u_acheteur.id
                    WHERE c.fournisseur_id = ?
                    ORDER BY 
                        COALESCE(
                            (SELECT created_at FROM messages m4 
                             WHERE m4.conversation_id = c.id 
                             AND m4.deleted_at IS NULL
                             ORDER BY m4.created_at DESC LIMIT 1), 
                            c.created_at
                        ) DESC
                `;
                params = [userId];

            } else {
                throw new Error('Rôle non autorisé pour accéder aux conversations');
            }

            const [conversations] = await db.execute(query, params);
            return conversations;

        } catch (error) {
            console.error('❌ Erreur récupération conversations:', error);
            throw error;
        }
    }
}

module.exports = new MessagingService();
