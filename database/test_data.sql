-- =====================================================
-- 🗄️ DONNÉES DE TEST - GABMARKETHUB
-- Script d'insertion pour valider la structure
-- =====================================================

USE `gabmarkethub`;

-- =====================================================
-- 🎯 INSERTION DES DONNÉES DE BASE
-- =====================================================

-- Types de notifications
INSERT INTO `notification_types` (`name`, `display_name`, `description`, `category`, `channels`) VALUES
('order_confirmed', 'Commande confirmée', 'Notification envoyée quand une commande est confirmée', 'orders', '["email", "push"]'),
('order_shipped', 'Commande expédiée', 'Notification envoyée quand une commande est expédiée', 'orders', '["email", "sms", "push"]'),
('order_delivered', 'Commande livrée', 'Notification envoyée quand une commande est livrée', 'orders', '["email", "push"]'),
('new_message', 'Nouveau message', 'Notification pour les nouveaux messages', 'messaging', '["push", "email"]'),
('product_review', 'Nouvel avis produit', 'Notification pour les nouveaux avis', 'products', '["email"]'),
('low_stock', 'Stock faible', 'Alerte stock faible pour les fournisseurs', 'inventory', '["email", "push"]'),
('new_product', 'Nouveau produit', 'Notification pour les nouveaux produits favoris', 'products', '["push"]');

-- Zones de livraison
INSERT INTO `shipping_zones` (`name`, `countries`, `states`, `cities`) VALUES
('Libreville', '["GA"]', '["Estuaire"]', '["Libreville"]'),
('Port-Gentil', '["GA"]', '["Ogooué-Maritime"]', '["Port-Gentil"]'),
('Franceville', '["GA"]', '["Haut-Ogooué"]', '["Franceville"]'),
('Oyem', '["GA"]', '["Woleu-Ntem"]', '["Oyem"]'),
('Gabon National', '["GA"]', null, null);

-- Méthodes de livraison
INSERT INTO `shipping_methods` (`zone_id`, `name`, `description`, `type`, `cost`, `estimated_days_min`, `estimated_days_max`) VALUES
(1, 'Livraison Standard Libreville', 'Livraison en 1-2 jours ouvrés', 'flat_rate', 2500.00, 1, 2),
(1, 'Livraison Express Libreville', 'Livraison le jour même', 'flat_rate', 5000.00, 0, 1),
(2, 'Livraison Standard Port-Gentil', 'Livraison en 2-3 jours ouvrés', 'flat_rate', 3500.00, 2, 3),
(3, 'Livraison Standard Franceville', 'Livraison en 3-5 jours ouvrés', 'flat_rate', 4500.00, 3, 5),
(4, 'Livraison Standard Oyem', 'Livraison en 3-4 jours ouvrés', 'flat_rate', 4000.00, 3, 4),
(5, 'Livraison Gratuite', 'Livraison gratuite pour commandes > 50 000 XAF', 'free', 0.00, 3, 7);

-- Catégories principales
INSERT INTO `categories` (`name`, `slug`, `description`, `parent_id`, `sort_order`) VALUES
('Électronique', 'electronique', 'Tous les produits électroniques', NULL, 1),
('Mode & Vêtements', 'mode-vetements', 'Vêtements et accessoires de mode', NULL, 2),
('Maison & Jardin', 'maison-jardin', 'Articles pour la maison et le jardin', NULL, 3),
('Sports & Loisirs', 'sports-loisirs', 'Équipements sportifs et loisirs', NULL, 4),
('Beauté & Santé', 'beaute-sante', 'Produits de beauté et de santé', NULL, 5),
('Alimentation', 'alimentation', 'Produits alimentaires et boissons', NULL, 6),
('Automobile', 'automobile', 'Pièces et accessoires auto', NULL, 7),
('Livres & Média', 'livres-media', 'Livres, films, musique', NULL, 8);

-- Sous-catégories
INSERT INTO `categories` (`name`, `slug`, `description`, `parent_id`, `sort_order`) VALUES
-- Électronique
('Smartphones', 'smartphones', 'Téléphones intelligents', 1, 1),
('Ordinateurs', 'ordinateurs', 'PC, laptops, tablets', 1, 2),
('TV & Audio', 'tv-audio', 'Télévisions et équipements audio', 1, 3),
('Appareils Photo', 'appareils-photo', 'Caméras et accessoires photo', 1, 4),

