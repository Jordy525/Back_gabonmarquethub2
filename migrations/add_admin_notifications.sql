-- Migration pour ajouter la table admin_notifications
-- Cette table gère toutes les notifications spécifiques aux administrateurs

CREATE TABLE IF NOT EXISTS `admin_notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `admin_id` int(11) DEFAULT NULL COMMENT 'ID de l\'admin qui a traité la notification',
  `type` enum('user_management','product_management','system','order_management') NOT NULL COMMENT 'Type de notification',
  `category` varchar(50) NOT NULL COMMENT 'Catégorie spécifique de la notification',
  `title` varchar(255) NOT NULL COMMENT 'Titre de la notification',
  `message` text NOT NULL COMMENT 'Message de la notification',
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Données JSON supplémentaires' CHECK (json_valid(`data`)),
  `is_read` tinyint(1) DEFAULT 0 COMMENT 'Indique si la notification a été lue',
  `priority` enum('low','medium','high','urgent') DEFAULT 'medium' COMMENT 'Priorité de la notification',
  `user_id` int(11) DEFAULT NULL COMMENT 'ID de l\'utilisateur concerné (si applicable)',
  `product_id` int(11) DEFAULT NULL COMMENT 'ID du produit concerné (si applicable)',
  `order_id` int(11) DEFAULT NULL COMMENT 'ID de la commande concernée (si applicable)',
  `created_at` timestamp NULL DEFAULT current_timestamp() COMMENT 'Date de création',
  `read_at` timestamp NULL DEFAULT NULL COMMENT 'Date de lecture',
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Date de mise à jour',
  PRIMARY KEY (`id`),
  KEY `idx_admin_id` (`admin_id`),
  KEY `idx_type` (`type`),
  KEY `idx_category` (`category`),
  KEY `idx_priority` (`priority`),
  KEY `idx_is_read` (`is_read`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_admin_notifications_admin` FOREIGN KEY (`admin_id`) REFERENCES `utilisateurs` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_admin_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_admin_notifications_product` FOREIGN KEY (`product_id`) REFERENCES `produits` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_admin_notifications_order` FOREIGN KEY (`order_id`) REFERENCES `commandes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Table des notifications pour les administrateurs';

-- Insérer quelques notifications de test pour démonstration
INSERT INTO `admin_notifications` (`type`, `category`, `title`, `message`, `priority`, `data`, `is_read`, `created_at`) VALUES
('user_management', 'new_user', 'Nouvel utilisateur inscrit', 'Un nouvel utilisateur s\'est inscrit: John Doe (john.doe@example.com)', 'medium', '{"user": {"id": 1, "nom": "Doe", "prenom": "John", "email": "john.doe@example.com"}}', 0, NOW()),
('user_management', 'verification_request', 'Demande de vérification d\'entreprise', 'L\'entreprise "ABC Corp" demande une vérification', 'high', '{"entreprise": {"id": 1, "nom_entreprise": "ABC Corp", "utilisateur_id": 2}}', 0, NOW()),
('product_management', 'product_moderation', 'Nouveau produit à modérer', 'Un nouveau produit "Smartphone XYZ" nécessite une modération', 'medium', '{"product": {"id": 1, "nom": "Smartphone XYZ", "fournisseur_id": 2}}', 0, NOW()),
('product_management', 'product_report', 'Produit signalé', 'Le produit "Laptop ABC" a été signalé. Raison: Contenu inapproprié', 'high', '{"product": {"id": 2, "nom": "Laptop ABC"}, "reporterId": 3, "reason": "Contenu inapproprié"}', 0, NOW()),
('system', 'system_error', 'Erreur système', 'Une erreur système s\'est produite dans le module de paiement', 'urgent', '{"error": "Database connection timeout", "context": "payment_module"}', 0, NOW()),
('system', 'security_alert', 'Alerte de sécurité', 'Tentative de connexion suspecte détectée', 'urgent', '{"alert": {"type": "suspicious_login", "ip": "192.168.1.100"}}', 0, NOW()),
('system', 'performance_stats', 'Statistiques de performance', 'Rapport de performance: Temps de réponse moyen 2.5s', 'low', '{"stats": {"avg_response_time": 2.5, "memory_usage": "75%"}}', 0, NOW()),
('system', 'maintenance', 'Maintenance programmée', 'Maintenance programmée pour demain de 2h à 4h', 'medium', '{"maintenance": {"date": "2024-01-15", "start_time": "02:00", "end_time": "04:00"}}', 0, NOW()),
('order_management', 'order_issue', 'Problème de commande', 'Commande #12345 en attente de traitement depuis 24h', 'high', '{"order": {"id": 12345, "total": 150.00, "status": "pending"}}', 0, NOW()),
('user_management', 'user_report', 'Signalement d\'utilisateur', 'Un utilisateur a été signalé pour comportement inapproprié', 'urgent', '{"reportedUserId": 4, "reporterId": 5, "reason": "Comportement inapproprié"}', 0, NOW());
