-- =====================================================
-- MISE À JOUR DE LA TABLE PRODUITS POUR LES OFFRES ET PROMOTIONS
-- =====================================================

-- Ajouter les colonnes pour les offres et promotions
ALTER TABLE `produits` 
ADD COLUMN `prix_promo` DECIMAL(10,2) NULL DEFAULT NULL COMMENT 'Prix promotionnel',
ADD COLUMN `date_debut_promo` DATETIME NULL DEFAULT NULL COMMENT 'Date de début de la promotion',
ADD COLUMN `date_fin_promo` DATETIME NULL DEFAULT NULL COMMENT 'Date de fin de la promotion',
ADD COLUMN `pourcentage_reduction` DECIMAL(5,2) NULL DEFAULT NULL COMMENT 'Pourcentage de réduction',
ADD COLUMN `est_en_offre` BOOLEAN DEFAULT FALSE COMMENT 'Indique si le produit est en offre',
ADD COLUMN `type_offre` ENUM('reduction', 'flash_sale', 'bundle', 'clearance') NULL DEFAULT NULL COMMENT 'Type d\'offre',
ADD COLUMN `quantite_offre` INT NULL DEFAULT NULL COMMENT 'Quantité disponible pour l\'offre',
ADD COLUMN `vues_30j` INT DEFAULT 0 COMMENT 'Nombre de vues sur les 30 derniers jours',
ADD COLUMN `ventes_30j` INT DEFAULT 0 COMMENT 'Nombre de ventes sur les 30 derniers jours',
ADD COLUMN `score_popularite` DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Score de popularité calculé',
ADD COLUMN `derniere_activite` DATETIME NULL DEFAULT NULL COMMENT 'Dernière activité (vue, vente, etc.)';

-- Ajouter des index pour optimiser les requêtes
CREATE INDEX `idx_produits_offres` ON `produits` (`est_en_offre`, `date_fin_promo`);
CREATE INDEX `idx_produits_popularite` ON `produits` (`score_popularite` DESC, `vues_30j` DESC);
CREATE INDEX `idx_produits_activite` ON `produits` (`derniere_activite` DESC);
CREATE INDEX `idx_produits_ventes_30j` ON `produits` (`ventes_30j` DESC);

-- Ajouter des contraintes
ALTER TABLE `produits` 
ADD CONSTRAINT `chk_prix_promo` CHECK (`prix_promo` IS NULL OR `prix_promo` > 0),
ADD CONSTRAINT `chk_pourcentage_reduction` CHECK (`pourcentage_reduction` IS NULL OR (`pourcentage_reduction` >= 0 AND `pourcentage_reduction` <= 100)),
ADD CONSTRAINT `chk_dates_promo` CHECK (`date_debut_promo` IS NULL OR `date_fin_promo` IS NULL OR `date_debut_promo` <= `date_fin_promo`);

-- =====================================================
-- CRÉATION DE LA TABLE ÉVÉNEMENTS COMMERCIAUX
-- =====================================================

CREATE TABLE `evenements_commerciaux` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `titre` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `description_courte` VARCHAR(500),
  `type` ENUM('salon', 'conference', 'webinar', 'promotion', 'lancement', 'flash_sale', 'partenariat') NOT NULL,
  `date_debut` DATETIME NOT NULL,
  `date_fin` DATETIME NULL,
  `lieu` VARCHAR(255),
  `est_en_ligne` BOOLEAN DEFAULT FALSE,
  `lien_webinaire` VARCHAR(500) NULL,
  `image_principale` VARCHAR(500),
  `images_supplementaires` JSON NULL,
  `organisateur_id` INT,
  `organisateur_nom` VARCHAR(255) NOT NULL,
  `prix_participation` DECIMAL(10,2) DEFAULT 0,
  `est_gratuit` BOOLEAN DEFAULT TRUE,
  `nombre_participants` INT DEFAULT 0,
  `nombre_max_participants` INT NULL,
  `est_populaire` BOOLEAN DEFAULT FALSE,
  `est_actif` BOOLEAN DEFAULT TRUE,
  `tags` JSON NULL,
  `produits_lies` JSON NULL COMMENT 'IDs des produits liés à l\'événement',
  `statut` ENUM('brouillon', 'programme', 'en_cours', 'termine', 'annule') DEFAULT 'brouillon',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX `idx_evenements_type` (`type`),
  INDEX `idx_evenements_dates` (`date_debut`, `date_fin`),
  INDEX `idx_evenements_organisateur` (`organisateur_id`),
  INDEX `idx_evenements_statut` (`statut`, `est_actif`),
  INDEX `idx_evenements_popularite` (`est_populaire`, `date_debut`)
);

