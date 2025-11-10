-- Migration pour corriger la table admin_notifications
-- Ajouter les colonnes manquantes une par une

-- 1. Ajouter la colonne category
ALTER TABLE `admin_notifications` 
ADD COLUMN `category` varchar(50) NOT NULL DEFAULT 'general' COMMENT 'Catégorie spécifique de la notification' AFTER `type`;

-- 2. Ajouter un index sur la colonne category
ALTER TABLE `admin_notifications` 
ADD INDEX `idx_category` (`category`);

-- 3. Mettre à jour les notifications existantes avec une catégorie par défaut
UPDATE `admin_notifications` 
SET `category` = 'general' 
WHERE `category` IS NULL OR `category` = '';

-- 4. Ajouter la colonne user_id
ALTER TABLE `admin_notifications` 
ADD COLUMN `user_id` int(11) DEFAULT NULL COMMENT 'ID de l\'utilisateur concerné (si applicable)' AFTER `priority`;

-- 5. Ajouter la colonne product_id
ALTER TABLE `admin_notifications` 
ADD COLUMN `product_id` int(11) DEFAULT NULL COMMENT 'ID du produit concerné (si applicable)' AFTER `user_id`;

-- 6. Ajouter la colonne order_id
ALTER TABLE `admin_notifications` 
ADD COLUMN `order_id` int(11) DEFAULT NULL COMMENT 'ID de la commande concernée (si applicable)' AFTER `product_id`;

-- 7. Ajouter la colonne updated_at
ALTER TABLE `admin_notifications` 
ADD COLUMN `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Date de mise à jour' AFTER `read_at`;

-- 8. Ajouter les contraintes de clés étrangères une par une
-- Note: Ces contraintes ne seront ajoutées que si les tables référencées existent

-- Contrainte pour user_id (si la table utilisateurs existe)
-- ALTER TABLE `admin_notifications` 
-- ADD CONSTRAINT `fk_admin_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE;

-- Contrainte pour product_id (si la table produits existe)
-- ALTER TABLE `admin_notifications` 
-- ADD CONSTRAINT `fk_admin_notifications_product` FOREIGN KEY (`product_id`) REFERENCES `produits` (`id`) ON DELETE CASCADE;

-- Contrainte pour order_id (si la table commandes existe)
-- ALTER TABLE `admin_notifications` 
-- ADD CONSTRAINT `fk_admin_notifications_order` FOREIGN KEY (`order_id`) REFERENCES `commandes` (`id`) ON DELETE CASCADE;