-- Mode & Vêtements
('Vêtements Homme', 'vetements-homme', 'Mode masculine', 2, 1),
('Vêtements Femme', 'vetements-femme', 'Mode féminine', 2, 2),
('Chaussures', 'chaussures', 'Chaussures pour tous', 2, 3),
('Accessoires', 'accessoires', 'Sacs, bijoux, accessoires', 2, 4),

-- Maison & Jardin
('Meubles', 'meubles', 'Mobilier pour la maison', 3, 1),
('Décoration', 'decoration', 'Articles de décoration', 3, 2),
('Électroménager', 'electromenager', 'Appareils électroménagers', 3, 3),
('Jardinage', 'jardinage', 'Outils et équipements de jardinage', 3, 4);

-- Marques
INSERT INTO `brands` (`name`, `slug`, `description`) VALUES
('Samsung', 'samsung', 'Marque coréenne d\'électronique'),
('Apple', 'apple', 'Marque américaine de technologie'),
('Nike', 'nike', 'Marque américaine de sport'),
('Adidas', 'adidas', 'Marque allemande de sport'),
('Zara', 'zara', 'Marque espagnole de mode'),
('H&M', 'hm', 'Marque suédoise de mode'),
('LG', 'lg', 'Marque coréenne d\'électronique'),
('Sony', 'sony', 'Marque japonaise d\'électronique');

-- =====================================================
-- 👥 UTILISATEURS DE TEST
-- =====================================================

-- Administrateur
INSERT INTO `users` (`uuid`, `email`, `password`, `first_name`, `last_name`, `phone`, `role_id`, `status`, `email_verified_at`) VALUES
(UUID(), 'admin@gabmarkethub.ga', '$2b$12$LQv3c1yqBwEHFNidp5b4vOQ8G8Kv5VK5K1FN.QXJ7ZLQj9NKJ8XYG', 'Admin', 'GabMarketHub', '+24106000000', 3, 'active', NOW());

-- Fournisseurs de test
INSERT INTO `users` (`uuid`, `email`, `password`, `first_name`, `last_name`, `phone`, `role_id`, `status`, `email_verified_at`) VALUES
(UUID(), 'supplier1@example.ga', '$2b$12$LQv3c1yqBwEHFNidp5b4vOQ8G8Kv5VK5K1FN.QXJ7ZLQj9NKJ8XYG', 'Jean', 'Supplier', '+24106111111', 2, 'active', NOW()),
(UUID(), 'supplier2@example.ga', '$2b$12$LQv3c1yqBwEHFNidp5b4vOQ8G8Kv5VK5K1FN.QXJ7ZLQj9NKJ8XYG', 'Marie', 'Commerce', '+24106222222', 2, 'active', NOW()),
(UUID(), 'supplier3@example.ga', '$2b$12$LQv3c1yqBwEHFNidp5b4vOQ8G8Kv5VK5K1FN.QXJ7ZLQj9NKJ8XYG', 'Pierre', 'Tech', '+24106333333', 2, 'active', NOW());

-- Acheteurs de test
INSERT INTO `users` (`uuid`, `email`, `password`, `first_name`, `last_name`, `phone`, `role_id`, `status`, `email_verified_at`) VALUES
(UUID(), 'buyer1@example.ga', '$2b$12$LQv3c1yqBwEHFNidp5b4vOQ8G8Kv5VK5K1FN.QXJ7ZLQj9NKJ8XYG', 'Alain', 'Acheteur', '+24106444444', 1, 'active', NOW()),
(UUID(), 'buyer2@example.ga', '$2b$12$LQv3c1yqBwEHFNidp5b4vOQ8G8Kv5VK5K1FN.QXJ7ZLQj9NKJ8XYG', 'Sophie', 'Client', '+24106555555', 1, 'active', NOW()),
(UUID(), 'buyer3@example.ga', '$2b$12$LQv3c1yqBwEHFNidp5b4vOQ8G8Kv5VK5K1FN.QXJ7ZLQj9NKJ8XYG', 'Paul', 'Utilisateur', '+24106666666', 1, 'active', NOW());

