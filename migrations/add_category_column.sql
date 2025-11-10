-- Migration pour ajouter la colonne category à la table admin_notifications

ALTER TABLE `admin_notifications` 
ADD COLUMN `category` varchar(50) NOT NULL DEFAULT 'general' COMMENT 'Catégorie spécifique de la notification' AFTER `type`;

-- Ajouter un index sur la colonne category
ALTER TABLE `admin_notifications` 
ADD INDEX `idx_category` (`category`);

-- Mettre à jour les notifications existantes avec une catégorie par défaut
UPDATE `admin_notifications` 
SET `category` = 'general' 
WHERE `category` IS NULL OR `category` = '';

-- Ajouter des colonnes manquantes si elles n'existent pas
ALTER TABLE `admin_notifications` 
ADD COLUMN IF NOT EXISTS `user_id` int(11) DEFAULT NULL COMMENT 'ID de l\'utilisateur concerné (si applicable)' AFTER `priority`,
ADD COLUMN IF NOT EXISTS `product_id` int(11) DEFAULT NULL COMMENT 'ID du produit concerné (si applicable)' AFTER `user_id`,
ADD COLUMN IF NOT EXISTS `order_id` int(11) DEFAULT NULL COMMENT 'ID de la commande concernée (si applicable)' AFTER `product_id`,
ADD COLUMN IF NOT EXISTS `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Date de mise à jour' AFTER `read_at`;

-- Ajouter les contraintes de clés étrangères si elles n'existent pas
ALTER TABLE `admin_notifications` 
ADD CONSTRAINT `fk_admin_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE,
ADD CONSTRAINT `fk_admin_notifications_product` FOREIGN KEY (`product_id`) REFERENCES `produits` (`id`) ON DELETE CASCADE,
ADD CONSTRAINT `fk_admin_notifications_order` FOREIGN KEY (`order_id`) REFERENCES `commandes` (`id`) ON DELETE CASCADE;
