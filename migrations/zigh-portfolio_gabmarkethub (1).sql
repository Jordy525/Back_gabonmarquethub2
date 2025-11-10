-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: mysql-zigh-portfolio.alwaysdata.net
-- Generation Time: Sep 15, 2025 at 06:01 PM
-- Server version: 10.11.13-MariaDB
-- PHP Version: 7.4.33

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `zigh-portfolio_gabmarkethub`
--

DELIMITER $$
--
-- Procedures
--
CREATE DEFINER=`404304`@`%` PROCEDURE `sp_update_daily_stats` ()   BEGIN
  -- Mettre à jour les vues des 30 derniers jours
  UPDATE `produits` p
  SET `vues_30j` = (
    SELECT COALESCE(SUM(`vues`), 0)
    FROM `statistiques_produits` sp
    WHERE sp.`produit_id` = p.`id`
    AND sp.`date` >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
  );
  
  -- Mettre à jour le score de popularité
  UPDATE `produits` 
  SET `score_popularite` = (
    (`vues_30j` * 0.3) + 
    (`ventes_30j` * 0.7) + 
    (`note_moyenne` * 10) + 
    (`nombre_avis` * 0.5)
  );
  
  -- Désactiver les offres expirées
  UPDATE `produits` 
  SET `est_en_offre` = FALSE 
  WHERE `date_fin_promo` < NOW() 
  AND `est_en_offre` = TRUE;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `abonnements`
--