-- Profils fournisseurs
INSERT INTO `supplier_profiles` (`user_id`, `business_name`, `business_registration`, `business_type`, `industry_sector`, `description`, `verification_status`, `verified_at`) VALUES
(2, 'Électronique Plus Gabon', 'REG-001-2024', 'company', 'Électronique', 'Spécialiste en produits électroniques et high-tech au Gabon', 'verified', NOW()),
(3, 'Mode & Style Libreville', 'REG-002-2024', 'company', 'Mode', 'Boutique de mode tendance pour homme et femme', 'verified', NOW()),
(4, 'TechnoGabon SARL', 'REG-003-2024', 'company', 'Technologie', 'Solutions technologiques et informatiques', 'pending', NULL);

-- Profils acheteurs
INSERT INTO `buyer_profiles` (`user_id`, `profession`, `interests`, `budget_range`, `shopping_frequency`) VALUES
(5, 'Ingénieur', '["technologie", "électronique", "gadgets"]', 'high', 'monthly'),
(6, 'Enseignante', '["mode", "beauté", "maison"]', 'medium', 'weekly'),
(7, 'Commercial', '["sport", "automobile", "loisirs"]', 'medium', 'monthly');

-- Adresses de test
INSERT INTO `addresses` (`user_id`, `type`, `label`, `first_name`, `last_name`, `address_line_1`, `city`, `postal_code`, `phone`, `is_default`) VALUES
(5, 'both', 'Domicile', 'Alain', 'Acheteur', 'Quartier Batterie IV, Rue de la Paix', 'Libreville', 'B.P. 1234', '+24106444444', 1),
(6, 'both', 'Domicile', 'Sophie', 'Client', 'Quartier Glass, Avenue Léon Mba', 'Libreville', 'B.P. 5678', '+24106555555', 1),
(7, 'both', 'Bureau', 'Paul', 'Utilisateur', 'Zone Industrielle Oloumi', 'Libreville', 'B.P. 9012', '+24106666666', 1);

-- =====================================================
-- 🛍️ PRODUITS DE TEST
-- =====================================================

-- Produits électroniques
INSERT INTO `products` (`uuid`, `supplier_id`, `category_id`, `brand_id`, `name`, `slug`, `short_description`, `description`, `sku`, `price`, `compare_price`, `stock_quantity`, `status`, `published_at`) VALUES
(UUID(), 2, 9, 1, 'Samsung Galaxy S24 Ultra', 'samsung-galaxy-s24-ultra', 'Smartphone haut de gamme avec caméra 200MP', 'Le Samsung Galaxy S24 Ultra redéfinit l\'excellence mobile avec son écran Dynamic AMOLED 2X de 6,8 pouces, son processeur Snapdragon 8 Gen 3 et sa caméra révolutionnaire de 200MP. Parfait pour la photographie professionnelle et les performances extrêmes.', 'SAMS24U-001', 850000.00, 950000.00, 25, 'active', NOW()),

(UUID(), 2, 9, 2, 'iPhone 15 Pro Max', 'iphone-15-pro-max', 'iPhone avec puce A17 Pro et appareil photo 48MP', 'L\'iPhone 15 Pro Max avec sa puce A17 Pro révolutionnaire offre des performances inégalées. Son système de caméra Pro à 48MP capture des détails époustouflants. Écran Super Retina XDR de 6,7 pouces et construction en titane.', 'APPL15PM-001', 1200000.00, 1350000.00, 15, 'active', NOW()),

(UUID(), 2, 11, 7, 'LG OLED C3 55 pouces', 'lg-oled-c3-55', 'TV OLED 4K avec Intelligence Artificielle', 'Téléviseur LG OLED C3 de 55 pouces avec technologie OLED evo, processeur α9 Gen6 AI, webOS 23 et compatibilité HDR10 Pro, Dolby Vision IQ et Dolby Atmos. Gaming en 4K à 120Hz.', 'LGOLED55C3-001', 650000.00, 750000.00, 12, 'active', NOW()),

(UUID(), 4, 10, 2, 'MacBook Pro M3 14 pouces', 'macbook-pro-m3-14', 'Ordinateur portable avec puce M3 révolutionnaire', 'MacBook Pro 14 pouces avec puce M3, écran Liquid Retina XDR, jusqu\'à 22h d\'autonomie. Parfait pour les créatifs et les professionnels. 16GB RAM, 512GB SSD.', 'APPLMBP14M3-001', 1500000.00, 1650000.00, 8, 'active', NOW());

