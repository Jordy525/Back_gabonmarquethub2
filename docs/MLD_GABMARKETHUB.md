# MLD (Modèle Logique de Données) - GabMarketHub

## Vue d'ensemble
Le modèle logique de données de GabMarketHub traduit le modèle conceptuel en structure de base de données relationnelle avec toutes les contraintes et index nécessaires.

## Structure des tables

### 1. Table `utilisateurs`
```sql
CREATE TABLE utilisateurs (
    id INT(11) PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    photo_profil VARCHAR(255) DEFAULT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) DEFAULT NULL,
    telephone VARCHAR(20) DEFAULT NULL,
    role_id INT(11) NOT NULL,
    statut ENUM('actif','suspendu','inactif') DEFAULT 'actif',
    date_inscription TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    derniere_connexion TIMESTAMP NULL,
    last_login TIMESTAMP NULL,
    login_attempts INT(11) DEFAULT 0,
    locked_until TIMESTAMP NULL,
    email_verified TINYINT(1) DEFAULT 0,
    phone_verified TINYINT(1) DEFAULT 0,
    two_factor_enabled TINYINT(1) DEFAULT 0,
    suspension_reason TEXT DEFAULT NULL,
    suspended_by INT(11) DEFAULT NULL,
    suspended_at TIMESTAMP NULL,
    notes_admin TEXT DEFAULT NULL,
    documents_valides TINYINT(1) DEFAULT 0,
    email_verified_at DATETIME DEFAULT NULL,
    email_verification_token VARCHAR(64) DEFAULT NULL,
    email_verification_expires DATETIME DEFAULT NULL,
    
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (suspended_by) REFERENCES utilisateurs(id),
    
    INDEX idx_utilisateurs_email (email),
    INDEX idx_utilisateurs_role (role_id),
    INDEX idx_users_role_status (role_id, statut),
    INDEX idx_users_email_verified (email_verified),
    INDEX idx_users_last_login (last_login)
);
```