-- =====================================================
-- CRÉATION DE LA TABLE ARTICLES DE BLOG
-- =====================================================

CREATE TABLE `articles_blog` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `titre` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) UNIQUE NOT NULL,
  `extrait` TEXT,
  `contenu` LONGTEXT NOT NULL,
  `image_principale` VARCHAR(500),
  `images_supplementaires` JSON NULL,
  `auteur_id` INT,
  `auteur_nom` VARCHAR(255) NOT NULL,
  `categorie` VARCHAR(100) NOT NULL,
  `tags` JSON NULL,
  `produits_lies` JSON NULL COMMENT 'IDs des produits mentionnés dans l\'article',
  `est_a_la_une` BOOLEAN DEFAULT FALSE,
  `est_publie` BOOLEAN DEFAULT FALSE,
  `date_publication` DATETIME NULL,
  `date_modification` DATETIME NULL,
  `nombre_vues` INT DEFAULT 0,
  `nombre_likes` INT DEFAULT 0,
  `nombre_partages` INT DEFAULT 0,
  `temps_lecture` INT DEFAULT 0 COMMENT 'Temps de lecture estimé en minutes',
  `meta_description` VARCHAR(160),
  `meta_mots_cles` VARCHAR(255),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX `idx_articles_slug` (`slug`),
  INDEX `idx_articles_categorie` (`categorie`),
  INDEX `idx_articles_auteur` (`auteur_id`),
  INDEX `idx_articles_publication` (`est_publie`, `date_publication`),
  INDEX `idx_articles_une` (`est_a_la_une`, `est_publie`),
  INDEX `idx_articles_popularite` (`nombre_vues` DESC, `nombre_likes` DESC)
);

-- =====================================================
-- CRÉATION DE LA TABLE STATISTIQUES PRODUITS
-- =====================================================

CREATE TABLE `statistiques_produits` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `produit_id` INT NOT NULL,
  `date` DATE NOT NULL,
  `vues` INT DEFAULT 0,
  `clics` INT DEFAULT 0,
  `ajouts_favoris` INT DEFAULT 0,
  `partages` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY `unique_produit_date` (`produit_id`, `date`),
  INDEX `idx_stats_produit` (`produit_id`),
  INDEX `idx_stats_date` (`date`),
  
  FOREIGN KEY (`produit_id`) REFERENCES `produits`(`id`) ON DELETE CASCADE
);

-- =====================================================
-- CRÉATION DE LA TABLE PARTICIPANTS ÉVÉNEMENTS
-- =====================================================

CREATE TABLE `participants_evenements` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `evenement_id` INT NOT NULL,
  `utilisateur_id` INT NOT NULL,
  `nom` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `telephone` VARCHAR(20),
  `statut` ENUM('inscrit', 'confirme', 'present', 'absent') DEFAULT 'inscrit',
  `date_inscription` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `notes` TEXT NULL,
  
  UNIQUE KEY `unique_participant_evenement` (`evenement_id`, `utilisateur_id`),
  INDEX `idx_participants_evenement` (`evenement_id`),
  INDEX `idx_participants_utilisateur` (`utilisateur_id`),
  
  FOREIGN KEY (`evenement_id`) REFERENCES `evenements_commerciaux`(`id`) ON DELETE CASCADE
);