-- Produits mode
INSERT INTO `products` (`uuid`, `supplier_id`, `category_id`, `brand_id`, `name`, `slug`, `short_description`, `description`, `sku`, `price`, `compare_price`, `stock_quantity`, `status`, `published_at`) VALUES
(UUID(), 3, 13, 3, 'Nike Air Max 270', 'nike-air-max-270', 'Chaussures de sport avec amorti Air Max', 'Les Nike Air Max 270 offrent un confort exceptionnel avec leur unité Air Max visible au talon. Design moderne et respirant, parfaites pour le sport et le quotidien. Disponibles en plusieurs coloris.', 'NIKEAM270-001', 85000.00, 95000.00, 45, 'active', NOW()),

(UUID(), 3, 14, 4, 'Adidas Ultraboost 22', 'adidas-ultraboost-22', 'Chaussures de running haute performance', 'Chaussures de running Adidas Ultraboost 22 avec technologie BOOST pour un retour d\'énergie optimal. Tige Primeknit+ pour un ajustement parfait et une respirabilité maximale.', 'ADIUB22-001', 120000.00, 135000.00, 30, 'active', NOW()),

(UUID(), 3, 13, 5, 'Zara Blazer Femme', 'zara-blazer-femme', 'Blazer élégant pour femme', 'Blazer Zara pour femme, coupe moderne et élégante. Parfait pour le bureau ou les occasions spéciales. Tissu de qualité premium, doublure complète. Disponible en noir, bleu marine et beige.', 'ZARABLFEM-001', 45000.00, 55000.00, 20, 'active', NOW());

-- Produits maison
INSERT INTO `products` (`uuid`, `supplier_id`, `category_id`, `name`, `slug`, `short_description`, `description`, `sku`, `price`, `stock_quantity`, `status`, `published_at`) VALUES
(UUID(), 3, 17, 'Canapé 3 places Moderne', 'canape-3-places-moderne', 'Canapé confortable pour salon', 'Canapé 3 places au design moderne avec revêtement en tissu haute qualité. Structure en bois massif et mousse haute densité pour un confort optimal. Dimensions : L200 x P90 x H85 cm.', 'CANMOD3P-001', 285000.00, 25, 'active', NOW()),

(UUID(), 2, 19, 'Réfrigérateur Samsung 400L', 'refrigerateur-samsung-400l', 'Réfrigérateur double porte avec technologie No Frost', 'Réfrigérateur Samsung de 400L avec technologie No Frost, classe énergétique A++. Compartiment congélateur spacieux, clayettes en verre trempé et bacs à légumes optimisés.', 'SAMRF400L-001', 450000.00, 8, 'active', NOW());

-- =====================================================
-- 🛒 COMMANDES DE TEST
-- =====================================================

-- Commande 1
INSERT INTO `orders` (`uuid`, `order_number`, `buyer_id`, `status`, `payment_status`, `currency`, `subtotal`, `tax_amount`, `shipping_amount`, `total_amount`, `billing_address`, `shipping_address`) VALUES
(UUID(), 'ORD-20241106-000001', 5, 'confirmed', 'paid', 'XAF', 850000.00, 0.00, 2500.00, 852500.00, 
'{"first_name": "Alain", "last_name": "Acheteur", "address_line_1": "Quartier Batterie IV, Rue de la Paix", "city": "Libreville", "postal_code": "B.P. 1234", "phone": "+24106444444"}',
'{"first_name": "Alain", "last_name": "Acheteur", "address_line_1": "Quartier Batterie IV, Rue de la Paix", "city": "Libreville", "postal_code": "B.P. 1234", "phone": "+24106444444"}');

-- Articles de commande 1
INSERT INTO `order_items` (`order_id`, `product_id`, `supplier_id`, `product_name`, `product_sku`, `price`, `quantity`, `total`) VALUES
(1, 1, 2, 'Samsung Galaxy S24 Ultra', 'SAMS24U-001', 850000.00, 1, 850000.00);

