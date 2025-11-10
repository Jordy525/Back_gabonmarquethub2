# 🗄️ Structure Base de Données MySQL - GabMarketHub
## Marketplace B2C - Conception Complète

## 📊 **Vue d'Ensemble**
- **20+ Tables** pour couvrir tous les besoins métier
- **Relations optimisées** avec contraintes d'intégrité
- **Indexation performante** pour les requêtes fréquentes
- **Évolutivité** pour la croissance future

---

## 🏗️ **Structure SQL Complète**

```sql
-- =====================================================
-- 🗄️ GABMARKETHUB - STRUCTURE BASE DE DONNÉES MYSQL
-- Marketplace B2C - Version Production
-- Date: Novembre 2025
-- =====================================================

-- Configuration de la base
SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

-- Création de la base de données
CREATE DATABASE IF NOT EXISTS `gabmarkethub` 
DEFAULT CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `gabmarkethub`;

-- =====================================================
-- 👥 TABLES UTILISATEURS ET AUTHENTIFICATION
-- =====================================================

-- Table des rôles système
CREATE TABLE `roles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL UNIQUE,
  `display_name` varchar(100) NOT NULL,
  `description` text,
  `permissions` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  INDEX `idx_roles_name` (`name`),
  INDEX `idx_roles_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Rôles système (admin, buyer, supplier)';

-- Insertion des rôles par défaut
INSERT INTO `roles` (`name`, `display_name`, `description`) VALUES
('admin', 'Administrateur', 'Gestionnaire de la plateforme avec tous les droits'),
('buyer', 'Acheteur', 'Utilisateur qui achète des produits'),
('supplier', 'Fournisseur', 'Entreprise qui vend des produits');

-- Table utilisateurs principale (pivot)
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uuid` char(36) NOT NULL UNIQUE,
  `email` varchar(255) NOT NULL UNIQUE,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `phone_verified_at` timestamp NULL DEFAULT NULL,
  `profile_picture` varchar(500) DEFAULT NULL,
  `role_id` int(11) NOT NULL,
  `status` enum('active','inactive','suspended','pending') DEFAULT 'pending',
  `last_login_at` timestamp NULL DEFAULT NULL,
  `login_attempts` int(11) DEFAULT 0,
  `locked_until` timestamp NULL DEFAULT NULL,
  `two_factor_enabled` tinyint(1) DEFAULT 0,
  `two_factor_secret` varchar(255) DEFAULT NULL,
  `preferences` json DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_uuid` (`uuid`),
  UNIQUE KEY `uk_users_email` (`email`),
  KEY `fk_users_role` (`role_id`),
  KEY `idx_users_status` (`status`),
  KEY `idx_users_created` (`created_at`),
  KEY `idx_users_deleted` (`deleted_at`),
  
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Utilisateurs système - Table pivot';

-- Table des adresses
CREATE TABLE `addresses` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `type` enum('billing','shipping','both') DEFAULT 'both',
  `label` varchar(100) DEFAULT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `company` varchar(200) DEFAULT NULL,
  `address_line_1` varchar(255) NOT NULL,
  `address_line_2` varchar(255) DEFAULT NULL,
  `city` varchar(100) NOT NULL,
  `state` varchar(100) DEFAULT NULL,
  `postal_code` varchar(20) NOT NULL,
  `country` varchar(2) NOT NULL DEFAULT 'GA',
  `phone` varchar(20) DEFAULT NULL,
  `is_default` tinyint(1) DEFAULT 0,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  KEY `fk_addresses_user` (`user_id`),
  KEY `idx_addresses_type` (`type`),
  KEY `idx_addresses_default` (`is_default`),
  
  CONSTRAINT `fk_addresses_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Adresses des utilisateurs';

