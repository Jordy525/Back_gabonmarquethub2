-- Étendre la table notifications existante pour supporter tous les types de notifications
-- Ajouter les colonnes manquantes

-- Ajouter la colonne category si elle n'existe pas
ALTER TABLE `notifications` 
ADD COLUMN IF NOT EXISTS `category` varchar(50) DEFAULT 'general' AFTER `type`;

-- Ajouter la colonne priority si elle n'existe pas
ALTER TABLE `notifications` 
ADD COLUMN IF NOT EXISTS `priority` enum('low','medium','high','urgent') DEFAULT 'medium' AFTER `lu`;

-- Ajouter la colonne data pour stocker des données JSON
ALTER TABLE `notifications` 
ADD COLUMN IF NOT EXISTS `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`data`)) AFTER `priority`;

-- Ajouter les colonnes de relations
ALTER TABLE `notifications` 
ADD COLUMN IF NOT EXISTS `related_user_id` int(11) DEFAULT NULL AFTER `data`;

ALTER TABLE `notifications` 
ADD COLUMN IF NOT EXISTS `related_product_id` int(11) DEFAULT NULL AFTER `related_user_id`;

ALTER TABLE `notifications` 
ADD COLUMN IF NOT EXISTS `related_conversation_id` int(11) DEFAULT NULL AFTER `related_product_id`;

ALTER TABLE `notifications` 
ADD COLUMN IF NOT EXISTS `related_order_id` int(11) DEFAULT NULL AFTER `related_conversation_id`;

-- Ajouter la colonne read_at
ALTER TABLE `notifications` 
ADD COLUMN IF NOT EXISTS `read_at` timestamp NULL DEFAULT NULL AFTER `date_creation`;

-- Ajouter la colonne updated_at
ALTER TABLE `notifications` 
ADD COLUMN IF NOT EXISTS `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `read_at`;

-- Modifier le type enum pour inclure tous les types de notifications
ALTER TABLE `notifications` 
MODIFY COLUMN `type` enum('message','commande','promotion','systeme','produit','user_management','product_management','order_management') NOT NULL;

-- Ajouter les index pour les nouvelles colonnes
ALTER TABLE `notifications` 
ADD INDEX IF NOT EXISTS `idx_category` (`category`),
ADD INDEX IF NOT EXISTS `idx_priority` (`priority`),
ADD INDEX IF NOT EXISTS `idx_related_user` (`related_user_id`),
ADD INDEX IF NOT EXISTS `idx_related_product` (`related_product_id`),
ADD INDEX IF NOT EXISTS `idx_related_conversation` (`related_conversation_id`),
ADD INDEX IF NOT EXISTS `idx_related_order` (`related_order_id`);

-- Ajouter les contraintes de clés étrangères si les tables existent
-- Vérifier et ajouter les contraintes de clés étrangères
SET @constraint_exists = (
  SELECT COUNT(*) 
  FROM information_schema.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'notifications' 
  AND CONSTRAINT_NAME = 'fk_notifications_related_user'
);

SET @sql = IF(@constraint_exists = 0, 
  'ALTER TABLE `notifications` ADD CONSTRAINT `fk_notifications_related_user` FOREIGN KEY (`related_user_id`) REFERENCES `utilisateurs` (`id`) ON DELETE SET NULL',
  'SELECT "Constraint fk_notifications_related_user already exists"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Contrainte pour les produits
SET @constraint_exists = (
  SELECT COUNT(*) 
  FROM information_schema.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'notifications' 
  AND CONSTRAINT_NAME = 'fk_notifications_related_product'
);

SET @sql = IF(@constraint_exists = 0, 
  'ALTER TABLE `notifications` ADD CONSTRAINT `fk_notifications_related_product` FOREIGN KEY (`related_product_id`) REFERENCES `produits` (`id`) ON DELETE SET NULL',
  'SELECT "Constraint fk_notifications_related_product already exists"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