-- Commande 2
INSERT INTO `orders` (`uuid`, `order_number`, `buyer_id`, `status`, `payment_status`, `currency`, `subtotal`, `tax_amount`, `shipping_amount`, `total_amount`, `billing_address`, `shipping_address`) VALUES
(UUID(), 'ORD-20241106-000002', 6, 'processing', 'paid', 'XAF', 205000.00, 0.00, 2500.00, 207500.00,
'{"first_name": "Sophie", "last_name": "Client", "address_line_1": "Quartier Glass, Avenue Léon Mba", "city": "Libreville", "postal_code": "B.P. 5678", "phone": "+24106555555"}',
'{"first_name": "Sophie", "last_name": "Client", "address_line_1": "Quartier Glass, Avenue Léon Mba", "city": "Libreville", "postal_code": "B.P. 5678", "phone": "+24106555555"}');

-- Articles de commande 2
INSERT INTO `order_items` (`order_id`, `product_id`, `supplier_id`, `product_name`, `product_sku`, `price`, `quantity`, `total`) VALUES
(2, 5, 3, 'Nike Air Max 270', 'NIKEAM270-001', 85000.00, 1, 85000.00),
(2, 6, 3, 'Adidas Ultraboost 22', 'ADIUB22-001', 120000.00, 1, 120000.00);

-- Paiements
INSERT INTO `payments` (`uuid`, `order_id`, `transaction_id`, `gateway`, `method`, `status`, `amount`, `currency`, `processed_at`) VALUES
(UUID(), 1, 'TXN-001-2024', 'orange_money', 'mobile_money', 'completed', 852500.00, 'XAF', NOW()),
(UUID(), 2, 'TXN-002-2024', 'moov_money', 'mobile_money', 'completed', 207500.00, 'XAF', NOW());

-- =====================================================
-- 💬 CONVERSATIONS ET MESSAGES DE TEST
-- =====================================================

-- Conversation support
INSERT INTO `conversations` (`uuid`, `type`, `subject`, `status`) VALUES
(UUID(), 'support', 'Question sur livraison', 'active');

-- Participants à la conversation
INSERT INTO `conversation_participants` (`conversation_id`, `user_id`, `role`, `last_read_at`) VALUES
(1, 5, 'participant', NOW()),
(1, 1, 'admin', NOW());

-- Messages
INSERT INTO `messages` (`uuid`, `conversation_id`, `sender_id`, `type`, `content`) VALUES
(UUID(), 1, 5, 'text', 'Bonjour, j\'aimerais savoir quand ma commande sera livrée ?'),
(UUID(), 1, 1, 'text', 'Bonjour ! Votre commande ORD-20241106-000001 sera livrée demain entre 9h et 17h. Vous recevrez un SMS de confirmation.');

-- =====================================================
-- ⭐ AVIS ET ÉVALUATIONS DE TEST
-- =====================================================

-- Avis produits
INSERT INTO `product_reviews` (`product_id`, `buyer_id`, `order_item_id`, `rating`, `title`, `content`, `verified_purchase`, `status`) VALUES
(1, 5, 1, 5, 'Excellent smartphone !', 'Le Samsung Galaxy S24 Ultra dépasse toutes mes attentes. La qualité photo est exceptionnelle et les performances sont au top. Livraison rapide et produit conforme à la description.', 1, 'approved'),
(5, 6, 2, 4, 'Très bonnes chaussures', 'Les Nike Air Max 270 sont très confortables et stylées. Parfaites pour mes sessions de sport. Seul bémol : j\'aurais aimé plus de choix de couleurs.', 1, 'approved'),
(6, 6, 3, 5, 'Running au top niveau', 'Adidas Ultraboost 22 : un investissement qui en vaut la peine ! Le confort est exceptionnel pour les longues distances. Je recommande vivement.', 1, 'approved');

-- =====================================================
-- 🔔 NOTIFICATIONS DE TEST
-- =====================================================

INSERT INTO `notifications` (`uuid`, `user_id`, `type_id`, `title`, `content`, `priority`, `read_at`) VALUES
(UUID(), 5, 1, 'Commande confirmée', 'Votre commande ORD-20241106-000001 a été confirmée avec succès. Montant : 852 500 XAF', 'normal', NULL),
(UUID(), 6, 1, 'Commande confirmée', 'Votre commande ORD-20241106-000002 a été confirmée avec succès. Montant : 207 500 XAF', 'normal', NOW()),
(UUID(), 2, 5, 'Nouvel avis produit', 'Un client a laissé un avis 5 étoiles sur votre produit Samsung Galaxy S24 Ultra', 'normal', NULL);

