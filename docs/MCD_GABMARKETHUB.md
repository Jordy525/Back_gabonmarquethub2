# MCD (Modèle Conceptuel de Données) - GabMarketHub

## Vue d'ensemble
Le modèle conceptuel de GabMarketHub représente une plateforme marketplace B2B pour le Gabon, permettant la mise en relation entre acheteurs et fournisseurs.

## Entités principales et leurs attributs

### 1. ENTITÉ UTILISATEUR
**Attributs :**
- id (Identifiant unique)
- email (Adresse email unique)
- mot_de_passe (Mot de passe crypté)
- nom (Nom de famille)
- prenom (Prénom)
- telephone (Numéro de téléphone)
- photo_profil (URL de la photo)
- statut (actif, suspendu, inactif)
- date_inscription
- derniere_connexion
- email_verified (Booléen)
- suspension_reason (Raison de suspension)

### 2. ENTITÉ RÔLE
**Attributs :**
- id (Identifiant unique)
- nom (acheteur, fournisseur, administrateur)
- description (Description du rôle)
- created_at

### 3. ENTITÉ ENTREPRISE
**Attributs :**
- id (Identifiant unique)
- nom_entreprise (Nom commercial)
- description (Description de l'entreprise)
- logo_url (URL du logo)
- site_web (Site web de l'entreprise)
- numero_siret (Numéro SIRET)
- numero_registre_commerce
- numero_tva (Numéro TVA)
- telephone_professionnel
- adresse_ligne1, adresse_ligne2
- ville, code_postal, pays
- statut_verification (en_attente, verifie, rejete)
- note_moyenne (Note moyenne des avis)
- nombre_avis
- annee_creation
- nombre_employes
- capacite_production
- certifications

### 4. ENTITÉ SECTEUR_ACTIVITÉ
**Attributs :**
- id (Identifiant unique)
- nom (Nom du secteur)
- description (Description du secteur)

### 5. ENTITÉ TYPE_ENTREPRISE
**Attributs :**
- id (Identifiant unique)
- nom (Fabricant, Distributeur, Grossiste, etc.)
- description (Description du type)

### 6. ENTITÉ CATÉGORIE
**Attributs :**
- id (Identifiant unique)
- nom (Nom de la catégorie)
- slug (URL friendly)
- description (Description de la catégorie)
- image (Image de la catégorie)
- ordre (Ordre d'affichage)
- actif (Booléen)

### 7. ENTITÉ PRODUIT
**Attributs :**
- id (Identifiant unique)
- nom (Nom du produit)
- marque (Marque du produit)
- reference_produit (Référence unique)
- slug (URL friendly)
- description (Description courte)
- description_longue (Description détaillée)
- fonctionnalites (Liste des fonctionnalités)
- instructions_utilisation
- materiaux (Matériaux utilisés)
- couleurs_disponibles (JSON)
- certifications (JSON)
- prix_unitaire (Prix en FCFA)
- prix_promo (Prix promotionnel)
- note_moyenne (Note moyenne des avis)
- nombre_avis
- stock_disponible
- moq (Quantité minimum de commande)
- unite (unité de mesure)
- poids, dimensions
- delai_traitement
- capacite_approvisionnement
- port_depart
- delai_livraison_estime
- politique_retour
- garantie
- video_url
- statut (actif, inactif, suspendu)
- statut_moderation (en_attente, approuve, rejete)
- featured (Produit mis en avant)
- est_en_offre (Booléen)
- type_offre (reduction, flash_sale, bundle, clearance)
- vues_30j, ventes_30j
- score_popularite

### 8. ENTITÉ IMAGE_PRODUIT
**Attributs :**
- id (Identifiant unique)
- url (URL de l'image)
- alt_text (Texte alternatif)
- type_image (principale, galerie, detail)
- ordre (Ordre d'affichage)
- principale (Booléen)
- largeur, hauteur, taille_fichier

### 9. ENTITÉ CONVERSATION
**Attributs :**
- id (Identifiant unique)
- sujet (Sujet de la conversation)
- statut (ouverte, fermee)
- derniere_activite
- messages_non_lus_acheteur
- messages_non_lus_fournisseur
- archivee (Booléen)
- priorite (normale, haute, urgente)

### 10. ENTITÉ MESSAGE
**Attributs :**
- id (Identifiant unique)
- contenu (Contenu du message)
- type (texte, image, fichier, systeme)
- lu (Booléen)
- fichier_url, fichier_nom, fichier_taille
- edited_at, deleted_at

### 11. ENTITÉ NOTIFICATION
**Attributs :**
- id (Identifiant unique)
- titre (Titre de la notification)
- message (Message de la notification)
- type (message, commande, promotion, systeme, produit)
- category (Catégorie spécifique)
- lu (Booléen)
- priority (low, medium, high, urgent)
- data (Données JSON)
- url (Lien associé)

### 12. ENTITÉ AVIS_PRODUIT
**Attributs :**
- id (Identifiant unique)
- note (Note de 1 à 5)
- commentaire (Commentaire textuel)
- achat_verifie (Booléen)
- statut (en_attente, approuve, rejete)
- date_moderation
- raison_rejet
- ip_address, user_agent

### 13. ENTITÉ FAVORI
**Attributs :**
- id (Identifiant unique)
- created_at (Date d'ajout aux favoris)

### 14. ENTITÉ DOCUMENT_ENTREPRISE
**Attributs :**
- id (Identifiant unique)
- type_document (certificat_enregistrement, certificat_fiscal, etc.)
- nom_fichier
- chemin_fichier
- taille_fichier, type_mime
- statut_verification (en_attente, verifie, rejete)
- commentaire_verification

### 15. ENTITÉ STATISTIQUE_PRODUIT
**Attributs :**
- id (Identifiant unique)
- date (Date de la statistique)
- vues (Nombre de vues)
- clics (Nombre de clics)
- ajouts_favoris
- partages

### 16. ENTITÉ ARTICLE_BLOG
**Attributs :**
- id (Identifiant unique)
- titre, slug
- extrait, contenu
- image_principale
- auteur_nom, categorie
- tags (JSON)
- est_a_la_une, est_publie
- date_publication
- nombre_vues, nombre_likes, nombre_partages
- temps_lecture

### 17. ENTITÉ ÉVÉNEMENT_COMMERCIAL
**Attributs :**
- id (Identifiant unique)
- titre, description
- type (salon, conference, webinar, promotion)
- date_debut, date_fin
- lieu, est_en_ligne
- organisateur_nom
- prix_participation, est_gratuit
- nombre_participants, nombre_max_participants
- statut (brouillon, programme, en_cours, termine, annule)

## Relations principales

### Relations de cardinalité

1. **UTILISATEUR - RÔLE** (N:1)
   - Un utilisateur a un rôle
   - Un rôle peut être attribué à plusieurs utilisateurs

2. **UTILISATEUR - ENTREPRISE** (1:1)
   - Un fournisseur crée une entreprise
   - Une entreprise appartient à un utilisateur

3. **ENTREPRISE - SECTEUR_ACTIVITÉ** (N:1)
   - Une entreprise appartient à un secteur d'activité
   - Un secteur peut contenir plusieurs entreprises

4. **ENTREPRISE - TYPE_ENTREPRISE** (N:1)
   - Une entreprise a un type
   - Un type peut être attribué à plusieurs entreprises

5. **PRODUIT - ENTREPRISE** (N:1)
   - Un produit appartient à une entreprise
   - Une entreprise peut avoir plusieurs produits

6. **PRODUIT - CATÉGORIE** (N:1)
   - Un produit appartient à une catégorie
   - Une catégorie peut contenir plusieurs produits

7. **CATÉGORIE - CATÉGORIE** (1:N) - Auto-référence
   - Une catégorie peut avoir une catégorie parent
   - Une catégorie peut avoir plusieurs sous-catégories

8. **PRODUIT - IMAGE_PRODUIT** (1:N)
   - Un produit peut avoir plusieurs images
   - Une image appartient à un produit

9. **CONVERSATION - UTILISATEUR** (N:2)
   - Une conversation implique un acheteur et un fournisseur
   - Un utilisateur peut avoir plusieurs conversations

10. **CONVERSATION - PRODUIT** (N:1)
    - Une conversation peut concerner un produit spécifique
    - Un produit peut être l'objet de plusieurs conversations

11. **MESSAGE - CONVERSATION** (N:1)
    - Un message appartient à une conversation
    - Une conversation contient plusieurs messages

12. **MESSAGE - UTILISATEUR** (N:1)
    - Un message est envoyé par un utilisateur
    - Un utilisateur peut envoyer plusieurs messages

13. **AVIS_PRODUIT - PRODUIT** (N:1)
    - Un avis concerne un produit
    - Un produit peut avoir plusieurs avis

14. **AVIS_PRODUIT - UTILISATEUR** (N:1)
    - Un avis est rédigé par un utilisateur
    - Un utilisateur peut rédiger plusieurs avis

15. **FAVORI - UTILISATEUR - PRODUIT** (N:N)
    - Un utilisateur peut avoir plusieurs produits favoris
    - Un produit peut être favori de plusieurs utilisateurs

16. **NOTIFICATION - UTILISATEUR** (N:1)
    - Une notification est destinée à un utilisateur
    - Un utilisateur peut recevoir plusieurs notifications

17. **DOCUMENT_ENTREPRISE - ENTREPRISE** (N:1)
    - Un document appartient à une entreprise
    - Une entreprise peut avoir plusieurs documents

18. **STATISTIQUE_PRODUIT - PRODUIT** (N:1)
    - Une statistique concerne un produit
    - Un produit peut avoir plusieurs entrées statistiques

## Contraintes d'intégrité

### Contraintes de domaine
- Les emails doivent être uniques
- Les notes des avis doivent être entre 1 et 5
- Les prix doivent être positifs
- Les pourcentages de réduction doivent être entre 0 et 100

### Contraintes référentielles
- Toutes les clés étrangères doivent référencer des entités existantes
- La suppression d'un utilisateur entraîne la suppression de ses données associées (CASCADE)
- La suppression d'un produit entraîne la suppression de ses images et avis

### Contraintes métier
- Un utilisateur ne peut avoir qu'un seul avis par produit
- Une conversation doit impliquer un acheteur et un fournisseur différents
- Les produits en promotion doivent avoir une date de fin > date de début
- Les entreprises doivent être vérifiées avant de pouvoir publier des produits

## Règles de gestion

1. **Gestion des utilisateurs**
   - Vérification email obligatoire pour les fournisseurs
   - Système de suspension pour non-respect des conditions

2. **Gestion des produits**
   - Modération obligatoire avant publication
   - Système de signalement pour contenus inappropriés
   - Calcul automatique du score de popularité

3. **Gestion des conversations**
   - Archivage automatique après inactivité
   - Notifications en temps réel via WebSocket

4. **Gestion des notifications**
   - Différents types selon le rôle utilisateur
   - Système de priorité pour l'affichage

5. **Gestion des statistiques**
   - Calcul quotidien des vues et interactions
   - Historique des prix pour suivi des évolutions