-- =====================================================
-- TRIGGERS POUR MISE À JOUR AUTOMATIQUE DES STATISTIQUES
-- =====================================================

DELIMITER //

-- Trigger pour mettre à jour les statistiques de vues
CREATE TRIGGER `tr_update_vues_produit` 
AFTER INSERT ON `statistiques_produits`
FOR EACH ROW
BEGIN
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
END//

-- Trigger pour calculer le score de popularité
CREATE TRIGGER `tr_calculate_popularity_score`
AFTER UPDATE ON `produits`
FOR EACH ROW
BEGIN
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
END//

DELIMITER ;

-- =====================================================
-- VUES POUR FACILITER LES REQUÊTES
-- =====================================================

-- Vue pour les produits en offre
CREATE VIEW `vue_produits_en_offre` AS
SELECT 
  p.*,
  e.nom_entreprise as fournisseur_nom,
  c.nom as categorie_nom,
  CASE 
    WHEN p.`prix_promo` IS NOT NULL THEN p.`prix_promo`
    ELSE p.`prix_unitaire`
  END as prix_final,
  CASE 
    WHEN p.`prix_promo` IS NOT NULL THEN 
      ROUND(((p.`prix_unitaire` - p.`prix_promo`) / p.`prix_unitaire`) * 100, 2)
    ELSE 0
  END as pourcentage_economie,
  DATEDIFF(p.`date_fin_promo`, NOW()) as jours_restants
FROM `produits` p
LEFT JOIN `entreprises` e ON p.`fournisseur_id` = e.`id`
LEFT JOIN `categories` c ON p.`categorie_id` = c.`id`
WHERE p.`est_en_offre` = TRUE 
  AND p.`date_fin_promo` > NOW()
  AND p.`statut` = 'actif'
ORDER BY p.`pourcentage_reduction` DESC, p.`date_fin_promo` ASC;

-- Vue pour les produits populaires
CREATE VIEW `vue_produits_populaires` AS
SELECT 
  p.*,
  e.nom_entreprise as fournisseur_nom,
  c.nom as categorie_nom,
  CASE 
    WHEN p.`prix_promo` IS NOT NULL AND p.`date_fin_promo` > NOW() THEN p.`prix_promo`
    ELSE p.`prix_unitaire`
  END as prix_final,
  p.`score_popularite`
FROM `produits` p
LEFT JOIN `entreprises` e ON p.`fournisseur_id` = e.`id`
LEFT JOIN `categories` c ON p.`categorie_id` = c.`id`
WHERE p.`statut` = 'actif'
  AND p.`score_popularite` > 0
ORDER BY p.`score_popularite` DESC, p.`vues_30j` DESC;

-- Vue pour les événements à venir
CREATE VIEW `vue_evenements_a_venir` AS
SELECT 
  ec.*,
  COUNT(pe.id) as participants_inscrits
FROM `evenements_commerciaux` ec
LEFT JOIN `participants_evenements` pe ON ec.`id` = pe.`evenement_id`
WHERE ec.`date_debut` > NOW() 
  AND ec.`est_actif` = TRUE
  AND ec.`statut` IN ('programme', 'en_cours')
GROUP BY ec.`id`
ORDER BY ec.`date_debut` ASC;

-- Vue pour les articles à la une
CREATE VIEW `vue_articles_a_la_une` AS
SELECT 
  ab.*,
  CASE 
    WHEN ab.`temps_lecture` = 0 THEN 
      CEIL(CHAR_LENGTH(ab.`contenu`) / 200)
    ELSE ab.`temps_lecture`
  END as temps_lecture_estime
FROM `articles_blog` ab
WHERE ab.`est_publie` = TRUE 
  AND ab.`est_a_la_une` = TRUE
  AND ab.`date_publication` <= NOW()