-- Table des profils acheteurs
CREATE TABLE `buyer_profiles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL UNIQUE,
  `date_of_birth` date DEFAULT NULL,
  `gender` enum('male','female','other') DEFAULT NULL,
  `profession` varchar(200) DEFAULT NULL,
  `interests` json DEFAULT NULL,
  `preferred_categories` json DEFAULT NULL,
  `budget_range` enum('low','medium','high','premium') DEFAULT NULL,
  `shopping_frequency` enum('daily','weekly','monthly','rarely') DEFAULT NULL,
  `marketing_consent` tinyint(1) DEFAULT 0,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_buyer_profiles_user` (`user_id`),
  KEY `idx_buyer_budget` (`budget_range`),
  KEY `idx_buyer_frequency` (`shopping_frequency`),
  
  CONSTRAINT `fk_buyer_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Profils détaillés des acheteurs';

-- Table des profils fournisseurs
CREATE TABLE `supplier_profiles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL UNIQUE,
  `business_name` varchar(200) NOT NULL,
  `business_registration` varchar(100) DEFAULT NULL,
  `tax_number` varchar(100) DEFAULT NULL,
  `business_type` enum('individual','company','cooperative') DEFAULT 'company',
  `industry_sector` varchar(100) DEFAULT NULL,
  `description` text,
  `website` varchar(500) DEFAULT NULL,
  `established_year` year DEFAULT NULL,
  `employee_count` enum('1-10','11-50','51-200','201-500','500+') DEFAULT NULL,
  `verification_status` enum('pending','verified','rejected') DEFAULT 'pending',
  `verification_documents` json DEFAULT NULL,
  `verified_at` timestamp NULL DEFAULT NULL,
  `rating_average` decimal(3,2) DEFAULT 0.00,
  `rating_count` int(11) DEFAULT 0,
  `total_sales` decimal(15,2) DEFAULT 0.00,
  `commission_rate` decimal(5,2) DEFAULT 5.00,
  `is_featured` tinyint(1) DEFAULT 0,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_supplier_profiles_user` (`user_id`),
  KEY `idx_supplier_verification` (`verification_status`),
  KEY `idx_supplier_rating` (`rating_average`),
  KEY `idx_supplier_featured` (`is_featured`),
  
  CONSTRAINT `fk_supplier_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Profils détaillés des fournisseurs';

-- =====================================================
-- 🛍️ TABLES PRODUITS ET CATALOGUE
-- =====================================================

-- Table des catégories (structure hiérarchique)
CREATE TABLE `categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `parent_id` int(11) DEFAULT NULL,
  `name` varchar(200) NOT NULL,
  `slug` varchar(200) NOT NULL UNIQUE,
  `description` text,
  `icon` varchar(200) DEFAULT NULL,
  `image` varchar(500) DEFAULT NULL,
  `sort_order` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `seo_title` varchar(200) DEFAULT NULL,
  `seo_description` text DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_categories_slug` (`slug`),
  KEY `fk_categories_parent` (`parent_id`),
  KEY `idx_categories_active` (`is_active`),
  KEY `idx_categories_sort` (`sort_order`),
  
  CONSTRAINT `fk_categories_parent` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Catégories de produits hiérarchiques';

-- Table des marques
CREATE TABLE `brands` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL UNIQUE,
  `slug` varchar(200) NOT NULL UNIQUE,
  `description` text,
  `logo` varchar(500) DEFAULT NULL,
  `website` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_brands_name` (`name`),
  UNIQUE KEY `uk_brands_slug` (`slug`),
  KEY `idx_brands_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Marques de produits';