### 2. Table `roles`
```sql
CREATE TABLE roles (
    id INT(11) PRIMARY KEY AUTO_INCREMENT,
    nom VARCHAR(50) UNIQUE NOT NULL,
    description TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. Table `secteurs_activite`
```sql
CREATE TABLE secteurs_activite (
    id INT(11) PRIMARY KEY AUTO_INCREMENT,
    nom VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. Table `types_entreprise`
```sql
CREATE TABLE types_entreprise (
    id INT(11) PRIMARY KEY AUTO_INCREMENT,
    nom VARCHAR(100) NOT NULL,
    description TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 5. Table `entreprises`
```sql
CREATE TABLE entreprises (
    id INT(11) PRIMARY KEY AUTO_INCREMENT,
    utilisateur_id INT(11) NOT NULL,
    nom_entreprise VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    logo VARCHAR(255) DEFAULT NULL,
    site_web VARCHAR(255) DEFAULT NULL,
    numero_siret VARCHAR(50) DEFAULT NULL,
    numero_registre_commerce VARCHAR(50) DEFAULT NULL,
    numero_tva VARCHAR(50) DEFAULT NULL,
    statut_verification ENUM('en_attente','verifie','rejete') DEFAULT 'en_attente',
    note_moyenne DECIMAL(3,2) DEFAULT 0.00,
    nombre_avis INT(11) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    telephone_professionnel VARCHAR(20) DEFAULT NULL,
    adresse_ligne1 VARCHAR(255) DEFAULT NULL,
    adresse_ligne2 VARCHAR(255) DEFAULT NULL,
    ville VARCHAR(100) DEFAULT NULL,
    code_postal VARCHAR(20) DEFAULT NULL,
    pays VARCHAR(100) DEFAULT 'Gabon',
    secteur_activite_id INT(11) DEFAULT NULL,
    type_entreprise_id INT(11) DEFAULT NULL,
    annee_creation YEAR(4) DEFAULT NULL,
    nombre_employes INT(11) DEFAULT NULL,
    capacite_production TEXT DEFAULT NULL,
    certifications TEXT DEFAULT NULL,
    logo_url VARCHAR(500) DEFAULT NULL,
    date_verification TIMESTAMP NULL,
    
    FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
    FOREIGN KEY (secteur_activite_id) REFERENCES secteurs_activite(id),
    FOREIGN KEY (type_entreprise_id) REFERENCES types_entreprise(id),
    
    INDEX idx_entreprise_secteur (secteur_activite_id),
    INDEX idx_entreprise_type (type_entreprise_id)
);
```

### 6. Table `categories`
```sql
CREATE TABLE categories (
    id INT(11) PRIMARY KEY AUTO_INCREMENT,
    nom VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT DEFAULT NULL,
    image VARCHAR(255) DEFAULT NULL,
    parent_id INT(11) DEFAULT NULL,
    ordre INT(11) DEFAULT 0,
    actif TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);
```

### 7. Table `produits`
```sql
CREATE TABLE produits (
    id INT(11) PRIMARY KEY AUTO_INCREMENT,
    fournisseur_id INT(11) NOT NULL,
    categorie_id INT(11) NOT NULL,
    nom VARCHAR(255) NOT NULL,
    marque VARCHAR(100) DEFAULT NULL,
    reference_produit VARCHAR(100) DEFAULT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    description_longue TEXT DEFAULT NULL,
    fonctionnalites TEXT DEFAULT NULL,
    instructions_utilisation TEXT DEFAULT NULL,
    materiaux TEXT DEFAULT NULL,
    couleurs_disponibles JSON DEFAULT NULL,
    certifications JSON DEFAULT NULL,
    delai_traitement INT(11) DEFAULT 7,
    capacite_approvisionnement INT(11) DEFAULT NULL,
    port_depart VARCHAR(100) DEFAULT NULL,
    delai_livraison_estime VARCHAR(100) DEFAULT NULL,
    politique_retour TEXT DEFAULT NULL,
    garantie TEXT DEFAULT NULL,
    video_url VARCHAR(255) DEFAULT NULL,
    prix_unitaire DECIMAL(10,2) NOT NULL,
    note_moyenne DECIMAL(2,1) DEFAULT 0.0,
    nombre_avis INT(11) DEFAULT 0,
    moq INT(11) DEFAULT 1,
    stock_disponible INT(11) DEFAULT 0,
    unite VARCHAR(50) DEFAULT 'pièce',
    poids DECIMAL(8,2) DEFAULT NULL,
    dimensions VARCHAR(100) DEFAULT NULL,
    statut ENUM('actif','inactif','suspendu') DEFAULT 'actif',
    featured TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    statut_moderation ENUM('en_attente','approuve','rejete','revision_requise') DEFAULT 'en_attente',
    moderated_by INT(11) DEFAULT NULL,
    moderated_at TIMESTAMP NULL,
    moderation_notes TEXT DEFAULT NULL,
    rejection_reason TEXT DEFAULT NULL,
    signalements_count INT(11) DEFAULT 0,
    last_signalement TIMESTAMP NULL,
    admin_notes TEXT DEFAULT NULL,
    prix_promo DECIMAL(10,2) DEFAULT NULL,
    date_debut_promo DATETIME DEFAULT NULL,
    date_fin_promo DATETIME DEFAULT NULL,
    pourcentage_reduction DECIMAL(5,2) DEFAULT NULL,
    est_en_offre TINYINT(1) DEFAULT 0,
    type_offre ENUM('reduction','flash_sale','bundle','clearance') DEFAULT NULL,
    quantite_offre INT(11) DEFAULT NULL,
    vues_30j INT(11) DEFAULT 0,
    ventes_30j INT(11) DEFAULT 0,
    score_popularite DECIMAL(5,2) DEFAULT 0.00,
    derniere_activite DATETIME DEFAULT NULL,
    
    FOREIGN KEY (fournisseur_id) REFERENCES entreprises(id) ON DELETE CASCADE,
    FOREIGN KEY (categorie_id) REFERENCES categories(id),
    FOREIGN KEY (moderated_by) REFERENCES utilisateurs(id),
    
    INDEX idx_produits_fournisseur (fournisseur_id),
    INDEX idx_produits_categorie (categorie_id),
    INDEX idx_products_moderation (statut_moderation),
    INDEX idx_products_signalements (signalements_count),
    INDEX idx_products_moderated_date (moderated_at),
    INDEX idx_produits_offres (est_en_offre, date_fin_promo),
    INDEX idx_produits_popularite (score_popularite DESC, vues_30j DESC),
    INDEX idx_produits_activite (derniere_activite DESC),
    INDEX idx_produits_ventes_30j (ventes_30j DESC),
    
    CONSTRAINT chk_prix_positif CHECK (prix_unitaire > 0),
    CONSTRAINT chk_pourcentage_reduction CHECK (pourcentage_reduction >= 0 AND pourcentage_reduction <= 100)
);
```

### 8. Table `images_produits`
```sql
CREATE TABLE images_produits (
    id INT(11) PRIMARY KEY AUTO_INCREMENT,
    produit_id INT(11) NOT NULL,
    url VARCHAR(255) NOT NULL,
    alt_text VARCHAR(255) DEFAULT NULL,
    type_image ENUM('principale','galerie','detail','usage','taille') DEFAULT 'galerie',
    largeur INT DEFAULT NULL,
    hauteur INT DEFAULT NULL,
    taille_fichier INT DEFAULT NULL,
    ordre INT DEFAULT 0,
    principale TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE CASCADE
);
```

### 9. Table `conversations`
```sql
CREATE TABLE conversations (
    id INT(11) PRIMARY KEY AUTO_INCREMENT,
    acheteur_id INT(11) NOT NULL,
    fournisseur_id INT(11) NOT NULL,
    produit_id INT(11) DEFAULT NULL,
    sujet VARCHAR(255) DEFAULT NULL,
    statut ENUM('ouverte','fermee') DEFAULT 'ouverte',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    derniere_activite TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    messages_non_lus_acheteur INT(11) DEFAULT 0,
    messages_non_lus_fournisseur INT(11) DEFAULT 0,
    archivee TINYINT(1) DEFAULT 0,
    priorite ENUM('normale','haute','urgente') DEFAULT 'normale',
    tags JSON DEFAULT NULL,
    
    FOREIGN KEY (acheteur_id) REFERENCES utilisateurs(id),
    FOREIGN KEY (fournisseur_id) REFERENCES utilisateurs(id),
    FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE SET NULL,
    
    INDEX idx_conversations_derniere_activite (derniere_activite),
    INDEX idx_conversations_archivee (archivee),
    INDEX idx_conversations_priorite (priorite)
);
```

### 10. Table `messages`
```sql
CREATE TABLE messages (
    id INT(11) PRIMARY KEY AUTO_INCREMENT,
    conversation_id INT(11) NOT NULL,
    expediteur_id INT(11) NOT NULL,
    contenu TEXT NOT NULL,
    lu TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    type ENUM('texte','image','fichier','systeme') DEFAULT 'texte',
    fichier_url VARCHAR(500) DEFAULT NULL,
    fichier_nom VARCHAR(255) DEFAULT NULL,
    fichier_taille INT DEFAULT NULL,
    fichier_type VARCHAR(100) DEFAULT NULL,
    message_parent_id INT(11) DEFAULT NULL,
    edited_at TIMESTAMP NULL,
    deleted_at TIMESTAMP NULL,
    metadata JSON DEFAULT NULL,
    
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (expediteur_id) REFERENCES utilisateurs(id),
    FOREIGN KEY (message_parent_id) REFERENCES messages(id) ON DELETE SET NULL,
    
    INDEX idx_messages_conversation (conversation_id),
    INDEX idx_messages_type (type),
    INDEX idx_messages_created_at (created_at),
    INDEX idx_messages_lu (lu)
);
```

### 11. Table `notifications`
```sql
CREATE TABLE notifications (
    id INT(11) PRIMARY KEY AUTO_INCREMENT,
    utilisateur_id INT(11) NOT NULL,
    titre VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('message','commande','promotion','systeme','produit','user_management','product_management','order_management') NOT NULL,
    category VARCHAR(50) DEFAULT 'general',
    lu TINYINT(1) DEFAULT 0,
    priority ENUM('low','medium','high','urgent') DEFAULT 'medium',
    data JSON DEFAULT NULL,
    related_user_id INT(11) DEFAULT NULL,
    related_product_id INT(11) DEFAULT NULL,
    related_conversation_id INT(11) DEFAULT NULL,
    related_order_id INT(11) DEFAULT NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    url VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
    FOREIGN KEY (related_user_id) REFERENCES utilisateurs(id) ON DELETE SET NULL,
    FOREIGN KEY (related_product_id) REFERENCES produits(id) ON DELETE SET NULL,
    
    INDEX idx_notifications_utilisateur (utilisateur_id),
    INDEX idx_notifications_lu (lu),
    INDEX idx_category (category),
    INDEX idx_priority (priority),
    INDEX idx_related_user (related_user_id),
    INDEX idx_related_product (related_product_id),
    INDEX idx_related_conversation (related_conversation_id),
    INDEX idx_related_order (related_order_id)
);
```

### 12. Table `avis_produits`
```sql
CREATE TABLE avis_produits (
    id INT(11) PRIMARY KEY AUTO_INCREMENT,
    produit_id INT(11) NOT NULL,
    utilisateur_id INT(11) NOT NULL,
    note INT NOT NULL CHECK (note >= 1 AND note <= 5),
    commentaire TEXT DEFAULT NULL,
    achat_verifie TINYINT(1) DEFAULT 0,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    statut ENUM('en_attente','approuve','rejete') DEFAULT 'approuve',
    date_moderation TIMESTAMP NULL,
    moderateur_id INT(11) DEFAULT NULL,
    raison_rejet TEXT DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    
    FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE CASCADE,
    FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_user_product_review (produit_id, utilisateur_id),
    INDEX idx_avis_produit (produit_id),
    INDEX idx_avis_utilisateur (utilisateur_id),
    INDEX idx_statut (statut),
    INDEX idx_produit_statut (produit_id, statut),
    INDEX idx_date_creation (date_creation)
);
```

### 13. Table `favoris`
```sql
CREATE TABLE favoris (
    id INT(11) PRIMARY KEY AUTO_INCREMENT,
    utilisateur_id INT(11) NOT NULL,
    produit_id INT(11) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
    FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_favori (utilisateur_id, produit_id),
    INDEX idx_favoris_utilisateur (utilisateur_id)
);
```

### 14. Table `documents_entreprise`
```sql
CREATE TABLE documents_entreprise (
    id INT(11) PRIMARY KEY AUTO_INCREMENT,
    entreprise_id INT(11) NOT NULL,
    type_document ENUM('certificat_enregistrement','certificat_fiscal','piece_identite_representant','licence_commerciale','certificat_origine','conformite_ce','certificat_sanitaire','autre') NOT NULL,
    nom_fichier VARCHAR(255) NOT NULL,
    chemin_fichier VARCHAR(500) NOT NULL,
    taille_fichier INT DEFAULT NULL,
    type_mime VARCHAR(100) DEFAULT NULL,
    statut_verification ENUM('en_attente','verifie','rejete') DEFAULT 'en_attente',
    commentaire_verification TEXT DEFAULT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP NULL,
    
    FOREIGN KEY (entreprise_id) REFERENCES entreprises(id) ON DELETE CASCADE
);
```

### 15. Table `statistiques_produits`
```sql
CREATE TABLE statistiques_produits (
    id INT(11) PRIMARY KEY AUTO_INCREMENT,
    produit_id INT(11) NOT NULL,
    date DATE NOT NULL,
    vues INT DEFAULT 0,
    clics INT DEFAULT 0,
    ajouts_favoris INT DEFAULT 0,
    partages INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_produit_date (produit_id, date),
    INDEX idx_stats_produit (produit_id),
    INDEX idx_stats_date (date)
);
```

### 16. Table `articles_blog`
```sql
CREATE TABLE articles_blog (
    id INT(11) PRIMARY KEY AUTO_INCREMENT,
    titre VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    extrait TEXT DEFAULT NULL,
    contenu LONGTEXT NOT NULL,
    image_principale VARCHAR(500) DEFAULT NULL,
    images_supplementaires JSON DEFAULT NULL,
    auteur_id INT(11) DEFAULT NULL,
    auteur_nom VARCHAR(255) NOT NULL,
    categorie VARCHAR(100) NOT NULL,
    tags JSON DEFAULT NULL,
    produits_lies JSON DEFAULT NULL,
    est_a_la_une TINYINT(1) DEFAULT 0,
    est_publie TINYINT(1) DEFAULT 0,
    date_publication DATETIME DEFAULT NULL,
    date_modification DATETIME DEFAULT NULL,
    nombre_vues INT DEFAULT 0,
    nombre_likes INT DEFAULT 0,
    nombre_partages INT DEFAULT 0,
    temps_lecture INT DEFAULT 0,
    meta_description VARCHAR(160) DEFAULT NULL,
    meta_mots_cles VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_articles_slug (slug),
    INDEX idx_articles_categorie (categorie),
    INDEX idx_articles_auteur (auteur_id),
    INDEX idx_articles_publication (est_publie, date_publication),
    INDEX idx_articles_une (est_a_la_une, est_publie),
    INDEX idx_articles_popularite (nombre_vues DESC, nombre_likes DESC)
);
```

### 17. Table `evenements_commerciaux`
```sql
CREATE TABLE evenements_commerciaux (
    id INT(11) PRIMARY KEY AUTO_INCREMENT,
    titre VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    description_courte VARCHAR(500) DEFAULT NULL,
    type ENUM('salon','conference','webinar','promotion','lancement','flash_sale','partenariat') NOT NULL,
    date_debut DATETIME NOT NULL,
    date_fin DATETIME DEFAULT NULL,
    lieu VARCHAR(255) DEFAULT NULL,
    est_en_ligne TINYINT(1) DEFAULT 0,
    lien_webinaire VARCHAR(500) DEFAULT NULL,
    image_principale VARCHAR(500) DEFAULT NULL,
    images_supplementaires JSON DEFAULT NULL,
    organisateur_id INT(11) DEFAULT NULL,
    organisateur_nom VARCHAR(255) NOT NULL,
    prix_participation DECIMAL(10,2) DEFAULT 0.00,
    est_gratuit TINYINT(1) DEFAULT 1,
    nombre_participants INT DEFAULT 0,
    nombre_max_participants INT DEFAULT NULL,
    est_populaire TINYINT(1) DEFAULT 0,
    est_actif TINYINT(1) DEFAULT 1,
    tags JSON DEFAULT NULL,
    produits_lies JSON DEFAULT NULL,
    statut ENUM('brouillon','programme','en_cours','termine','annule') DEFAULT 'brouillon',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_evenements_type (type),
    INDEX idx_evenements_dates (date_debut, date_fin),
    INDEX idx_evenements_organisateur (organisateur_id),
    INDEX idx_evenements_statut (statut, est_actif),
    INDEX idx_evenements_popularite (est_populaire, date_debut)
);
```

## Tables administratives

### 18. Table `admin_audit_logs`
```sql
CREATE TABLE admin_audit_logs (
    id INT(11) PRIMARY KEY AUTO_INCREMENT,
    admin_id INT(11) NOT NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id INT(11) DEFAULT NULL,
    old_values JSON DEFAULT NULL,
    new_values JSON DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    session_id VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (admin_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
    
    INDEX idx_audit_admin_id (admin_id),
    INDEX idx_audit_date (created_at),
    INDEX idx_audit_action (action),
    INDEX idx_audit_table (table_name)
);
```

### 19. Table `admin_notifications`
```sql
CREATE TABLE admin_notifications (
    id INT(11) PRIMARY KEY AUTO_INCREMENT,
    admin_id INT(11) DEFAULT NULL,
    type VARCHAR(50) NOT NULL,
    category VARCHAR(50) DEFAULT 'general',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSON DEFAULT NULL,
    is_read TINYINT(1) DEFAULT 0,
    priority ENUM('low','medium','high','urgent') DEFAULT 'medium',
    user_id INT(11) DEFAULT NULL,
    product_id INT(11) DEFAULT NULL,
    order_id INT(11) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (admin_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
    
    INDEX idx_admin_notifications_admin_id (admin_id),
    INDEX idx_admin_notifications_read (is_read),
    INDEX idx_admin_notifications_priority (priority),
    INDEX idx_admin_notifications_date (created_at),
    INDEX idx_category (category)
);
```

## Tables de sécurité et gestion

### 20. Table `password_reset_tokens`
```sql
CREATE TABLE password_reset_tokens (
    id INT(11) PRIMARY KEY AUTO_INCREMENT,
    utilisateur_id INT(11) NOT NULL,
    token VARCHAR(64) UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    used TINYINT(1) DEFAULT 0,
    used_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
    
    INDEX idx_token (token),
    INDEX idx_expires (expires_at),
    INDEX idx_used (used)
);
```

### 21. Table `email_notifications`
```sql
CREATE TABLE email_notifications (
    id INT(11) PRIMARY KEY AUTO_INCREMENT,
    utilisateur_id INT(11) NOT NULL,
    type_notification VARCHAR(50) NOT NULL,
    sujet VARCHAR(255) NOT NULL,
    contenu TEXT NOT NULL,
    statut_envoi ENUM('pending','sent','failed') DEFAULT 'pending',
    tentatives INT DEFAULT 0,
    erreur_envoi TEXT DEFAULT NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_envoi TIMESTAMP NULL,
    
    FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
    
    INDEX idx_utilisateur_id (utilisateur_id),
    INDEX idx_statut_envoi (statut_envoi),
    INDEX idx_type_notification (type_notification),
    INDEX idx_date_creation (date_creation)
);
```

## Vues optimisées

### 22. Vue `vue_produits_complets`
```sql
CREATE VIEW vue_produits_complets AS
SELECT 
    p.*,
    c.nom AS categorie_nom,
    c.slug AS categorie_slug,
    e.nom_entreprise AS entreprise_nom
FROM produits p
LEFT JOIN categories c ON p.categorie_id = c.id
LEFT JOIN entreprises e ON p.fournisseur_id = e.id;
```

### 23. Vue `vue_produits_populaires`
```sql
CREATE VIEW vue_produits_populaires AS
SELECT 
    p.*,
    e.nom_entreprise AS fournisseur_nom,
    c.nom AS categorie_nom,
    CASE 
        WHEN p.est_en_offre = 1 AND p.prix_promo IS NOT NULL 
        THEN p.prix_promo 
        ELSE p.prix_unitaire 
    END AS prix_final
FROM produits p
LEFT JOIN entreprises e ON p.fournisseur_id = e.id
LEFT JOIN categories c ON p.categorie_id = c.id
WHERE p.statut = 'actif' 
  AND p.score_popularite > 0
ORDER BY p.score_popularite DESC, p.vues_30j DESC;
```

### 24. Vue `vue_produits_en_offre`
```sql
CREATE VIEW vue_produits_en_offre AS
SELECT 
    p.*,
    e.nom_entreprise AS fournisseur_nom,
    c.nom AS categorie_nom,
    p.prix_promo AS prix_final,
    ROUND(((p.prix_unitaire - p.prix_promo) / p.prix_unitaire) * 100, 2) AS pourcentage_economie,
    COALESCE(DATEDIFF(p.date_fin_promo, NOW()), 0) AS jours_restants
FROM produits p
LEFT JOIN entreprises e ON p.fournisseur_id = e.id
LEFT JOIN categories c ON p.categorie_id = c.id
WHERE p.est_en_offre = 1 
  AND p.date_fin_promo > NOW()
  AND p.statut = 'actif'
ORDER BY p.pourcentage_reduction DESC, p.date_fin_promo ASC;
```

## Triggers

### 25. Trigger pour mise à jour des compteurs de messages non lus
```sql
DELIMITER $$
CREATE TRIGGER update_unread_count_insert 
AFTER INSERT ON messages 
FOR EACH ROW
BEGIN
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
END$$
DELIMITER ;
```

### 26. Trigger pour calcul automatique du score de popularité
```sql
DELIMITER $$
CREATE TRIGGER tr_calculate_popularity_score 
AFTER UPDATE ON produits 
FOR EACH ROW
BEGIN
    IF NEW.vues_30j != OLD.vues_30j OR NEW.ventes_30j != OLD.ventes_30j THEN
        SET @score = (
            (NEW.vues_30j * 0.3) + 
            (NEW.ventes_30j * 0.7) + 
            (NEW.note_moyenne * 10) + 
            (NEW.nombre_avis * 0.5)
        );
        
        UPDATE produits 
        SET score_popularite = @score 
        WHERE id = NEW.id;
    END IF;
END$$
DELIMITER ;
```

### 27. Trigger pour mise à jour des statistiques produit
```sql
DELIMITER $$
CREATE TRIGGER tr_update_vues_produit 
AFTER INSERT ON statistiques_produits 
FOR EACH ROW
BEGIN
    UPDATE produits 
    SET 
        vues_30j = (
            SELECT COALESCE(SUM(vues), 0) 
            FROM statistiques_produits 
            WHERE produit_id = NEW.produit_id 
            AND date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        ),
        derniere_activite = NOW()
    WHERE id = NEW.produit_id;
END$$
DELIMITER ;
```

## Index de performance

### Index composites pour optimisation des requêtes fréquentes
```sql
-- Index pour recherche de produits par catégorie et statut
CREATE INDEX idx_produits_categorie_statut ON produits(categorie_id, statut, statut_moderation);

-- Index pour recherche de produits par fournisseur et statut
CREATE INDEX idx_produits_fournisseur_statut ON produits(fournisseur_id, statut);

-- Index pour tri par prix
CREATE INDEX idx_produits_prix ON produits(prix_unitaire, statut);

-- Index pour recherche full-text sur les produits
CREATE FULLTEXT INDEX idx_produits_fulltext ON produits(nom, description, marque);

-- Index pour conversations actives
CREATE INDEX idx_conversations_active ON conversations(statut, derniere_activite DESC);

-- Index pour notifications non lues
CREATE INDEX idx_notifications_unread ON notifications(utilisateur_id, lu, created_at DESC);
```

## Contraintes de validation

### Contraintes CHECK pour validation des données
```sql
-- Contraintes sur les prix
ALTER TABLE produits ADD CONSTRAINT chk_prix_positif CHECK (prix_unitaire > 0);
ALTER TABLE produits ADD CONSTRAINT chk_prix_promo_valide CHECK (prix_promo IS NULL OR prix_promo < prix_unitaire);

-- Contraintes sur les pourcentages
ALTER TABLE produits ADD CONSTRAINT chk_pourcentage CHECK (pourcentage_reduction IS NULL OR (pourcentage_reduction >= 0 AND pourcentage_reduction <= 100));

-- Contraintes sur les notes
ALTER TABLE avis_produits ADD CONSTRAINT chk_note_valide CHECK (note >= 1 AND note <= 5);

-- Contraintes sur les dates de promotion
ALTER TABLE produits ADD CONSTRAINT chk_dates_promo CHECK (date_debut_promo IS NULL OR date_fin_promo IS NULL OR date_fin_promo > date_debut_promo);
```

## Procédures stockées

### Procédure pour calcul des statistiques quotidiennes
```sql
DELIMITER $$
CREATE PROCEDURE sp_update_daily_stats()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE prod_id INT;
    DECLARE cur CURSOR FOR SELECT id FROM produits WHERE statut = 'actif';
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN cur;
    read_loop: LOOP
        FETCH cur INTO prod_id;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- Mise à jour des vues sur 30 jours
        UPDATE produits p
        SET vues_30j = (
            SELECT COALESCE(SUM(vues), 0)
            FROM statistiques_produits sp
            WHERE sp.produit_id = prod_id
            AND sp.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        )
        WHERE p.id = prod_id;
        
    END LOOP;
    CLOSE cur;
END$$
DELIMITER ;
```

## Événements automatiques

### Événement pour nettoyage automatique
```sql
CREATE EVENT ev_update_daily_stats
ON SCHEDULE EVERY 1 DAY
STARTS '2025-01-01 02:00:00'
DO
    CALL sp_update_daily_stats();
```

## Règles de nommage et conventions

1. **Tables** : Pluriel en français (ex: `utilisateurs`, `produits`)
2. **Champs** : Snake_case en français (ex: `nom_entreprise`, `date_creation`)
3. **Index** : Préfixe `idx_` suivi du nom de table et champ (ex: `idx_produits_categorie`)
4. **Clés étrangères** : Préfixe `fk_` (ex: `fk_produits_fournisseur`)
5. **Triggers** : Préfixe `tr_` (ex: `tr_calculate_popularity_score`)
6. **Vues** : Préfixe `vue_` (ex: `vue_produits_complets`)

## Optimisations de performance

1. **Partitionnement** : Tables de logs partitionnées par date
2. **Cache** : Table `admin_statistics_cache` pour statistiques précalculées
3. **Index** : Index composites pour requêtes complexes
4. **Vues matérialisées** : Pour données de reporting fréquemment consultées
5. **Archivage** : Procédures pour archiver les anciennes données