ORDER BY ab.`date_publication` DESC;

-- =====================================================
-- DONNÉES D'EXEMPLE
-- =====================================================

-- Insérer quelques événements d'exemple
INSERT INTO `evenements_commerciaux` (
  `titre`, `description`, `description_courte`, `type`, `date_debut`, `date_fin`, 
  `lieu`, `est_en_ligne`, `organisateur_nom`, `prix_participation`, `est_gratuit`, 
  `nombre_max_participants`, `est_populaire`, `tags`
) VALUES 
(
  'Salon du Commerce B2B Gabon 2025',
  'Le plus grand événement commercial du Gabon réunissant fournisseurs et acheteurs professionnels. Découvrez les dernières tendances, rencontrez des partenaires et développez votre réseau.',
  'Le plus grand événement commercial du Gabon',
  'salon',
  '2025-03-15 09:00:00',
  '2025-03-17 18:00:00',
  'Centre de Conférences de Libreville',
  FALSE,
  'GabMarketHub',
  25000,
  FALSE,
  2000,
  TRUE,
  '["B2B", "Networking", "Commerce", "Gabon"]'
),
(
  'Webinaire : E-commerce et Digitalisation',
  'Apprenez les meilleures pratiques pour digitaliser votre entreprise et développer votre présence en ligne.',
  "Formation gratuite sur l'e-commerce",
  'webinar',
  '2025-02-20 14:00:00',
  '2025-02-20 16:00:00',
  NULL,
  TRUE,
  'GabMarketHub',
  0,
  TRUE,
  500,
  TRUE,
  '["E-commerce", "Digital", "Formation"]'
);

-- Insérer quelques articles d'exemple
INSERT INTO `articles_blog` (
  `titre`, `slug`, `extrait`, `contenu`, `auteur_nom`, `categorie`, 
  `tags`, `est_a_la_une`, `est_publie`, `date_publication`, `temps_lecture`
) VALUES 
(
  'Guide Complet : Comment Choisir le Bon Fournisseur B2B',
  'guide-choisir-fournisseur-b2b',
  'Découvrez les critères essentiels pour sélectionner le fournisseur idéal pour votre entreprise.',
  'Dans le monde du commerce B2B, choisir le bon fournisseur est crucial pour le succès de votre entreprise. Voici un guide complet pour vous aider à faire le bon choix...',
  'Équipe GabMarketHub',
  'Conseils',
  '["B2B", "Fournisseurs", "Guide", "Commerce"]',
  TRUE,
  TRUE,
  '2025-01-15 10:00:00',
  8
),
(
  'Tendances E-commerce 2025 : Ce qui Attend les Entreprises',
  'tendances-ecommerce-2025',
  "Explorez les tendances qui vont façonner l'e-commerce en 2025 et comment les anticiper.",
  "L'e-commerce continue d'évoluer rapidement. Voici les tendances majeures à surveiller en 2025...",
  'Équipe GabMarketHub',
  'Tendances',
  '["E-commerce", "Tendances", "2025", "Innovation"]',
  TRUE,
  TRUE,
  '2025-01-10 14:30:00',
  6
);

-- =====================================================
-- PROCÉDURES STOCKÉES UTILES
-- =====================================================

DELIMITER //

-- Procédure pour mettre à jour les statistiques quotidiennes
CREATE PROCEDURE `sp_update_daily_stats`()
BEGIN
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
END//

DELIMITER ;

-- =====================================================
-- ÉVÉNEMENTS POUR AUTOMATISATION
-- =====================================================

-- Événement pour mettre à jour les statistiques quotidiennement
CREATE EVENT `ev_update_daily_stats`
ON SCHEDULE EVERY 1 DAY

STARTS '2025-01-01 02:00:00'
DO
  CALL `sp_update_daily_stats`();

-- Activer le planificateur d'événements
SET GLOBAL event_scheduler = ON;