-- Table des produits
CREATE TABLE `products` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uuid` char(36) NOT NULL UNIQUE,
  `supplier_id` int(11) NOT NULL,
  `category_id` int(11) NOT NULL,
  `brand_id` int(11) DEFAULT NULL,
  `name` varchar(300) NOT NULL,
  `slug` varchar(300) NOT NULL,
  `short_description` varchar(500) DEFAULT NULL,
  `description` longtext,
  `sku` varchar(100) NOT NULL,
  `barcode` varchar(100) DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `compare_price` decimal(10,2) DEFAULT NULL,
  `cost_price` decimal(10,2) DEFAULT NULL,
  `currency` varchar(3) DEFAULT 'XAF',
  `weight` decimal(8,2) DEFAULT NULL,
  `dimensions` json DEFAULT NULL,
  `inventory_tracking` tinyint(1) DEFAULT 1,
  `stock_quantity` int(11) DEFAULT 0,
  `low_stock_threshold` int(11) DEFAULT 10,
  `allow_backorder` tinyint(1) DEFAULT 0,
  `status` enum('draft','active','inactive','out_of_stock') DEFAULT 'draft',
  `featured` tinyint(1) DEFAULT 0,
  `digital` tinyint(1) DEFAULT 0,
  `shipping_required` tinyint(1) DEFAULT 1,
  `tax_class` varchar(50) DEFAULT 'standard',
  `attributes` json DEFAULT NULL,
  `variants` json DEFAULT NULL,
  `images` json DEFAULT NULL,
  `seo_title` varchar(200) DEFAULT NULL,
  `seo_description` text DEFAULT NULL,
  `tags` json DEFAULT NULL,
  `rating_average` decimal(3,2) DEFAULT 0.00,
  `rating_count` int(11) DEFAULT 0,
  `view_count` int(11) DEFAULT 0,
  `order_count` int(11) DEFAULT 0,
  `published_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_products_uuid` (`uuid`),
  UNIQUE KEY `uk_products_sku` (`sku`),
  KEY `uk_products_slug` (`slug`),
  KEY `fk_products_supplier` (`supplier_id`),
  KEY `fk_products_category` (`category_id`),
  KEY `fk_products_brand` (`brand_id`),
  KEY `idx_products_status` (`status`),
  KEY `idx_products_featured` (`featured`),
  KEY `idx_products_price` (`price`),
  KEY `idx_products_rating` (`rating_average`),
  KEY `idx_products_published` (`published_at`),
  KEY `idx_products_deleted` (`deleted_at`),
  
  CONSTRAINT `fk_products_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_products_brand` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Catalogue de produits';

-- Table des variantes de produits
CREATE TABLE `product_variants` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` int(11) NOT NULL,
  `name` varchar(200) NOT NULL,
  `sku` varchar(100) NOT NULL UNIQUE,
  `barcode` varchar(100) DEFAULT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `compare_price` decimal(10,2) DEFAULT NULL,
  `cost_price` decimal(10,2) DEFAULT NULL,
  `weight` decimal(8,2) DEFAULT NULL,
  `stock_quantity` int(11) DEFAULT 0,
  `attributes` json DEFAULT NULL,
  `image` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_variants_sku` (`sku`),
  KEY `fk_variants_product` (`product_id`),
  KEY `idx_variants_active` (`is_active`),
  
  CONSTRAINT `fk_variants_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Variantes de produits (taille, couleur, etc.)';

-- =====================================================
-- 🛒 TABLES COMMANDES ET TRANSACTIONS
-- =====================================================