CREATE TABLE `abonnements` (
  `id` int(11) NOT NULL,
  `nom` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `prix_mensuel` decimal(10,2) NOT NULL,
  `max_produits` int(11) DEFAULT NULL,
  `commission_reduite` decimal(5,2) DEFAULT 0.00,
  `support_prioritaire` tinyint(1) DEFAULT 0,
  `analytics_avances` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `abonnements`
--

INSERT INTO `abonnements` (`id`, `nom`, `description`, `prix_mensuel`, `max_produits`, `commission_reduite`, `support_prioritaire`, `analytics_avances`, `created_at`) VALUES
(1, 'Basique', 'Abonnement de base', 0.00, 50, 0.00, 0, 0, '2025-08-01 14:25:30'),
(2, 'Premium', 'Abonnement premium', 49.99, 500, 1.00, 1, 1, '2025-08-01 14:25:30'),
(3, 'Enterprise', 'Abonnement entreprise', 199.99, NULL, 2.00, 1, 1, '2025-08-01 14:25:30');

-- --------------------------------------------------------

--
-- Table structure for table `admin_audit_logs`
--

CREATE TABLE `admin_audit_logs` (
  `id` int(11) NOT NULL,
  `admin_id` int(11) NOT NULL,
  `action` varchar(100) NOT NULL,
  `table_name` varchar(50) NOT NULL,
  `record_id` int(11) DEFAULT NULL,
  `old_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`old_values`)),
  `new_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`new_values`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `session_id` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admin_audit_logs`
--

INSERT INTO `admin_audit_logs` (`id`, `admin_id`, `action`, `table_name`, `record_id`, `old_values`, `new_values`, `ip_address`, `user_agent`, `session_id`, `created_at`) VALUES
(1, 47, 'DELETE_USER', 'utilisateurs', 46, '{\"id\":46,\"nom\":\"Test\",\"prenom\":\"User2\",\"email\":\"test2@example.com\",\"role_id\":1,\"statut\":\"actif\"}', NULL, '::1', 'axios/1.11.0', NULL, '2025-08-28 12:25:25'),
(2, 47, 'DELETE_USER', 'utilisateurs', 45, '{\"id\":45,\"nom\":\"Test\",\"prenom\":\"User\",\"email\":\"test@example.com\",\"role_id\":1,\"statut\":\"actif\"}', NULL, '::1', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 Edg/139.0.0.0', NULL, '2025-08-28 12:27:24'),
(3, 47, 'DELETE_USER', 'utilisateurs', 43, '{\"id\":43,\"nom\":\"Mbeng\",\"prenom\":\"Bob\",\"email\":\"bob@gmail.com\",\"role_id\":2,\"statut\":\"actif\"}', NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0', NULL, '2025-08-28 12:35:53'),
(4, 47, 'suspend_user', 'utilisateurs', 30, '{\"statut\":\"actif\"}', '{\"statut\":\"suspendu\",\"suspension_reason\":\"xcxcvbn,bvcbn\"}', '::1', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 Edg/139.0.0.0', 'unknown', '2025-08-28 13:03:44'),
(5, 47, 'activate_user', 'utilisateurs', 28, '{\"statut\":\"suspendu\"}', '{\"statut\":\"actif\"}', '::ffff:127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0', 'unknown', '2025-09-06 20:41:07'),
(6, 47, 'activate_user', 'utilisateurs', 30, '{\"statut\":\"suspendu\"}', '{\"statut\":\"actif\"}', '::ffff:127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0', 'unknown', '2025-09-07 15:31:11'),
(7, 47, 'suspend_user', 'utilisateurs', 52, '{\"statut\":\"actif\"}', '{\"statut\":\"suspendu\",\"suspension_reason\":\"manque ethique\"}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0', 'unknown', '2025-09-07 20:55:52'),
(8, 47, 'activate_user', 'utilisateurs', 52, '{\"statut\":\"suspendu\"}', '{\"statut\":\"actif\"}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0', 'unknown', '2025-09-07 20:58:17'),
(9, 47, 'DELETE_USER', 'utilisateurs', 55, '{\"id\":55,\"nom\":\"Test\",\"prenom\":\"User\",\"email\":\"test-1757518229271@example.com\",\"role_id\":1,\"statut\":\"actif\"}', NULL, '::ffff:127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0', NULL, '2025-09-10 15:43:15');

-- --------------------------------------------------------

--
-- Table structure for table `admin_notifications`
--

CREATE TABLE `admin_notifications` (
  `id` int(11) NOT NULL,
  `admin_id` int(11) DEFAULT NULL,
  `type` varchar(50) NOT NULL,
  `category` varchar(50) NOT NULL DEFAULT 'general' COMMENT 'Catégorie spécifique de la notification',
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`data`)),
  `is_read` tinyint(1) DEFAULT 0,
  `priority` enum('low','medium','high','urgent') DEFAULT 'medium',
  `user_id` int(11) DEFAULT NULL COMMENT 'ID de l''utilisateur concerné (si applicable)',
  `product_id` int(11) DEFAULT NULL COMMENT 'ID du produit concerné (si applicable)',
  `order_id` int(11) DEFAULT NULL COMMENT 'ID de la commande concernée (si applicable)',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `read_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Date de mise à jour'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admin_notifications`
--

INSERT INTO `admin_notifications` (`id`, `admin_id`, `type`, `category`, `title`, `message`, `data`, `is_read`, `priority`, `user_id`, `product_id`, `order_id`, `created_at`, `read_at`, `updated_at`) VALUES
(12, 47, 'user_management', 'new_user', 'Nouvel utilisateur inscrit', 'Acheteur: User Test (test-1757518229271@example.com) s\'est inscrit sur la plateforme', '{\"user\":{\"id\":55,\"nom\":\"Test\",\"prenom\":\"User\",\"email\":\"test-1757518229271@example.com\",\"role_id\":1}}', 1, 'medium', 55, NULL, NULL, '2025-09-10 15:30:32', '2025-09-10 21:14:00', '2025-09-10 21:14:00');

-- --------------------------------------------------------

--
-- Table structure for table `admin_sessions`
--

CREATE TABLE `admin_sessions` (
  `id` varchar(255) NOT NULL,
  `admin_id` int(11) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `last_activity` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `expires_at` timestamp NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `admin_statistics_cache`
--

CREATE TABLE `admin_statistics_cache` (
  `id` int(11) NOT NULL,
  `metric_name` varchar(100) NOT NULL,
  `metric_value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`metric_value`)),
  `period_type` enum('daily','weekly','monthly','yearly') NOT NULL,
  `period_date` date NOT NULL,
  `calculated_at` timestamp NULL DEFAULT current_timestamp(),
  `expires_at` timestamp NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `adresses`
--

CREATE TABLE `adresses` (
  `id` int(11) NOT NULL,
  `utilisateur_id` int(11) NOT NULL,
  `type` enum('facturation','livraison') NOT NULL,
  `nom_complet` varchar(200) DEFAULT NULL,
  `adresse_ligne1` varchar(255) NOT NULL,
  `adresse_ligne2` varchar(255) DEFAULT NULL,
  `ville` varchar(100) NOT NULL,
  `code_postal` varchar(20) NOT NULL,
  `pays` varchar(100) NOT NULL,
  `telephone` varchar(20) DEFAULT NULL,
  `par_defaut` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `articles_blog`
--

CREATE TABLE `articles_blog` (
  `id` int(11) NOT NULL,
  `titre` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `extrait` text DEFAULT NULL,
  `contenu` longtext NOT NULL,
  `image_principale` varchar(500) DEFAULT NULL,
  `images_supplementaires` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`images_supplementaires`)),
  `auteur_id` int(11) DEFAULT NULL,
  `auteur_nom` varchar(255) NOT NULL,
  `categorie` varchar(100) NOT NULL,
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tags`)),
  `produits_lies` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'IDs des produits mentionnés dans l''article' CHECK (json_valid(`produits_lies`)),
  `est_a_la_une` tinyint(1) DEFAULT 0,
  `est_publie` tinyint(1) DEFAULT 0,
  `date_publication` datetime DEFAULT NULL,
  `date_modification` datetime DEFAULT NULL,
  `nombre_vues` int(11) DEFAULT 0,
  `nombre_likes` int(11) DEFAULT 0,
  `nombre_partages` int(11) DEFAULT 0,
  `temps_lecture` int(11) DEFAULT 0 COMMENT 'Temps de lecture estimé en minutes',
  `meta_description` varchar(160) DEFAULT NULL,
  `meta_mots_cles` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `articles_blog`
--

INSERT INTO `articles_blog` (`id`, `titre`, `slug`, `extrait`, `contenu`, `image_principale`, `images_supplementaires`, `auteur_id`, `auteur_nom`, `categorie`, `tags`, `produits_lies`, `est_a_la_une`, `est_publie`, `date_publication`, `date_modification`, `nombre_vues`, `nombre_likes`, `nombre_partages`, `temps_lecture`, `meta_description`, `meta_mots_cles`, `created_at`, `updated_at`) VALUES
(1, 'Guide Complet : Comment Choisir le Bon Fournisseur B2B', 'guide-choisir-fournisseur-b2b', 'Découvrez les critères essentiels pour sélectionner le fournisseur idéal pour votre entreprise.', 'Dans le monde du commerce B2B, choisir le bon fournisseur est crucial pour le succès de votre entreprise. Voici un guide complet pour vous aider à faire le bon choix...', NULL, NULL, NULL, 'Équipe GabMarketHub', 'Conseils', '[\"B2B\", \"Fournisseurs\", \"Guide\", \"Commerce\"]', NULL, 1, 1, '2025-01-15 10:00:00', NULL, 3, 0, 0, 8, NULL, NULL, '2025-09-03 04:58:49', '2025-09-15 14:50:33'),
(2, 'Tendances E-commerce 2025 : Ce qui Attend les Entreprises', 'tendances-ecommerce-2025', 'Explorez les tendances qui vont façonner l\'e-commerce en 2025 et comment les anticiper.', 'L\'e-commerce continue d\'évoluer rapidement. Voici les tendances majeures à surveiller en 2025...', NULL, NULL, NULL, 'Équipe GabMarketHub', 'Tendances', '[\"E-commerce\", \"Tendances\", \"2025\", \"Innovation\"]', NULL, 1, 1, '2025-01-10 14:30:00', NULL, 0, 0, 0, 6, NULL, NULL, '2025-09-03 04:58:49', '2025-09-03 04:58:49');

-- --------------------------------------------------------

--
-- Table structure for table `attributs`
--

CREATE TABLE `attributs` (
  `id` int(11) NOT NULL,
  `nom` varchar(100) NOT NULL,
  `type` enum('couleur','taille','matiere','autre') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `attributs`
--

INSERT INTO `attributs` (`id`, `nom`, `type`, `created_at`) VALUES
(1, 'Couleur', 'couleur', '2025-08-01 14:25:30'),
(2, 'Taille', 'taille', '2025-08-01 14:25:30'),
(3, 'Matière', 'matiere', '2025-08-01 14:25:30');

-- --------------------------------------------------------

--
-- Table structure for table `audit_trail`
--

CREATE TABLE `audit_trail` (
  `id` int(11) NOT NULL,
  `utilisateur_id` int(11) DEFAULT NULL,
  `table_name` varchar(50) NOT NULL,
  `record_id` int(11) NOT NULL,
  `action` enum('CREATE','UPDATE','DELETE') NOT NULL,
  `old_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`old_values`)),
  `new_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`new_values`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `avis`
--

CREATE TABLE `avis` (
  `id` int(11) NOT NULL,
  `acheteur_id` int(11) NOT NULL,
  `fournisseur_id` int(11) NOT NULL,
  `note` int(11) NOT NULL CHECK (`note` >= 1 and `note` <= 5),
  `commentaire` text DEFAULT NULL,
  `statut` enum('publie','modere','rejete') DEFAULT 'publie',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Triggers `avis`
--
DELIMITER $$
CREATE TRIGGER `update_note_fournisseur` AFTER INSERT ON `avis` FOR EACH ROW BEGIN
    UPDATE entreprises 
    SET note_moyenne = (
        SELECT AVG(note) 
        FROM avis 
        WHERE fournisseur_id = NEW.fournisseur_id AND statut = 'publie'
    ),
    nombre_avis = (
        SELECT COUNT(*) 
        FROM avis 
        WHERE fournisseur_id = NEW.fournisseur_id AND statut = 'publie'
    )
    WHERE id = NEW.fournisseur_id;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `avis_produits`
--

CREATE TABLE `avis_produits` (
  `id` int(11) NOT NULL,
  `produit_id` int(11) NOT NULL,
  `utilisateur_id` int(11) NOT NULL,
  `note` int(11) NOT NULL CHECK (`note` >= 1 and `note` <= 5),
  `commentaire` text DEFAULT NULL,
  `achat_verifie` tinyint(1) DEFAULT 0,
  `date_creation` timestamp NOT NULL DEFAULT current_timestamp(),
  `statut` enum('en_attente','approuve','rejete') DEFAULT 'approuve',
  `date_moderation` timestamp NULL DEFAULT NULL,
  `moderateur_id` int(11) DEFAULT NULL,
  `raison_rejet` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `avis_produits`
--

INSERT INTO `avis_produits` (`id`, `produit_id`, `utilisateur_id`, `note`, `commentaire`, `achat_verifie`, `date_creation`, `statut`, `date_moderation`, `moderateur_id`, `raison_rejet`, `ip_address`, `user_agent`) VALUES
(3, 17, 44, 4, 'Se produit est tres ben durable et confortable', 0, '2025-09-03 09:54:28', 'approuve', NULL, NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0');

-- --------------------------------------------------------

--
-- Table structure for table `avis_produits_ameliore`
--

CREATE TABLE `avis_produits_ameliore` (
  `id` int(11) NOT NULL,
  `produit_id` int(11) NOT NULL,
  `utilisateur_id` int(11) NOT NULL,
  `note` int(11) NOT NULL CHECK (`note` >= 1 and `note` <= 5),
  `commentaire` text DEFAULT NULL,
  `achat_verifie` tinyint(1) DEFAULT 0,
  `statut` enum('en_attente','approuve','rejete') DEFAULT 'en_attente',
  `date_creation` timestamp NULL DEFAULT current_timestamp(),
  `date_moderation` timestamp NULL DEFAULT NULL,
  `moderateur_id` int(11) DEFAULT NULL,
  `raison_rejet` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `campagnes_marketing`
--

CREATE TABLE `campagnes_marketing` (
  `id` int(11) NOT NULL,
  `nom` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `type` enum('email','banniere','popup','notification') NOT NULL,
  `contenu` text NOT NULL,
  `date_debut` datetime NOT NULL,
  `date_fin` datetime NOT NULL,
  `budget` decimal(10,2) DEFAULT 0.00,
  `cible` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`cible`)),
  `statut` enum('brouillon','active','pausee','terminee') DEFAULT 'brouillon',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` int(11) NOT NULL,
  `nom` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `ordre` int(11) DEFAULT 0,
  `actif` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `nom`, `slug`, `description`, `image`, `parent_id`, `ordre`, `actif`, `created_at`) VALUES
(2, 'Textile', 'textile', 'Vêtements et accessoires', NULL, NULL, 0, 1, '2025-08-01 14:25:30'),
(3, 'Maison & Jardin', 'maison-jardin', 'Articles pour la maison et le jardin', NULL, NULL, 0, 1, '2025-08-01 14:25:30'),
(4, 'Automobile', 'automobile', 'Pièces et accessoires automobiles', NULL, NULL, 0, 1, '2025-08-01 14:25:30'),
(5, 'Agriculture et Agroalimentaire', 'agriculture-agroalimentaire', 'Produits agricoles, alimentaires et équipements agricoles', NULL, NULL, 1, 1, '2025-08-11 15:27:00'),
(6, 'Électronique et High-Tech', 'electronique-high-tech', 'Appareils électroniques, informatique et télécommunications', NULL, NULL, 2, 1, '2025-08-11 15:27:00'),
(7, 'Textile et Habillement', 'textile-habillement', 'Vêtements, tissus et accessoires de mode', NULL, NULL, 3, 1, '2025-08-11 15:27:00'),
(8, 'Construction et BTP', 'construction-btp', 'Matériaux de construction et équipements BTP', NULL, NULL, 4, 1, '2025-08-11 15:27:00'),
(9, 'Automobile et Transport', 'automobile-transport', 'Véhicules, pièces détachées et équipements de transport', NULL, NULL, 5, 1, '2025-08-11 15:27:00'),
(10, 'Santé et Médical', 'sante-medical', 'Équipements médicaux et produits pharmaceutiques', NULL, NULL, 6, 1, '2025-08-11 15:27:00'),
(11, 'Cosmétiques et Beauté', 'cosmetiques-beaute', 'Produits de beauté, cosmétiques et soins', NULL, NULL, 7, 1, '2025-08-11 15:27:00'),
(12, 'Mobilier et Décoration', 'mobilier-decoration', 'Meubles, décoration et articles de maison', NULL, NULL, 8, 1, '2025-08-11 15:27:00'),
(13, 'Énergie et Environnement', 'energie-environnement', 'Énergies renouvelables et équipements environnementaux', NULL, NULL, 9, 1, '2025-08-11 15:27:00'),
(14, 'Artisanat et Culture', 'artisanat-culture', 'Produits artisanaux traditionnels et culturels', NULL, NULL, 10, 1, '2025-08-11 15:27:00'),
(15, 'Sports et Loisirs', 'sports-loisirs', 'Équipements sportifs et articles de loisirs', NULL, NULL, 11, 1, '2025-08-11 15:27:00'),
(16, 'Éducation et Formation', 'education-formation', 'Matériel éducatif et de formation', NULL, NULL, 12, 1, '2025-08-11 15:27:00'),
(27, 'Vêtements Hommes', 'vetements-hommes', 'Costumes, chemises, pantalons pour hommes', NULL, 2, 1, 1, '2025-08-11 15:39:19'),
(28, 'Vêtements Femmes', 'vetements-femmes', 'Robes, jupes, blouses et vêtements féminins', NULL, 2, 2, 1, '2025-08-11 15:39:19'),
(29, 'Vêtements Enfants', 'vetements-enfants', 'Habits pour bébés, enfants et adolescents', NULL, 2, 3, 1, '2025-08-11 15:39:19'),
(30, 'Chaussures', 'chaussures', 'Chaussures de ville, sport et sandales', NULL, 2, 4, 1, '2025-08-11 15:39:19'),
(31, 'Accessoires Mode', 'accessoires-mode', 'Sacs, ceintures, bijoux et accessoires', NULL, 2, 5, 1, '2025-08-11 15:39:19'),
(32, 'Tissus et Pagnes', 'tissus-pagnes', 'Wax, bazin, tissus traditionnels et modernes', NULL, 2, 6, 1, '2025-08-11 15:39:19'),
(33, 'Vêtements Traditionnels', 'vetements-traditionnels', 'Boubous, pagnes et tenues traditionnelles africaines', NULL, 2, 7, 1, '2025-08-11 15:39:19'),
(34, 'Lingerie', 'lingerie', 'Sous-vêtements et lingerie', NULL, 2, 8, 1, '2025-08-11 15:39:19'),
(35, 'Vêtements de Travail', 'vetements-travail', 'Uniformes et vêtements professionnels', NULL, 2, 9, 1, '2025-08-11 15:39:19'),
(36, 'Maroquinerie', 'maroquinerie', 'Sacs en cuir, portefeuilles et articles en cuir', NULL, 2, 10, 1, '2025-08-11 15:39:19'),
(37, 'Mobilier Salon', 'mobilier-salon', 'Canapés, fauteuils et tables de salon', NULL, 3, 1, 1, '2025-08-11 15:39:19'),
(38, 'Mobilier Chambre', 'mobilier-chambre', 'Lits, armoires et mobilier de chambre', NULL, 3, 2, 1, '2025-08-11 15:39:19'),
(39, 'Mobilier Cuisine', 'mobilier-cuisine', 'Tables, chaises et mobilier de cuisine', NULL, 3, 3, 1, '2025-08-11 15:39:19'),
(40, 'Électroménager', 'electromenager-maison', 'Réfrigérateurs, cuisinières et appareils ménagers', NULL, 3, 4, 1, '2025-08-11 15:39:19'),
(41, 'Décoration', 'decoration', 'Tableaux, miroirs et objets décoratifs', NULL, 3, 5, 1, '2025-08-11 15:39:19'),
(42, 'Éclairage', 'eclairage', 'Lampes, lustres et solutions d\'éclairage', NULL, 3, 6, 1, '2025-08-11 15:39:19'),
(43, 'Jardinage', 'jardinage', 'Outils de jardin, plantes et équipements', NULL, 3, 7, 1, '2025-08-11 15:39:19'),
(44, 'Textiles Maison', 'textiles-maison', 'Rideaux, coussins et linge de maison', NULL, 3, 8, 1, '2025-08-11 15:39:19'),
(45, 'Sécurité Maison', 'securite-maison', 'Alarmes, serrures et sécurité domestique', NULL, 3, 9, 1, '2025-08-11 15:39:19'),
(46, 'Bricolage', 'bricolage', 'Outils et matériel de bricolage', NULL, 3, 10, 1, '2025-08-11 15:39:19'),
(47, 'Pièces Moteur', 'pieces-moteur', 'Pièces détachées pour moteurs automobiles', NULL, 4, 1, 1, '2025-08-11 15:39:19'),
(48, 'Pneus et Jantes', 'pneus-jantes', 'Pneumatiques et jantes pour véhicules', NULL, 4, 2, 1, '2025-08-11 15:39:19'),
(49, 'Accessoires Auto', 'accessoires-auto', 'Équipements et accessoires automobiles', NULL, 4, 3, 1, '2025-08-11 15:39:19'),
(50, 'Huiles et Lubrifiants', 'huiles-lubrifiants', 'Huiles moteur, liquides et lubrifiants', NULL, 4, 4, 1, '2025-08-11 15:39:19'),
(51, 'Électronique Auto', 'electronique-auto', 'GPS, autoradios et électronique embarquée', NULL, 4, 5, 1, '2025-08-11 15:39:19'),
(52, 'Carrosserie', 'carrosserie', 'Pièces de carrosserie et éléments extérieurs', NULL, 4, 6, 1, '2025-08-11 15:39:19'),
(53, 'Motos et Scooters', 'motos-scooters', 'Motocyclettes, scooters et pièces', NULL, 4, 7, 1, '2025-08-11 15:39:19'),
(54, 'Vélos', 'velos', 'Bicyclettes, VTT et accessoires vélo', NULL, 4, 8, 1, '2025-08-11 15:39:19'),
(55, 'Outils Garage', 'outils-garage', 'Outils et équipements de garage', NULL, 4, 9, 1, '2025-08-11 15:39:19'),
(56, 'Services Auto', 'services-auto', 'Réparation et services automobiles', NULL, 4, 10, 1, '2025-08-11 15:39:19'),
(57, 'Fruits Tropicaux', 'fruits-tropicaux', 'Mangues, papayes, avocats, ananas', NULL, 5, 1, 1, '2025-08-12 00:52:44'),
(58, 'Légumes Frais', 'legumes-frais', 'Légumes de saison et produits maraîchers', NULL, 5, 2, 1, '2025-08-12 00:52:44'),
(59, 'Céréales', 'cereales', 'Riz, maïs, mil et autres céréales', NULL, 5, 3, 1, '2025-08-12 00:52:44'),
(60, 'Légumineuses', 'legumineuses', 'Haricots, arachides, pois et légumineuses', NULL, 5, 4, 1, '2025-08-12 00:52:44'),
(61, 'Produits Carnés', 'produits-carnes', 'Viandes, volailles et charcuterie', NULL, 5, 5, 1, '2025-08-12 00:52:44'),
(62, 'Poissons', 'poissons', 'Poissons frais, fumés et fruits de mer', NULL, 5, 6, 1, '2025-08-12 00:52:44'),
(63, 'Épices Locales', 'epices-locales', 'Piment, gingembre et condiments africains', NULL, 5, 7, 1, '2025-08-12 00:52:44'),
(64, 'Huile de Palme', 'huile-palme', 'Huile de palme et huiles végétales', NULL, 5, 8, 1, '2025-08-12 00:52:44'),
(65, 'Manioc', 'manioc', 'Manioc, tapioca et dérivés', NULL, 5, 9, 1, '2025-08-12 00:52:44'),
(66, 'Équipements Agricoles', 'equipements-agricoles', 'Outils et machines agricoles', NULL, 5, 10, 1, '2025-08-12 00:52:44'),
(67, 'Smartphones', 'smartphones', 'Téléphones mobiles et accessoires', NULL, 6, 1, 1, '2025-08-12 00:52:44'),
(68, 'Ordinateurs', 'ordinateurs', 'PC, laptops et équipements informatiques', NULL, 6, 2, 1, '2025-08-12 00:52:44'),
(69, 'Télévisions', 'televisions', 'TV, écrans et équipements audiovisuels', NULL, 6, 3, 1, '2025-08-12 00:52:44'),
(70, 'Audio', 'audio', 'Systèmes audio, enceintes et casques', NULL, 6, 4, 1, '2025-08-12 00:52:44'),
(71, 'Appareils Photo', 'appareils-photo', 'Caméras, appareils photo et vidéo', NULL, 6, 5, 1, '2025-08-12 00:52:44'),
(72, 'Accessoires Tech', 'accessoires-tech', 'Câbles, chargeurs et accessoires', NULL, 6, 6, 1, '2025-08-12 00:52:44'),
(73, 'Composants', 'composants', 'Processeurs, mémoires et composants PC', NULL, 6, 7, 1, '2025-08-12 00:52:44'),
(74, 'Réseaux', 'reseaux', 'Routeurs, modems et équipements réseau', NULL, 6, 8, 1, '2025-08-12 00:52:44'),
(75, 'Énergie Solaire', 'energie-solaire', 'Panneaux solaires et batteries', NULL, 6, 9, 1, '2025-08-12 00:52:44'),
(76, 'Sécurité Électronique', 'securite-electronique', 'Caméras, alarmes et surveillance', NULL, 6, 10, 1, '2025-08-12 00:52:44'),
(77, 'Mode Masculine', 'mode-masculine', 'Vêtements et accessoires pour hommes', NULL, 7, 1, 1, '2025-08-12 00:52:44'),
(78, 'Mode Féminine', 'mode-feminine', 'Vêtements et accessoires pour femmes', NULL, 7, 2, 1, '2025-08-12 00:52:44'),
(79, 'Mode Enfantine', 'mode-enfantine', 'Vêtements pour enfants et bébés', NULL, 7, 3, 1, '2025-08-12 00:52:44'),
(80, 'Chaussures Mode', 'chaussures-mode', 'Chaussures tendance et de créateur', NULL, 7, 4, 1, '2025-08-12 00:52:44'),
(81, 'Bijoux', 'bijoux', 'Bijoux fantaisie et précieux', NULL, 7, 5, 1, '2025-08-12 00:52:44'),
(82, 'Sacs et Bagages', 'sacs-bagages', 'Sacs à main, valises et bagages', NULL, 7, 6, 1, '2025-08-12 00:52:44'),
(83, 'Tissus Africains', 'tissus-africains', 'Wax, kente et tissus traditionnels', NULL, 7, 7, 1, '2025-08-12 00:52:44'),
(84, 'Mode Traditionnelle', 'mode-traditionnelle', 'Vêtements traditionnels africains', NULL, 7, 8, 1, '2025-08-12 00:52:44'),
(85, 'Sous-vêtements', 'sous-vetements', 'Lingerie et sous-vêtements', NULL, 7, 9, 1, '2025-08-12 00:52:44'),
(86, 'Uniformes', 'uniformes', 'Vêtements professionnels et uniformes', NULL, 7, 10, 1, '2025-08-12 00:52:44'),
(87, 'Ciment', 'ciment', 'Ciment, béton et liants hydrauliques', NULL, 8, 1, 1, '2025-08-12 00:52:44'),
(88, 'Fer et Acier', 'fer-acier', 'Barres de fer, poutrelles métalliques', NULL, 8, 2, 1, '2025-08-12 00:52:44'),
(89, 'Bois Construction', 'bois-construction', 'Planches, poutres et bois d\'œuvre', NULL, 8, 3, 1, '2025-08-12 00:52:44'),
(90, 'Carrelage', 'carrelage', 'Carreaux, faïences et revêtements', NULL, 8, 4, 1, '2025-08-12 00:52:44'),
(91, 'Peinture', 'peinture', 'Peintures, vernis et produits de finition', NULL, 8, 5, 1, '2025-08-12 00:52:44'),
(92, 'Plomberie', 'plomberie', 'Tuyaux, robinets et sanitaires', NULL, 8, 6, 1, '2025-08-12 00:52:44'),
(93, 'Électricité', 'electricite', 'Câbles, prises et matériel électrique', NULL, 8, 7, 1, '2025-08-12 00:52:44'),
(94, 'Toiture', 'toiture', 'Tôles, tuiles et matériaux de couverture', NULL, 8, 8, 1, '2025-08-12 00:52:44'),
(95, 'Menuiserie', 'menuiserie', 'Portes, fenêtres et menuiseries', NULL, 8, 9, 1, '2025-08-12 00:52:44'),
(96, 'Outils BTP', 'outils-btp', 'Outils et machines de construction', NULL, 8, 10, 1, '2025-08-12 00:52:44'),
(97, 'Véhicules Neufs', 'vehicules-neufs', 'Voitures et véhicules neufs', NULL, 9, 1, 1, '2025-08-12 00:52:44'),
(98, 'Véhicules Occasion', 'vehicules-occasion', 'Voitures d\'occasion', NULL, 9, 2, 1, '2025-08-12 00:52:44'),
(99, 'Pièces Auto', 'pieces-auto', 'Pièces détachées automobiles', NULL, 9, 3, 1, '2025-08-12 00:52:44'),
(100, 'Pneumatiques', 'pneumatiques', 'Pneus et chambres à air', NULL, 9, 4, 1, '2025-08-12 00:52:44'),
(101, 'Moto', 'moto', 'Motocyclettes et accessoires moto', NULL, 9, 5, 1, '2025-08-12 00:52:44'),
(102, 'Transport Public', 'transport-public', 'Bus, taxis et transport en commun', NULL, 9, 6, 1, '2025-08-12 00:52:44'),
(103, 'Transport Maritime', 'transport-maritime', 'Bateaux et transport fluvial', NULL, 9, 7, 1, '2025-08-12 00:52:44'),
(104, 'Logistique', 'logistique', 'Services de transport et logistique', NULL, 9, 8, 1, '2025-08-12 00:52:44'),
(105, 'Carburants', 'carburants', 'Essence, gasoil et carburants', NULL, 9, 9, 1, '2025-08-12 00:52:44'),
(106, 'Entretien Auto', 'entretien-auto', 'Services d\'entretien automobile', NULL, 9, 10, 1, '2025-08-12 00:52:44'),
(107, 'Médicaments', 'medicaments', 'Médicaments et produits pharmaceutiques', NULL, 10, 1, 1, '2025-08-12 00:52:44'),
(108, 'Équipements Médicaux', 'equipements-medicaux', 'Appareils et instruments médicaux', NULL, 10, 2, 1, '2025-08-12 00:52:44'),
(109, 'Matériel Hospitalier', 'materiel-hospitalier', 'Mobilier et équipements hospitaliers', NULL, 10, 3, 1, '2025-08-12 00:52:44'),
(110, 'Premiers Secours', 'premiers-secours', 'Trousses et matériel de premiers secours', NULL, 10, 4, 1, '2025-08-12 00:52:44'),
(111, 'Optique', 'optique', 'Lunettes, lentilles et équipements optiques', NULL, 10, 5, 1, '2025-08-12 00:52:44'),
(112, 'Dentaire', 'dentaire', 'Équipements et produits dentaires', NULL, 10, 6, 1, '2025-08-12 00:52:44'),
(113, 'Laboratoire', 'laboratoire', 'Matériel de laboratoire médical', NULL, 10, 7, 1, '2025-08-12 00:52:44'),
(114, 'Médecine Traditionnelle', 'medecine-traditionnelle', 'Plantes médicinales et remèdes traditionnels', NULL, 10, 8, 1, '2025-08-12 00:52:44'),
(115, 'Hygiène Médicale', 'hygiene-medicale', 'Produits d\'hygiène et désinfection', NULL, 10, 9, 1, '2025-08-12 00:52:44'),
(116, 'Rééducation', 'reeducation', 'Matériel de kinésithérapie et rééducation', NULL, 10, 10, 1, '2025-08-12 00:52:44'),
(117, 'Soins Visage', 'soins-visage', 'Crèmes, sérums et soins du visage', NULL, 11, 1, 1, '2025-08-12 00:52:44'),
(118, 'Soins Corps', 'soins-corps', 'Laits corporels et soins du corps', NULL, 11, 2, 1, '2025-08-12 00:52:44'),
(119, 'Cheveux', 'cheveux', 'Shampooings, soins et coiffure', NULL, 11, 3, 1, '2025-08-12 00:52:44'),
(120, 'Maquillage', 'maquillage', 'Produits de maquillage et beauté', NULL, 11, 4, 1, '2025-08-12 00:52:44'),
(121, 'Parfums', 'parfums', 'Parfums et eaux de toilette', NULL, 11, 5, 1, '2025-08-12 00:52:44'),
(122, 'Cosmétiques Naturels', 'cosmetiques-naturels', 'Produits bio et naturels africains', NULL, 11, 6, 1, '2025-08-12 00:52:44'),
(123, 'Beauté Homme', 'beaute-homme', 'Soins et cosmétiques pour hommes', NULL, 11, 7, 1, '2025-08-12 00:52:44'),
(124, 'Accessoires Beauté', 'accessoires-beaute', 'Pinceaux, miroirs et accessoires', NULL, 11, 8, 1, '2025-08-12 00:52:44'),
(125, 'Soins Bébé', 'soins-bebe', 'Produits de soins pour bébés', NULL, 11, 9, 1, '2025-08-12 00:52:44'),
(126, 'Épilation', 'epilation', 'Produits et accessoires d\'épilation', NULL, 11, 10, 1, '2025-08-12 00:52:44'),
(127, 'Salon', 'salon', 'Mobilier et décoration de salon', NULL, 12, 1, 1, '2025-08-12 00:52:44'),
(128, 'Chambre', 'chambre', 'Mobilier et décoration de chambre', NULL, 12, 2, 1, '2025-08-12 00:52:44'),
(129, 'Cuisine', 'cuisine', 'Mobilier et équipements de cuisine', NULL, 12, 3, 1, '2025-08-12 00:52:44'),
(130, 'Bureau', 'bureau', 'Mobilier et équipements de bureau', NULL, 12, 4, 1, '2025-08-12 00:52:44'),
(131, 'Salle de Bain', 'salle-bain', 'Mobilier et accessoires de salle de bain', NULL, 12, 5, 1, '2025-08-12 00:52:44'),
(132, 'Éclairage Déco', 'eclairage-deco', 'Luminaires et éclairage décoratif', NULL, 12, 6, 1, '2025-08-12 00:52:44'),
(133, 'Art Décoratif', 'art-decoratif', 'Tableaux, sculptures et objets d\'art', NULL, 12, 7, 1, '2025-08-12 00:52:44'),
(134, 'Tapis et Rideaux', 'tapis-rideaux', 'Tapis, rideaux et textiles déco', NULL, 12, 8, 1, '2025-08-12 00:52:44'),
(135, 'Mobilier Extérieur', 'mobilier-exterieur', 'Mobilier de jardin et terrasse', NULL, 12, 9, 1, '2025-08-12 00:52:44'),
(136, 'Vaisselle', 'vaisselle', 'Vaisselle, couverts et arts de la table', NULL, 12, 10, 1, '2025-08-12 00:52:44'),
(137, 'Solaire', 'solaire', 'Équipements et installations solaires', NULL, 13, 1, 1, '2025-08-12 00:52:44'),
(138, 'Éolien', 'eolien', 'Éoliennes et énergie éolienne', NULL, 13, 2, 1, '2025-08-12 00:52:44'),
(139, 'Batteries', 'batteries', 'Batteries et systèmes de stockage', NULL, 13, 3, 1, '2025-08-12 00:52:44'),
(140, 'Traitement Eau', 'traitement-eau', 'Purification et traitement de l\'eau', NULL, 13, 4, 1, '2025-08-12 00:52:44'),
(141, 'Recyclage', 'recyclage', 'Équipements de recyclage et tri', NULL, 13, 5, 1, '2025-08-12 00:52:44'),
(142, 'Économie Énergie', 'economie-energie', 'Solutions d\'économie d\'énergie', NULL, 13, 6, 1, '2025-08-12 00:52:44'),
(143, 'Bioénergie', 'bioenergie', 'Biomasse et énergies renouvelables', NULL, 13, 7, 1, '2025-08-12 00:52:44'),
(144, 'Environnement', 'environnement', 'Protection et préservation environnementale', NULL, 13, 8, 1, '2025-08-12 00:52:44'),
(145, 'Éclairage LED', 'eclairage-led', 'Éclairage LED et économique', NULL, 13, 9, 1, '2025-08-12 00:52:44'),
(146, 'Chauffage Écologique', 'chauffage-ecologique', 'Solutions de chauffage écologique', NULL, 13, 10, 1, '2025-08-12 00:52:44'),
(147, 'Sculptures', 'sculptures', 'Sculptures en bois, bronze et pierre', NULL, 14, 1, 1, '2025-08-12 00:52:44'),
(148, 'Masques', 'masques', 'Masques traditionnels et décoratifs', NULL, 14, 2, 1, '2025-08-12 00:52:44'),
(149, 'Bijoux Artisanaux', 'bijoux-artisanaux', 'Bijoux traditionnels et artisanaux', NULL, 14, 3, 1, '2025-08-12 00:52:44'),
(150, 'Instruments Musique', 'instruments-musique', 'Instruments de musique traditionnels', NULL, 14, 4, 1, '2025-08-12 00:52:44'),
(151, 'Poterie', 'poterie', 'Poteries et céramiques artisanales', NULL, 14, 5, 1, '2025-08-12 00:52:44'),
(152, 'Vannerie', 'vannerie', 'Paniers et objets en fibres végétales', NULL, 14, 6, 1, '2025-08-12 00:52:44'),
(153, 'Textiles Artisanaux', 'textiles-artisanaux', 'Tissages et broderies traditionnels', NULL, 14, 7, 1, '2025-08-12 00:52:44'),
(154, 'Cuir Artisanal', 'cuir-artisanal', 'Maroquinerie et objets en cuir', NULL, 14, 8, 1, '2025-08-12 00:52:44'),
(155, 'Peinture Africaine', 'peinture-africaine', 'Art pictural et peintures africaines', NULL, 14, 9, 1, '2025-08-12 00:52:44'),
(156, 'Livres Culture', 'livres-culture', 'Livres et publications culturelles', NULL, 14, 10, 1, '2025-08-12 00:52:44'),
(157, 'Football', 'football', 'Équipements et accessoires de football', NULL, 15, 1, 1, '2025-08-12 00:52:44'),
(158, 'Basketball', 'basketball', 'Matériel de basketball', NULL, 15, 2, 1, '2025-08-12 00:52:44'),
(159, 'Sports Nautiques', 'sports-nautiques', 'Équipements pour sports aquatiques', NULL, 15, 3, 1, '2025-08-12 00:52:44'),
(160, 'Fitness', 'fitness', 'Appareils de fitness et musculation', NULL, 15, 4, 1, '2025-08-12 00:52:44'),
(161, 'Arts Martiaux', 'arts-martiaux', 'Équipements d\'arts martiaux', NULL, 15, 5, 1, '2025-08-12 00:52:44'),
(162, 'Jeux', 'jeux', 'Jeux de société et jouets', NULL, 15, 6, 1, '2025-08-12 00:52:44'),
(163, 'Camping', 'camping', 'Équipements de camping et outdoor', NULL, 15, 7, 1, '2025-08-12 00:52:44'),
(164, 'Pêche', 'peche', 'Matériel de pêche', NULL, 15, 8, 1, '2025-08-12 00:52:44'),
(165, 'Chasse', 'chasse', 'Équipements de chasse', NULL, 15, 9, 1, '2025-08-12 00:52:44'),
(166, 'Loisirs Créatifs', 'loisirs-creatifs', 'Matériel d\'arts et loisirs créatifs', NULL, 15, 10, 1, '2025-08-12 00:52:44'),
(167, 'Fournitures Scolaires', 'fournitures-scolaires', 'Cahiers, stylos et matériel scolaire', NULL, 16, 1, 1, '2025-08-12 00:52:44'),
(168, 'Livres Scolaires', 'livres-scolaires', 'Manuels et livres d\'enseignement', NULL, 16, 2, 1, '2025-08-12 00:52:44'),
(169, 'Informatique Éducative', 'informatique-educative', 'Ordinateurs et logiciels éducatifs', NULL, 16, 3, 1, '2025-08-12 00:52:44'),
(170, 'Mobilier Scolaire', 'mobilier-scolaire', 'Tables, chaises et mobilier d\'école', NULL, 16, 4, 1, '2025-08-12 00:52:44'),
(171, 'Laboratoire Scolaire', 'laboratoire-scolaire', 'Équipements de laboratoire pour écoles', NULL, 16, 5, 1, '2025-08-12 00:52:44'),
(172, 'Audiovisuel Éducatif', 'audiovisuel-educatif', 'Projecteurs et équipements AV', NULL, 16, 6, 1, '2025-08-12 00:52:44'),
(173, 'Formation Pro', 'formation-pro', 'Équipements de formation professionnelle', NULL, 16, 7, 1, '2025-08-12 00:52:44'),
(174, 'Jeux Éducatifs', 'jeux-educatifs', 'Jeux et matériel pédagogique', NULL, 16, 8, 1, '2025-08-12 00:52:44'),
(175, 'Arts Plastiques', 'arts-plastiques', 'Matériel d\'arts plastiques', NULL, 16, 9, 1, '2025-08-12 00:52:44'),
(176, 'Sport Scolaire', 'sport-scolaire', 'Équipements sportifs pour écoles', NULL, 16, 10, 1, '2025-08-12 00:52:44'),
(177, 'Pêche et Aquaculture', 'peche-aquaculture', 'Produits de la mer et équipements de pêche', NULL, NULL, 17, 1, '2025-08-12 00:52:44'),
(178, 'Foresterie', 'foresterie', 'Bois, exploitation forestière et transformation', NULL, NULL, 18, 1, '2025-08-12 00:52:44'),
(179, 'Mines et Métaux', 'mines-metaux', 'Extraction minière et métallurgie', NULL, NULL, 19, 1, '2025-08-12 00:52:44');

-- --------------------------------------------------------

--
-- Table structure for table `certifications`
--

CREATE TABLE `certifications` (
  `id` int(11) NOT NULL,
  `nom` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `logo` varchar(255) DEFAULT NULL,
  `organisme` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `certifications`
--

INSERT INTO `certifications` (`id`, `nom`, `description`, `logo`, `organisme`, `created_at`) VALUES
(1, 'ISO 9001', 'Certification qualité', NULL, 'ISO', '2025-08-01 14:25:30'),
(2, 'CE', 'Conformité européenne', NULL, 'Union Européenne', '2025-08-01 14:25:30'),
(3, 'Bio', 'Agriculture biologique', NULL, 'Ecocert', '2025-08-01 14:25:30');

-- --------------------------------------------------------

--
-- Table structure for table `certifications_produits`
--

CREATE TABLE `certifications_produits` (
  `id` int(11) NOT NULL,
  `produit_id` int(11) NOT NULL,
  `nom_certification` varchar(100) NOT NULL,
  `organisme` varchar(100) DEFAULT NULL,
  `numero_certificat` varchar(100) DEFAULT NULL,
  `date_obtention` date DEFAULT NULL,
  `date_expiration` date DEFAULT NULL,
  `fichier_certificat` varchar(255) DEFAULT NULL,
  `verifie` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `conditions_commerciales`
--

CREATE TABLE `conditions_commerciales` (
  `id` int(11) NOT NULL,
  `produit_id` int(11) NOT NULL,
  `type_condition` enum('livraison','retour','garantie') NOT NULL,
  `titre` varchar(100) NOT NULL,
  `description` text NOT NULL,
  `valeur` varchar(100) DEFAULT NULL,
  `ordre` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `conversations`
--

CREATE TABLE `conversations` (
  `id` int(11) NOT NULL,
  `acheteur_id` int(11) NOT NULL,
  `fournisseur_id` int(11) NOT NULL,
  `produit_id` int(11) DEFAULT NULL,
  `sujet` varchar(255) DEFAULT NULL,
  `statut` enum('ouverte','fermee') DEFAULT 'ouverte',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `derniere_activite` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `messages_non_lus_acheteur` int(11) DEFAULT 0,
  `messages_non_lus_fournisseur` int(11) DEFAULT 0,
  `archivee` tinyint(1) DEFAULT 0,
  `priorite` enum('normale','haute','urgente') DEFAULT 'normale',
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tags`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `conversations`
--

INSERT INTO `conversations` (`id`, `acheteur_id`, `fournisseur_id`, `produit_id`, `sujet`, `statut`, `created_at`, `updated_at`, `derniere_activite`, `messages_non_lus_acheteur`, `messages_non_lus_fournisseur`, `archivee`, `priorite`, `tags`) VALUES
(25, 29, 28, NULL, 'supplier_contact', 'ouverte', '2025-08-25 11:00:55', '2025-08-25 15:07:36', '2025-08-25 15:07:36', 0, 0, 0, 'normale', NULL),
(42, 44, 28, NULL, 'Contact avec SHOP_service', 'ouverte', '2025-08-27 10:47:58', '2025-09-03 13:23:42', '2025-09-03 13:23:42', 0, 0, 0, 'normale', NULL),
(43, 44, 52, NULL, 'Conversation avec Alissa AI', 'ouverte', '2025-09-12 17:50:01', '2025-09-12 17:50:32', '2025-09-12 17:50:32', 0, 1, 0, 'normale', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `conversation_participants`
--

CREATE TABLE `conversation_participants` (
  `id` int(11) NOT NULL,
  `conversation_id` int(11) NOT NULL,
  `utilisateur_id` int(11) NOT NULL,
  `role` enum('acheteur','fournisseur','admin') NOT NULL,
  `derniere_lecture` timestamp NULL DEFAULT NULL,
  `notifications_actives` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `coupons_reduction`
--

CREATE TABLE `coupons_reduction` (
  `id` int(11) NOT NULL,
  `code` varchar(50) NOT NULL,
  `type` enum('pourcentage','montant_fixe') NOT NULL,
  `valeur` decimal(10,2) NOT NULL,
  `montant_minimum` decimal(10,2) DEFAULT 0.00,
  `utilisations_max` int(11) DEFAULT NULL,
  `utilisations_actuelles` int(11) DEFAULT 0,
  `date_debut` date NOT NULL,
  `date_fin` date NOT NULL,
  `actif` tinyint(1) DEFAULT 1,
  `fournisseur_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `devis`
--

CREATE TABLE `devis` (
  `id` int(11) NOT NULL,
  `numero_devis` varchar(50) NOT NULL,
  `acheteur_id` int(11) NOT NULL,
  `fournisseur_id` int(11) NOT NULL,
  `produit_id` int(11) NOT NULL,
  `quantite` int(11) NOT NULL,
  `prix_unitaire` decimal(10,2) NOT NULL,
  `total_ht` decimal(10,2) NOT NULL,
  `tva` decimal(10,2) DEFAULT 0.00,
  `total_ttc` decimal(10,2) NOT NULL,
  `validite_jours` int(11) DEFAULT 30,
  `statut` enum('brouillon','envoye','accepte','refuse','expire') DEFAULT 'brouillon',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `devises`
--

CREATE TABLE `devises` (
  `id` int(11) NOT NULL,
  `code` varchar(3) NOT NULL,
  `nom` varchar(50) NOT NULL,
  `symbole` varchar(5) NOT NULL,
  `taux_change` decimal(10,6) DEFAULT 1.000000,
  `principale` tinyint(1) DEFAULT 0,
  `actif` tinyint(1) DEFAULT 1,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `devises`
--

INSERT INTO `devises` (`id`, `code`, `nom`, `symbole`, `taux_change`, `principale`, `actif`, `updated_at`) VALUES
(1, 'EUR', 'Euro', '€', 1.000000, 1, 1, '2025-08-01 14:25:30'),
(2, 'USD', 'Dollar américain', '$', 1.100000, 0, 1, '2025-08-01 14:25:30'),
(3, 'GBP', 'Livre sterling', '£', 0.850000, 0, 1, '2025-08-01 14:25:30');

-- --------------------------------------------------------

--
-- Table structure for table `documents_entreprise`
--

CREATE TABLE `documents_entreprise` (
  `id` int(11) NOT NULL,
  `entreprise_id` int(11) NOT NULL,
  `type_document` enum('certificat_enregistrement','certificat_fiscal','piece_identite_representant','licence_commerciale','certificat_origine','conformite_ce','certificat_sanitaire','autre') NOT NULL COMMENT 'Type de document: certificat_enregistrement=Obligatoire pour tous, certificat_fiscal=Obligatoire pour tous, piece_identite_representant=Obligatoire pour tous, licence_commerciale=Requis pour produits pharmaceutiques/alcoolisés/agroalimentaires sensibles/électroniques, certificat_origine=Requis pour produits alimentaires/agricoles/manufacturés, conformite_ce=Requis pour produits électroniques/jouets/cosmétiques/EPI, certificat_sanitaire=Requis pour produits alimentaires frais/cosmétiques/pharmaceutiques, autre=Document spécifique',
  `nom_fichier` varchar(255) NOT NULL,
  `chemin_fichier` varchar(500) NOT NULL,
  `taille_fichier` int(11) DEFAULT NULL,
  `type_mime` varchar(100) DEFAULT NULL,
  `statut_verification` enum('en_attente','verifie','rejete') DEFAULT 'en_attente',
  `commentaire_verification` text DEFAULT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `verified_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `documents_entreprise`
--

INSERT INTO `documents_entreprise` (`id`, `entreprise_id`, `type_document`, `nom_fichier`, `chemin_fichier`, `taille_fichier`, `type_mime`, `statut_verification`, `commentaire_verification`, `uploaded_at`, `verified_at`) VALUES
(2, 17, 'certificat_fiscal', 'Demande_Stage_SEEG.pdf', '/uploads/documents/doc-1757188660888-241753276.pdf', 114599, 'application/pdf', 'verifie', '', '2025-09-06 19:57:42', '2025-09-06 20:09:11'),
(3, 17, 'licence_commerciale', 'WhatsApp Image 2025-04-29 Ã  19.57.51_4fee9726.jpg', '/uploads/documents/doc-1757195458451-78773244.jpg', 86970, 'image/jpeg', 'verifie', '', '2025-09-06 21:51:02', '2025-09-07 14:57:07'),
(4, 17, 'piece_identite_representant', 'Demande_Stage_SEEG.pdf', '/uploads/documents/doc-1757256989293-835412529.pdf', 114599, 'application/pdf', 'verifie', '', '2025-09-07 14:56:29', '2025-09-07 14:57:00'),
(5, 17, 'certificat_enregistrement', 'Demande_Stage_SEEG.pdf', '/uploads/documents/doc-1757257087829-749448233.pdf', 114599, 'application/pdf', 'verifie', '', '2025-09-07 14:58:08', '2025-09-07 14:58:39'),
(6, 18, 'certificat_fiscal', 'Demande_Stage_SEEG.pdf', '/uploads/documents/doc-1757278231968-476241735.pdf', 114599, 'application/pdf', 'verifie', '', '2025-09-07 20:50:32', '2025-09-07 20:51:45'),
(7, 18, 'licence_commerciale', 'Demande_Stage_SEEG.pdf', '/uploads/documents/doc-1757278336762-389955531.pdf', 114599, 'application/pdf', 'verifie', '', '2025-09-07 20:52:18', '2025-09-07 20:53:50'),
(8, 18, 'certificat_enregistrement', 'Demande_Stage_SEEG.pdf', '/uploads/documents/doc-1757278357723-972722482.pdf', 114599, 'application/pdf', 'verifie', '', '2025-09-07 20:52:38', '2025-09-07 20:53:36'),
(9, 18, 'piece_identite_representant', 'WhatsApp Image 2025-04-29 Ã  19.57.51_4fee9726.jpg', '/uploads/documents/doc-1757278382326-121689144.jpg', 86970, 'image/jpeg', 'verifie', '', '2025-09-07 20:53:02', '2025-09-07 20:53:24'),
(10, 19, 'certificat_fiscal', 'Demande_Stage_SEEG.pdf', '/uploads/documents/doc-1757519342845-904646340.pdf', 114599, 'application/pdf', 'en_attente', NULL, '2025-09-10 15:49:04', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `documents_utilisateur`
--

CREATE TABLE `documents_utilisateur` (
  `id` int(11) NOT NULL,
  `utilisateur_id` int(11) NOT NULL,
  `type_document` enum('registre_commerce','piece_identite','justificatif_domicile','autorisation_commerciale') NOT NULL,
  `nom_fichier` varchar(255) NOT NULL,
  `chemin_fichier` varchar(500) NOT NULL,
  `statut_validation` enum('en_attente','approuve','rejete') DEFAULT 'en_attente',
  `commentaire_admin` text DEFAULT NULL,
  `date_soumission` timestamp NULL DEFAULT current_timestamp(),
  `date_validation` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `email_notifications`
--

CREATE TABLE `email_notifications` (
  `id` int(11) NOT NULL,
  `utilisateur_id` int(11) NOT NULL,
  `type_notification` varchar(50) NOT NULL,
  `sujet` varchar(255) NOT NULL,
  `contenu` text NOT NULL,
  `statut_envoi` enum('pending','sent','failed') DEFAULT 'pending',
  `tentatives` int(11) DEFAULT 0,
  `erreur_envoi` text DEFAULT NULL,
  `date_creation` timestamp NULL DEFAULT current_timestamp(),
  `date_envoi` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `email_notifications`
--

INSERT INTO `email_notifications` (`id`, `utilisateur_id`, `type_notification`, `sujet`, `contenu`, `statut_envoi`, `tentatives`, `erreur_envoi`, `date_creation`, `date_envoi`) VALUES
(2, 28, 'verification', 'Vérifiez votre adresse email - GabMarketHub', '\n            <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\n                <div style=\"background-color: #f8f9fa; padding: 20px; text-align: center;\">\n                    <h1 style=\"color: #dc2626; margin: 0;\">GabMarketHub</h1>\n                </div>\n                \n                <div style=\"padding: 30px 20px;\">\n                    <h2 style=\"color: #333;\">Bienvenue zigh cheick !</h2>\n                    \n                    <p style=\"color: #666; line-height: 1.6;\">\n                        Merci de vous être inscrit sur GabMarketHub. Pour activer votre compte, \n                        veuillez cliquer sur le lien ci-dessous :\n                    </p>\n                    \n                    <div style=\"text-align: center; margin: 30px 0;\">\n                        <a href=\"http://localhost:5173/verify-email?token=031d681c7013ad2fedc0edb5257f30c2fca304995074719da4507aa3abac5f0e\" \n                           style=\"background-color: #dc2626; color: white; padding: 12px 30px; \n                                  text-decoration: none; border-radius: 5px; display: inline-block;\">\n                            Vérifier mon email\n                        </a>\n                    </div>\n                    \n                    <p style=\"color: #666; font-size: 14px;\">\n                        Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :\n                        <br><a href=\"http://localhost:5173/verify-email?token=031d681c7013ad2fedc0edb5257f30c2fca304995074719da4507aa3abac5f0e\">http://localhost:5173/verify-email?token=031d681c7013ad2fedc0edb5257f30c2fca304995074719da4507aa3abac5f0e</a>\n                    </p>\n                    \n                    <p style=\"color: #666; font-size: 14px;\">\n                        Ce lien expire dans 24 heures.\n                    </p>\n                </div>\n                \n                <div style=\"background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;\">\n                    © 2025 GabMarketHub. Tous droits réservés.\n                </div>\n            </div>\n        ', 'failed', 1, 'Invalid login: 535-5.7.8 Username and Password not accepted. For more information, go to\n535 5.7.8  https://support.google.com/mail/?p=BadCredentials ffacd0b85a97d-3c70e4ba078sm27348341f8f.4 - gsmtp', '2025-08-28 15:34:29', NULL),
(10, 56, 'password_reset', 'Réinitialisation de votre mot de passe - GabMarketHub', '\n            <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\n                <div style=\"background-color: #f8f9fa; padding: 20px; text-align: center;\">\n                    <h1 style=\"color: #dc2626; margin: 0;\">GabMarketHub</h1>\n                </div>\n                \n                <div style=\"padding: 30px 20px;\">\n                    <h2 style=\"color: #333;\">Réinitialisation de mot de passe</h2>\n                    \n                    <p style=\"color: #666; line-height: 1.6;\">\n                        Bonjour jordy zigh,<br><br>\n                        Vous avez demandé la réinitialisation de votre mot de passe. \n                        Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :\n                    </p>\n                    \n                    <div style=\"text-align: center; margin: 30px 0;\">\n                        <a href=\"http://localhost:8080/reset-password?token=bdac1044fde70e7dbcc1cf30349a7a3967db4aa09298677094c0cd6535686415\" \n                           style=\"background-color: #dc2626; color: white; padding: 12px 30px; \n                                  text-decoration: none; border-radius: 5px; display: inline-block;\">\n                            Réinitialiser mon mot de passe\n                        </a>\n                    </div>\n                    \n                    <p style=\"color: #666; font-size: 14px;\">\n                        Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>\n                        <a href=\"http://localhost:8080/reset-password?token=bdac1044fde70e7dbcc1cf30349a7a3967db4aa09298677094c0cd6535686415\">http://localhost:8080/reset-password?token=bdac1044fde70e7dbcc1cf30349a7a3967db4aa09298677094c0cd6535686415</a>\n                    </p>\n                    \n                    <p style=\"color: #666; font-size: 14px;\">\n                        ⏰ Ce lien expire dans <strong>1 heure</strong>\n                    </p>\n                    \n                    <p style=\"color: #666; font-size: 14px;\">\n                        Si vous n\'avez pas demandé cette réinitialisation, ignorez cet email.\n                    </p>\n                </div>\n                \n                <div style=\"background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;\">\n                    © 2025 GabMarketHub. Tous droits réservés.\n                </div>\n            </div>\n        ', 'failed', 1, 'Invalid login: 535-5.7.8 Username and Password not accepted. For more information, go to\n535 5.7.8  https://support.google.com/mail/?p=BadCredentials 5b1f17b1804b1-45f2acbeee0sm36301305e9.0 - gsmtp', '2025-09-14 17:09:04', NULL),
(11, 56, 'password_reset', 'Réinitialisation de votre mot de passe - GabMarketHub', '\n            <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\n                <div style=\"background-color: #f8f9fa; padding: 20px; text-align: center;\">\n                    <h1 style=\"color: #dc2626; margin: 0;\">GabMarketHub</h1>\n                </div>\n                \n                <div style=\"padding: 30px 20px;\">\n                    <h2 style=\"color: #333;\">Réinitialisation de mot de passe</h2>\n                    \n                    <p style=\"color: #666; line-height: 1.6;\">\n                        Bonjour jordy zigh,<br><br>\n                        Vous avez demandé la réinitialisation de votre mot de passe. \n                        Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :\n                    </p>\n                    \n                    <div style=\"text-align: center; margin: 30px 0;\">\n                        <a href=\"http://localhost:8080/reset-password?token=d01a9a5bd48c4e728ef9bdde49f1c83d0d2b3fac73f19eb6160a03d469cd77dc\" \n                           style=\"background-color: #dc2626; color: white; padding: 12px 30px; \n                                  text-decoration: none; border-radius: 5px; display: inline-block;\">\n                            Réinitialiser mon mot de passe\n                        </a>\n                    </div>\n                    \n                    <p style=\"color: #666; font-size: 14px;\">\n                        Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>\n                        <a href=\"http://localhost:8080/reset-password?token=d01a9a5bd48c4e728ef9bdde49f1c83d0d2b3fac73f19eb6160a03d469cd77dc\">http://localhost:8080/reset-password?token=d01a9a5bd48c4e728ef9bdde49f1c83d0d2b3fac73f19eb6160a03d469cd77dc</a>\n                    </p>\n                    \n                    <p style=\"color: #666; font-size: 14px;\">\n                        ⏰ Ce lien expire dans <strong>1 heure</strong>\n                    </p>\n                    \n                    <p style=\"color: #666; font-size: 14px;\">\n                        Si vous n\'avez pas demandé cette réinitialisation, ignorez cet email.\n                    </p>\n                </div>\n                \n                <div style=\"background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;\">\n                    © 2025 GabMarketHub. Tous droits réservés.\n                </div>\n            </div>\n        ', 'failed', 1, 'Invalid login: 535-5.7.8 Username and Password not accepted. For more information, go to\n535 5.7.8  https://support.google.com/mail/?p=BadCredentials ffacd0b85a97d-3e7607870cfsm14697608f8f.19 - gsmtp', '2025-09-14 17:12:15', NULL),
(12, 56, 'password_reset', 'Réinitialisation de votre mot de passe - GabMarketHub', '\n            <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\n                <div style=\"background-color: #f8f9fa; padding: 20px; text-align: center;\">\n                    <h1 style=\"color: #dc2626; margin: 0;\">GabMarketHub</h1>\n                </div>\n                \n                <div style=\"padding: 30px 20px;\">\n                    <h2 style=\"color: #333;\">Réinitialisation de mot de passe</h2>\n                    \n                    <p style=\"color: #666; line-height: 1.6;\">\n                        Bonjour jordy zigh,<br><br>\n                        Vous avez demandé la réinitialisation de votre mot de passe. \n                        Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :\n                    </p>\n                    \n                    <div style=\"text-align: center; margin: 30px 0;\">\n                        <a href=\"http://localhost:8080/reset-password?token=88d385b7cf33172a77fe08e730b222f860ec68c7a01cf72bf7bbf03f0df7e8f4\" \n                           style=\"background-color: #dc2626; color: white; padding: 12px 30px; \n                                  text-decoration: none; border-radius: 5px; display: inline-block;\">\n                            Réinitialiser mon mot de passe\n                        </a>\n                    </div>\n                    \n                    <p style=\"color: #666; font-size: 14px;\">\n                        Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>\n                        <a href=\"http://localhost:8080/reset-password?token=88d385b7cf33172a77fe08e730b222f860ec68c7a01cf72bf7bbf03f0df7e8f4\">http://localhost:8080/reset-password?token=88d385b7cf33172a77fe08e730b222f860ec68c7a01cf72bf7bbf03f0df7e8f4</a>\n                    </p>\n                    \n                    <p style=\"color: #666; font-size: 14px;\">\n                        ⏰ Ce lien expire dans <strong>1 heure</strong>\n                    </p>\n                    \n                    <p style=\"color: #666; font-size: 14px;\">\n                        Si vous n\'avez pas demandé cette réinitialisation, ignorez cet email.\n                    </p>\n                </div>\n                \n                <div style=\"background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;\">\n                    © 2025 GabMarketHub. Tous droits réservés.\n                </div>\n            </div>\n        ', 'sent', 0, NULL, '2025-09-14 17:44:54', '2025-09-14 17:44:57'),
(13, 56, 'password_reset', 'Réinitialisation de votre mot de passe - GabMarketHub', '\n            <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\n                <div style=\"background-color: #f8f9fa; padding: 20px; text-align: center;\">\n                    <h1 style=\"color: #dc2626; margin: 0;\">GabMarketHub</h1>\n                </div>\n                \n                <div style=\"padding: 30px 20px;\">\n                    <h2 style=\"color: #333;\">Réinitialisation de mot de passe</h2>\n                    \n                    <p style=\"color: #666; line-height: 1.6;\">\n                        Bonjour jordy zigh,<br><br>\n                        Vous avez demandé la réinitialisation de votre mot de passe. \n                        Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :\n                    </p>\n                    \n                    <div style=\"text-align: center; margin: 30px 0;\">\n                        <a href=\"http://localhost:8080/reset-password?token=c5a26d712aee1ae8f45436824bb311d08c7c1bc57251f19fdbe7327f5b99f7a2\" \n                           style=\"background-color: #dc2626; color: white; padding: 12px 30px; \n                                  text-decoration: none; border-radius: 5px; display: inline-block;\">\n                            Réinitialiser mon mot de passe\n                        </a>\n                    </div>\n                    \n                    <p style=\"color: #666; font-size: 14px;\">\n                        Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>\n                        <a href=\"http://localhost:8080/reset-password?token=c5a26d712aee1ae8f45436824bb311d08c7c1bc57251f19fdbe7327f5b99f7a2\">http://localhost:8080/reset-password?token=c5a26d712aee1ae8f45436824bb311d08c7c1bc57251f19fdbe7327f5b99f7a2</a>\n                    </p>\n                    \n                    <p style=\"color: #666; font-size: 14px;\">\n                        ⏰ Ce lien expire dans <strong>1 heure</strong>\n                    </p>\n                    \n                    <p style=\"color: #666; font-size: 14px;\">\n                        Si vous n\'avez pas demandé cette réinitialisation, ignorez cet email.\n                    </p>\n                </div>\n                \n                <div style=\"background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;\">\n                    © 2025 GabMarketHub. Tous droits réservés.\n                </div>\n            </div>\n        ', 'sent', 0, NULL, '2025-09-14 17:51:49', '2025-09-14 17:51:52');

-- --------------------------------------------------------

--
-- Table structure for table `encheres`
--

CREATE TABLE `encheres` (
  `id` int(11) NOT NULL,
  `acheteur_id` int(11) NOT NULL,
  `produit_id` int(11) NOT NULL,
  `quantite_demandee` int(11) NOT NULL,
  `prix_max` decimal(10,2) NOT NULL,
  `description` text DEFAULT NULL,
  `date_limite` datetime NOT NULL,
  `statut` enum('active','terminee','annulee') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `entreprises`
--

CREATE TABLE `entreprises` (
  `id` int(11) NOT NULL,
  `utilisateur_id` int(11) NOT NULL,
  `nom_entreprise` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `logo` varchar(255) DEFAULT NULL,
  `site_web` varchar(255) DEFAULT NULL,
  `numero_siret` varchar(50) DEFAULT NULL,
  `numero_registre_commerce` varchar(50) DEFAULT NULL,
  `numero_tva` varchar(50) DEFAULT NULL,
  `statut_verification` enum('en_attente','verifie','rejete') DEFAULT 'en_attente',
  `note_moyenne` decimal(3,2) DEFAULT 0.00,
  `nombre_avis` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `telephone_professionnel` varchar(20) DEFAULT NULL,
  `adresse_ligne1` varchar(255) DEFAULT NULL,
  `adresse_ligne2` varchar(255) DEFAULT NULL,
  `ville` varchar(100) DEFAULT NULL,
  `code_postal` varchar(20) DEFAULT NULL,
  `pays` varchar(100) DEFAULT 'Gabon',
  `secteur_activite_id` int(11) DEFAULT NULL,
  `type_entreprise_id` int(11) DEFAULT NULL,
  `annee_creation` year(4) DEFAULT NULL,
  `nombre_employes` int(11) DEFAULT NULL,
  `capacite_production` text DEFAULT NULL,
  `certifications` text DEFAULT NULL,
  `logo_url` varchar(500) DEFAULT NULL,
  `date_verification` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `entreprises`
--

INSERT INTO `entreprises` (`id`, `utilisateur_id`, `nom_entreprise`, `description`, `logo`, `site_web`, `numero_siret`, `numero_registre_commerce`, `numero_tva`, `statut_verification`, `note_moyenne`, `nombre_avis`, `created_at`, `telephone_professionnel`, `adresse_ligne1`, `adresse_ligne2`, `ville`, `code_postal`, `pays`, `secteur_activite_id`, `type_entreprise_id`, `annee_creation`, `nombre_employes`, `capacite_production`, `certifications`, `logo_url`, `date_verification`) VALUES
(17, 28, 'SHOP_service', 'zyttarieaoyzorotufeyrtreytrfyofdghftrfyuregrhkfgjreogfr', NULL, 'https://www.shop_service.com', 'NIH12345678', 'TAF87654321', 'TVA0987612345', 'en_attente', 0.00, 0, '2025-08-21 13:47:28', '011234567', 'Charbonnage', NULL, 'Libreville', 'BP 0000', 'Gabon', 26, 5, '2021', 49, '1000 Unite par mois ', 'azertyuiopqsdfghjklwxcvbn,;:', NULL, NULL),
(18, 52, 'Alissa AI', 'Notre entreprise fait dans la creation des outils ', NULL, 'https://alissa-ia-site', 'NIF 213456789', 'TAF 12345678', NULL, 'en_attente', 0.00, 0, '2025-09-03 12:16:11', '011234567', 'CHARBONAGE', NULL, 'Libreville', 'BP 01234', 'Gabon', 38, 15, '2018', 8, '2', 'Certifier ANBR', NULL, NULL),
(19, 53, 'Alissa AI', 'Notre entreprise fait dans la creation des outils ', NULL, 'https://alissa-ia-site', 'NIF 213456789', 'TAF 12345678', 'TVA 12345678', 'en_attente', 0.00, 0, '2025-09-03 12:18:43', '011234567', 'CHARBONAGE', NULL, 'Libreville', 'BP 01234', 'Gabon', 38, 15, '2018', 8, '2', 'Certifier ANBR', NULL, NULL),
(20, 54, 'UFDKJLJ?NJ', 'HGFDSFGHJK', NULL, 'HFDSFHGJK', '23456789', '23456789', '876543567890', 'en_attente', 0.00, 0, '2025-09-03 13:37:52', '011345677', 'HFGDSFGHJK', 'CXGHJKLM', 'KJHGFFHJ', 'JH456', 'Italie', 11, 10, '2007', 44, 'KJHGF', 'FDSFGH', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `etapes_inscription`
--

CREATE TABLE `etapes_inscription` (
  `id` int(11) NOT NULL,
  `entreprise_id` int(11) NOT NULL,
  `etape_1_compte` tinyint(1) DEFAULT 0,
  `etape_2_entreprise` tinyint(1) DEFAULT 0,
  `etape_3_adresse` tinyint(1) DEFAULT 0,
  `etape_4_legal` tinyint(1) DEFAULT 0,
  `etape_5_produits` tinyint(1) DEFAULT 0,
  `etape_6_documents` tinyint(1) DEFAULT 0,
  `etape_completee` tinyint(1) DEFAULT 0,
  `date_completion` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `etapes_inscription`
--

INSERT INTO `etapes_inscription` (`id`, `entreprise_id`, `etape_1_compte`, `etape_2_entreprise`, `etape_3_adresse`, `etape_4_legal`, `etape_5_produits`, `etape_6_documents`, `etape_completee`, `date_completion`, `created_at`, `updated_at`) VALUES
(17, 17, 1, 1, 1, 1, 1, 0, 1, NULL, '2025-08-21 13:47:29', '2025-08-21 13:47:29'),
(18, 18, 1, 1, 1, 1, 1, 0, 1, NULL, '2025-09-03 12:16:11', '2025-09-03 12:16:11'),
(19, 19, 1, 1, 1, 1, 1, 0, 1, NULL, '2025-09-03 12:18:43', '2025-09-03 12:18:43'),
(20, 20, 1, 1, 1, 1, 1, 0, 1, NULL, '2025-09-03 13:37:52', '2025-09-03 13:37:52');

-- --------------------------------------------------------

--
-- Table structure for table `evenements_commerciaux`
--

CREATE TABLE `evenements_commerciaux` (
  `id` int(11) NOT NULL,
  `titre` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `description_courte` varchar(500) DEFAULT NULL,
  `type` enum('salon','conference','webinar','promotion','lancement','flash_sale','partenariat') NOT NULL,
  `date_debut` datetime NOT NULL,
  `date_fin` datetime DEFAULT NULL,
  `lieu` varchar(255) DEFAULT NULL,
  `est_en_ligne` tinyint(1) DEFAULT 0,
  `lien_webinaire` varchar(500) DEFAULT NULL,
  `image_principale` varchar(500) DEFAULT NULL,
  `images_supplementaires` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`images_supplementaires`)),
  `organisateur_id` int(11) DEFAULT NULL,
  `organisateur_nom` varchar(255) NOT NULL,
  `prix_participation` decimal(10,2) DEFAULT 0.00,
  `est_gratuit` tinyint(1) DEFAULT 1,
  `nombre_participants` int(11) DEFAULT 0,
  `nombre_max_participants` int(11) DEFAULT NULL,
  `est_populaire` tinyint(1) DEFAULT 0,
  `est_actif` tinyint(1) DEFAULT 1,
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tags`)),
  `produits_lies` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'IDs des produits liés à l''événement' CHECK (json_valid(`produits_lies`)),
  `statut` enum('brouillon','programme','en_cours','termine','annule') DEFAULT 'brouillon',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `evenements_commerciaux`
--

INSERT INTO `evenements_commerciaux` (`id`, `titre`, `description`, `description_courte`, `type`, `date_debut`, `date_fin`, `lieu`, `est_en_ligne`, `lien_webinaire`, `image_principale`, `images_supplementaires`, `organisateur_id`, `organisateur_nom`, `prix_participation`, `est_gratuit`, `nombre_participants`, `nombre_max_participants`, `est_populaire`, `est_actif`, `tags`, `produits_lies`, `statut`, `created_at`, `updated_at`) VALUES
(1, 'Salon du Commerce B2B Gabon 2025', 'Le plus grand événement commercial du Gabon réunissant fournisseurs et acheteurs professionnels. Découvrez les dernières tendances, rencontrez des partenaires et développez votre réseau.', 'Le plus grand événement commercial du Gabon', 'salon', '2025-03-15 09:00:00', '2025-03-17 18:00:00', 'Centre de Conférences de Libreville', 0, NULL, NULL, NULL, NULL, 'GabMarketHub', 25000.00, 0, 0, 2000, 1, 1, '[\"B2B\", \"Networking\", \"Commerce\", \"Gabon\"]', NULL, 'brouillon', '2025-09-03 04:58:49', '2025-09-03 04:58:49'),
(2, 'Webinaire : E-commerce et Digitalisation', 'Apprenez les meilleures pratiques pour digitaliser votre entreprise et développer votre présence en ligne.', 'Formation gratuite sur l\'e-commerce', 'webinar', '2025-02-20 14:00:00', '2025-02-20 16:00:00', NULL, 1, NULL, NULL, NULL, NULL, 'GabMarketHub', 0.00, 1, 0, 500, 1, 1, '[\"E-commerce\", \"Digital\", \"Formation\"]', NULL, 'brouillon', '2025-09-03 04:58:49', '2025-09-03 04:58:49'),
(3, 'Salon du Commerce B2B Gabon 2025', 'Le plus grand événement commercial du Gabon réunissant fournisseurs et acheteurs professionnels. Découvrez les dernières tendances, rencontrez des partenaires et développez votre réseau.', 'Le plus grand événement commercial du Gabon', 'salon', '2025-03-15 09:00:00', '2025-03-17 18:00:00', 'Centre de Conférences de Libreville', 0, NULL, NULL, NULL, NULL, 'GabMarketHub', 25000.00, 0, 0, 2000, 1, 1, '[\"B2B\", \"Networking\", \"Commerce\", \"Gabon\"]', NULL, 'brouillon', '2025-09-03 04:59:16', '2025-09-03 04:59:16'),
(4, 'Webinaire : E-commerce et Digitalisation', 'Apprenez les meilleures pratiques pour digitaliser votre entreprise et développer votre présence en ligne.', 'Formation gratuite sur l\'e-commerce', 'webinar', '2025-02-20 14:00:00', '2025-02-20 16:00:00', NULL, 1, NULL, NULL, NULL, NULL, 'GabMarketHub', 0.00, 1, 0, 500, 1, 1, '[\"E-commerce\", \"Digital\", \"Formation\"]', NULL, 'brouillon', '2025-09-03 04:59:16', '2025-09-03 04:59:16');

-- --------------------------------------------------------

--
-- Table structure for table `favoris`
--

CREATE TABLE `favoris` (
  `id` int(11) NOT NULL,
  `utilisateur_id` int(11) NOT NULL,
  `produit_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `favoris`
--

INSERT INTO `favoris` (`id`, `utilisateur_id`, `produit_id`, `created_at`) VALUES
(7, 44, 16, '2025-09-01 10:04:46'),
(8, 44, 17, '2025-09-03 09:53:52'),
(9, 71, 17, '2025-09-15 09:50:38');

-- --------------------------------------------------------

--
-- Table structure for table `fournisseurs_abonnements`
--

CREATE TABLE `fournisseurs_abonnements` (
  `id` int(11) NOT NULL,
  `fournisseur_id` int(11) NOT NULL,
  `abonnement_id` int(11) NOT NULL,
  `date_debut` date NOT NULL,
  `date_fin` date NOT NULL,
  `statut` enum('actif','expire','annule') DEFAULT 'actif',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `fournisseurs_certifications`
--

CREATE TABLE `fournisseurs_certifications` (
  `id` int(11) NOT NULL,
  `fournisseur_id` int(11) NOT NULL,
  `certification_id` int(11) NOT NULL,
  `numero_certificat` varchar(100) DEFAULT NULL,
  `date_obtention` date NOT NULL,
  `date_expiration` date DEFAULT NULL,
  `fichier_certificat` varchar(255) DEFAULT NULL,
  `verifie` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `gdpr_consentements`
--

CREATE TABLE `gdpr_consentements` (
  `id` int(11) NOT NULL,
  `utilisateur_id` int(11) NOT NULL,
  `type` enum('cookies','marketing','analytics','fonctionnel') NOT NULL,
  `consenti` tinyint(1) NOT NULL,
  `ip_address` varchar(45) NOT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `historique_prix`
--

CREATE TABLE `historique_prix` (
  `id` int(11) NOT NULL,
  `produit_id` int(11) NOT NULL,
  `ancien_prix` decimal(10,2) NOT NULL,
  `nouveau_prix` decimal(10,2) NOT NULL,
  `date_changement` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `images_produits`
--

CREATE TABLE `images_produits` (
  `id` int(11) NOT NULL,
  `produit_id` int(11) NOT NULL,
  `url` varchar(255) NOT NULL,
  `alt_text` varchar(255) DEFAULT NULL,
  `type_image` enum('principale','galerie','detail','usage','taille') DEFAULT 'galerie',
  `largeur` int(11) DEFAULT NULL,
  `hauteur` int(11) DEFAULT NULL,
  `taille_fichier` int(11) DEFAULT NULL,
  `ordre` int(11) DEFAULT 0,
  `principale` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `images_produits`
--

INSERT INTO `images_produits` (`id`, `produit_id`, `url`, `alt_text`, `type_image`, `largeur`, `hauteur`, `taille_fichier`, `ordre`, `principale`, `created_at`) VALUES
(6, 16, '/uploads/products/product-1755873052473-509398284.jpg', 'IMG-20250125-WA0142.jpg', 'principale', NULL, NULL, 153586, 0, 1, '2025-08-22 14:30:52'),
(7, 16, '/uploads/products/product-1755873052479-567677027.jpg', 'IMG-20250125-WA0143.jpg', 'galerie', NULL, NULL, 154371, 1, 0, '2025-08-22 14:30:52'),
(8, 16, '/uploads/products/product-1755873052484-125825071.jpg', 'IMG-20250125-WA0144.jpg', 'galerie', NULL, NULL, 119204, 2, 0, '2025-08-22 14:30:53'),
(9, 15, '/uploads/products/product-1755873399282-612555549.jpg', 'IMG-20241216-WA0083.jpg', 'galerie', NULL, NULL, 108839, 0, 0, '2025-08-22 14:36:39'),
(10, 15, '/uploads/products/product-1755873399289-96823516.jpg', 'IMG-20241218-WA0021.jpg', 'galerie', NULL, NULL, 82606, 1, 0, '2025-08-22 14:36:39'),
(11, 17, '/uploads/products/product-1755874823148-474317073.jpg', 'IMG-20250328-WA0463.jpg', 'principale', NULL, NULL, 128653, 0, 1, '2025-08-22 15:00:23'),
(12, 17, '/uploads/products/product-1755874823151-804975949.jpg', 'IMG-20250328-WA0464.jpg', 'galerie', NULL, NULL, 88801, 1, 0, '2025-08-22 15:00:23'),
(13, 17, '/uploads/products/product-1755874823152-865327408.jpg', 'IMG-20250328-WA0466.jpg', 'galerie', NULL, NULL, 300234, 2, 0, '2025-08-22 15:00:23'),
(14, 17, '/uploads/products/product-1755874823160-102370624.jpg', 'IMG-20250328-WA0468.jpg', 'galerie', NULL, NULL, 249670, 3, 0, '2025-08-22 15:00:23'),
(15, 17, '/uploads/products/product-1755874823165-786402113.jpg', 'IMG-20250328-WA0470.jpg', 'galerie', NULL, NULL, 313332, 4, 0, '2025-08-22 15:00:24'),
(16, 17, '/uploads/products/product-1755874823176-48794135.jpg', 'IMG-20250328-WA0472.jpg', 'galerie', NULL, NULL, 384698, 5, 0, '2025-08-22 15:00:24'),
(17, 15, '/uploads/products/product-1755875101691-675084047.jpg', 'IMG-20241222-WA0093.jpg', 'galerie', NULL, NULL, 81928, 2, 0, '2025-08-22 15:05:02'),
(18, 12, '/uploads/products/product-1755875707550-136571769.jpg', 'IMG-20250328-WA0463.jpg', 'galerie', NULL, NULL, 128653, 0, 0, '2025-08-22 15:15:07'),
(19, 12, '/uploads/products/product-1755875707554-805868536.jpg', 'IMG-20250328-WA0464.jpg', 'galerie', NULL, NULL, 88801, 1, 0, '2025-08-22 15:15:07'),
(20, 15, '/uploads/products/product-1755877166352-381277596.jpg', 'IMG-20250115-WA0029.jpg', 'principale', NULL, NULL, 76688, 3, 1, '2025-08-22 15:39:26'),
(21, 14, '/uploads/products/product-1756909676536-776417389.jpg', 'IMG-20241225-WA0057.jpg', 'principale', NULL, NULL, 136188, 0, 1, '2025-09-03 14:27:57'),
(22, 14, '/uploads/products/product-1756909676539-307984344.jpg', 'IMG-20241225-WA0060.jpg', 'galerie', NULL, NULL, 127055, 1, 0, '2025-09-03 14:27:57'),
(23, 14, '/uploads/products/product-1756909676542-87294414.jpg', 'IMG-20241225-WA0067.jpg', 'galerie', NULL, NULL, 87966, 2, 0, '2025-09-03 14:27:57'),
(24, 12, '/uploads/products/product-1756909733818-191606928.jpg', 'IMG-20241216-WA0083.jpg', 'principale', NULL, NULL, 108839, 2, 1, '2025-09-03 14:28:55'),
(25, 12, '/uploads/products/product-1756909733820-76281215.jpg', 'IMG-20241217-WA0027.jpg', 'galerie', NULL, NULL, 42674, 3, 0, '2025-09-03 14:28:55'),
(26, 12, '/uploads/products/product-1756909733821-230798495.jpg', 'IMG-20241218-WA0021.jpg', 'galerie', NULL, NULL, 82606, 4, 0, '2025-09-03 14:28:55'),
(27, 11, '/uploads/products/product-1756909788249-689630818.jpg', 'IMG-20241225-WA0036.jpg', 'principale', NULL, NULL, 107033, 0, 1, '2025-09-03 14:29:49'),
(28, 11, '/uploads/products/product-1756909788250-843970695.jpg', 'IMG-20241225-WA0055.jpg', 'galerie', NULL, NULL, 153672, 1, 0, '2025-09-03 14:29:49'),
(29, 11, '/uploads/products/product-1756909788252-227762022.jpg', 'IMG-20241225-WA0056.jpg', 'galerie', NULL, NULL, 155604, 2, 0, '2025-09-03 14:29:49'),
(30, 10, '/uploads/products/product-1756909822851-701499143.jpg', 'IMG-20241225-WA0057.jpg', 'principale', NULL, NULL, 136188, 0, 1, '2025-09-03 14:30:23'),
(31, 10, '/uploads/products/product-1756909822852-270006633.jpg', 'IMG-20241225-WA0060.jpg', 'galerie', NULL, NULL, 127055, 1, 0, '2025-09-03 14:30:23'),
(32, 10, '/uploads/products/product-1756909822855-120345462.jpg', 'IMG-20241225-WA0067.jpg', 'galerie', NULL, NULL, 87966, 2, 0, '2025-09-03 14:30:23');

-- --------------------------------------------------------

--
-- Table structure for table `langues`
--

CREATE TABLE `langues` (
  `id` int(11) NOT NULL,
  `code` varchar(2) NOT NULL,
  `nom` varchar(50) NOT NULL,
  `nom_natif` varchar(50) NOT NULL,
  `principale` tinyint(1) DEFAULT 0,
  `actif` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `langues`
--

INSERT INTO `langues` (`id`, `code`, `nom`, `nom_natif`, `principale`, `actif`) VALUES
(1, 'fr', 'Français', 'Français', 1, 1),
(2, 'en', 'Anglais', 'English', 0, 1),
(3, 'es', 'Espagnol', 'Español', 0, 1);

-- --------------------------------------------------------

--
-- Table structure for table `logs_activite`
--

CREATE TABLE `logs_activite` (
  `id` int(11) NOT NULL,
  `utilisateur_id` int(11) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `table_concernee` varchar(50) DEFAULT NULL,
  `enregistrement_id` int(11) DEFAULT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `logs_admin`
--

CREATE TABLE `logs_admin` (
  `id` int(11) NOT NULL,
  `admin_id` int(11) NOT NULL,
  `action` varchar(100) NOT NULL,
  `table_cible` varchar(50) NOT NULL,
  `id_cible` int(11) NOT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `messages`
--

CREATE TABLE `messages` (
  `id` int(11) NOT NULL,
  `conversation_id` int(11) NOT NULL,
  `expediteur_id` int(11) NOT NULL,
  `contenu` text NOT NULL,
  `lu` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `type` enum('texte','image','fichier','systeme') DEFAULT 'texte',
  `fichier_url` varchar(500) DEFAULT NULL,
  `fichier_nom` varchar(255) DEFAULT NULL,
  `fichier_taille` int(11) DEFAULT NULL,
  `fichier_type` varchar(100) DEFAULT NULL,
  `message_parent_id` int(11) DEFAULT NULL,
  `edited_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `messages`
--

INSERT INTO `messages` (`id`, `conversation_id`, `expediteur_id`, `contenu`, `lu`, `created_at`, `type`, `fichier_url`, `fichier_nom`, `fichier_taille`, `fichier_type`, `message_parent_id`, `edited_at`, `deleted_at`, `metadata`) VALUES
(11, 25, 29, 'CC', 1, '2025-08-25 12:21:40', 'texte', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(12, 25, 29, 'cc', 1, '2025-08-25 13:10:25', 'texte', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(13, 25, 28, 'Bonjour', 1, '2025-08-25 13:32:12', 'texte', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(14, 25, 29, 'OK', 1, '2025-08-25 13:51:12', 'texte', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(15, 25, 29, 'cc', 1, '2025-08-25 14:56:18', 'texte', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(16, 25, 28, 'oui', 1, '2025-08-25 14:59:56', 'texte', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(19, 42, 44, 'cc', 1, '2025-08-27 11:05:16', 'texte', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(20, 42, 44, 'cc', 1, '2025-08-27 11:10:13', 'texte', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(21, 42, 44, 'Cc', 1, '2025-08-27 11:58:02', 'texte', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(22, 42, 44, 'Bonjour', 1, '2025-09-01 11:50:44', 'texte', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(23, 42, 28, 'comment tu vas que puis-je faire pour toi', 1, '2025-09-01 11:51:16', 'texte', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(24, 42, 44, 'j\'ai beson de connatre combien coute un pantalon zara chez vous ??', 1, '2025-09-01 11:52:01', 'texte', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(25, 42, 28, 'Ok d\'accord je vas vous envoyer la liste des prix', 1, '2025-09-01 11:53:02', 'texte', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(26, 42, 44, 'ok merci', 1, '2025-09-01 11:53:47', 'texte', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(27, 42, 44, 'je vous attend', 1, '2025-09-01 12:48:53', 'texte', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(28, 42, 28, 'Petit probleme techniques', 1, '2025-09-01 13:56:14', 'texte', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(29, 42, 44, 'cc', 1, '2025-09-03 05:11:26', 'texte', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(30, 42, 28, 'Bonjour monsieur', 1, '2025-09-03 11:38:46', 'texte', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(31, 43, 44, 'bonjour', 0, '2025-09-12 16:50:32', 'texte', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

--
-- Triggers `messages`
--
DELIMITER $$
CREATE TRIGGER `update_unread_count_insert` AFTER INSERT ON `messages` FOR EACH ROW BEGIN
    DECLARE acheteur_id INT;
    DECLARE fournisseur_id INT;
    
    SELECT c.acheteur_id, c.fournisseur_id 
    INTO acheteur_id, fournisseur_id
    FROM conversations c 
    WHERE c.id = NEW.conversation_id;
    
    IF NEW.expediteur_id = acheteur_id THEN
        UPDATE conversations 
        SET messages_non_lus_fournisseur = messages_non_lus_fournisseur + 1,
            derniere_activite = NOW()
        WHERE id = NEW.conversation_id;
    ELSE
        UPDATE conversations 
        SET messages_non_lus_acheteur = messages_non_lus_acheteur + 1,
            derniere_activite = NOW()
        WHERE id = NEW.conversation_id;
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `update_unread_count_update` AFTER UPDATE ON `messages` FOR EACH ROW BEGIN
    DECLARE acheteur_id INT;
    DECLARE fournisseur_id INT;
    
    IF OLD.lu = FALSE AND NEW.lu = TRUE THEN
        SELECT c.acheteur_id, c.fournisseur_id 
        INTO acheteur_id, fournisseur_id
        FROM conversations c 
        WHERE c.id = NEW.conversation_id;
        
        IF NEW.expediteur_id = acheteur_id THEN
            UPDATE conversations 
            SET messages_non_lus_fournisseur = GREATEST(0, messages_non_lus_fournisseur - 1)
            WHERE id = NEW.conversation_id;
        ELSE
            UPDATE conversations 
            SET messages_non_lus_acheteur = GREATEST(0, messages_non_lus_acheteur - 1)
            WHERE id = NEW.conversation_id;
        END IF;
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `message_attachments`
--

CREATE TABLE `message_attachments` (
  `id` int(11) NOT NULL,
  `message_id` int(11) NOT NULL,
  `filename` varchar(255) NOT NULL,
  `original_filename` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_size` int(11) NOT NULL,
  `mime_type` varchar(100) NOT NULL,
  `uploaded_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `message_files`
--

CREATE TABLE `message_files` (
  `id` int(11) NOT NULL,
  `message_id` int(11) NOT NULL,
  `nom_original` varchar(255) NOT NULL,
  `nom_stockage` varchar(255) NOT NULL,
  `url` varchar(500) NOT NULL,
  `taille` int(11) NOT NULL,
  `type_mime` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `message_notifications`
--

CREATE TABLE `message_notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `message_id` int(11) NOT NULL,
  `conversation_id` int(11) NOT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `read_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `message_reactions`
--

CREATE TABLE `message_reactions` (
  `id` int(11) NOT NULL,
  `message_id` int(11) NOT NULL,
  `utilisateur_id` int(11) NOT NULL,
  `emoji` varchar(10) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `message_read_status`
--

CREATE TABLE `message_read_status` (
  `id` int(11) NOT NULL,
  `message_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `read_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `methodes_livraison_produit`
--

CREATE TABLE `methodes_livraison_produit` (
  `id` int(11) NOT NULL,
  `produit_id` int(11) NOT NULL,
  `methode` varchar(50) NOT NULL,
  `cout_estime` decimal(10,2) DEFAULT NULL,
  `delai_min` int(11) DEFAULT NULL,
  `delai_max` int(11) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `actif` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `utilisateur_id` int(11) NOT NULL,
  `titre` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `type` enum('message','commande','promotion','systeme','produit','user_management','product_management','order_management') NOT NULL,
  `category` varchar(50) DEFAULT 'general',
  `lu` tinyint(1) DEFAULT 0,
  `priority` enum('low','medium','high','urgent') DEFAULT 'medium',
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`data`)),
  `related_user_id` int(11) DEFAULT NULL,
  `related_product_id` int(11) DEFAULT NULL,
  `related_conversation_id` int(11) DEFAULT NULL,
  `related_order_id` int(11) DEFAULT NULL,
  `date_creation` timestamp NOT NULL DEFAULT current_timestamp(),
  `read_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `url` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `utilisateur_id`, `titre`, `message`, `type`, `category`, `lu`, `priority`, `data`, `related_user_id`, `related_product_id`, `related_conversation_id`, `related_order_id`, `date_creation`, `read_at`, `updated_at`, `url`, `created_at`) VALUES
(3, 29, 'Nouveau message de cheick zigh', 'Bonjour', 'message', 'general', 0, 'medium', NULL, NULL, NULL, NULL, NULL, '2025-08-25 13:32:13', NULL, '2025-09-10 15:57:08', NULL, '2025-08-25 13:32:13'),
(4, 29, 'Nouveau message de cheick zigh', 'oui', 'message', 'general', 0, 'medium', NULL, NULL, NULL, NULL, NULL, '2025-08-25 14:59:57', NULL, '2025-09-10 15:57:08', NULL, '2025-08-25 14:59:57'),
(7, 28, 'Test - Nouveau message de Marie Dupont', 'Bonjour, je suis intéressée par votre produit. Pouvez-vous me contacter ?', 'message', 'new_message', 1, 'high', '{\"buyer\":\"Marie Dupont\",\"conversationId\":2}', NULL, NULL, NULL, NULL, '2025-09-10 15:59:46', '2025-09-10 21:28:38', '2025-09-10 21:28:38', NULL, '2025-09-10 15:59:46'),
(8, 28, 'Test - Demande de contact de Jean Martin', 'Intéressé par: Laptop Gaming Pro', 'message', 'contact_request', 1, 'high', '{\"buyer\":\"Jean Martin\",\"product\":\"Laptop Gaming Pro\"}', NULL, NULL, NULL, NULL, '2025-09-10 15:59:46', '2025-09-10 21:28:38', '2025-09-10 21:28:38', NULL, '2025-09-10 15:59:46'),
(9, 28, 'Test - Produit approuvé: Smartphone Galaxy S24', 'Votre produit a été approuvé par l\'administrateur', 'produit', 'product_approved', 1, 'high', '{\"product\":\"Smartphone Galaxy S24\"}', NULL, NULL, NULL, NULL, '2025-09-10 15:59:47', '2025-09-10 21:28:38', '2025-09-10 21:28:38', NULL, '2025-09-10 15:59:47'),
(10, 28, 'Test - Modification demandée: Laptop Gaming Pro', 'L\'administrateur demande des modifications', 'produit', 'modification_request', 1, 'medium', '{\"product\":\"Laptop Gaming Pro\",\"reason\":\"Description incomplète\"}', NULL, NULL, NULL, NULL, '2025-09-10 15:59:47', '2025-09-10 21:28:38', '2025-09-10 21:28:38', NULL, '2025-09-10 15:59:47'),
(11, 28, 'Test - Maintenance programmée', 'Maintenance prévue du 15/09/2025 02:00 au 15/09/2025 04:00', 'systeme', 'maintenance', 1, 'high', '{\"startTime\":\"15/09/2025 02:00\",\"endTime\":\"15/09/2025 04:00\"}', NULL, NULL, NULL, NULL, '2025-09-10 15:59:47', '2025-09-10 21:28:38', '2025-09-10 21:28:38', NULL, '2025-09-10 15:59:47'),
(12, 29, 'Test - Nouveau message de Tech Solutions', 'Bonjour, j\'ai une question sur votre produit. Pouvez-vous me donner plus de détails ?', 'message', 'new_message', 0, 'high', '{\"supplier\":\"Tech Solutions\",\"conversationId\":1}', NULL, NULL, NULL, NULL, '2025-09-10 15:59:47', NULL, '2025-09-10 15:59:47', NULL, '2025-09-10 15:59:47'),
(13, 29, 'Test - Nouvelle conversation créée', 'Conversation créée pour le produit: Smartphone Galaxy S24', 'message', 'conversation_created', 0, 'medium', '{\"product\":\"Smartphone Galaxy S24\",\"supplier\":\"Tech Solutions\"}', NULL, NULL, NULL, NULL, '2025-09-10 15:59:47', NULL, '2025-09-10 15:59:47', NULL, '2025-09-10 15:59:47'),
(14, 29, 'Test - Nouveau produit de Tech Solutions', 'Laptop Gaming Pro - 1299€', 'produit', 'new_product', 0, 'medium', '{\"product\":\"Laptop Gaming Pro\",\"price\":1299}', NULL, NULL, NULL, NULL, '2025-09-10 15:59:47', NULL, '2025-09-10 15:59:47', NULL, '2025-09-10 15:59:47'),
(15, 29, 'Test - Prix modifié: Smartphone Galaxy S24', '899€ → 799€ par Tech Solutions', 'produit', 'price_change', 0, 'medium', '{\"product\":\"Smartphone Galaxy S24\",\"oldPrice\":899,\"newPrice\":799}', NULL, NULL, NULL, NULL, '2025-09-10 15:59:47', NULL, '2025-09-10 15:59:47', NULL, '2025-09-10 15:59:47'),
(16, 29, 'Test - Message système', 'Bienvenue sur GabMarketHub ! Découvrez nos nouveaux produits.', 'systeme', 'system_message', 0, 'low', '{\"type\":\"welcome\"}', NULL, NULL, NULL, NULL, '2025-09-10 15:59:47', NULL, '2025-09-10 15:59:47', NULL, '2025-09-10 15:59:47'),
(17, 30, 'Test - Nouveau message de Tech Solutions', 'Bonjour, j\'ai une question sur votre produit. Pouvez-vous me donner plus de détails ?', 'message', 'new_message', 0, 'high', '{\"supplier\":\"Tech Solutions\",\"conversationId\":1}', NULL, NULL, NULL, NULL, '2025-09-10 15:59:47', NULL, '2025-09-10 15:59:47', NULL, '2025-09-10 15:59:47'),
(18, 30, 'Test - Nouvelle conversation créée', 'Conversation créée pour le produit: Smartphone Galaxy S24', 'message', 'conversation_created', 0, 'medium', '{\"product\":\"Smartphone Galaxy S24\",\"supplier\":\"Tech Solutions\"}', NULL, NULL, NULL, NULL, '2025-09-10 15:59:48', NULL, '2025-09-10 15:59:48', NULL, '2025-09-10 15:59:48'),
(19, 30, 'Test - Nouveau produit de Tech Solutions', 'Laptop Gaming Pro - 1299€', 'produit', 'new_product', 0, 'medium', '{\"product\":\"Laptop Gaming Pro\",\"price\":1299}', NULL, NULL, NULL, NULL, '2025-09-10 15:59:48', NULL, '2025-09-10 15:59:48', NULL, '2025-09-10 15:59:48'),
(20, 30, 'Test - Prix modifié: Smartphone Galaxy S24', '899€ → 799€ par Tech Solutions', 'produit', 'price_change', 0, 'medium', '{\"product\":\"Smartphone Galaxy S24\",\"oldPrice\":899,\"newPrice\":799}', NULL, NULL, NULL, NULL, '2025-09-10 15:59:48', NULL, '2025-09-10 15:59:48', NULL, '2025-09-10 15:59:48'),
(21, 30, 'Test - Message système', 'Bienvenue sur GabMarketHub ! Découvrez nos nouveaux produits.', 'systeme', 'system_message', 0, 'low', '{\"type\":\"welcome\"}', NULL, NULL, NULL, NULL, '2025-09-10 15:59:48', NULL, '2025-09-10 15:59:48', NULL, '2025-09-10 15:59:48'),
(22, 44, 'Test - Nouveau message de Tech Solutions', 'Bonjour, j\'ai une question sur votre produit. Pouvez-vous me donner plus de détails ?', 'message', 'new_message', 0, 'high', '{\"supplier\":\"Tech Solutions\",\"conversationId\":1}', NULL, NULL, NULL, NULL, '2025-09-10 15:59:48', NULL, '2025-09-10 15:59:48', NULL, '2025-09-10 15:59:48'),
(23, 44, 'Test - Nouvelle conversation créée', 'Conversation créée pour le produit: Smartphone Galaxy S24', 'message', 'conversation_created', 0, 'medium', '{\"product\":\"Smartphone Galaxy S24\",\"supplier\":\"Tech Solutions\"}', NULL, NULL, NULL, NULL, '2025-09-10 15:59:48', NULL, '2025-09-10 15:59:48', NULL, '2025-09-10 15:59:48'),
(24, 44, 'Test - Nouveau produit de Tech Solutions', 'Laptop Gaming Pro - 1299€', 'produit', 'new_product', 0, 'medium', '{\"product\":\"Laptop Gaming Pro\",\"price\":1299}', NULL, NULL, NULL, NULL, '2025-09-10 15:59:48', NULL, '2025-09-10 15:59:48', NULL, '2025-09-10 15:59:48'),
(25, 44, 'Test - Prix modifié: Smartphone Galaxy S24', '899€ → 799€ par Tech Solutions', 'produit', 'price_change', 0, 'medium', '{\"product\":\"Smartphone Galaxy S24\",\"oldPrice\":899,\"newPrice\":799}', NULL, NULL, NULL, NULL, '2025-09-10 15:59:48', NULL, '2025-09-10 15:59:48', NULL, '2025-09-10 15:59:48'),
(26, 44, 'Test - Message système', 'Bienvenue sur GabMarketHub ! Découvrez nos nouveaux produits.', 'systeme', 'system_message', 0, 'low', '{\"type\":\"welcome\"}', NULL, NULL, NULL, NULL, '2025-09-10 15:59:49', NULL, '2025-09-10 15:59:49', NULL, '2025-09-10 15:59:49'),
(27, 28, 'Test Fournisseur - Nouveau message de Marie Dupont', 'Bonjour, je suis intéressée par votre produit. Pouvez-vous me donner plus de détails sur la livraison ?', 'message', 'new_message', 1, 'high', '{\"buyer\":\"Marie Dupont\",\"conversationId\":1}', NULL, NULL, NULL, NULL, '2025-09-10 16:15:47', '2025-09-10 21:28:38', '2025-09-10 21:28:38', NULL, '2025-09-10 16:15:47'),
(28, 28, 'Test Fournisseur - Demande de contact de Jean Martin', 'Intéressé par: Smartphone Galaxy S24', 'message', 'contact_request', 1, 'high', '{\"buyer\":\"Jean Martin\",\"product\":\"Smartphone Galaxy S24\"}', NULL, NULL, NULL, NULL, '2025-09-10 16:15:47', '2025-09-10 21:28:38', '2025-09-10 21:28:38', NULL, '2025-09-10 16:15:47'),
(29, 28, 'Test Fournisseur - Produit approuvé: Laptop Gaming Pro', 'Votre produit a été approuvé par l\'administrateur', 'produit', 'product_approved', 1, 'high', '{\"product\":\"Laptop Gaming Pro\"}', NULL, NULL, NULL, NULL, '2025-09-10 16:15:47', '2025-09-10 21:28:38', '2025-09-10 21:28:38', NULL, '2025-09-10 16:15:47'),
(30, 28, 'Test Fournisseur - Produit rejeté: Smartphone Galaxy S24', 'Raison: Description incomplète - Veuillez ajouter plus de détails techniques', 'produit', 'product_rejected', 1, 'high', '{\"product\":\"Smartphone Galaxy S24\",\"reason\":\"Description incomplète\"}', NULL, NULL, NULL, NULL, '2025-09-10 16:15:47', '2025-09-10 21:28:38', '2025-09-10 21:28:38', NULL, '2025-09-10 16:15:47'),
(31, 28, 'Test Fournisseur - Modification demandée: Laptop Gaming Pro', 'L\'administrateur demande des modifications sur les spécifications', 'produit', 'modification_request', 1, 'medium', '{\"product\":\"Laptop Gaming Pro\",\"reason\":\"Spécifications incomplètes\"}', NULL, NULL, NULL, NULL, '2025-09-10 16:15:47', '2025-09-10 21:28:38', '2025-09-10 21:28:38', NULL, '2025-09-10 16:15:47'),
(32, 28, 'Test Fournisseur - Produit en attente: Smartphone Galaxy S24', 'Votre produit attend la modération de l\'administrateur', 'produit', 'pending_moderation', 1, 'low', '{\"product\":\"Smartphone Galaxy S24\"}', NULL, NULL, NULL, NULL, '2025-09-10 16:15:47', '2025-09-10 21:28:38', '2025-09-10 21:28:38', NULL, '2025-09-10 16:15:47'),
(33, 28, 'Test Fournisseur - Nouvelle commande de Sophie Laurent', '2 produit(s) - Total: 1299€', 'commande', 'new_order', 1, 'high', '{\"buyer\":\"Sophie Laurent\",\"total\":1299,\"productCount\":2}', NULL, NULL, NULL, NULL, '2025-09-10 16:15:47', '2025-09-10 21:28:38', '2025-09-10 21:28:38', NULL, '2025-09-10 16:15:47'),
(34, 28, 'Test Fournisseur - Maintenance programmée', 'Maintenance prévue du 15/09/2025 02:00 au 15/09/2025 04:00', 'systeme', 'maintenance', 1, 'high', '{\"startTime\":\"15/09/2025 02:00\",\"endTime\":\"15/09/2025 04:00\"}', NULL, NULL, NULL, NULL, '2025-09-10 16:15:48', '2025-09-10 21:28:38', '2025-09-10 21:28:38', NULL, '2025-09-10 16:15:48'),
(35, 28, 'Test Fournisseur - Mise à jour v2.1.0', 'Nouvelle version disponible avec de nouvelles fonctionnalités de gestion des commandes', 'systeme', 'important_update', 1, 'medium', '{\"version\":\"2.1.0\",\"features\":[\"Gestion commandes\",\"Statistiques avancées\"]}', NULL, NULL, NULL, NULL, '2025-09-10 16:15:48', '2025-09-10 21:28:38', '2025-09-10 21:28:38', NULL, '2025-09-10 16:15:48'),
(36, 52, 'Test Fournisseur - Nouveau message de Marie Dupont', 'Bonjour, je suis intéressée par votre produit. Pouvez-vous me donner plus de détails sur la livraison ?', 'message', 'new_message', 0, 'high', '{\"buyer\":\"Marie Dupont\",\"conversationId\":1}', NULL, NULL, NULL, NULL, '2025-09-10 16:15:48', NULL, '2025-09-10 16:15:48', NULL, '2025-09-10 16:15:48'),
(37, 52, 'Test Fournisseur - Demande de contact de Jean Martin', 'Intéressé par: Smartphone Galaxy S24', 'message', 'contact_request', 0, 'high', '{\"buyer\":\"Jean Martin\",\"product\":\"Smartphone Galaxy S24\"}', NULL, NULL, NULL, NULL, '2025-09-10 16:15:48', NULL, '2025-09-10 16:15:48', NULL, '2025-09-10 16:15:48'),
(38, 52, 'Test Fournisseur - Produit approuvé: Laptop Gaming Pro', 'Votre produit a été approuvé par l\'administrateur', 'produit', 'product_approved', 0, 'high', '{\"product\":\"Laptop Gaming Pro\"}', NULL, NULL, NULL, NULL, '2025-09-10 16:15:48', NULL, '2025-09-10 16:15:48', NULL, '2025-09-10 16:15:48'),
(39, 52, 'Test Fournisseur - Produit rejeté: Smartphone Galaxy S24', 'Raison: Description incomplète - Veuillez ajouter plus de détails techniques', 'produit', 'product_rejected', 0, 'high', '{\"product\":\"Smartphone Galaxy S24\",\"reason\":\"Description incomplète\"}', NULL, NULL, NULL, NULL, '2025-09-10 16:15:48', NULL, '2025-09-10 16:15:48', NULL, '2025-09-10 16:15:48'),
(40, 52, 'Test Fournisseur - Modification demandée: Laptop Gaming Pro', 'L\'administrateur demande des modifications sur les spécifications', 'produit', 'modification_request', 0, 'medium', '{\"product\":\"Laptop Gaming Pro\",\"reason\":\"Spécifications incomplètes\"}', NULL, NULL, NULL, NULL, '2025-09-10 16:15:48', NULL, '2025-09-10 16:15:48', NULL, '2025-09-10 16:15:48'),
(41, 52, 'Test Fournisseur - Produit en attente: Smartphone Galaxy S24', 'Votre produit attend la modération de l\'administrateur', 'produit', 'pending_moderation', 0, 'low', '{\"product\":\"Smartphone Galaxy S24\"}', NULL, NULL, NULL, NULL, '2025-09-10 16:15:48', NULL, '2025-09-10 16:15:48', NULL, '2025-09-10 16:15:48'),
(42, 52, 'Test Fournisseur - Nouvelle commande de Sophie Laurent', '2 produit(s) - Total: 1299€', 'commande', 'new_order', 0, 'high', '{\"buyer\":\"Sophie Laurent\",\"total\":1299,\"productCount\":2}', NULL, NULL, NULL, NULL, '2025-09-10 16:15:49', NULL, '2025-09-10 16:15:49', NULL, '2025-09-10 16:15:49'),
(43, 52, 'Test Fournisseur - Maintenance programmée', 'Maintenance prévue du 15/09/2025 02:00 au 15/09/2025 04:00', 'systeme', 'maintenance', 0, 'high', '{\"startTime\":\"15/09/2025 02:00\",\"endTime\":\"15/09/2025 04:00\"}', NULL, NULL, NULL, NULL, '2025-09-10 16:15:49', NULL, '2025-09-10 16:15:49', NULL, '2025-09-10 16:15:49'),
(44, 52, 'Test Fournisseur - Mise à jour v2.1.0', 'Nouvelle version disponible avec de nouvelles fonctionnalités de gestion des commandes', 'systeme', 'important_update', 0, 'medium', '{\"version\":\"2.1.0\",\"features\":[\"Gestion commandes\",\"Statistiques avancées\"]}', NULL, NULL, NULL, NULL, '2025-09-10 16:15:49', NULL, '2025-09-10 16:15:49', NULL, '2025-09-10 16:15:49');

-- --------------------------------------------------------

--
-- Table structure for table `offres_encheres`
--

CREATE TABLE `offres_encheres` (
  `id` int(11) NOT NULL,
  `enchere_id` int(11) NOT NULL,
  `fournisseur_id` int(11) NOT NULL,
  `prix_propose` decimal(10,2) NOT NULL,
  `delai_livraison` int(11) NOT NULL,
  `commentaire` text DEFAULT NULL,
  `acceptee` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `parametres_site`
--

CREATE TABLE `parametres_site` (
  `id` int(11) NOT NULL,
  `cle` varchar(100) NOT NULL,
  `valeur` text DEFAULT NULL,
  `description` text DEFAULT NULL,
  `type` enum('text','number','boolean','json') DEFAULT 'text',
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `parametres_site`
--

INSERT INTO `parametres_site` (`id`, `cle`, `valeur`, `description`, `type`, `updated_at`) VALUES
(1, 'commission_pourcentage', '5.0', 'Pourcentage de commission sur les ventes', 'number', '2025-08-01 14:25:30'),
(2, 'moq_minimum', '1', 'Quantité minimum par défaut', 'number', '2025-09-02 15:33:28'),
(3, 'devise_principale', 'EUR', 'Devise principale du site', 'text', '2025-08-01 14:25:30'),
(4, 'email_contact', 'contact@monsite.com', 'Email de contact principal', 'text', '2025-08-01 14:25:30'),
(6, 'methodes_livraison_disponibles', '[\"DHL\", \"FedEx\", \"UPS\", \"TNT\", \"Bateau\", \"Avion\", \"Train\", \"Camion\"]', 'Méthodes de livraison disponibles', 'json', '2025-08-02 00:57:58');

-- --------------------------------------------------------

--
-- Table structure for table `participants_evenements`
--

CREATE TABLE `participants_evenements` (
  `id` int(11) NOT NULL,
  `evenement_id` int(11) NOT NULL,
  `utilisateur_id` int(11) NOT NULL,
  `nom` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `telephone` varchar(20) DEFAULT NULL,
  `statut` enum('inscrit','confirme','present','absent') DEFAULT 'inscrit',
  `date_inscription` timestamp NULL DEFAULT current_timestamp(),
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `password_reset_tokens`
--

CREATE TABLE `password_reset_tokens` (
  `id` int(11) NOT NULL,
  `utilisateur_id` int(11) NOT NULL,
  `token` varchar(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used` tinyint(1) DEFAULT 0,
  `used_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `password_reset_tokens`
--

INSERT INTO `password_reset_tokens` (`id`, `utilisateur_id`, `token`, `expires_at`, `used`, `used_at`, `created_at`) VALUES
(4, 56, 'c5a26d712aee1ae8f45436824bb311d08c7c1bc57251f19fdbe7327f5b99f7a2', '2025-09-14 19:51:49', 1, '2025-09-14 19:53:01', '2025-09-14 17:51:49');

-- --------------------------------------------------------

--
-- Table structure for table `photos_entreprise`
--

CREATE TABLE `photos_entreprise` (
  `id` int(11) NOT NULL,
  `entreprise_id` int(11) NOT NULL,
  `type_photo` enum('entrepot','personnel','produits','facade','autre') NOT NULL,
  `nom_fichier` varchar(255) NOT NULL,
  `chemin_fichier` varchar(500) NOT NULL,
  `description` text DEFAULT NULL,
  `ordre_affichage` int(11) DEFAULT 0,
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `prix_degressifs`
--

CREATE TABLE `prix_degressifs` (
  `id` int(11) NOT NULL,
  `produit_id` int(11) NOT NULL,
  `quantite_min` int(11) NOT NULL,
  `quantite_max` int(11) DEFAULT NULL,
  `prix_unitaire` decimal(10,2) NOT NULL,
  `devise` varchar(3) DEFAULT 'EUR',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_reports`
--

CREATE TABLE `product_reports` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `reporter_id` int(11) NOT NULL,
  `reason` enum('contenu_inapproprie','fausse_information','prix_suspect','qualite_douteuse','autre') NOT NULL,
  `description` text DEFAULT NULL,
  `status` enum('en_attente','traite','rejete') DEFAULT 'en_attente',
  `handled_by` int(11) DEFAULT NULL,
  `handled_at` timestamp NULL DEFAULT NULL,
  `admin_notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Triggers `product_reports`
--
DELIMITER $$
CREATE TRIGGER `update_product_reports_count` AFTER INSERT ON `product_reports` FOR EACH ROW BEGIN
    UPDATE produits 
    SET signalements_count = signalements_count + 1,
        last_signalement = NOW()
    WHERE id = NEW.product_id;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `produits`
--

CREATE TABLE `produits` (
  `id` int(11) NOT NULL,
  `fournisseur_id` int(11) NOT NULL,
  `categorie_id` int(11) NOT NULL,
  `nom` varchar(255) NOT NULL,
  `marque` varchar(100) DEFAULT NULL,
  `reference_produit` varchar(100) DEFAULT NULL,
  `slug` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `description_longue` text DEFAULT NULL,
  `fonctionnalites` text DEFAULT NULL,
  `instructions_utilisation` text DEFAULT NULL,
  `materiaux` text DEFAULT NULL,
  `couleurs_disponibles` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`couleurs_disponibles`)),
  `certifications` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`certifications`)),
  `delai_traitement` int(11) DEFAULT 7,
  `capacite_approvisionnement` int(11) DEFAULT NULL,
  `port_depart` varchar(100) DEFAULT NULL,
  `delai_livraison_estime` varchar(100) DEFAULT NULL,
  `politique_retour` text DEFAULT NULL,
  `garantie` text DEFAULT NULL,
  `video_url` varchar(255) DEFAULT NULL,
  `prix_unitaire` decimal(10,2) NOT NULL,
  `note_moyenne` decimal(2,1) DEFAULT 0.0,
  `nombre_avis` int(11) DEFAULT 0,
  `moq` int(11) DEFAULT 1,
  `stock_disponible` int(11) DEFAULT 0,
  `unite` varchar(50) DEFAULT 'pièce',
  `poids` decimal(8,2) DEFAULT NULL,
  `dimensions` varchar(100) DEFAULT NULL,
  `statut` enum('actif','inactif','suspendu') DEFAULT 'actif',
  `featured` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `statut_moderation` enum('en_attente','approuve','rejete','revision_requise') DEFAULT 'en_attente',
  `moderated_by` int(11) DEFAULT NULL,
  `moderated_at` timestamp NULL DEFAULT NULL,
  `moderation_notes` text DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `signalements_count` int(11) DEFAULT 0,
  `last_signalement` timestamp NULL DEFAULT NULL,
  `admin_notes` text DEFAULT NULL,
  `prix_promo` decimal(10,2) DEFAULT NULL COMMENT 'Prix promotionnel',
  `date_debut_promo` datetime DEFAULT NULL COMMENT 'Date de début de la promotion',
  `date_fin_promo` datetime DEFAULT NULL COMMENT 'Date de fin de la promotion',
  `pourcentage_reduction` decimal(5,2) DEFAULT NULL COMMENT 'Pourcentage de réduction',
  `est_en_offre` tinyint(1) DEFAULT 0 COMMENT 'Indique si le produit est en offre',
  `type_offre` enum('reduction','flash_sale','bundle','clearance') DEFAULT NULL COMMENT 'Type d''offre',
  `quantite_offre` int(11) DEFAULT NULL COMMENT 'Quantité disponible pour l''offre',
  `vues_30j` int(11) DEFAULT 0 COMMENT 'Nombre de vues sur les 30 derniers jours',
  `ventes_30j` int(11) DEFAULT 0 COMMENT 'Nombre de ventes sur les 30 derniers jours',
  `score_popularite` decimal(5,2) DEFAULT 0.00 COMMENT 'Score de popularité calculé',
  `derniere_activite` datetime DEFAULT NULL COMMENT 'Dernière activité (vue, vente, etc.)'
) ;

--
-- Dumping data for table `produits`
--

INSERT INTO `produits` (`id`, `fournisseur_id`, `categorie_id`, `nom`, `marque`, `reference_produit`, `slug`, `description`, `description_longue`, `fonctionnalites`, `instructions_utilisation`, `materiaux`, `couleurs_disponibles`, `certifications`, `delai_traitement`, `capacite_approvisionnement`, `port_depart`, `delai_livraison_estime`, `politique_retour`, `garantie`, `video_url`, `prix_unitaire`, `note_moyenne`, `nombre_avis`, `moq`, `stock_disponible`, `unite`, `poids`, `dimensions`, `statut`, `featured`, `created_at`, `updated_at`, `statut_moderation`, `moderated_by`, `moderated_at`, `moderation_notes`, `rejection_reason`, `signalements_count`, `last_signalement`, `admin_notes`, `prix_promo`, `date_debut_promo`, `date_fin_promo`, `pourcentage_reduction`, `est_en_offre`, `type_offre`, `quantite_offre`, `vues_30j`, `ventes_30j`, `score_popularite`, `derniere_activite`) VALUES
(10, 17, 30, 'Babouche ', 'Zara', '001', 'babouche', 'Babouche artisanale confortable et légère', 'Babouche fabriquée à la main avec des matériaux naturels, idéale pour un usage intérieur et extérieur. Design élégant et traditionnel, adaptée à tous les âges.', 'Confort optimal pour les pieds\r\n\r\nSemelle souple et légère\r\n\r\nRésistante et durable', 'Porter à l\'intérieur ou à l\'extérieur sur sol sec\r\n\r\nÉviter le contact prolongé avec l\'eau\r\n\r\nNettoyer avec un chiffon humide', 'Tige : cuir naturel ou tissu  Semelle : cuir ou caoutchouc souple  Doublure : coton ou textile respirant', '[\"Bleu\",\"Noir\",\"Marron\",\"Beige\"]', '[\"Artisanat local\",\"Matériaux naturels\"]', 1, 49, 'Grand Libreville ', '3 jours', 'Retour accepté sous 7 jours après réception si le produit est intact et non utilisé.', '3 mois contre défauts de fabrication (couture, semelle, matière).\r\n\r\nSupport client disponible par email ou téléphone pour toute question ou problème.', NULL, 50.00, 0.0, 0, 1, 25, 'kg', 1.00, ': 30 x 10 x 8 (taille moyenne adulte)', 'actif', 0, '2025-08-22 13:54:16', '2025-09-03 14:30:22', 'en_attente', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 0.00, '2025-09-03 08:00:10'),
(11, 17, 30, 'Babouche ', 'Zara', '001', 'babouche', 'Babouche artisanale confortable et légère', 'Babouche fabriquée à la main avec des matériaux naturels, idéale pour un usage intérieur et extérieur. Design élégant et traditionnel, adaptée à tous les âges.', 'Confort optimal pour les pieds\r\n\r\nSemelle souple et légère\r\n\r\nRésistante et durable', 'Porter à l’intérieur ou à l’extérieur sur sol sec\r\n\r\nÉviter le contact prolongé avec l’eau\r\n\r\nNettoyer avec un chiffon humide', 'Tige : cuir naturel ou tissu  Semelle : cuir ou caoutchouc souple  Doublure : coton ou textile respirant', '[\"Bleu\",\"Noir\",\"Marron\",\"Beige\"]', '[\"Artisanat local\",\"Matériaux naturels\"]', 1, 49, 'Grand Libreville ', '3 jours', 'Retour accepté sous 7 jours après réception si le produit est intact et non utilisé.', '3 mois contre défauts de fabrication (couture, semelle, matière).\r\n\r\nSupport client disponible par email ou téléphone pour toute question ou problème.', NULL, 50.00, 0.0, 0, 1, 25, 'kg', 1.00, ': 30 x 10 x 8 (taille moyenne adulte)', 'actif', 0, '2025-08-22 13:54:51', '2025-09-03 14:29:47', 'en_attente', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 0.00, NULL),
(12, 17, 30, 'Babouche ', 'Zara', '001', 'babouche', 'Babouche artisanale confortable et légère', 'Babouche fabriquée à la main avec des matériaux naturels, idéale pour un usage intérieur et extérieur. Design élégant et traditionnel, adaptée à tous les âges.', 'Confort optimal pour les pieds\r\n\r\nSemelle souple et légère\r\n\r\nRésistante et durable', 'Porter à l’intérieur ou à l’extérieur sur sol sec\r\n\r\nÉviter le contact prolongé avec l’eau\r\n\r\nNettoyer avec un chiffon humide', 'Tige : cuir naturel ou tissu  Semelle : cuir ou caoutchouc souple  Doublure : coton ou textile respirant', '[\"Bleu\",\"Noir\",\"Marron\",\"Beige\"]', '[\"Artisanat local\",\"Matériaux naturels\"]', 1, 49, 'Grand Libreville ', '3 jours', 'Retour accepté sous 7 jours après réception si le produit est intact et non utilisé.', '3 mois contre défauts de fabrication (couture, semelle, matière).\r\n\r\nSupport client disponible par email ou téléphone pour toute question ou problème.', NULL, 50.00, 0.0, 0, 1, 25, 'kg', 1.00, ': 30 x 10 x 8 (taille moyenne adulte)', 'actif', 0, '2025-08-22 14:05:46', '2025-09-03 14:28:53', 'en_attente', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 0.00, NULL),
(14, 17, 27, 'Ensemble Homme', 'zara', 'REF-002', 'ensemble-homme', 'Ensemble confortable et légers ', 'Ensemble fabriquée à la main avec des matériaux naturels, idéale pour un usage intérieur et extérieur. Design élégant et traditionnel, adaptée à tous les âges.', 'Confort optimal\r\n\r\nTissu leger 100 %coton \r\n\r\nRésistant et durable', 'Porter à l’intérieur ou à l’extérieur\r\n\r\nÉviter le contact prolongé avec l’eau\r\n\r\nNettoyer avec de eau ou en machine', 'Tige : cuir naturel ou tissu  Semelle : cuir ou caoutchouc souple  Doublure : coton ou textile respirant', '[\"Beige\",\"noir\",\"blanc\"]', '[\"Matériaux naturels\"]', 5, 2001, 'Port de Libreville ', '10', 'Retour accepté sous 7 jours après réception si le produit est intact et non utilisé.', 'Support client disponible par email ou téléphone pour toute question ou problème.\r\n3 mois contre défauts de fabrication (couture, semelle, matière).', NULL, 80.00, 0.0, 0, 1, 148, 'pièce', 2.00, ': 30 x 10 x 8 (taille moyenne adulte)', 'actif', 0, '2025-08-22 14:19:38', '2025-09-03 14:27:56', 'en_attente', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 0.00, NULL),
(15, 17, 27, 'Ensemble Homme', 'zara', 'REF-002', 'ensemble-homme', 'Ensemble confortable et légers ', 'Ensemble fabriquée à la main avec des matériaux naturels, idéale pour un usage intérieur et extérieur. Design élégant et traditionnel, adaptée à tous les âges.', 'Confort optimal\r\n\r\nTissu leger 100 %coton \r\n\r\nRésistant et durable', 'Porter à l’intérieur ou à l’extérieur\r\n\r\nÉviter le contact prolongé avec l’eau\r\n\r\nNettoyer avec de eau ou en machine', 'Tige : cuir naturel ou tissu  Semelle : cuir ou caoutchouc souple  Doublure : coton ou textile respirant', '[\"Beige\",\"noir\",\"blanc\"]', '[\"Matériaux naturels\"]', 5, 2001, 'Port de Libreville ', '10', 'Retour accepté sous 7 jours après réception si le produit est intact et non utilisé.', 'Support client disponible par email ou téléphone pour toute question ou problème.\r\n3 mois contre défauts de fabrication (couture, semelle, matière).', NULL, 80.00, 0.0, 0, 1, 148, 'pièce', 2.00, ': 30 x 10 x 8 (taille moyenne adulte)', 'actif', 0, '2025-08-22 14:27:05', '2025-08-22 15:39:25', 'en_attente', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 0.00, NULL),
(16, 17, 27, 'Ensemble Homme', 'zara', 'REF-002', 'ensemble-homme', 'Ensemble confortable et légers ', 'Ensemble fabriquée à la main avec des matériaux naturels, idéale pour un usage intérieur et extérieur. Design élégant et traditionnel, adaptée à tous les âges.', 'Confort optimal\r\n\r\nTissu leger 100 %coton \r\n\r\nRésistant et durable', 'Porter à l’intérieur ou à l’extérieur\r\n\r\nÉviter le contact prolongé avec l’eau\r\n\r\nNettoyer avec de eau ou en machine', 'Tige : cuir naturel ou tissu  Semelle : cuir ou caoutchouc souple  Doublure : coton ou textile respirant', '[\"Beige\",\"noir\",\"blanc\"]', '[\"Matériaux naturels\"]', 5, 2001, 'Port de Libreville ', '10', 'Retour accepté sous 7 jours après réception si le produit est intact et non utilisé.', 'Support client disponible par email ou téléphone pour toute question ou problème.\r\n3 mois contre défauts de fabrication (couture, semelle, matière).', NULL, 80.00, 0.0, 0, 1, 148, 'pièce', 2.00, ': 30 x 10 x 8 (taille moyenne adulte)', 'actif', 0, '2025-08-22 14:30:52', '2025-09-12 17:51:10', 'en_attente', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 0.00, '2025-09-12 19:51:10'),
(17, 17, 30, 'Babouche ', 'Zara', '001', 'babouche', 'Babouche artisanale confortable et légère', 'Babouche fabriquée à la main avec des matériaux naturels, idéale pour un usage intérieur et extérieur. Design élégant et traditionnel, adaptée à tous les âges.', 'Confort optimal pour les pieds\r\n\r\nSemelle souple et légère\r\n\r\nRésistante et durable', 'Porter à l’intérieur ou à l’extérieur sur sol sec\r\n\r\nÉviter le contact prolongé avec l’eau\r\n\r\nNettoyer avec un chiffon humide', 'Tige : cuir naturel ou tissu  Semelle : cuir ou caoutchouc souple  Doublure : coton ou textile respirant', '[\"Bleu\",\"Noir\",\"Marron\",\"Beige\"]', '[\"Artisanat local\",\"Matériaux naturels\"]', 1, 49, 'Grand Libreville ', '3 jours', 'Retour accepté sous 7 jours après réception si le produit est intact et non utilisé.', '3 mois contre défauts de fabrication (couture, semelle, matière).\r\n\r\nSupport client disponible par email ou téléphone pour toute question ou problème.', NULL, 50.00, 0.0, 0, 1, 25, 'kg', 1.00, ': 30 x 10 x 8 (taille moyenne adulte)', 'actif', 0, '2025-08-22 15:00:23', '2025-09-03 12:33:42', 'en_attente', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 0.00, '2025-09-03 14:33:42');

--
-- Triggers `produits`
--
DELIMITER $$
CREATE TRIGGER `historique_prix_update` AFTER UPDATE ON `produits` FOR EACH ROW BEGIN
    IF OLD.prix_unitaire != NEW.prix_unitaire THEN
        INSERT INTO historique_prix (produit_id, ancien_prix, nouveau_prix)
        VALUES (NEW.id, OLD.prix_unitaire, NEW.prix_unitaire);
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `tr_calculate_popularity_score` AFTER UPDATE ON `produits` FOR EACH ROW BEGIN
  IF NEW.`vues_30j` != OLD.`vues_30j` OR NEW.`ventes_30j` != OLD.`ventes_30j` THEN
    SET @score = (
      (NEW.`vues_30j` * 0.3) + 
      (NEW.`ventes_30j` * 0.7) + 
      (NEW.`note_moyenne` * 10) + 
      (NEW.`nombre_avis` * 0.5)
    );
    
    UPDATE `produits` 
    SET `score_popularite` = @score 
    WHERE `id` = NEW.`id`;
  END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `update_product_slug` BEFORE UPDATE ON `produits` FOR EACH ROW BEGIN
    IF OLD.nom != NEW.nom THEN
        SET NEW.slug = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(NEW.nom, ' ', '-'), 'é', 'e'), 'è', 'e'), 'à', 'a'), 'ç', 'c'));
        SET NEW.slug = REGEXP_REPLACE(NEW.slug, '[^a-z0-9-]', '');
        SET NEW.slug = REGEXP_REPLACE(NEW.slug, '-+', '-');
        SET NEW.slug = TRIM(BOTH '-' FROM NEW.slug);
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `produits_attributs`
--

CREATE TABLE `produits_attributs` (
  `id` int(11) NOT NULL,
  `produit_id` int(11) NOT NULL,
  `valeur_attribut_id` int(11) NOT NULL,
  `prix_supplement` decimal(10,2) DEFAULT 0.00,
  `stock_supplement` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `recommandations`
--

CREATE TABLE `recommandations` (
  `id` int(11) NOT NULL,
  `utilisateur_id` int(11) NOT NULL,
  `produit_id` int(11) NOT NULL,
  `score` decimal(5,4) NOT NULL,
  `type` enum('collaborative','contenu','populaire','historique') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reponses_avis`
--

CREATE TABLE `reponses_avis` (
  `id` int(11) NOT NULL,
  `avis_id` int(11) NOT NULL,
  `fournisseur_id` int(11) NOT NULL,
  `reponse` text NOT NULL,
  `date_reponse` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` int(11) NOT NULL,
  `nom` varchar(50) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `nom`, `description`, `created_at`) VALUES
(1, 'acheteur', 'Utilisateur qui achète des produits', '2025-08-01 14:25:29'),
(2, 'fournisseur', 'Entreprise qui vend des produits', '2025-08-01 14:25:29'),
(3, 'administrateur', 'Gestionnaire de la plateforme', '2025-08-01 14:25:29');

-- --------------------------------------------------------

--
-- Table structure for table `secteurs_activite`
--

CREATE TABLE `secteurs_activite` (
  `id` int(11) NOT NULL,
  `nom` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `secteurs_activite`
--

INSERT INTO `secteurs_activite` (`id`, `nom`, `description`, `created_at`) VALUES
(1, 'Agriculture et Agroalimentaire', 'Production agricole, transformation alimentaire', '2025-08-01 16:36:35'),
(2, 'Textile et Habillement', 'Confection, textile, mode', '2025-08-01 16:36:35'),
(3, 'Électronique et High-Tech', 'Appareils électroniques, informatique, télécommunications', '2025-08-01 16:36:35'),
(4, 'Automobile et Transport', 'Véhicules, pièces détachées, équipements de transport', '2025-08-01 16:36:35'),
(5, 'Construction et BTP', 'Matériaux de construction, équipements BTP', '2025-08-01 16:36:35'),
(6, 'Santé et Médical', 'Équipements médicaux, produits pharmaceutiques', '2025-08-01 16:36:35'),
(7, 'Cosmétiques et Beauté', 'Produits de beauté, cosmétiques, parfums', '2025-08-01 16:36:35'),
(8, 'Mobilier et Décoration', 'Meubles, décoration, articles de maison', '2025-08-01 16:36:35'),
(9, 'Énergie et Environnement', 'Énergies renouvelables, équipements environnementaux', '2025-08-01 16:36:35'),
(10, 'Services aux Entreprises', 'Consulting, services professionnels', '2025-08-01 16:36:35'),
(11, 'Agriculture et Agroalimentaire', 'Production agricole, transformation alimentaire', '2025-08-01 16:44:30'),
(12, 'Textile et Habillement', 'Confection, textile, mode', '2025-08-01 16:44:30'),
(13, 'Électronique et High-Tech', 'Appareils électroniques, informatique, télécommunications', '2025-08-01 16:44:30'),
(14, 'Automobile et Transport', 'Véhicules, pièces détachées, équipements de transport', '2025-08-01 16:44:30'),
(15, 'Construction et BTP', 'Matériaux de construction, équipements BTP', '2025-08-01 16:44:30'),
(16, 'Santé et Médical', 'Équipements médicaux, produits pharmaceutiques', '2025-08-01 16:44:30'),
(17, 'Cosmétiques et Beauté', 'Produits de beauté, cosmétiques, parfums', '2025-08-01 16:44:30'),
(18, 'Mobilier et Décoration', 'Meubles, décoration, articles de maison', '2025-08-01 16:44:30'),
(19, 'Énergie et Environnement', 'Énergies renouvelables, équipements environnementaux', '2025-08-01 16:44:30'),
(20, 'Services aux Entreprises', 'Consulting, services professionnels', '2025-08-01 16:44:30'),
(21, 'Agriculture', NULL, '2025-08-03 20:58:13'),
(22, 'Agroalimentaire', NULL, '2025-08-03 20:58:13'),
(23, 'Textile', NULL, '2025-08-03 20:58:13'),
(24, 'Électronique', NULL, '2025-08-03 20:58:13'),
(25, 'Cosmétique', NULL, '2025-08-03 20:58:13'),
(26, 'Artisanat', NULL, '2025-08-03 20:58:13'),
(27, 'Construction', NULL, '2025-08-03 20:58:13'),
(28, 'Automobile', NULL, '2025-08-03 20:58:13'),
(29, 'Agriculture', 'Production agricole, élevage, pêche', '2025-08-04 10:06:09'),
(30, 'Agroalimentaire', 'Transformation et distribution alimentaire', '2025-08-04 10:06:09'),
(31, 'Textile', 'Confection, mode, accessoires', '2025-08-04 10:06:09'),
(32, 'Électronique', 'Appareils électroniques, informatique', '2025-08-04 10:06:09'),
(33, 'Cosmétique', 'Produits de beauté et soins', '2025-08-04 10:06:09'),
(34, 'Artisanat', 'Produits artisanaux traditionnels', '2025-08-04 10:06:09'),
(35, 'Construction', 'Matériaux de construction, BTP', '2025-08-04 10:06:09'),
(36, 'Automobile', 'Pièces auto, accessoires véhicules', '2025-08-04 10:06:09'),
(37, 'Santé', 'Produits pharmaceutiques, matériel médical', '2025-08-04 10:06:09'),
(38, 'Commerce', 'Commerce général', '2025-08-04 10:06:09');

-- --------------------------------------------------------

--
-- Table structure for table `segments_clients`
--

CREATE TABLE `segments_clients` (
  `id` int(11) NOT NULL,
  `nom` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `criteres` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`criteres`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `seo_meta`
--

CREATE TABLE `seo_meta` (
  `id` int(11) NOT NULL,
  `table_name` varchar(50) NOT NULL,
  `record_id` int(11) NOT NULL,
  `meta_title` varchar(255) DEFAULT NULL,
  `meta_description` text DEFAULT NULL,
  `meta_keywords` varchar(500) DEFAULT NULL,
  `canonical_url` varchar(255) DEFAULT NULL,
  `robots` varchar(100) DEFAULT 'index,follow',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sessions_utilisateurs`
--

CREATE TABLE `sessions_utilisateurs` (
  `id` varchar(128) NOT NULL,
  `utilisateur_id` int(11) DEFAULT NULL,
  `ip_address` varchar(45) NOT NULL,
  `user_agent` text DEFAULT NULL,
  `payload` text NOT NULL,
  `last_activity` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `signalements_avis`
--

CREATE TABLE `signalements_avis` (
  `id` int(11) NOT NULL,
  `avis_id` int(11) NOT NULL,
  `utilisateur_id` int(11) NOT NULL,
  `raison` enum('inapproprié','spam','faux','autre') NOT NULL,
  `description` text DEFAULT NULL,
  `date_signalement` timestamp NULL DEFAULT current_timestamp(),
  `statut` enum('en_attente','traite','rejete') DEFAULT 'en_attente'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `specifications_techniques`
--

CREATE TABLE `specifications_techniques` (
  `id` int(11) NOT NULL,
  `produit_id` int(11) NOT NULL,
  `nom_specification` varchar(100) NOT NULL,
  `valeur_specification` text NOT NULL,
  `unite` varchar(50) DEFAULT NULL,
  `ordre` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `statistiques_produits`
--

CREATE TABLE `statistiques_produits` (
  `id` int(11) NOT NULL,
  `produit_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `vues` int(11) DEFAULT 0,
  `clics` int(11) DEFAULT 0,
  `ajouts_favoris` int(11) DEFAULT 0,
  `partages` int(11) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `statistiques_produits`
--

INSERT INTO `statistiques_produits` (`id`, `produit_id`, `date`, `vues`, `clics`, `ajouts_favoris`, `partages`, `created_at`) VALUES
(5, 10, '2025-09-03', 10, 0, 7, 0, '2025-09-03 05:33:27'),
(42, 17, '2025-09-03', 10, 0, 2, 0, '2025-09-03 09:53:52'),
(55, 16, '2025-09-12', 0, 1, 0, 0, '2025-09-12 17:51:10');

--
-- Triggers `statistiques_produits`
--
DELIMITER $$
CREATE TRIGGER `tr_update_vues_produit` AFTER INSERT ON `statistiques_produits` FOR EACH ROW BEGIN
  UPDATE `produits` 
  SET 
    `vues_30j` = (
      SELECT COALESCE(SUM(`vues`), 0) 
      FROM `statistiques_produits` 
      WHERE `produit_id` = NEW.`produit_id` 
      AND `date` >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    ),
    `derniere_activite` = NOW()
  WHERE `id` = NEW.`produit_id`;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `statistiques_vues`
--

CREATE TABLE `statistiques_vues` (
  `id` int(11) NOT NULL,
  `table_name` varchar(50) NOT NULL,
  `record_id` int(11) NOT NULL,
  `utilisateur_id` int(11) DEFAULT NULL,
  `ip_address` varchar(45) NOT NULL,
  `user_agent` text DEFAULT NULL,
  `referer` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `system_messages`
--

CREATE TABLE `system_messages` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `message_type` enum('info','warning','success','error') DEFAULT 'info',
  `target_audience` enum('all','buyers','suppliers','admins') DEFAULT 'all',
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `expires_at` timestamp NULL DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `priority` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `system_message_reads`
--

CREATE TABLE `system_message_reads` (
  `id` int(11) NOT NULL,
  `system_message_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `read_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `system_settings`
--

CREATE TABLE `system_settings` (
  `id` int(11) NOT NULL,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `setting_type` enum('string','number','boolean','json') DEFAULT 'string',
  `description` text DEFAULT NULL,
  `category` varchar(50) DEFAULT 'general',
  `is_public` tinyint(1) DEFAULT 0,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `system_settings`
--

INSERT INTO `system_settings` (`id`, `setting_key`, `setting_value`, `setting_type`, `description`, `category`, `is_public`, `updated_by`, `created_at`, `updated_at`) VALUES
(1, 'site_name', 'GabMarketHub', 'string', 'Nom du site', 'general', 1, NULL, '2025-08-13 14:39:45', '2025-08-13 14:39:45'),
(2, 'site_description', 'Plateforme e-commerce B2B', 'string', 'Description du site', 'general', 1, NULL, '2025-08-13 14:39:45', '2025-08-13 14:39:45'),
(3, 'maintenance_mode', 'false', 'boolean', 'Mode maintenance', 'system', 0, NULL, '2025-08-13 14:39:45', '2025-08-13 14:39:45'),
(4, 'max_upload_size', '10485760', 'number', 'Taille max upload (bytes)', 'system', 0, NULL, '2025-08-13 14:39:45', '2025-08-13 14:39:45'),
(5, 'session_timeout', '1800', 'number', 'Timeout session admin (secondes)', 'security', 0, NULL, '2025-08-13 14:39:45', '2025-08-13 14:39:45'),
(6, 'max_login_attempts', '5', 'number', 'Tentatives de connexion max', 'security', 0, NULL, '2025-08-13 14:39:45', '2025-08-13 14:39:45'),
(7, 'lockout_duration', '900', 'number', 'Durée de verrouillage (secondes)', 'security', 0, NULL, '2025-08-13 14:39:45', '2025-08-13 14:39:45'),
(8, 'email_notifications', 'true', 'boolean', 'Notifications email activées', 'notifications', 0, NULL, '2025-08-13 14:39:45', '2025-08-13 14:39:45'),
(9, 'auto_approve_products', 'false', 'boolean', 'Approbation automatique des produits', 'moderation', 0, NULL, '2025-08-13 14:39:45', '2025-08-13 14:39:45'),
(10, 'min_order_amount', '1000', 'number', 'Montant minimum de commande (FCFA)', 'orders', 1, NULL, '2025-08-13 14:39:45', '2025-08-13 14:39:45');

-- --------------------------------------------------------

--
-- Table structure for table `tentatives_connexion`
--

CREATE TABLE `tentatives_connexion` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `ip_address` varchar(45) NOT NULL,
  `user_agent` text DEFAULT NULL,
  `succes` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `traductions`
--

CREATE TABLE `traductions` (
  `id` int(11) NOT NULL,
  `table_name` varchar(50) NOT NULL,
  `field_name` varchar(50) NOT NULL,
  `record_id` int(11) NOT NULL,
  `langue_id` int(11) NOT NULL,
  `contenu` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `transporteurs`
--

CREATE TABLE `transporteurs` (
  `id` int(11) NOT NULL,
  `nom` varchar(100) NOT NULL,
  `logo` varchar(255) DEFAULT NULL,
  `site_web` varchar(255) DEFAULT NULL,
  `api_url` varchar(255) DEFAULT NULL,
  `api_key` varchar(255) DEFAULT NULL,
  `actif` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `transporteurs`
--

INSERT INTO `transporteurs` (`id`, `nom`, `logo`, `site_web`, `api_url`, `api_key`, `actif`, `created_at`) VALUES
(1, 'Colissimo', NULL, NULL, NULL, NULL, 1, '2025-08-01 14:25:30'),
(2, 'Chronopost', NULL, NULL, NULL, NULL, 1, '2025-08-01 14:25:30'),
(3, 'DHL', NULL, NULL, NULL, NULL, 1, '2025-08-01 14:25:30'),
(4, 'UPS', NULL, NULL, NULL, NULL, 1, '2025-08-01 14:25:30');

-- --------------------------------------------------------

--
-- Table structure for table `types_entreprise`
--

CREATE TABLE `types_entreprise` (
  `id` int(11) NOT NULL,
  `nom` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `types_entreprise`
--

INSERT INTO `types_entreprise` (`id`, `nom`, `description`, `created_at`) VALUES
(1, 'Fabricant', 'Entreprise qui produit des biens', '2025-08-01 16:36:35'),
(2, 'Grossiste', 'Entreprise qui vend en gros', '2025-08-01 16:36:35'),
(3, 'Distributeur', 'Entreprise qui distribue des produits', '2025-08-01 16:36:35'),
(4, 'Importateur', 'Entreprise qui importe des produits', '2025-08-01 16:36:35'),
(5, 'Exportateur', 'Entreprise qui exporte des produits', '2025-08-01 16:36:35'),
(6, 'Commerçant', 'Entreprise de commerce de détail', '2025-08-01 16:36:35'),
(7, 'Prestataire de services', 'Entreprise qui fournit des services', '2025-08-01 16:36:35'),
(8, 'Fabricant', 'Entreprise qui produit des biens', '2025-08-01 16:44:30'),
(9, 'Grossiste', 'Entreprise qui vend en gros', '2025-08-01 16:44:30'),
(10, 'Distributeur', 'Entreprise qui distribue des produits', '2025-08-01 16:44:30'),
(11, 'Importateur', 'Entreprise qui importe des produits', '2025-08-01 16:44:30'),
(12, 'Exportateur', 'Entreprise qui exporte des produits', '2025-08-01 16:44:30'),
(13, 'Commerçant', 'Entreprise de commerce de détail', '2025-08-01 16:44:30'),
(14, 'Prestataire de services', 'Entreprise qui fournit des services', '2025-08-01 16:44:30'),
(15, 'Fabricant', NULL, '2025-08-03 20:58:13'),
(16, 'Distributeur', NULL, '2025-08-03 20:58:13'),
(17, 'Grossiste', NULL, '2025-08-03 20:58:13'),
(18, 'Importateur', NULL, '2025-08-03 20:58:13'),
(19, 'Exportateur', NULL, '2025-08-03 20:58:13'),
(20, 'Artisan', NULL, '2025-08-03 20:58:13'),
(21, 'PME', NULL, '2025-08-03 20:58:13'),
(22, 'Grande entreprise', NULL, '2025-08-03 20:58:13'),
(23, 'Fabricant', 'Entreprise de production/fabrication', '2025-08-04 10:06:09'),
(24, 'Distributeur', 'Distribution en gros', '2025-08-04 10:06:09'),
(25, 'Grossiste', 'Vente en gros', '2025-08-04 10:06:09'),
(26, 'Importateur', 'Import de produits étrangers', '2025-08-04 10:06:09'),
(27, 'Exportateur', 'Export vers l\'étranger', '2025-08-04 10:06:09'),
(28, 'Artisan', 'Production artisanale', '2025-08-04 10:06:09'),
(29, 'PME', 'Petite et moyenne entreprise', '2025-08-04 10:06:09'),
(30, 'Grande entreprise', 'Entreprise de grande taille', '2025-08-04 10:06:09');

-- --------------------------------------------------------

--
-- Table structure for table `typing_indicators`
--

CREATE TABLE `typing_indicators` (
  `id` int(11) NOT NULL,
  `conversation_id` int(11) NOT NULL,
  `utilisateur_id` int(11) NOT NULL,
  `is_typing` tinyint(1) DEFAULT 0,
  `last_activity` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `utilisateurs`
--

CREATE TABLE `utilisateurs` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `photo_profil` varchar(255) DEFAULT NULL COMMENT 'Chemin vers la photo de profil de l''utilisateur',
  `mot_de_passe` varchar(255) NOT NULL,
  `nom` varchar(100) NOT NULL,
  `prenom` varchar(100) DEFAULT NULL,
  `telephone` varchar(20) DEFAULT NULL,
  `role_id` int(11) NOT NULL,
  `statut` enum('actif','suspendu','inactif') DEFAULT 'actif',
  `date_inscription` timestamp NOT NULL DEFAULT current_timestamp(),
  `derniere_connexion` timestamp NULL DEFAULT NULL,
  `last_login` timestamp NULL DEFAULT NULL,
  `login_attempts` int(11) DEFAULT 0,
  `locked_until` timestamp NULL DEFAULT NULL,
  `email_verified` tinyint(1) DEFAULT 0,
  `phone_verified` tinyint(1) DEFAULT 0,
  `two_factor_enabled` tinyint(1) DEFAULT 0,
  `suspension_reason` text DEFAULT NULL,
  `suspended_by` int(11) DEFAULT NULL,
  `suspended_at` timestamp NULL DEFAULT NULL,
  `notes_admin` text DEFAULT NULL,
  `documents_valides` tinyint(1) DEFAULT 0,
  `email_verified_at` datetime DEFAULT NULL,
  `email_verification_token` varchar(64) DEFAULT NULL,
  `email_verification_expires` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `utilisateurs`
--

INSERT INTO `utilisateurs` (`id`, `email`, `photo_profil`, `mot_de_passe`, `nom`, `prenom`, `telephone`, `role_id`, `statut`, `date_inscription`, `derniere_connexion`, `last_login`, `login_attempts`, `locked_until`, `email_verified`, `phone_verified`, `two_factor_enabled`, `suspension_reason`, `suspended_by`, `suspended_at`, `notes_admin`, `documents_valides`, `email_verified_at`, `email_verification_token`, `email_verification_expires`) VALUES
(28, 'cheick@gmail.com', '/uploads/profiles/profile_28_1757606365068.jpg', '$2a$12$bhLGwKSYFKjezbUKp2ys6eB55iQusQoXUrGCl9thF9HpFO6x7F6hy', 'cheick', 'zigh', '077654211', 2, 'actif', '2025-08-21 13:47:27', '2025-09-11 15:57:34', NULL, 0, NULL, 0, 0, 0, NULL, NULL, NULL, NULL, 1, NULL, NULL, NULL),
(29, 'ada@gmail.com', NULL, '$2a$12$jLvnARa1H1FsWgEIhVUeu.Iebb0nkCEdd4rd08xaVboldiFTizXzC', 'ondo', 'ada', '077654321', 1, 'actif', '2025-08-21 21:46:10', '2025-08-26 10:44:12', NULL, 0, NULL, 0, 0, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL),
(30, 'tata@gmail.com', NULL, '$2a$12$mNjUMMKYplzCTNMEm5CbWehN4g.WAwsO.luaMO3OnjuuiI6LjWYVO', 'jean', 'ada', '077654321', 1, 'actif', '2025-08-21 23:26:58', '2025-09-08 07:36:09', NULL, 0, NULL, 0, 0, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL),
(44, 'mama@gmail.com', '/uploads/profiles/profile_44_1757607747741.jpg', '$2a$12$GT6ObQdnFum2y/2BHbNNleFpKH23wOCIM9rWS.1I5ZM5cQ8WvEy5e', 'TATI', 'MAMA', '076543212', 1, 'actif', '2025-08-26 10:45:13', '2025-09-12 15:33:26', NULL, 0, NULL, 0, 0, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL),
(47, 'zigh@gmail.com', '/uploads/profiles/profile_47_1757631409031.jpg', '$2a$12$bc0BldMH3JA8llEM3uyDROfAxXceBHbK6QPzUQD6ZmX4/aeloRRuK', 'Administrateur', 'Jordy', '0000000000', 3, 'actif', '2025-08-28 09:36:48', '2025-09-11 22:44:26', NULL, 0, NULL, 1, 0, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL),
(51, 'zightidiane@gmail.com', NULL, '$2a$12$t7Zp4h9vfW.FZ2YD9j.4X.ESG92WP9Wdkw9RrJie7P06y8/KGVwH.', 'nana', 'tata', '074233456', 1, 'actif', '2025-08-28 15:37:23', '2025-08-28 15:58:34', NULL, 0, NULL, 0, 0, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL),
(52, 'ketsia@gmail.com', NULL, '$2a$12$SpM0e06aUbof4zfddFlfoePp8ugfFea9JGxJzxWAt.EEb2jVmemxS', 'MOUSSAVOU', 'ketsia', '077654325', 2, 'actif', '2025-09-03 12:16:11', '2025-09-07 20:58:26', NULL, 0, NULL, 0, 0, 0, NULL, NULL, NULL, NULL, 1, NULL, NULL, NULL),
(53, 'kati@gmail.com', NULL, '$2a$12$8sV8QVjR8YCrBy9ZV9Tc2uKY9iWnpW5cuB/ntcOgX.6CgUfEVvmJK', 'MOUSSAVOU', 'kati', '077654325', 2, 'actif', '2025-09-03 12:18:43', '2025-09-15 15:40:52', NULL, 0, NULL, 0, 0, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL),
(54, 'popo@gmail.com', NULL, '$2a$12$YKXotgcF/vEgaM9mRCP7Je6sVzG.rP59zDz05LLGRLVAr5z06tv9a', 'MUYJFH', 'JHGF', '098765', 2, 'actif', '2025-09-03 13:37:52', '2025-09-03 13:43:25', NULL, 0, NULL, 0, 0, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL),
(56, 'zighcheick@gmail.com', NULL, '$2a$12$a3KGUhgvq0fUqJTeCnNuDub5DHBBDzLUSTNtksOFrsQDt/sL6oZPm', 'zigh', 'jordy', '074297882', 1, 'actif', '2025-09-14 17:08:00', '2025-09-14 17:53:18', NULL, 0, NULL, 0, 0, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL),
(71, 'zighjordy@gmail.com', 'https://lh3.googleusercontent.com/a/ACg8ocKPybxJK8OIK7lpT2TzquR5rKvadAIn4r5tvgyXppo5g3lTcQ=s96-c', '.r2ec17qekufmfkxyxp4', 'zigh', 'Jordy', NULL, 1, 'actif', '2025-09-15 09:48:46', '2025-09-15 09:48:46', NULL, 0, NULL, 1, 0, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `utilisateurs_segments`
--

CREATE TABLE `utilisateurs_segments` (
  `id` int(11) NOT NULL,
  `utilisateur_id` int(11) NOT NULL,
  `segment_id` int(11) NOT NULL,
  `date_ajout` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `utilisateurs_temp`
--

CREATE TABLE `utilisateurs_temp` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `verification_code` varchar(6) NOT NULL,
  `code_expires_at` datetime NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `utilisations_coupons`
--

CREATE TABLE `utilisations_coupons` (
  `id` int(11) NOT NULL,
  `coupon_id` int(11) NOT NULL,
  `utilisateur_id` int(11) NOT NULL,
  `montant_reduction` decimal(10,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Triggers `utilisations_coupons`
--
DELIMITER $$
CREATE TRIGGER `update_coupon_usage` AFTER INSERT ON `utilisations_coupons` FOR EACH ROW BEGIN
    UPDATE coupons_reduction 
    SET utilisations_actuelles = utilisations_actuelles + 1
    WHERE id = NEW.coupon_id;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `valeurs_attributs`
--

CREATE TABLE `valeurs_attributs` (
  `id` int(11) NOT NULL,
  `attribut_id` int(11) NOT NULL,
  `valeur` varchar(100) NOT NULL,
  `code_couleur` varchar(7) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `valeurs_attributs`
--

INSERT INTO `valeurs_attributs` (`id`, `attribut_id`, `valeur`, `code_couleur`) VALUES
(1, 1, 'Rouge', '#FF0000'),
(2, 1, 'Bleu', '#0000FF'),
(3, 1, 'Vert', '#00FF00'),
(4, 2, 'S', NULL),
(5, 2, 'M', NULL),
(6, 2, 'L', NULL),
(7, 2, 'XL', NULL),
(8, 3, 'Coton', NULL),
(9, 3, 'Polyester', NULL),
(10, 3, 'Laine', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `variantes_produits`
--

CREATE TABLE `variantes_produits` (
  `id` int(11) NOT NULL,
  `produit_id` int(11) NOT NULL,
  `nom_variante` varchar(100) NOT NULL,
  `valeur_variante` varchar(100) NOT NULL,
  `prix_supplement` decimal(10,2) DEFAULT 0.00,
  `stock_variante` int(11) DEFAULT 0,
  `sku` varchar(100) DEFAULT NULL,
  `image_variante` varchar(255) DEFAULT NULL,
  `actif` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `vues_produits_detaillees`
--

CREATE TABLE `vues_produits_detaillees` (
  `id` int(11) NOT NULL,
  `produit_id` int(11) NOT NULL,
  `utilisateur_id` int(11) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `referrer` varchar(500) DEFAULT NULL,
  `timestamp` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `vues_produits_detaillees`
--

INSERT INTO `vues_produits_detaillees` (`id`, `produit_id`, `utilisateur_id`, `ip_address`, `user_agent`, `referrer`, `timestamp`) VALUES
(1, 10, NULL, '::1', 'Mozilla/5.0 (Windows NT; Windows NT 10.0; fr-FR) WindowsPowerShell/5.1.26100.5074', NULL, '2025-09-03 05:33:51'),
(2, 10, NULL, '::1', 'Mozilla/5.0 (Windows NT; Windows NT 10.0; fr-FR) WindowsPowerShell/5.1.26100.5074', NULL, '2025-09-03 05:34:18'),
(3, 10, NULL, '127.0.0.1', 'Test Agent', NULL, '2025-09-03 05:34:50'),
(4, 10, NULL, '::1', 'Mozilla/5.0 (Windows NT; Windows NT 10.0; fr-FR) WindowsPowerShell/5.1.26100.5074', NULL, '2025-09-03 05:35:20'),
(5, 10, NULL, '::1', 'axios/1.11.0', NULL, '2025-09-03 05:36:26'),
(6, 10, NULL, '::1', 'axios/1.11.0', NULL, '2025-09-03 05:41:52'),
(7, 10, NULL, '::1', 'axios/1.11.0', NULL, '2025-09-03 05:49:31'),
(8, 10, NULL, '::1', 'axios/1.11.0', NULL, '2025-09-03 05:50:41'),
(9, 10, NULL, '::1', 'axios/1.11.0', NULL, '2025-09-03 05:51:56'),
(10, 10, NULL, '::1', 'axios/1.11.0', NULL, '2025-09-03 06:00:10'),
(11, 17, 44, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0', NULL, '2025-09-03 10:02:09'),
(12, 17, 44, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0', NULL, '2025-09-03 10:44:58'),
(13, 17, 44, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0', NULL, '2025-09-03 11:17:40'),
(14, 17, 44, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0', NULL, '2025-09-03 11:18:34'),
(15, 17, 44, '::1', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 Edg/139.0.0.0', NULL, '2025-09-03 11:59:34'),
(16, 17, 44, '::1', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 Edg/139.0.0.0', NULL, '2025-09-03 12:00:58'),
(17, 17, 44, '::1', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 Edg/139.0.0.0', NULL, '2025-09-03 12:04:58'),
(18, 17, 44, '::1', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 Edg/139.0.0.0', NULL, '2025-09-03 12:05:18'),
(19, 17, 44, '::1', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 Edg/139.0.0.0', NULL, '2025-09-03 12:05:32'),
(20, 17, 44, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0', NULL, '2025-09-03 12:33:42');

-- --------------------------------------------------------

--
-- Stand-in structure for view `vue_produits_complets`
-- (See below for the actual view)
--
CREATE TABLE `vue_produits_complets` (
`id` int(11)
,`fournisseur_id` int(11)
,`categorie_id` int(11)
,`nom` varchar(255)
,`marque` varchar(100)
,`reference_produit` varchar(100)
,`slug` varchar(255)
,`description` text
,`description_longue` text
,`fonctionnalites` text
,`instructions_utilisation` text
,`materiaux` text
,`couleurs_disponibles` longtext
,`certifications` longtext
,`delai_traitement` int(11)
,`capacite_approvisionnement` int(11)
,`port_depart` varchar(100)
,`delai_livraison_estime` varchar(100)
,`politique_retour` text
,`garantie` text
,`video_url` varchar(255)
,`prix_unitaire` decimal(10,2)
,`note_moyenne` decimal(2,1)
,`nombre_avis` int(11)
,`moq` int(11)
,`stock_disponible` int(11)
,`unite` varchar(50)
,`poids` decimal(8,2)
,`dimensions` varchar(100)
,`statut` enum('actif','inactif','suspendu')
,`featured` tinyint(1)
,`created_at` timestamp
,`updated_at` timestamp
,`statut_moderation` enum('en_attente','approuve','rejete','revision_requise')
,`moderated_by` int(11)
,`moderated_at` timestamp
,`moderation_notes` text
,`rejection_reason` text
,`signalements_count` int(11)
,`last_signalement` timestamp
,`admin_notes` text
,`categorie_nom` varchar(100)
,`categorie_slug` varchar(100)
,`entreprise_nom` varchar(255)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `vue_produits_en_offre`
-- (See below for the actual view)
--
CREATE TABLE `vue_produits_en_offre` (
`id` int(11)
,`fournisseur_id` int(11)
,`categorie_id` int(11)
,`nom` varchar(255)
,`marque` varchar(100)
,`reference_produit` varchar(100)
,`slug` varchar(255)
,`description` text
,`description_longue` text
,`fonctionnalites` text
,`instructions_utilisation` text
,`materiaux` text
,`couleurs_disponibles` longtext
,`certifications` longtext
,`delai_traitement` int(11)
,`capacite_approvisionnement` int(11)
,`port_depart` varchar(100)
,`delai_livraison_estime` varchar(100)
,`politique_retour` text
,`garantie` text
,`video_url` varchar(255)
,`prix_unitaire` decimal(10,2)
,`note_moyenne` decimal(2,1)
,`nombre_avis` int(11)
,`moq` int(11)
,`stock_disponible` int(11)
,`unite` varchar(50)
,`poids` decimal(8,2)
,`dimensions` varchar(100)
,`statut` enum('actif','inactif','suspendu')
,`featured` tinyint(1)
,`created_at` timestamp
,`updated_at` timestamp
,`statut_moderation` enum('en_attente','approuve','rejete','revision_requise')
,`moderated_by` int(11)
,`moderated_at` timestamp
,`moderation_notes` text
,`rejection_reason` text
,`signalements_count` int(11)
,`last_signalement` timestamp
,`admin_notes` text
,`prix_promo` decimal(10,2)
,`date_debut_promo` datetime
,`date_fin_promo` datetime
,`pourcentage_reduction` decimal(5,2)
,`est_en_offre` tinyint(1)
,`type_offre` enum('reduction','flash_sale','bundle','clearance')
,`quantite_offre` int(11)
,`vues_30j` int(11)
,`ventes_30j` int(11)
,`score_popularite` decimal(5,2)
,`derniere_activite` datetime
,`fournisseur_nom` varchar(255)
,`categorie_nom` varchar(100)
,`prix_final` decimal(10,2)
,`pourcentage_economie` decimal(17,2)
,`jours_restants` int(8)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `vue_produits_populaires`
-- (See below for the actual view)
--
CREATE TABLE `vue_produits_populaires` (
`id` int(11)
,`fournisseur_id` int(11)
,`categorie_id` int(11)
,`nom` varchar(255)
,`marque` varchar(100)
,`reference_produit` varchar(100)
,`slug` varchar(255)
,`description` text
,`description_longue` text
,`fonctionnalites` text
,`instructions_utilisation` text
,`materiaux` text
,`couleurs_disponibles` longtext
,`certifications` longtext
,`delai_traitement` int(11)
,`capacite_approvisionnement` int(11)
,`port_depart` varchar(100)
,`delai_livraison_estime` varchar(100)
,`politique_retour` text
,`garantie` text
,`video_url` varchar(255)
,`prix_unitaire` decimal(10,2)
,`note_moyenne` decimal(2,1)
,`nombre_avis` int(11)
,`moq` int(11)
,`stock_disponible` int(11)
,`unite` varchar(50)
,`poids` decimal(8,2)
,`dimensions` varchar(100)
,`statut` enum('actif','inactif','suspendu')
,`featured` tinyint(1)
,`created_at` timestamp
,`updated_at` timestamp
,`statut_moderation` enum('en_attente','approuve','rejete','revision_requise')
,`moderated_by` int(11)
,`moderated_at` timestamp
,`moderation_notes` text
,`rejection_reason` text
,`signalements_count` int(11)
,`last_signalement` timestamp
,`admin_notes` text
,`prix_promo` decimal(10,2)
,`date_debut_promo` datetime
,`date_fin_promo` datetime
,`pourcentage_reduction` decimal(5,2)
,`est_en_offre` tinyint(1)
,`type_offre` enum('reduction','flash_sale','bundle','clearance')
,`quantite_offre` int(11)
,`vues_30j` int(11)
,`ventes_30j` int(11)
,`score_popularite` decimal(5,2)
,`derniere_activite` datetime
,`fournisseur_nom` varchar(255)
,`categorie_nom` varchar(100)
,`prix_final` decimal(10,2)
);

-- --------------------------------------------------------

--
-- Table structure for table `zones_livraison`
--

CREATE TABLE `zones_livraison` (
  `id` int(11) NOT NULL,
  `transporteur_id` int(11) NOT NULL,
  `nom` varchar(100) NOT NULL,
  `pays` varchar(100) NOT NULL,
  `code_postal_debut` varchar(10) DEFAULT NULL,
  `code_postal_fin` varchar(10) DEFAULT NULL,
  `prix_base` decimal(10,2) NOT NULL,
  `prix_par_kg` decimal(10,2) DEFAULT 0.00,
  `delai_livraison_min` int(11) DEFAULT 1,
  `delai_livraison_max` int(11) DEFAULT 7
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `abonnements`
--
ALTER TABLE `abonnements`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `admin_audit_logs`
--
ALTER TABLE `admin_audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_audit_admin_id` (`admin_id`),
  ADD KEY `idx_audit_date` (`created_at`),
  ADD KEY `idx_audit_action` (`action`),
  ADD KEY `idx_audit_table` (`table_name`);

--
-- Indexes for table `admin_notifications`
--
ALTER TABLE `admin_notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_admin_notifications_admin_id` (`admin_id`),
  ADD KEY `idx_admin_notifications_read` (`is_read`),
  ADD KEY `idx_admin_notifications_priority` (`priority`),
  ADD KEY `idx_admin_notifications_date` (`created_at`),
  ADD KEY `idx_category` (`category`);

--
-- Indexes for table `admin_sessions`
--
ALTER TABLE `admin_sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_admin_sessions_admin_id` (`admin_id`),
  ADD KEY `idx_admin_sessions_expires` (`expires_at`),
  ADD KEY `idx_admin_sessions_active` (`is_active`);

--
-- Indexes for table `admin_statistics_cache`
--
ALTER TABLE `admin_statistics_cache`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_metric_period` (`metric_name`,`period_type`,`period_date`),
  ADD KEY `idx_stats_cache_metric` (`metric_name`),
  ADD KEY `idx_stats_cache_period` (`period_type`,`period_date`),
  ADD KEY `idx_stats_cache_expires` (`expires_at`);

--
-- Indexes for table `adresses`
--
ALTER TABLE `adresses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `utilisateur_id` (`utilisateur_id`);

--
-- Indexes for table `articles_blog`
--
ALTER TABLE `articles_blog`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD KEY `idx_articles_slug` (`slug`),
  ADD KEY `idx_articles_categorie` (`categorie`),
  ADD KEY `idx_articles_auteur` (`auteur_id`),
  ADD KEY `idx_articles_publication` (`est_publie`,`date_publication`),
  ADD KEY `idx_articles_une` (`est_a_la_une`,`est_publie`),
  ADD KEY `idx_articles_popularite` (`nombre_vues` DESC,`nombre_likes` DESC);

--
-- Indexes for table `attributs`
--
ALTER TABLE `attributs`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `audit_trail`
--
ALTER TABLE `audit_trail`
  ADD PRIMARY KEY (`id`),
  ADD KEY `utilisateur_id` (`utilisateur_id`),
  ADD KEY `idx_audit_trail_table` (`table_name`,`record_id`);

--
-- Indexes for table `avis`
--
ALTER TABLE `avis`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fournisseur_id` (`fournisseur_id`),
  ADD KEY `avis_ibfk_1` (`acheteur_id`);

--
-- Indexes for table `avis_produits`
--
ALTER TABLE `avis_produits`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_product_review` (`produit_id`,`utilisateur_id`),
  ADD KEY `idx_avis_produit` (`produit_id`),
  ADD KEY `idx_avis_utilisateur` (`utilisateur_id`),
  ADD KEY `idx_statut` (`statut`),
  ADD KEY `idx_produit_statut` (`produit_id`,`statut`),
  ADD KEY `idx_date_creation` (`date_creation`);

--
-- Indexes for table `avis_produits_ameliore`
--
ALTER TABLE `avis_produits_ameliore`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_product_review` (`produit_id`,`utilisateur_id`),
  ADD KEY `utilisateur_id` (`utilisateur_id`),
  ADD KEY `moderateur_id` (`moderateur_id`),
  ADD KEY `idx_statut` (`statut`),
  ADD KEY `idx_produit_statut` (`produit_id`,`statut`),
  ADD KEY `idx_date_creation` (`date_creation`);

--
-- Indexes for table `campagnes_marketing`
--
ALTER TABLE `campagnes_marketing`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD KEY `parent_id` (`parent_id`);

--
-- Indexes for table `certifications`
--
ALTER TABLE `certifications`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `certifications_produits`
--
ALTER TABLE `certifications_produits`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_certifications_produit` (`produit_id`);

--
-- Indexes for table `conditions_commerciales`
--
ALTER TABLE `conditions_commerciales`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_conditions_produit` (`produit_id`);

--
-- Indexes for table `conversations`
--
ALTER TABLE `conversations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `acheteur_id` (`acheteur_id`),
  ADD KEY `fournisseur_id` (`fournisseur_id`),
  ADD KEY `produit_id` (`produit_id`),
  ADD KEY `idx_conversations_derniere_activite` (`derniere_activite`),
  ADD KEY `idx_conversations_archivee` (`archivee`),
  ADD KEY `idx_conversations_priorite` (`priorite`);

--
-- Indexes for table `conversation_participants`
--
ALTER TABLE `conversation_participants`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_participant` (`conversation_id`,`utilisateur_id`),
  ADD KEY `utilisateur_id` (`utilisateur_id`);

--
-- Indexes for table `coupons_reduction`
--
ALTER TABLE `coupons_reduction`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`),
  ADD KEY `fournisseur_id` (`fournisseur_id`);

--
-- Indexes for table `devis`
--
ALTER TABLE `devis`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `numero_devis` (`numero_devis`),
  ADD KEY `acheteur_id` (`acheteur_id`),
  ADD KEY `fournisseur_id` (`fournisseur_id`),
  ADD KEY `produit_id` (`produit_id`);

--
-- Indexes for table `devises`
--
ALTER TABLE `devises`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indexes for table `documents_entreprise`
--
ALTER TABLE `documents_entreprise`
  ADD PRIMARY KEY (`id`),
  ADD KEY `entreprise_id` (`entreprise_id`);

--
-- Indexes for table `documents_utilisateur`
--
ALTER TABLE `documents_utilisateur`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_utilisateur_id` (`utilisateur_id`),
  ADD KEY `idx_statut_validation` (`statut_validation`),
  ADD KEY `idx_type_document` (`type_document`),
  ADD KEY `idx_date_soumission` (`date_soumission`);

--
-- Indexes for table `email_notifications`
--
ALTER TABLE `email_notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_utilisateur_id` (`utilisateur_id`),
  ADD KEY `idx_statut_envoi` (`statut_envoi`),
  ADD KEY `idx_type_notification` (`type_notification`),
  ADD KEY `idx_date_creation` (`date_creation`);

--
-- Indexes for table `encheres`
--
ALTER TABLE `encheres`
  ADD PRIMARY KEY (`id`),
  ADD KEY `acheteur_id` (`acheteur_id`),
  ADD KEY `produit_id` (`produit_id`);

--
-- Indexes for table `entreprises`
--
ALTER TABLE `entreprises`
  ADD PRIMARY KEY (`id`),
  ADD KEY `utilisateur_id` (`utilisateur_id`),
  ADD KEY `idx_entreprise_secteur` (`secteur_activite_id`),
  ADD KEY `idx_entreprise_type` (`type_entreprise_id`);

--
-- Indexes for table `etapes_inscription`
--
ALTER TABLE `etapes_inscription`
  ADD PRIMARY KEY (`id`),
  ADD KEY `entreprise_id` (`entreprise_id`);

--
-- Indexes for table `evenements_commerciaux`
--
ALTER TABLE `evenements_commerciaux`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_evenements_type` (`type`),
  ADD KEY `idx_evenements_dates` (`date_debut`,`date_fin`),
  ADD KEY `idx_evenements_organisateur` (`organisateur_id`),
  ADD KEY `idx_evenements_statut` (`statut`,`est_actif`),
  ADD KEY `idx_evenements_popularite` (`est_populaire`,`date_debut`);

--
-- Indexes for table `favoris`
--
ALTER TABLE `favoris`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_favori` (`utilisateur_id`,`produit_id`),
  ADD KEY `produit_id` (`produit_id`),
  ADD KEY `idx_favoris_utilisateur` (`utilisateur_id`);

--
-- Indexes for table `fournisseurs_abonnements`
--
ALTER TABLE `fournisseurs_abonnements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fournisseur_id` (`fournisseur_id`),
  ADD KEY `abonnement_id` (`abonnement_id`);

--
-- Indexes for table `fournisseurs_certifications`
--
ALTER TABLE `fournisseurs_certifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fournisseur_id` (`fournisseur_id`),
  ADD KEY `certification_id` (`certification_id`);

--
-- Indexes for table `gdpr_consentements`
--
ALTER TABLE `gdpr_consentements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `utilisateur_id` (`utilisateur_id`);

--
-- Indexes for table `historique_prix`
--
ALTER TABLE `historique_prix`
  ADD PRIMARY KEY (`id`),
  ADD KEY `produit_id` (`produit_id`);

--
-- Indexes for table `images_produits`
--
ALTER TABLE `images_produits`
  ADD PRIMARY KEY (`id`),
  ADD KEY `produit_id` (`produit_id`);

--
-- Indexes for table `langues`
--
ALTER TABLE `langues`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indexes for table `logs_activite`
--
ALTER TABLE `logs_activite`
  ADD PRIMARY KEY (`id`),
  ADD KEY `utilisateur_id` (`utilisateur_id`);

--
-- Indexes for table `logs_admin`
--
ALTER TABLE `logs_admin`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_admin_logs_admin_id` (`admin_id`),
  ADD KEY `idx_admin_logs_date` (`created_at`),
  ADD KEY `idx_admin_logs_action` (`action`);

--
-- Indexes for table `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `expediteur_id` (`expediteur_id`),
  ADD KEY `idx_messages_conversation` (`conversation_id`),
  ADD KEY `idx_messages_type` (`type`),
  ADD KEY `idx_messages_created_at` (`created_at`),
  ADD KEY `idx_messages_lu` (`lu`),
  ADD KEY `fk_message_parent` (`message_parent_id`);

--
-- Indexes for table `message_attachments`
--
ALTER TABLE `message_attachments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_message_id` (`message_id`);

--
-- Indexes for table `message_files`
--
ALTER TABLE `message_files`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_message_files_message_id` (`message_id`);

--
-- Indexes for table `message_notifications`
--
ALTER TABLE `message_notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_message_id` (`message_id`),
  ADD KEY `idx_conversation_id` (`conversation_id`),
  ADD KEY `idx_is_read` (`is_read`);

--
-- Indexes for table `message_reactions`
--
ALTER TABLE `message_reactions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_reaction` (`message_id`,`utilisateur_id`,`emoji`),
  ADD KEY `utilisateur_id` (`utilisateur_id`);

--
-- Indexes for table `message_read_status`
--
ALTER TABLE `message_read_status`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_read_status` (`message_id`,`user_id`),
  ADD KEY `idx_message_id` (`message_id`),
  ADD KEY `idx_user_id` (`user_id`);

--
-- Indexes for table `methodes_livraison_produit`
--
ALTER TABLE `methodes_livraison_produit`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_livraison_produit` (`produit_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_notifications_utilisateur` (`utilisateur_id`),
  ADD KEY `idx_notifications_lu` (`lu`),
  ADD KEY `idx_category` (`category`),
  ADD KEY `idx_priority` (`priority`),
  ADD KEY `idx_related_user` (`related_user_id`),
  ADD KEY `idx_related_product` (`related_product_id`),
  ADD KEY `idx_related_conversation` (`related_conversation_id`),
  ADD KEY `idx_related_order` (`related_order_id`);

--
-- Indexes for table `offres_encheres`
--
ALTER TABLE `offres_encheres`
  ADD PRIMARY KEY (`id`),
  ADD KEY `enchere_id` (`enchere_id`),
  ADD KEY `fournisseur_id` (`fournisseur_id`);

--
-- Indexes for table `parametres_site`
--
ALTER TABLE `parametres_site`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `cle` (`cle`);

--
-- Indexes for table `participants_evenements`
--
ALTER TABLE `participants_evenements`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_participant_evenement` (`evenement_id`,`utilisateur_id`),
  ADD KEY `idx_participants_evenement` (`evenement_id`),
  ADD KEY `idx_participants_utilisateur` (`utilisateur_id`);

--
-- Indexes for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `token` (`token`),
  ADD KEY `utilisateur_id` (`utilisateur_id`),
  ADD KEY `idx_token` (`token`),
  ADD KEY `idx_expires` (`expires_at`),
  ADD KEY `idx_used` (`used`);

--
-- Indexes for table `photos_entreprise`
--
ALTER TABLE `photos_entreprise`
  ADD PRIMARY KEY (`id`),
  ADD KEY `entreprise_id` (`entreprise_id`);

--
-- Indexes for table `prix_degressifs`
--
ALTER TABLE `prix_degressifs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_prix_degressifs_produit` (`produit_id`);

--
-- Indexes for table `product_reports`
--
ALTER TABLE `product_reports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `reporter_id` (`reporter_id`),
  ADD KEY `handled_by` (`handled_by`),
  ADD KEY `idx_reports_product` (`product_id`),
  ADD KEY `idx_reports_status` (`status`),
  ADD KEY `idx_reports_date` (`created_at`);

--
-- Indexes for table `produits`
--
ALTER TABLE `produits`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_produits_fournisseur` (`fournisseur_id`),
  ADD KEY `idx_produits_categorie` (`categorie_id`),
  ADD KEY `idx_products_moderation` (`statut_moderation`),
  ADD KEY `idx_products_signalements` (`signalements_count`),
  ADD KEY `idx_products_moderated_date` (`moderated_at`),
  ADD KEY `fk_products_moderated_by` (`moderated_by`),
  ADD KEY `idx_produits_offres` (`est_en_offre`,`date_fin_promo`),
  ADD KEY `idx_produits_popularite` (`score_popularite` DESC,`vues_30j` DESC),
  ADD KEY `idx_produits_activite` (`derniere_activite` DESC),
  ADD KEY `idx_produits_ventes_30j` (`ventes_30j` DESC);

--
-- Indexes for table `produits_attributs`
--
ALTER TABLE `produits_attributs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `produit_id` (`produit_id`),
  ADD KEY `valeur_attribut_id` (`valeur_attribut_id`);

--
-- Indexes for table `recommandations`
--
ALTER TABLE `recommandations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `utilisateur_id` (`utilisateur_id`),
  ADD KEY `produit_id` (`produit_id`);

--
-- Indexes for table `reponses_avis`
--
ALTER TABLE `reponses_avis`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_reponses_avis` (`avis_id`),
  ADD KEY `idx_reponses_fournisseur` (`fournisseur_id`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nom` (`nom`);

--
-- Indexes for table `secteurs_activite`
--
ALTER TABLE `secteurs_activite`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `segments_clients`
--
ALTER TABLE `segments_clients`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `seo_meta`
--
ALTER TABLE `seo_meta`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `sessions_utilisateurs`
--
ALTER TABLE `sessions_utilisateurs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sessions_utilisateur` (`utilisateur_id`);

--
-- Indexes for table `signalements_avis`
--
ALTER TABLE `signalements_avis`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_signalements_avis` (`avis_id`),
  ADD KEY `idx_signalements_utilisateur` (`utilisateur_id`);

--
-- Indexes for table `specifications_techniques`
--
ALTER TABLE `specifications_techniques`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_specifications_produit` (`produit_id`);

--
-- Indexes for table `statistiques_produits`
--
ALTER TABLE `statistiques_produits`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_produit_date` (`produit_id`,`date`),
  ADD KEY `idx_stats_produit` (`produit_id`),
  ADD KEY `idx_stats_date` (`date`);

--
-- Indexes for table `statistiques_vues`
--
ALTER TABLE `statistiques_vues`
  ADD PRIMARY KEY (`id`),
  ADD KEY `utilisateur_id` (`utilisateur_id`),
  ADD KEY `idx_statistiques_vues` (`table_name`,`record_id`);

--
-- Indexes for table `system_messages`
--
ALTER TABLE `system_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_created_by` (`created_by`),
  ADD KEY `idx_target_audience` (`target_audience`),
  ADD KEY `idx_is_active` (`is_active`),
  ADD KEY `idx_expires_at` (`expires_at`);

--
-- Indexes for table `system_message_reads`
--
ALTER TABLE `system_message_reads`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_system_read` (`system_message_id`,`user_id`),
  ADD KEY `idx_system_message_id` (`system_message_id`),
  ADD KEY `idx_user_id` (`user_id`);

--
-- Indexes for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `setting_key` (`setting_key`),
  ADD KEY `updated_by` (`updated_by`),
  ADD KEY `idx_settings_key` (`setting_key`),
  ADD KEY `idx_settings_category` (`category`);

--
-- Indexes for table `tentatives_connexion`
--
ALTER TABLE `tentatives_connexion`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `traductions`
--
ALTER TABLE `traductions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `langue_id` (`langue_id`);

--
-- Indexes for table `transporteurs`
--
ALTER TABLE `transporteurs`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `types_entreprise`
--
ALTER TABLE `types_entreprise`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `typing_indicators`
--
ALTER TABLE `typing_indicators`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_typing` (`conversation_id`,`utilisateur_id`),
  ADD KEY `utilisateur_id` (`utilisateur_id`),
  ADD KEY `idx_typing_indicators_conversation` (`conversation_id`);

--
-- Indexes for table `utilisateurs`
--
ALTER TABLE `utilisateurs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_utilisateurs_email` (`email`),
  ADD KEY `idx_utilisateurs_role` (`role_id`),
  ADD KEY `idx_users_role_status` (`role_id`,`statut`),
  ADD KEY `idx_users_email_verified` (`email_verified`),
  ADD KEY `idx_users_last_login` (`last_login`),
  ADD KEY `fk_users_suspended_by` (`suspended_by`),
  ADD KEY `idx_photo_profil` (`photo_profil`),
  ADD KEY `idx_email_verified` (`email_verified`),
  ADD KEY `idx_email_verification_token` (`email_verification_token`);

--
-- Indexes for table `utilisateurs_segments`
--
ALTER TABLE `utilisateurs_segments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `utilisateur_id` (`utilisateur_id`),
  ADD KEY `segment_id` (`segment_id`);

--
-- Indexes for table `utilisateurs_temp`
--
ALTER TABLE `utilisateurs_temp`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_code` (`verification_code`),
  ADD KEY `idx_expires` (`code_expires_at`);

--
-- Indexes for table `utilisations_coupons`
--
ALTER TABLE `utilisations_coupons`
  ADD PRIMARY KEY (`id`),
  ADD KEY `coupon_id` (`coupon_id`),
  ADD KEY `utilisateur_id` (`utilisateur_id`);

--
-- Indexes for table `valeurs_attributs`
--
ALTER TABLE `valeurs_attributs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `attribut_id` (`attribut_id`);

--
-- Indexes for table `variantes_produits`
--
ALTER TABLE `variantes_produits`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_variantes_produit` (`produit_id`);

--
-- Indexes for table `vues_produits_detaillees`
--
ALTER TABLE `vues_produits_detaillees`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_vues_produit` (`produit_id`),
  ADD KEY `idx_vues_utilisateur` (`utilisateur_id`),
  ADD KEY `idx_vues_timestamp` (`timestamp`);

--
-- Indexes for table `zones_livraison`
--
ALTER TABLE `zones_livraison`
  ADD PRIMARY KEY (`id`),
  ADD KEY `transporteur_id` (`transporteur_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `abonnements`
--
ALTER TABLE `abonnements`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `admin_audit_logs`
--
ALTER TABLE `admin_audit_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `admin_notifications`
--
ALTER TABLE `admin_notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `admin_statistics_cache`
--
ALTER TABLE `admin_statistics_cache`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `adresses`
--
ALTER TABLE `adresses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `articles_blog`
--
ALTER TABLE `articles_blog`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `attributs`
--
ALTER TABLE `attributs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `audit_trail`
--
ALTER TABLE `audit_trail`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `avis`
--
ALTER TABLE `avis`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `avis_produits`
--
ALTER TABLE `avis_produits`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `avis_produits_ameliore`
--
ALTER TABLE `avis_produits_ameliore`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `campagnes_marketing`
--
ALTER TABLE `campagnes_marketing`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=180;

--
-- AUTO_INCREMENT for table `certifications`
--
ALTER TABLE `certifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `certifications_produits`
--
ALTER TABLE `certifications_produits`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `conditions_commerciales`
--
ALTER TABLE `conditions_commerciales`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `conversations`
--
ALTER TABLE `conversations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=44;

--
-- AUTO_INCREMENT for table `conversation_participants`
--
ALTER TABLE `conversation_participants`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `coupons_reduction`
--
ALTER TABLE `coupons_reduction`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `devis`
--
ALTER TABLE `devis`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `devises`
--
ALTER TABLE `devises`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `documents_entreprise`
--
ALTER TABLE `documents_entreprise`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `documents_utilisateur`
--
ALTER TABLE `documents_utilisateur`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `email_notifications`
--
ALTER TABLE `email_notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `encheres`
--
ALTER TABLE `encheres`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `entreprises`
--
ALTER TABLE `entreprises`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `etapes_inscription`
--
ALTER TABLE `etapes_inscription`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `evenements_commerciaux`
--
ALTER TABLE `evenements_commerciaux`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `favoris`
--
ALTER TABLE `favoris`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `fournisseurs_abonnements`
--
ALTER TABLE `fournisseurs_abonnements`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `fournisseurs_certifications`
--
ALTER TABLE `fournisseurs_certifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `gdpr_consentements`
--
ALTER TABLE `gdpr_consentements`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `historique_prix`
--
ALTER TABLE `historique_prix`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `images_produits`
--
ALTER TABLE `images_produits`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT for table `langues`
--
ALTER TABLE `langues`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `logs_activite`
--
ALTER TABLE `logs_activite`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `logs_admin`
--
ALTER TABLE `logs_admin`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `messages`
--
ALTER TABLE `messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT for table `message_attachments`
--
ALTER TABLE `message_attachments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `message_files`
--
ALTER TABLE `message_files`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `message_notifications`
--
ALTER TABLE `message_notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `message_reactions`
--
ALTER TABLE `message_reactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `message_read_status`
--
ALTER TABLE `message_read_status`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `methodes_livraison_produit`
--
ALTER TABLE `methodes_livraison_produit`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=54;

--
-- AUTO_INCREMENT for table `offres_encheres`
--
ALTER TABLE `offres_encheres`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `parametres_site`
--
ALTER TABLE `parametres_site`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `participants_evenements`
--
ALTER TABLE `participants_evenements`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `photos_entreprise`
--
ALTER TABLE `photos_entreprise`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `prix_degressifs`
--
ALTER TABLE `prix_degressifs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `product_reports`
--
ALTER TABLE `product_reports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `produits`
--
ALTER TABLE `produits`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `produits_attributs`
--
ALTER TABLE `produits_attributs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `recommandations`
--
ALTER TABLE `recommandations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reponses_avis`
--
ALTER TABLE `reponses_avis`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `secteurs_activite`
--
ALTER TABLE `secteurs_activite`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=39;

--
-- AUTO_INCREMENT for table `segments_clients`
--
ALTER TABLE `segments_clients`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `seo_meta`
--
ALTER TABLE `seo_meta`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `signalements_avis`
--
ALTER TABLE `signalements_avis`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `specifications_techniques`
--
ALTER TABLE `specifications_techniques`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `statistiques_produits`
--
ALTER TABLE `statistiques_produits`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=61;

--
-- AUTO_INCREMENT for table `statistiques_vues`
--
ALTER TABLE `statistiques_vues`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `system_messages`
--
ALTER TABLE `system_messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `system_message_reads`
--
ALTER TABLE `system_message_reads`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `system_settings`
--
ALTER TABLE `system_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT for table `tentatives_connexion`
--
ALTER TABLE `tentatives_connexion`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `traductions`
--
ALTER TABLE `traductions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `transporteurs`
--
ALTER TABLE `transporteurs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `types_entreprise`
--
ALTER TABLE `types_entreprise`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT for table `typing_indicators`
--
ALTER TABLE `typing_indicators`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `utilisateurs`
--
ALTER TABLE `utilisateurs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=72;

--
-- AUTO_INCREMENT for table `utilisateurs_segments`
--
ALTER TABLE `utilisateurs_segments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `utilisateurs_temp`
--
ALTER TABLE `utilisateurs_temp`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `utilisations_coupons`
--
ALTER TABLE `utilisations_coupons`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `valeurs_attributs`
--
ALTER TABLE `valeurs_attributs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `variantes_produits`
--
ALTER TABLE `variantes_produits`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `vues_produits_detaillees`
--
ALTER TABLE `vues_produits_detaillees`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `zones_livraison`
--
ALTER TABLE `zones_livraison`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

-- --------------------------------------------------------

--
-- Structure for view `vue_produits_complets`
--
DROP TABLE IF EXISTS `vue_produits_complets`;

CREATE ALGORITHM=UNDEFINED DEFINER=`404304`@`%` SQL SECURITY DEFINER VIEW `vue_produits_complets`  AS SELECT `p`.`id` AS `id`, `p`.`fournisseur_id` AS `fournisseur_id`, `p`.`categorie_id` AS `categorie_id`, `p`.`nom` AS `nom`, `p`.`marque` AS `marque`, `p`.`reference_produit` AS `reference_produit`, `p`.`slug` AS `slug`, `p`.`description` AS `description`, `p`.`description_longue` AS `description_longue`, `p`.`fonctionnalites` AS `fonctionnalites`, `p`.`instructions_utilisation` AS `instructions_utilisation`, `p`.`materiaux` AS `materiaux`, `p`.`couleurs_disponibles` AS `couleurs_disponibles`, `p`.`certifications` AS `certifications`, `p`.`delai_traitement` AS `delai_traitement`, `p`.`capacite_approvisionnement` AS `capacite_approvisionnement`, `p`.`port_depart` AS `port_depart`, `p`.`delai_livraison_estime` AS `delai_livraison_estime`, `p`.`politique_retour` AS `politique_retour`, `p`.`garantie` AS `garantie`, `p`.`video_url` AS `video_url`, `p`.`prix_unitaire` AS `prix_unitaire`, `p`.`note_moyenne` AS `note_moyenne`, `p`.`nombre_avis` AS `nombre_avis`, `p`.`moq` AS `moq`, `p`.`stock_disponible` AS `stock_disponible`, `p`.`unite` AS `unite`, `p`.`poids` AS `poids`, `p`.`dimensions` AS `dimensions`, `p`.`statut` AS `statut`, `p`.`featured` AS `featured`, `p`.`created_at` AS `created_at`, `p`.`updated_at` AS `updated_at`, `p`.`statut_moderation` AS `statut_moderation`, `p`.`moderated_by` AS `moderated_by`, `p`.`moderated_at` AS `moderated_at`, `p`.`moderation_notes` AS `moderation_notes`, `p`.`rejection_reason` AS `rejection_reason`, `p`.`signalements_count` AS `signalements_count`, `p`.`last_signalement` AS `last_signalement`, `p`.`admin_notes` AS `admin_notes`, `c`.`nom` AS `categorie_nom`, `c`.`slug` AS `categorie_slug`, `e`.`nom_entreprise` AS `entreprise_nom` FROM ((`produits` `p` left join `categories` `c` on(`p`.`categorie_id` = `c`.`id`)) left join `entreprises` `e` on(`p`.`fournisseur_id` = `e`.`id`)) ;

-- --------------------------------------------------------

--
-- Structure for view `vue_produits_en_offre`
--
DROP TABLE IF EXISTS `vue_produits_en_offre`;

CREATE ALGORITHM=UNDEFINED DEFINER=`404304`@`%` SQL SECURITY DEFINER VIEW `vue_produits_en_offre`  AS SELECT `p`.`id` AS `id`, `p`.`fournisseur_id` AS `fournisseur_id`, `p`.`categorie_id` AS `categorie_id`, `p`.`nom` AS `nom`, `p`.`marque` AS `marque`, `p`.`reference_produit` AS `reference_produit`, `p`.`slug` AS `slug`, `p`.`description` AS `description`, `p`.`description_longue` AS `description_longue`, `p`.`fonctionnalites` AS `fonctionnalites`, `p`.`instructions_utilisation` AS `instructions_utilisation`, `p`.`materiaux` AS `materiaux`, `p`.`couleurs_disponibles` AS `couleurs_disponibles`, `p`.`certifications` AS `certifications`, `p`.`delai_traitement` AS `delai_traitement`, `p`.`capacite_approvisionnement` AS `capacite_approvisionnement`, `p`.`port_depart` AS `port_depart`, `p`.`delai_livraison_estime` AS `delai_livraison_estime`, `p`.`politique_retour` AS `politique_retour`, `p`.`garantie` AS `garantie`, `p`.`video_url` AS `video_url`, `p`.`prix_unitaire` AS `prix_unitaire`, `p`.`note_moyenne` AS `note_moyenne`, `p`.`nombre_avis` AS `nombre_avis`, `p`.`moq` AS `moq`, `p`.`stock_disponible` AS `stock_disponible`, `p`.`unite` AS `unite`, `p`.`poids` AS `poids`, `p`.`dimensions` AS `dimensions`, `p`.`statut` AS `statut`, `p`.`featured` AS `featured`, `p`.`created_at` AS `created_at`, `p`.`updated_at` AS `updated_at`, `p`.`statut_moderation` AS `statut_moderation`, `p`.`moderated_by` AS `moderated_by`, `p`.`moderated_at` AS `moderated_at`, `p`.`moderation_notes` AS `moderation_notes`, `p`.`rejection_reason` AS `rejection_reason`, `p`.`signalements_count` AS `signalements_count`, `p`.`last_signalement` AS `last_signalement`, `p`.`admin_notes` AS `admin_notes`, `p`.`prix_promo` AS `prix_promo`, `p`.`date_debut_promo` AS `date_debut_promo`, `p`.`date_fin_promo` AS `date_fin_promo`, `p`.`pourcentage_reduction` AS `pourcentage_reduction`, `p`.`est_en_offre` AS `est_en_offre`, `p`.`type_offre` AS `type_offre`, `p`.`quantite_offre` AS `quantite_offre`, `p`.`vues_30j` AS `vues_30j`, `p`.`ventes_30j` AS `ventes_30j`, `p`.`score_popularite` AS `score_popularite`, `p`.`derniere_activite` AS `derniere_activite`, `e`.`nom_entreprise` AS `fournisseur_nom`, `c`.`nom` AS `categorie_nom`, CASE `prix_final` ELSE `p`.`prix_unitaire` AS `end` END FROM ((`produits` `p` left join `entreprises` `e` on(`p`.`fournisseur_id` = `e`.`id`)) left join `categories` `c` on(`p`.`categorie_id` = `c`.`id`)) WHERE `p`.`est_en_offre` = 1 AND `p`.`date_fin_promo` > current_timestamp() AND `p`.`statut` = 'actif' ORDER BY `p`.`pourcentage_reduction` DESC, `p`.`date_fin_promo` ASC ;

-- --------------------------------------------------------

--
-- Structure for view `vue_produits_populaires`
--
DROP TABLE IF EXISTS `vue_produits_populaires`;

CREATE ALGORITHM=UNDEFINED DEFINER=`404304`@`%` SQL SECURITY DEFINER VIEW `vue_produits_populaires`  AS SELECT `p`.`id` AS `id`, `p`.`fournisseur_id` AS `fournisseur_id`, `p`.`categorie_id` AS `categorie_id`, `p`.`nom` AS `nom`, `p`.`marque` AS `marque`, `p`.`reference_produit` AS `reference_produit`, `p`.`slug` AS `slug`, `p`.`description` AS `description`, `p`.`description_longue` AS `description_longue`, `p`.`fonctionnalites` AS `fonctionnalites`, `p`.`instructions_utilisation` AS `instructions_utilisation`, `p`.`materiaux` AS `materiaux`, `p`.`couleurs_disponibles` AS `couleurs_disponibles`, `p`.`certifications` AS `certifications`, `p`.`delai_traitement` AS `delai_traitement`, `p`.`capacite_approvisionnement` AS `capacite_approvisionnement`, `p`.`port_depart` AS `port_depart`, `p`.`delai_livraison_estime` AS `delai_livraison_estime`, `p`.`politique_retour` AS `politique_retour`, `p`.`garantie` AS `garantie`, `p`.`video_url` AS `video_url`, `p`.`prix_unitaire` AS `prix_unitaire`, `p`.`note_moyenne` AS `note_moyenne`, `p`.`nombre_avis` AS `nombre_avis`, `p`.`moq` AS `moq`, `p`.`stock_disponible` AS `stock_disponible`, `p`.`unite` AS `unite`, `p`.`poids` AS `poids`, `p`.`dimensions` AS `dimensions`, `p`.`statut` AS `statut`, `p`.`featured` AS `featured`, `p`.`created_at` AS `created_at`, `p`.`updated_at` AS `updated_at`, `p`.`statut_moderation` AS `statut_moderation`, `p`.`moderated_by` AS `moderated_by`, `p`.`moderated_at` AS `moderated_at`, `p`.`moderation_notes` AS `moderation_notes`, `p`.`rejection_reason` AS `rejection_reason`, `p`.`signalements_count` AS `signalements_count`, `p`.`last_signalement` AS `last_signalement`, `p`.`admin_notes` AS `admin_notes`, `p`.`prix_promo` AS `prix_promo`, `p`.`date_debut_promo` AS `date_debut_promo`, `p`.`date_fin_promo` AS `date_fin_promo`, `p`.`pourcentage_reduction` AS `pourcentage_reduction`, `p`.`est_en_offre` AS `est_en_offre`, `p`.`type_offre` AS `type_offre`, `p`.`quantite_offre` AS `quantite_offre`, `p`.`vues_30j` AS `vues_30j`, `p`.`ventes_30j` AS `ventes_30j`, `p`.`score_popularite` AS `score_popularite`, `p`.`derniere_activite` AS `derniere_activite`, `e`.`nom_entreprise` AS `fournisseur_nom`, `c`.`nom` AS `categorie_nom`, CASE `prix_final` ELSE `p`.`prix_unitaire` AS `end` END FROM ((`produits` `p` left join `entreprises` `e` on(`p`.`fournisseur_id` = `e`.`id`)) left join `categories` `c` on(`p`.`categorie_id` = `c`.`id`)) WHERE `p`.`statut` = 'actif' AND `p`.`score_popularite` > 0 ORDER BY `p`.`score_popularite` DESC, `p`.`vues_30j` DESC ;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `admin_audit_logs`
--
ALTER TABLE `admin_audit_logs`
  ADD CONSTRAINT `admin_audit_logs_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `admin_notifications`
--
ALTER TABLE `admin_notifications`
  ADD CONSTRAINT `admin_notifications_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `admin_sessions`
--
ALTER TABLE `admin_sessions`
  ADD CONSTRAINT `admin_sessions_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `adresses`
--
ALTER TABLE `adresses`
  ADD CONSTRAINT `adresses_ibfk_1` FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `audit_trail`
--
ALTER TABLE `audit_trail`
  ADD CONSTRAINT `audit_trail_ibfk_1` FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateurs` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `avis`
--
ALTER TABLE `avis`
  ADD CONSTRAINT `avis_ibfk_1` FOREIGN KEY (`acheteur_id`) REFERENCES `utilisateurs` (`id`),
  ADD CONSTRAINT `avis_ibfk_2` FOREIGN KEY (`fournisseur_id`) REFERENCES `entreprises` (`id`);

--
-- Constraints for table `avis_produits`
--
ALTER TABLE `avis_produits`
  ADD CONSTRAINT `avis_produits_ibfk_1` FOREIGN KEY (`produit_id`) REFERENCES `produits` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `avis_produits_ibfk_2` FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `avis_produits_ameliore`
--
ALTER TABLE `avis_produits_ameliore`
  ADD CONSTRAINT `avis_produits_ameliore_ibfk_1` FOREIGN KEY (`produit_id`) REFERENCES `produits` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `avis_produits_ameliore_ibfk_2` FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `avis_produits_ameliore_ibfk_3` FOREIGN KEY (`moderateur_id`) REFERENCES `utilisateurs` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `categories`
--
ALTER TABLE `categories`
  ADD CONSTRAINT `categories_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `certifications_produits`
--
ALTER TABLE `certifications_produits`
  ADD CONSTRAINT `certifications_produits_ibfk_1` FOREIGN KEY (`produit_id`) REFERENCES `produits` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `conditions_commerciales`
--
ALTER TABLE `conditions_commerciales`
  ADD CONSTRAINT `conditions_commerciales_ibfk_1` FOREIGN KEY (`produit_id`) REFERENCES `produits` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `conversations`
--
ALTER TABLE `conversations`
  ADD CONSTRAINT `conversations_ibfk_1` FOREIGN KEY (`acheteur_id`) REFERENCES `utilisateurs` (`id`),
  ADD CONSTRAINT `conversations_ibfk_2` FOREIGN KEY (`fournisseur_id`) REFERENCES `utilisateurs` (`id`),
  ADD CONSTRAINT `conversations_ibfk_3` FOREIGN KEY (`produit_id`) REFERENCES `produits` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `conversation_participants`
--
ALTER TABLE `conversation_participants`
  ADD CONSTRAINT `conversation_participants_ibfk_1` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `conversation_participants_ibfk_2` FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `coupons_reduction`
--
ALTER TABLE `coupons_reduction`
  ADD CONSTRAINT `coupons_reduction_ibfk_1` FOREIGN KEY (`fournisseur_id`) REFERENCES `entreprises` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `devis`
--
ALTER TABLE `devis`
  ADD CONSTRAINT `devis_ibfk_1` FOREIGN KEY (`acheteur_id`) REFERENCES `utilisateurs` (`id`),
  ADD CONSTRAINT `devis_ibfk_2` FOREIGN KEY (`fournisseur_id`) REFERENCES `entreprises` (`id`),
  ADD CONSTRAINT `devis_ibfk_3` FOREIGN KEY (`produit_id`) REFERENCES `produits` (`id`);

--
-- Constraints for table `documents_entreprise`
--
ALTER TABLE `documents_entreprise`
  ADD CONSTRAINT `documents_entreprise_ibfk_1` FOREIGN KEY (`entreprise_id`) REFERENCES `entreprises` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `documents_utilisateur`
--
ALTER TABLE `documents_utilisateur`
  ADD CONSTRAINT `documents_utilisateur_ibfk_1` FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `email_notifications`
--
ALTER TABLE `email_notifications`
  ADD CONSTRAINT `email_notifications_ibfk_1` FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `encheres`
--
ALTER TABLE `encheres`
  ADD CONSTRAINT `encheres_ibfk_1` FOREIGN KEY (`acheteur_id`) REFERENCES `utilisateurs` (`id`),
  ADD CONSTRAINT `encheres_ibfk_2` FOREIGN KEY (`produit_id`) REFERENCES `produits` (`id`);

--
-- Constraints for table `entreprises`
--
ALTER TABLE `entreprises`
  ADD CONSTRAINT `entreprises_ibfk_1` FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `entreprises_ibfk_2` FOREIGN KEY (`secteur_activite_id`) REFERENCES `secteurs_activite` (`id`),
  ADD CONSTRAINT `entreprises_ibfk_3` FOREIGN KEY (`type_entreprise_id`) REFERENCES `types_entreprise` (`id`),
  ADD CONSTRAINT `fk_entreprise_secteur` FOREIGN KEY (`secteur_activite_id`) REFERENCES `secteurs_activite` (`id`),
  ADD CONSTRAINT `fk_entreprise_type` FOREIGN KEY (`type_entreprise_id`) REFERENCES `types_entreprise` (`id`),
  ADD CONSTRAINT `fk_entreprises_secteur` FOREIGN KEY (`secteur_activite_id`) REFERENCES `secteurs_activite` (`id`),
  ADD CONSTRAINT `fk_entreprises_type` FOREIGN KEY (`type_entreprise_id`) REFERENCES `types_entreprise` (`id`);

--
-- Constraints for table `etapes_inscription`
--
ALTER TABLE `etapes_inscription`
  ADD CONSTRAINT `etapes_inscription_ibfk_1` FOREIGN KEY (`entreprise_id`) REFERENCES `entreprises` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `favoris`
--
ALTER TABLE `favoris`
  ADD CONSTRAINT `favoris_ibfk_1` FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `favoris_ibfk_2` FOREIGN KEY (`produit_id`) REFERENCES `produits` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `fournisseurs_abonnements`
--
ALTER TABLE `fournisseurs_abonnements`
  ADD CONSTRAINT `fournisseurs_abonnements_ibfk_1` FOREIGN KEY (`fournisseur_id`) REFERENCES `entreprises` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fournisseurs_abonnements_ibfk_2` FOREIGN KEY (`abonnement_id`) REFERENCES `abonnements` (`id`);

--
-- Constraints for table `fournisseurs_certifications`
--
ALTER TABLE `fournisseurs_certifications`
  ADD CONSTRAINT `fournisseurs_certifications_ibfk_1` FOREIGN KEY (`fournisseur_id`) REFERENCES `entreprises` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fournisseurs_certifications_ibfk_2` FOREIGN KEY (`certification_id`) REFERENCES `certifications` (`id`);

--
-- Constraints for table `gdpr_consentements`
--
ALTER TABLE `gdpr_consentements`
  ADD CONSTRAINT `gdpr_consentements_ibfk_1` FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `historique_prix`
--
ALTER TABLE `historique_prix`
  ADD CONSTRAINT `historique_prix_ibfk_1` FOREIGN KEY (`produit_id`) REFERENCES `produits` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `images_produits`
--
ALTER TABLE `images_produits`
  ADD CONSTRAINT `images_produits_ibfk_1` FOREIGN KEY (`produit_id`) REFERENCES `produits` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `logs_activite`
--
ALTER TABLE `logs_activite`
  ADD CONSTRAINT `logs_activite_ibfk_1` FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateurs` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `logs_admin`
--
ALTER TABLE `logs_admin`
  ADD CONSTRAINT `logs_admin_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `messages`
--
ALTER TABLE `messages`
  ADD CONSTRAINT `fk_message_parent` FOREIGN KEY (`message_parent_id`) REFERENCES `messages` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `messages_ibfk_2` FOREIGN KEY (`expediteur_id`) REFERENCES `utilisateurs` (`id`);

--
-- Constraints for table `message_attachments`
--
ALTER TABLE `message_attachments`
  ADD CONSTRAINT `message_attachments_ibfk_1` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `message_files`
--
ALTER TABLE `message_files`
  ADD CONSTRAINT `message_files_ibfk_1` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `message_notifications`
--
ALTER TABLE `message_notifications`
  ADD CONSTRAINT `message_notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `message_notifications_ibfk_2` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `message_notifications_ibfk_3` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `message_reactions`
--
ALTER TABLE `message_reactions`
  ADD CONSTRAINT `message_reactions_ibfk_1` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `message_reactions_ibfk_2` FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `message_read_status`
--
ALTER TABLE `message_read_status`
  ADD CONSTRAINT `message_read_status_ibfk_1` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `message_read_status_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `methodes_livraison_produit`
--
ALTER TABLE `methodes_livraison_produit`
  ADD CONSTRAINT `methodes_livraison_produit_ibfk_1` FOREIGN KEY (`produit_id`) REFERENCES `produits` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `fk_notifications_related_product` FOREIGN KEY (`related_product_id`) REFERENCES `produits` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_notifications_related_user` FOREIGN KEY (`related_user_id`) REFERENCES `utilisateurs` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `offres_encheres`
--
ALTER TABLE `offres_encheres`
  ADD CONSTRAINT `offres_encheres_ibfk_1` FOREIGN KEY (`enchere_id`) REFERENCES `encheres` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `offres_encheres_ibfk_2` FOREIGN KEY (`fournisseur_id`) REFERENCES `entreprises` (`id`);

--
-- Constraints for table `participants_evenements`
--
ALTER TABLE `participants_evenements`
  ADD CONSTRAINT `participants_evenements_ibfk_1` FOREIGN KEY (`evenement_id`) REFERENCES `evenements_commerciaux` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD CONSTRAINT `password_reset_tokens_ibfk_1` FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `photos_entreprise`
--
ALTER TABLE `photos_entreprise`
  ADD CONSTRAINT `photos_entreprise_ibfk_1` FOREIGN KEY (`entreprise_id`) REFERENCES `entreprises` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `prix_degressifs`
--
ALTER TABLE `prix_degressifs`
  ADD CONSTRAINT `prix_degressifs_ibfk_1` FOREIGN KEY (`produit_id`) REFERENCES `produits` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `product_reports`
--
ALTER TABLE `product_reports`
  ADD CONSTRAINT `product_reports_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `produits` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `product_reports_ibfk_2` FOREIGN KEY (`reporter_id`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `product_reports_ibfk_3` FOREIGN KEY (`handled_by`) REFERENCES `utilisateurs` (`id`);

--
-- Constraints for table `produits`
--
ALTER TABLE `produits`
  ADD CONSTRAINT `fk_products_moderated_by` FOREIGN KEY (`moderated_by`) REFERENCES `utilisateurs` (`id`),
  ADD CONSTRAINT `produits_ibfk_1` FOREIGN KEY (`fournisseur_id`) REFERENCES `entreprises` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `produits_ibfk_2` FOREIGN KEY (`categorie_id`) REFERENCES `categories` (`id`);

--
-- Constraints for table `produits_attributs`
--
ALTER TABLE `produits_attributs`
  ADD CONSTRAINT `produits_attributs_ibfk_1` FOREIGN KEY (`produit_id`) REFERENCES `produits` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `produits_attributs_ibfk_2` FOREIGN KEY (`valeur_attribut_id`) REFERENCES `valeurs_attributs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `recommandations`
--
ALTER TABLE `recommandations`
  ADD CONSTRAINT `recommandations_ibfk_1` FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `recommandations_ibfk_2` FOREIGN KEY (`produit_id`) REFERENCES `produits` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `reponses_avis`
--
ALTER TABLE `reponses_avis`
  ADD CONSTRAINT `reponses_avis_ibfk_1` FOREIGN KEY (`avis_id`) REFERENCES `avis_produits` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `sessions_utilisateurs`
--
ALTER TABLE `sessions_utilisateurs`
  ADD CONSTRAINT `sessions_utilisateurs_ibfk_1` FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `signalements_avis`
--
ALTER TABLE `signalements_avis`
  ADD CONSTRAINT `signalements_avis_ibfk_1` FOREIGN KEY (`avis_id`) REFERENCES `avis_produits` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `specifications_techniques`
--
ALTER TABLE `specifications_techniques`
  ADD CONSTRAINT `specifications_techniques_ibfk_1` FOREIGN KEY (`produit_id`) REFERENCES `produits` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `statistiques_produits`
--
ALTER TABLE `statistiques_produits`
  ADD CONSTRAINT `statistiques_produits_ibfk_1` FOREIGN KEY (`produit_id`) REFERENCES `produits` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `statistiques_vues`
--
ALTER TABLE `statistiques_vues`
  ADD CONSTRAINT `statistiques_vues_ibfk_1` FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateurs` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `system_messages`
--
ALTER TABLE `system_messages`
  ADD CONSTRAINT `system_messages_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `system_message_reads`
--
ALTER TABLE `system_message_reads`
  ADD CONSTRAINT `system_message_reads_ibfk_1` FOREIGN KEY (`system_message_id`) REFERENCES `system_messages` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `system_message_reads_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD CONSTRAINT `system_settings_ibfk_1` FOREIGN KEY (`updated_by`) REFERENCES `utilisateurs` (`id`);

--
-- Constraints for table `traductions`
--
ALTER TABLE `traductions`
  ADD CONSTRAINT `traductions_ibfk_1` FOREIGN KEY (`langue_id`) REFERENCES `langues` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `typing_indicators`
--
ALTER TABLE `typing_indicators`
  ADD CONSTRAINT `typing_indicators_ibfk_1` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `typing_indicators_ibfk_2` FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `utilisateurs`
--
ALTER TABLE `utilisateurs`
  ADD CONSTRAINT `fk_users_suspended_by` FOREIGN KEY (`suspended_by`) REFERENCES `utilisateurs` (`id`),
  ADD CONSTRAINT `utilisateurs_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`);

--
-- Constraints for table `utilisateurs_segments`
--
ALTER TABLE `utilisateurs_segments`
  ADD CONSTRAINT `utilisateurs_segments_ibfk_1` FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `utilisateurs_segments_ibfk_2` FOREIGN KEY (`segment_id`) REFERENCES `segments_clients` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `utilisations_coupons`
--
ALTER TABLE `utilisations_coupons`
  ADD CONSTRAINT `utilisations_coupons_ibfk_1` FOREIGN KEY (`coupon_id`) REFERENCES `coupons_reduction` (`id`),
  ADD CONSTRAINT `utilisations_coupons_ibfk_2` FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateurs` (`id`);

--
-- Constraints for table `valeurs_attributs`
--
ALTER TABLE `valeurs_attributs`
  ADD CONSTRAINT `valeurs_attributs_ibfk_1` FOREIGN KEY (`attribut_id`) REFERENCES `attributs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `variantes_produits`
--
ALTER TABLE `variantes_produits`
  ADD CONSTRAINT `variantes_produits_ibfk_1` FOREIGN KEY (`produit_id`) REFERENCES `produits` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `vues_produits_detaillees`
--
ALTER TABLE `vues_produits_detaillees`
  ADD CONSTRAINT `vues_produits_detaillees_ibfk_1` FOREIGN KEY (`produit_id`) REFERENCES `produits` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `zones_livraison`
--
ALTER TABLE `zones_livraison`
  ADD CONSTRAINT `zones_livraison_ibfk_1` FOREIGN KEY (`transporteur_id`) REFERENCES `transporteurs` (`id`) ON DELETE CASCADE;

DELIMITER $$
--
-- Events
--
CREATE DEFINER=`404304`@`%` EVENT `ev_update_daily_stats` ON SCHEDULE EVERY 1 DAY STARTS '2025-01-01 02:00:00' ON COMPLETION NOT PRESERVE ENABLE DO CALL `sp_update_daily_stats`()$$

DELIMITER ;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
