-- Index pour optimiser les performances des conversations et messages
-- À exécuter sur la base de données MySQL

-- Index pour la table conversations
CREATE INDEX IF NOT EXISTS idx_conversations_acheteur_updated 
ON conversations (acheteur_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_fournisseur_updated 
ON conversations (fournisseur_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_acheteur_fournisseur 
ON conversations (acheteur_id, fournisseur_id);

CREATE INDEX IF NOT EXISTS idx_conversations_produit 
ON conversations (produit_id);

-- Index pour la table messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON messages (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_unread 
ON messages (conversation_id, lu, expediteur_id);

CREATE INDEX IF NOT EXISTS idx_messages_expediteur 
ON messages (expediteur_id, created_at DESC);

-- Index composé pour optimiser les sous-requêtes de dernier message
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_id 
ON messages (conversation_id, created_at DESC, id);

-- Index pour la table entreprises (si pas déjà présent)
CREATE INDEX IF NOT EXISTS idx_entreprises_utilisateur 
ON entreprises (utilisateur_id);

-- Index pour la table produits (si pas déjà présent)
CREATE INDEX IF NOT EXISTS idx_produits_fournisseur 
ON produits (fournisseur_id);

-- Statistiques pour vérifier les performances
-- (À exécuter après création des index)

-- ANALYZE TABLE conversations;
-- ANALYZE TABLE messages;
-- ANALYZE TABLE entreprises;
-- ANALYZE TABLE produits;
-- ANALYZE TABLE utilisateurs;