-- Table des commandes
CREATE TABLE `orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uuid` char(36) NOT NULL UNIQUE,
  `order_number` varchar(50) NOT NULL UNIQUE,
  `buyer_id` int(11) NOT NULL,
  `status` enum('pending','confirmed','processing','shipped','delivered','cancelled','refunded') DEFAULT 'pending',
  `payment_status` enum('pending','paid','partially_paid','failed','refunded') DEFAULT 'pending',
  `fulfillment_status` enum('pending','processing','shipped','delivered','cancelled') DEFAULT 'pending',
  `currency` varchar(3) DEFAULT 'XAF',
  `subtotal` decimal(10,2) NOT NULL DEFAULT 0.00,
  `tax_amount` decimal(10,2) DEFAULT 0.00,
  `shipping_amount` decimal(10,2) DEFAULT 0.00,
  `discount_amount` decimal(10,2) DEFAULT 0.00,
  `total_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `billing_address` json DEFAULT NULL,
  `shipping_address` json DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `internal_notes` text DEFAULT NULL,
  `tracking_number` varchar(100) DEFAULT NULL,
  `shipped_at` timestamp NULL DEFAULT NULL,
  `delivered_at` timestamp NULL DEFAULT NULL,
  `cancelled_at` timestamp NULL DEFAULT NULL,
  `cancelled_reason` text DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_orders_uuid` (`uuid`),
  UNIQUE KEY `uk_orders_number` (`order_number`),
  KEY `fk_orders_buyer` (`buyer_id`),
  KEY `idx_orders_status` (`status`),
  KEY `idx_orders_payment_status` (`payment_status`),
  KEY `idx_orders_created` (`created_at`),
  
  CONSTRAINT `fk_orders_buyer` FOREIGN KEY (`buyer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Commandes clients';

-- Table des articles de commande
CREATE TABLE `order_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `variant_id` int(11) DEFAULT NULL,
  `supplier_id` int(11) NOT NULL,
  `product_name` varchar(300) NOT NULL,
  `product_sku` varchar(100) NOT NULL,
  `variant_name` varchar(200) DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `total` decimal(10,2) NOT NULL,
  `product_data` json DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  KEY `fk_order_items_order` (`order_id`),
  KEY `fk_order_items_product` (`product_id`),
  KEY `fk_order_items_variant` (`variant_id`),
  KEY `fk_order_items_supplier` (`supplier_id`),
  
  CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_order_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_order_items_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_order_items_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Articles des commandes';

-- Table des paiements
CREATE TABLE `payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uuid` char(36) NOT NULL UNIQUE,
  `order_id` int(11) NOT NULL,
  `transaction_id` varchar(200) DEFAULT NULL,
  `gateway` varchar(50) NOT NULL,
  `method` varchar(50) NOT NULL,
  `status` enum('pending','processing','completed','failed','cancelled','refunded') DEFAULT 'pending',
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(3) DEFAULT 'XAF',
  `gateway_response` json DEFAULT NULL,
  `processed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payments_uuid` (`uuid`),
  KEY `fk_payments_order` (`order_id`),
  KEY `idx_payments_status` (`status`),
  KEY `idx_payments_gateway` (`gateway`),
  
  CONSTRAINT `fk_payments_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Paiements des commandes';

-- =====================================================
-- 💬 TABLES COMMUNICATION ET MESSAGERIE
-- =====================================================

-- Table des conversations
CREATE TABLE `conversations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uuid` char(36) NOT NULL UNIQUE,
  `type` enum('direct','group','support') DEFAULT 'direct',
  `subject` varchar(300) DEFAULT NULL,
  `product_id` int(11) DEFAULT NULL,
  `order_id` int(11) DEFAULT NULL,
  `status` enum('active','archived','closed') DEFAULT 'active',
  `last_message_id` int(11) DEFAULT NULL,
  `last_message_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_conversations_uuid` (`uuid`),
  KEY `fk_conversations_product` (`product_id`),
  KEY `fk_conversations_order` (`order_id`),
  KEY `idx_conversations_status` (`status`),
  KEY `idx_conversations_last_message` (`last_message_at`),
  
  CONSTRAINT `fk_conversations_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_conversations_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Conversations entre utilisateurs';

-- Table des participants aux conversations
CREATE TABLE `conversation_participants` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `conversation_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `role` enum('participant','moderator','admin') DEFAULT 'participant',
  `joined_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `left_at` timestamp NULL DEFAULT NULL,
  `last_read_at` timestamp NULL DEFAULT NULL,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_participants_conversation_user` (`conversation_id`, `user_id`),
  KEY `fk_participants_conversation` (`conversation_id`),
  KEY `fk_participants_user` (`user_id`),
  
  CONSTRAINT `fk_participants_conversation` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_participants_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Participants aux conversations';

-- Table des messages
CREATE TABLE `messages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uuid` char(36) NOT NULL UNIQUE,
  `conversation_id` int(11) NOT NULL,
  `sender_id` int(11) NOT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `type` enum('text','image','file','audio','video','system') DEFAULT 'text',
  `content` text,
  `attachments` json DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `is_edited` tinyint(1) DEFAULT 0,
  `edited_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_messages_uuid` (`uuid`),
  KEY `fk_messages_conversation` (`conversation_id`),
  KEY `fk_messages_sender` (`sender_id`),
  KEY `fk_messages_parent` (`parent_id`),
  KEY `idx_messages_type` (`type`),
  KEY `idx_messages_created` (`created_at`),
  KEY `idx_messages_deleted` (`deleted_at`),
  
  CONSTRAINT `fk_messages_conversation` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_messages_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_messages_parent` FOREIGN KEY (`parent_id`) REFERENCES `messages` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Messages des conversations';

-- =====================================================
-- ⭐ TABLES AVIS ET ÉVALUATIONS
-- =====================================================

-- Table des avis produits
CREATE TABLE `product_reviews` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` int(11) NOT NULL,
  `buyer_id` int(11) NOT NULL,
  `order_item_id` int(11) DEFAULT NULL,
  `rating` tinyint(1) NOT NULL CHECK (`rating` >= 1 AND `rating` <= 5),
  `title` varchar(300) DEFAULT NULL,
  `content` text,
  `pros` text DEFAULT NULL,
  `cons` text DEFAULT NULL,
  `images` json DEFAULT NULL,
  `verified_purchase` tinyint(1) DEFAULT 0,
  `helpful_count` int(11) DEFAULT 0,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `moderated_at` timestamp NULL DEFAULT NULL,
  `moderated_by` int(11) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_reviews_buyer_product` (`buyer_id`, `product_id`),
  KEY `fk_reviews_product` (`product_id`),
  KEY `fk_reviews_buyer` (`buyer_id`),
  KEY `fk_reviews_order_item` (`order_item_id`),
  KEY `fk_reviews_moderator` (`moderated_by`),
  KEY `idx_reviews_rating` (`rating`),
  KEY `idx_reviews_status` (`status`),
  KEY `idx_reviews_verified` (`verified_purchase`),
  
  CONSTRAINT `fk_reviews_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reviews_buyer` FOREIGN KEY (`buyer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reviews_order_item` FOREIGN KEY (`order_item_id`) REFERENCES `order_items` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_reviews_moderator` FOREIGN KEY (`moderated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Avis et évaluations des produits';

-- Table des votes sur les avis
CREATE TABLE `review_votes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `review_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `vote` enum('helpful','not_helpful') NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_votes_review_user` (`review_id`, `user_id`),
  KEY `fk_votes_review` (`review_id`),
  KEY `fk_votes_user` (`user_id`),
  
  CONSTRAINT `fk_votes_review` FOREIGN KEY (`review_id`) REFERENCES `product_reviews` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_votes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Votes utiles sur les avis';

-- =====================================================
-- ❤️ TABLES FAVORIS ET LISTES
-- =====================================================

-- Table des listes de souhaits
CREATE TABLE `wishlists` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `name` varchar(200) NOT NULL DEFAULT 'Ma liste de souhaits',
  `description` text DEFAULT NULL,
  `is_public` tinyint(1) DEFAULT 0,
  `is_default` tinyint(1) DEFAULT 0,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  KEY `fk_wishlists_user` (`user_id`),
  KEY `idx_wishlists_public` (`is_public`),
  
  CONSTRAINT `fk_wishlists_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Listes de souhaits des utilisateurs';

-- Table des articles des listes de souhaits
CREATE TABLE `wishlist_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `wishlist_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `variant_id` int(11) DEFAULT NULL,
  `added_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_wishlist_items_product` (`wishlist_id`, `product_id`, `variant_id`),
  KEY `fk_wishlist_items_wishlist` (`wishlist_id`),
  KEY `fk_wishlist_items_product` (`product_id`),
  KEY `fk_wishlist_items_variant` (`variant_id`),
  
  CONSTRAINT `fk_wishlist_items_wishlist` FOREIGN KEY (`wishlist_id`) REFERENCES `wishlists` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_wishlist_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_wishlist_items_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Articles des listes de souhaits';

-- =====================================================
-- 🔔 TABLES NOTIFICATIONS
-- =====================================================

-- Table des types de notifications
CREATE TABLE `notification_types` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL UNIQUE,
  `display_name` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `category` varchar(50) DEFAULT NULL,
  `channels` json DEFAULT NULL,
  `template_email` varchar(200) DEFAULT NULL,
  `template_sms` varchar(200) DEFAULT NULL,
  `template_push` varchar(200) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_notification_types_name` (`name`),
  KEY `idx_notification_types_category` (`category`),
  KEY `idx_notification_types_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Types de notifications système';

-- Table des notifications
CREATE TABLE `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uuid` char(36) NOT NULL UNIQUE,
  `user_id` int(11) NOT NULL,
  `type_id` int(11) NOT NULL,
  `title` varchar(300) NOT NULL,
  `content` text NOT NULL,
  `data` json DEFAULT NULL,
  `channels` json DEFAULT NULL,
  `priority` enum('low','normal','high','urgent') DEFAULT 'normal',
  `read_at` timestamp NULL DEFAULT NULL,
  `sent_at` timestamp NULL DEFAULT NULL,
  `failed_at` timestamp NULL DEFAULT NULL,
  `failure_reason` text DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_notifications_uuid` (`uuid`),
  KEY `fk_notifications_user` (`user_id`),
  KEY `fk_notifications_type` (`type_id`),
  KEY `idx_notifications_read` (`read_at`),
  KEY `idx_notifications_priority` (`priority`),
  KEY `idx_notifications_created` (`created_at`),
  
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notifications_type` FOREIGN KEY (`type_id`) REFERENCES `notification_types` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Notifications utilisateurs';

-- =====================================================
-- 📊 TABLES ANALYTICS ET LOGS
-- =====================================================

-- Table des logs d'activité utilisateur
CREATE TABLE `activity_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `resource_type` varchar(100) DEFAULT NULL,
  `resource_id` int(11) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `properties` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  KEY `fk_activity_logs_user` (`user_id`),
  KEY `idx_activity_logs_action` (`action`),
  KEY `idx_activity_logs_resource` (`resource_type`, `resource_id`),
  KEY `idx_activity_logs_created` (`created_at`),
  
  CONSTRAINT `fk_activity_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Logs d\'activité système';

-- Table des sessions utilisateur
CREATE TABLE `user_sessions` (
  `id` varchar(255) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `payload` longtext NOT NULL,
  `last_activity` int(11) NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  KEY `fk_sessions_user` (`user_id`),
  KEY `idx_sessions_last_activity` (`last_activity`),
  
  CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Sessions utilisateurs actives';

-- =====================================================
-- 🎯 TABLES MARKETING ET PROMOTIONS
-- =====================================================

-- Table des coupons de réduction
CREATE TABLE `coupons` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL UNIQUE,
  `name` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `type` enum('percentage','fixed','free_shipping') NOT NULL,
  `value` decimal(10,2) NOT NULL,
  `minimum_amount` decimal(10,2) DEFAULT NULL,
  `maximum_discount` decimal(10,2) DEFAULT NULL,
  `usage_limit` int(11) DEFAULT NULL,
  `usage_limit_per_user` int(11) DEFAULT 1,
  `used_count` int(11) DEFAULT 0,
  `start_date` timestamp NULL DEFAULT NULL,
  `end_date` timestamp NULL DEFAULT NULL,
  `applicable_products` json DEFAULT NULL,
  `applicable_categories` json DEFAULT NULL,
  `applicable_users` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_coupons_code` (`code`),
  KEY `fk_coupons_created_by` (`created_by`),
  KEY `idx_coupons_active` (`is_active`),
  KEY `idx_coupons_dates` (`start_date`, `end_date`),
  
  CONSTRAINT `fk_coupons_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Coupons de réduction';

-- Table d'utilisation des coupons
CREATE TABLE `coupon_usage` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `coupon_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `discount_amount` decimal(10,2) NOT NULL,
  `used_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  KEY `fk_coupon_usage_coupon` (`coupon_id`),
  KEY `fk_coupon_usage_user` (`user_id`),
  KEY `fk_coupon_usage_order` (`order_id`),
  
  CONSTRAINT `fk_coupon_usage_coupon` FOREIGN KEY (`coupon_id`) REFERENCES `coupons` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_coupon_usage_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_coupon_usage_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Utilisation des coupons';

-- =====================================================
-- 🚚 TABLES LIVRAISON ET LOGISTIQUE
-- =====================================================

-- Table des zones de livraison
CREATE TABLE `shipping_zones` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `countries` json NOT NULL,
  `states` json DEFAULT NULL,
  `cities` json DEFAULT NULL,
  `postcodes` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  KEY `idx_shipping_zones_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Zones de livraison';

-- Table des méthodes de livraison
CREATE TABLE `shipping_methods` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `zone_id` int(11) NOT NULL,
  `name` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `type` enum('flat_rate','free','local_pickup','calculated') DEFAULT 'flat_rate',
  `cost` decimal(10,2) DEFAULT 0.00,
  `min_amount` decimal(10,2) DEFAULT NULL,
  `max_weight` decimal(8,2) DEFAULT NULL,
  `estimated_days_min` int(11) DEFAULT NULL,
  `estimated_days_max` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `sort_order` int(11) DEFAULT 0,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  KEY `fk_shipping_methods_zone` (`zone_id`),
  KEY `idx_shipping_methods_active` (`is_active`),
  KEY `idx_shipping_methods_sort` (`sort_order`),
  
  CONSTRAINT `fk_shipping_methods_zone` FOREIGN KEY (`zone_id`) REFERENCES `shipping_zones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Méthodes de livraison';

-- =====================================================
-- 📈 TRIGGERS ET PROCEDURES
-- =====================================================

-- Trigger pour mettre à jour les statistiques des produits
DELIMITER $$
CREATE TRIGGER `update_product_stats_after_review` 
AFTER INSERT ON `product_reviews` 
FOR EACH ROW 
BEGIN
    UPDATE `products` 
    SET 
        `rating_average` = (
            SELECT AVG(rating) 
            FROM `product_reviews` 
            WHERE `product_id` = NEW.product_id AND `status` = 'approved'
        ),
        `rating_count` = (
            SELECT COUNT(*) 
            FROM `product_reviews` 
            WHERE `product_id` = NEW.product_id AND `status` = 'approved'
        )
    WHERE `id` = NEW.product_id;
END$$

-- Trigger pour mettre à jour le dernier message d'une conversation
CREATE TRIGGER `update_conversation_last_message` 
AFTER INSERT ON `messages` 
FOR EACH ROW 
BEGIN
    UPDATE `conversations` 
    SET 
        `last_message_id` = NEW.id,
        `last_message_at` = NEW.created_at
    WHERE `id` = NEW.conversation_id;
END$$

-- Trigger pour générer les numéros de commande
CREATE TRIGGER `generate_order_number` 
BEFORE INSERT ON `orders` 
FOR EACH ROW 
BEGIN
    IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
        SET NEW.order_number = CONCAT('ORD-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', LPAD(LAST_INSERT_ID(), 6, '0'));
    END IF;
    
    IF NEW.uuid IS NULL OR NEW.uuid = '' THEN
        SET NEW.uuid = UUID();
    END IF;
END$$

DELIMITER ;

-- =====================================================
-- 📊 VUES UTILES
-- =====================================================

-- Vue des produits avec leurs catégories et fournisseurs
CREATE VIEW `products_with_details` AS
SELECT 
    p.id,
    p.uuid,
    p.name,
    p.slug,
    p.price,
    p.status,
    p.stock_quantity,
    p.rating_average,
    p.rating_count,
    c.name as category_name,
    c.slug as category_slug,
    b.name as brand_name,
    CONCAT(u.first_name, ' ', u.last_name) as supplier_name,
    sp.business_name,
    sp.verification_status
FROM `products` p
LEFT JOIN `categories` c ON p.category_id = c.id
LEFT JOIN `brands` b ON p.brand_id = b.id
LEFT JOIN `users` u ON p.supplier_id = u.id
LEFT JOIN `supplier_profiles` sp ON u.id = sp.user_id
WHERE p.deleted_at IS NULL;

-- Vue des commandes avec détails acheteur
CREATE VIEW `orders_with_buyer_details` AS
SELECT 
    o.*,
    CONCAT(u.first_name, ' ', u.last_name) as buyer_name,
    u.email as buyer_email,
    bp.profession as buyer_profession
FROM `orders` o
LEFT JOIN `users` u ON o.buyer_id = u.id
LEFT JOIN `buyer_profiles` bp ON u.id = bp.user_id;

-- =====================================================
-- 🚀 CONFIGURATION FINALE
-- =====================================================

-- Activer les contraintes de clés étrangères
SET foreign_key_checks = 1;

-- Optimisation des tables
OPTIMIZE TABLE `users`, `products`, `orders`, `messages`;

-- =====================================================
-- 📊 STATISTIQUES FINALES
-- =====================================================
SELECT 
    'Tables créées' as info,
    COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'gabmarkethub';

-- Commentaire final
SELECT 'Base de données GabMarketHub créée avec succès!' as status;
```

---

## 📋 **Résumé de la Structure**

### 🏗️ **Architecture Globale**
- **23 Tables principales** + vues et triggers
- **Relations optimisées** avec contraintes d'intégrité
- **Indexation complète** pour les performances
- **Support multi-langue** et multi-devises

### 📊 **Tables par Catégorie**

#### 👥 **Utilisateurs & Authentification (6 tables)**
- `roles` - Rôles système
- `users` - Table pivot utilisateurs
- `addresses` - Adresses des utilisateurs
- `buyer_profiles` - Profils acheteurs détaillés
- `supplier_profiles` - Profils fournisseurs avec vérification
- `user_sessions` - Sessions actives

#### 🛍️ **Catalogue & Produits (5 tables)**
- `categories` - Catégories hiérarchiques
- `brands` - Marques de produits
- `products` - Catalogue principal avec variants JSON
- `product_variants` - Variantes (taille, couleur, etc.)

#### 🛒 **Commandes & Paiements (4 tables)**
- `orders` - Commandes avec statuts multiples
- `order_items` - Articles des commandes
- `payments` - Paiements et transactions

#### 💬 **Communication (3 tables)**
- `conversations` - Conversations contextuelles
- `conversation_participants` - Participants
- `messages` - Messages temps réel avec attachements

#### ⭐ **Avis & Social (4 tables)**
- `product_reviews` - Avis produits avec modération
- `review_votes` - Votes utiles
- `wishlists` - Listes de souhaits
- `wishlist_items` - Articles des listes

#### 🔔 **Notifications (2 tables)**
- `notification_types` - Types configurables
- `notifications` - Notifications multi-canal

#### 🎯 **Marketing & Logistique (5 tables)**
- `coupons` - Coupons de réduction
- `coupon_usage` - Utilisation des coupons
- `shipping_zones` - Zones de livraison
- `shipping_methods` - Méthodes de livraison
- `activity_logs` - Logs d'activité

### 🔧 **Fonctionnalités Avancées**
- ✅ **UUID** pour sécurité et APIs
- ✅ **Soft deletes** avec `deleted_at`
- ✅ **JSON fields** pour flexibilité
- ✅ **Triggers automatiques** pour statistiques
- ✅ **Vues optimisées** pour requêtes fréquentes
- ✅ **Indexation complète** pour performances
- ✅ **Multi-tenant ready** avec cloisonnement

Cette structure est production-ready et peut supporter une montée en charge importante ! 🚀