-- =====================================================
-- 🎯 COUPONS DE TEST
-- =====================================================

INSERT INTO `coupons` (`code`, `name`, `description`, `type`, `value`, `minimum_amount`, `usage_limit`, `start_date`, `end_date`, `created_by`) VALUES
('WELCOME10', 'Bienvenue -10%', 'Réduction de 10% pour les nouveaux clients', 'percentage', 10.00, 50000.00, 100, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 1),
('LIVRAISON', 'Livraison gratuite', 'Livraison gratuite sans minimum', 'free_shipping', 0.00, NULL, 50, NOW(), DATE_ADD(NOW(), INTERVAL 15 DAY), 1),
('BLACK50', 'Black Friday -50%', 'Réduction exceptionnelle de 50%', 'percentage', 50.00, 100000.00, 200, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY), 1);

-- =====================================================
-- 📊 MISE À JOUR DES STATISTIQUES
-- =====================================================

-- Mise à jour des stocks après commandes
UPDATE `products` SET `stock_quantity` = `stock_quantity` - 1, `order_count` = `order_count` + 1 WHERE `id` = 1;
UPDATE `products` SET `stock_quantity` = `stock_quantity` - 1, `order_count` = `order_count` + 1 WHERE `id` = 5;
UPDATE `products` SET `stock_quantity` = `stock_quantity` - 1, `order_count` = `order_count` + 1 WHERE `id` = 6;

-- Mise à jour manuelle des ratings (normalement fait par trigger)
UPDATE `products` SET 
    `rating_average` = 5.00, 
    `rating_count` = 1 
WHERE `id` = 1;

UPDATE `products` SET 
    `rating_average` = 4.00, 
    `rating_count` = 1 
WHERE `id` = 5;

UPDATE `products` SET 
    `rating_average` = 5.00, 
    `rating_count` = 1 
WHERE `id` = 6;

-- =====================================================
-- 🎯 LISTES DE SOUHAITS DE TEST
-- =====================================================

INSERT INTO `wishlists` (`user_id`, `name`, `description`, `is_default`) VALUES
(5, 'Ma liste de souhaits', 'Produits que j\'aimerais acheter', 1),
(6, 'Favoris Mode', 'Mes articles de mode préférés', 1),
(7, 'Tech Wishlist', 'Gadgets technologiques intéressants', 1);

INSERT INTO `wishlist_items` (`wishlist_id`, `product_id`) VALUES
(1, 2), -- iPhone 15 Pro Max
(1, 3), -- LG OLED C3
(2, 7), -- Zara Blazer
(3, 4); -- MacBook Pro M3

-- =====================================================
-- 📈 LOGS D'ACTIVITÉ DE TEST
-- =====================================================

INSERT INTO `activity_logs` (`user_id`, `action`, `resource_type`, `resource_id`, `description`, `ip_address`) VALUES
(5, 'order_created', 'order', 1, 'Commande créée pour Samsung Galaxy S24 Ultra', '192.168.1.100'),
(6, 'order_created', 'order', 2, 'Commande créée pour Nike Air Max 270 et Adidas Ultraboost 22', '192.168.1.101'),
(5, 'review_created', 'product_review', 1, 'Avis 5 étoiles laissé sur Samsung Galaxy S24 Ultra', '192.168.1.100'),
(2, 'product_created', 'product', 1, 'Nouveau produit Samsung Galaxy S24 Ultra ajouté', '192.168.1.102');

-- =====================================================
-- ✅ VALIDATION DES DONNÉES
-- =====================================================

-- Vérification des comptes
SELECT 
    'Utilisateurs créés' as type,
    COUNT(*) as count,
    GROUP_CONCAT(CONCAT(first_name, ' ', last_name) SEPARATOR ', ') as details
FROM users;

-- Vérification des produits
SELECT 
    'Produits créés' as type,
    COUNT(*) as count,
    GROUP_CONCAT(name SEPARATOR ', ') as details
FROM products;

-- Vérification des commandes
SELECT 
    'Commandes créées' as type,
    COUNT(*) as count,
    SUM(total_amount) as total_value
FROM orders;

-- Statistiques finales
SELECT 
    'Base de données peuplée avec succès!' as status,
    NOW() as timestamp;