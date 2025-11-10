# Dictionnaire de données - GabMarketHub

## Vue d'ensemble
Ce document présente le dictionnaire complet des données de la base de données GabMarketHub, une plateforme marketplace B2B pour le Gabon.

## Table: `utilisateurs`
| Champ | Type | Taille | Null | Défaut | Commentaire |
|-------|------|--------|------|--------|-------------|
| id | INT | 11 | NON | AUTO_INCREMENT | Identifiant unique de l'utilisateur |
| email | VARCHAR | 255 | NON | - | Adresse email (unique) |
| photo_profil | VARCHAR | 255 | OUI | NULL | Chemin vers la photo de profil |
| mot_de_passe | VARCHAR | 255 | NON | - | Mot de passe crypté (bcrypt) |
| nom | VARCHAR | 100 | NON | - | Nom de famille |
| prenom | VARCHAR | 100 | OUI | NULL | Prénom |
| telephone | VARCHAR | 20 | OUI | NULL | Numéro de téléphone |
| role_id | INT | 11 | NON | - | Référence vers la table roles |
| statut | ENUM | - | OUI | 'actif' | État du compte: actif, suspendu, inactif |
| date_inscription | TIMESTAMP | - | NON | CURRENT_TIMESTAMP | Date d'inscription |
| derniere_connexion | TIMESTAMP | - | OUI | NULL | Dernière connexion |
| login_attempts | INT | 11 | OUI | 0 | Nombre de tentatives de connexion |
| locked_until | TIMESTAMP | - | OUI | NULL | Blocage du compte jusqu'à |
| email_verified | TINYINT | 1 | OUI | 0 | Email vérifié (0/1) |
| suspension_reason | TEXT | - | OUI | NULL | Raison de la suspension |

## Table: `roles`
| Champ | Type | Taille | Null | Défaut | Commentaire |
|-------|------|--------|------|--------|-------------|
| id | INT | 11 | NON | AUTO_INCREMENT | Identifiant unique |
| nom | VARCHAR | 50 | NON | - | Nom du rôle (unique) |
| description | TEXT | - | OUI | NULL | Description du rôle |
| created_at | TIMESTAMP | - | NON | CURRENT_TIMESTAMP | Date de création |

**Valeurs possibles pour `nom`:**
- acheteur: Utilisateur qui achète des produits
- fournisseur: Entreprise qui vend des produits  
- administrateur: Gestionnaire de la plateforme

## Table: `entreprises`
| Champ | Type | Taille | Null | Défaut | Commentaire |
|-------|------|--------|------|--------|-------------|
| id | INT | 11 | NON | AUTO_INCREMENT | Identifiant unique |
| utilisateur_id | INT | 11 | NON | - | Référence vers utilisateurs |
| nom_entreprise | VARCHAR | 255 | NON | - | Nom commercial |
| description | TEXT | - | OUI | NULL | Description de l'entreprise |
| logo | VARCHAR | 255 | OUI | NULL | Chemin vers le logo |
| site_web | VARCHAR | 255 | OUI | NULL | URL du site web |
| numero_siret | VARCHAR | 50 | OUI | NULL | Numéro SIRET/NIF |
| numero_registre_commerce | VARCHAR | 50 | OUI | NULL | Numéro registre commerce |
| numero_tva | VARCHAR | 50 | OUI | NULL | Numéro TVA |
| statut_verification | ENUM | - | OUI | 'en_attente' | État: en_attente, verifie, rejete |
| note_moyenne | DECIMAL | 3,2 | OUI | 0.00 | Note moyenne (0.00-5.00) |
| nombre_avis | INT | 11 | OUI | 0 | Nombre total d'avis |
| telephone_professionnel | VARCHAR | 20 | OUI | NULL | Téléphone professionnel |
| adresse_ligne1 | VARCHAR | 255 | OUI | NULL | Première ligne d'adresse |
| ville | VARCHAR | 100 | OUI | NULL | Ville |
| code_postal | VARCHAR | 20 | OUI | NULL | Code postal |
| pays | VARCHAR | 100 | OUI | 'Gabon' | Pays |
| secteur_activite_id | INT | 11 | OUI | NULL | Référence secteur d'activité |
| type_entreprise_id | INT | 11 | OUI | NULL | Référence type d'entreprise |
| annee_creation | YEAR | 4 | OUI | NULL | Année de création |
| nombre_employes | INT | 11 | OUI | NULL | Nombre d'employés |
| capacite_production | TEXT | - | OUI | NULL | Capacité de production |
| certifications | TEXT | - | OUI | NULL | Certifications possédées |

## Table: `secteurs_activite`
| Champ | Type | Taille | Null | Défaut | Commentaire |
|-------|------|--------|------|--------|-------------|
| id | INT | 11 | NON | AUTO_INCREMENT | Identifiant unique |
| nom | VARCHAR | 255 | NON | - | Nom du secteur |
| description | TEXT | - | OUI | NULL | Description du secteur |
| created_at | TIMESTAMP | - | NON | CURRENT_TIMESTAMP | Date de création |

**Exemples de secteurs:**
- Agriculture et Agroalimentaire
- Textile et Habillement  
- Électronique et High-Tech
- Construction et BTP
- Santé et Médical

## Table: `types_entreprise`
| Champ | Type | Taille | Null | Défaut | Commentaire |
|-------|------|--------|------|--------|-------------|
| id | INT | 11 | NON | AUTO_INCREMENT | Identifiant unique |
| nom | VARCHAR | 100 | NON | - | Nom du type |
| description | TEXT | - | OUI | NULL | Description du type |
| created_at | TIMESTAMP | - | NON | CURRENT_TIMESTAMP | Date de création |

**Types disponibles:**
- Fabricant: Entreprise qui produit des biens
- Grossiste: Entreprise qui vend en gros
- Distributeur: Entreprise qui distribue des produits
- Importateur: Entreprise qui importe des produits
- Exportateur: Entreprise qui exporte des produits

## Table: `categories`
| Champ | Type | Taille | Null | Défaut | Commentaire |
|-------|------|--------|------|--------|-------------|
| id | INT | 11 | NON | AUTO_INCREMENT | Identifiant unique |
| nom | VARCHAR | 100 | NON | - | Nom de la catégorie |
| slug | VARCHAR | 100 | NON | - | URL-friendly (unique) |
| description | TEXT | - | OUI | NULL | Description de la catégorie |
| image | VARCHAR | 255 | OUI | NULL | Image de la catégorie |
| parent_id | INT | 11 | OUI | NULL | Catégorie parent (hiérarchie) |
| ordre | INT | 11 | OUI | 0 | Ordre d'affichage |
| actif | TINYINT | 1 | OUI | 1 | Catégorie active (0/1) |
| created_at | TIMESTAMP | - | NON | CURRENT_TIMESTAMP | Date de création |

## Table: `produits`
| Champ | Type | Taille | Null | Défaut | Commentaire |
|-------|------|--------|------|--------|-------------|
| id | INT | 11 | NON | AUTO_INCREMENT | Identifiant unique |
| fournisseur_id | INT | 11 | NON | - | Référence vers entreprises |
| categorie_id | INT | 11 | NON | - | Référence vers categories |
| nom | VARCHAR | 255 | NON | - | Nom du produit |
| marque | VARCHAR | 100 | OUI | NULL | Marque du produit |
| reference_produit | VARCHAR | 100 | OUI | NULL | Référence interne |
| slug | VARCHAR | 255 | NON | - | URL-friendly |
| description | TEXT | - | OUI | NULL | Description courte |
| description_longue | TEXT | - | OUI | NULL | Description détaillée |
| fonctionnalites | TEXT | - | OUI | NULL | Liste des fonctionnalités |
| instructions_utilisation | TEXT | - | OUI | NULL | Instructions d'utilisation |
| materiaux | TEXT | - | OUI | NULL | Matériaux utilisés |
| couleurs_disponibles | JSON | - | OUI | NULL | Couleurs disponibles |
| certifications | JSON | - | OUI | NULL | Certifications du produit |
| prix_unitaire | DECIMAL | 10,2 | NON | - | Prix unitaire en FCFA |
| prix_promo | DECIMAL | 10,2 | OUI | NULL | Prix promotionnel |
| note_moyenne | DECIMAL | 2,1 | OUI | 0.0 | Note moyenne (0.0-5.0) |
| nombre_avis | INT | 11 | OUI | 0 | Nombre d'avis |
| stock_disponible | INT | 11 | OUI | 0 | Stock disponible |
| moq | INT | 11 | OUI | 1 | Quantité minimum commande |
| unite | VARCHAR | 50 | OUI | 'pièce' | Unité de mesure |
| poids | DECIMAL | 8,2 | OUI | NULL | Poids en kg |
| dimensions | VARCHAR | 100 | OUI | NULL | Dimensions (L x l x h) |
| statut | ENUM | - | OUI | 'actif' | État: actif, inactif, suspendu |
| featured | TINYINT | 1 | OUI | 0 | Produit mis en avant (0/1) |
| statut_moderation | ENUM | - | OUI | 'en_attente' | État modération |
| est_en_offre | TINYINT | 1 | OUI | 0 | En promotion (0/1) |
| type_offre | ENUM | - | OUI | NULL | Type d'offre |
| vues_30j | INT | 11 | OUI | 0 | Vues sur 30 jours |
| ventes_30j | INT | 11 | OUI | 0 | Ventes sur 30 jours |
| score_popularite | DECIMAL | 5,2 | OUI | 0.00 | Score de popularité calculé |

**Valeurs ENUM pour `statut_moderation`:**
- en_attente: En attente de modération
- approuve: Approuvé par l'admin
- rejete: Rejeté par l'admin
- revision_requise: Modifications demandées

**Valeurs ENUM pour `type_offre`:**
- reduction: Réduction de prix
- flash_sale: Vente flash
- bundle: Offre groupée
- clearance: Liquidation

## Table: `images_produits`
| Champ | Type | Taille | Null | Défaut | Commentaire |
|-------|------|--------|------|--------|-------------|
| id | INT | 11 | NON | AUTO_INCREMENT | Identifiant unique |
| produit_id | INT | 11 | NON | - | Référence vers produits |
| url | VARCHAR | 255 | NON | - | URL de l'image |
| alt_text | VARCHAR | 255 | OUI | NULL | Texte alternatif |
| type_image | ENUM | - | OUI | 'galerie' | Type d'image |
| largeur | INT | - | OUI | NULL | Largeur en pixels |
| hauteur | INT | - | OUI | NULL | Hauteur en pixels |
| taille_fichier | INT | - | OUI | NULL | Taille en octets |
| ordre | INT | - | OUI | 0 | Ordre d'affichage |
| principale | TINYINT | 1 | OUI | 0 | Image principale (0/1) |
| created_at | TIMESTAMP | - | NON | CURRENT_TIMESTAMP | Date d'ajout |

**Types d'images:**
- principale: Image principale du produit
- galerie: Images de la galerie
- detail: Images de détail
- usage: Images d'utilisation
- taille: Images de guide des tailles

## Table: `conversations`
| Champ | Type | Taille | Null | Défaut | Commentaire |
|-------|------|--------|------|--------|-------------|
| id | INT | 11 | NON | AUTO_INCREMENT | Identifiant unique |
| acheteur_id | INT | 11 | NON | - | Référence vers utilisateurs |
| fournisseur_id | INT | 11 | NON | - | Référence vers utilisateurs |
| produit_id | INT | 11 | OUI | NULL | Produit concerné (optionnel) |
| sujet | VARCHAR | 255 | OUI | NULL | Sujet de la conversation |
| statut | ENUM | - | OUI | 'ouverte' | État: ouverte, fermee |
| derniere_activite | TIMESTAMP | - | OUI | CURRENT_TIMESTAMP | Dernière activité |
| messages_non_lus_acheteur | INT | 11 | OUI | 0 | Messages non lus côté acheteur |
| messages_non_lus_fournisseur | INT | 11 | OUI | 0 | Messages non lus côté fournisseur |
| archivee | TINYINT | 1 | OUI | 0 | Conversation archivée (0/1) |
| priorite | ENUM | - | OUI | 'normale' | Priorité: normale, haute, urgente |
| tags | JSON | - | OUI | NULL | Tags de classification |

## Table: `messages`
| Champ | Type | Taille | Null | Défaut | Commentaire |
|-------|------|--------|------|--------|-------------|
| id | INT | 11 | NON | AUTO_INCREMENT | Identifiant unique |
| conversation_id | INT | 11 | NON | - | Référence vers conversations |
| expediteur_id | INT | 11 | NON | - | Référence vers utilisateurs |
| contenu | TEXT | - | NON | - | Contenu du message |
| lu | TINYINT | 1 | OUI | 0 | Message lu (0/1) |
| type | ENUM | - | OUI | 'texte' | Type de message |
| fichier_url | VARCHAR | 500 | OUI | NULL | URL du fichier joint |
| fichier_nom | VARCHAR | 255 | OUI | NULL | Nom du fichier |
| fichier_taille | INT | - | OUI | NULL | Taille du fichier |
| fichier_type | VARCHAR | 100 | OUI | NULL | Type MIME du fichier |
| message_parent_id | INT | 11 | OUI | NULL | Message parent (réponse) |
| edited_at | TIMESTAMP | - | OUI | NULL | Date de modification |
| deleted_at | TIMESTAMP | - | OUI | NULL | Date de suppression |
| metadata | JSON | - | OUI | NULL | Métadonnées additionnelles |
| created_at | TIMESTAMP | - | NON | CURRENT_TIMESTAMP | Date de création |

**Types de messages:**
- texte: Message textuel simple
- image: Image envoyée
- fichier: Fichier joint
- systeme: Message automatique du système

## Table: `notifications`
| Champ | Type | Taille | Null | Défaut | Commentaire |
|-------|------|--------|------|--------|-------------|
| id | INT | 11 | NON | AUTO_INCREMENT | Identifiant unique |
| utilisateur_id | INT | 11 | NON | - | Destinataire de la notification |
| titre | VARCHAR | 255 | NON | - | Titre de la notification |
| message | TEXT | - | NON | - | Message de la notification |
| type | ENUM | - | NON | - | Type de notification |
| category | VARCHAR | 50 | OUI | 'general' | Catégorie spécifique |
| lu | TINYINT | 1 | OUI | 0 | Notification lue (0/1) |
| priority | ENUM | - | OUI | 'medium' | Priorité d'affichage |
| data | JSON | - | OUI | NULL | Données structurées |
| related_user_id | INT | 11 | OUI | NULL | Utilisateur lié |
| related_product_id | INT | 11 | OUI | NULL | Produit lié |
| related_conversation_id | INT | 11 | OUI | NULL | Conversation liée |
| url | VARCHAR | 255 | OUI | NULL | Lien d'action |
| created_at | TIMESTAMP | - | NON | CURRENT_TIMESTAMP | Date de création |
| read_at | TIMESTAMP | - | OUI | NULL | Date de lecture |

**Types de notifications:**
- message: Nouveau message reçu
- commande: Notification de commande
- promotion: Offre promotionnelle
- systeme: Message système
- produit: Notification produit
- user_management: Gestion utilisateur
- product_management: Gestion produit

**Niveaux de priorité:**
- low: Priorité faible
- medium: Priorité moyenne
- high: Priorité haute
- urgent: Priorité urgente

## Table: `avis_produits`
| Champ | Type | Taille | Null | Défaut | Commentaire |
|-------|------|--------|------|--------|-------------|
| id | INT | 11 | NON | AUTO_INCREMENT | Identifiant unique |
| produit_id | INT | 11 | NON | - | Référence vers produits |
| utilisateur_id | INT | 11 | NON | - | Référence vers utilisateurs |
| note | INT | - | NON | - | Note de 1 à 5 |
| commentaire | TEXT | - | OUI | NULL | Commentaire textuel |
| achat_verifie | TINYINT | 1 | OUI | 0 | Achat vérifié (0/1) |
| statut | ENUM | - | OUI | 'approuve' | État de modération |
| date_moderation | TIMESTAMP | - | OUI | NULL | Date de modération |
| moderateur_id | INT | 11 | OUI | NULL | Modérateur |
| raison_rejet | TEXT | - | OUI | NULL | Raison du rejet |
| ip_address | VARCHAR | 45 | OUI | NULL | Adresse IP |
| user_agent | TEXT | - | OUI | NULL | User agent du navigateur |
| date_creation | TIMESTAMP | - | NON | CURRENT_TIMESTAMP | Date de création |

**Contrainte:** Un utilisateur ne peut laisser qu'un seul avis par produit

## Table: `favoris`
| Champ | Type | Taille | Null | Défaut | Commentaire |
|-------|------|--------|------|--------|-------------|
| id | INT | 11 | NON | AUTO_INCREMENT | Identifiant unique |
| utilisateur_id | INT | 11 | NON | - | Référence vers utilisateurs |
| produit_id | INT | 11 | NON | - | Référence vers produits |
| created_at | TIMESTAMP | - | NON | CURRENT_TIMESTAMP | Date d'ajout aux favoris |

**Contrainte:** Un utilisateur ne peut ajouter un produit qu'une seule fois en favori

## Table: `documents_entreprise`
| Champ | Type | Taille | Null | Défaut | Commentaire |
|-------|------|--------|------|--------|-------------|
| id | INT | 11 | NON | AUTO_INCREMENT | Identifiant unique |
| entreprise_id | INT | 11 | NON | - | Référence vers entreprises |
| type_document | ENUM | - | NON | - | Type de document |
| nom_fichier | VARCHAR | 255 | NON | - | Nom original du fichier |
| chemin_fichier | VARCHAR | 500 | NON | - | Chemin de stockage |
| taille_fichier | INT | - | OUI | NULL | Taille en octets |
| type_mime | VARCHAR | 100 | OUI | NULL | Type MIME |
| statut_verification | ENUM | - | OUI | 'en_attente' | État de vérification |
| commentaire_verification | TEXT | - | OUI | NULL | Commentaire de vérification |
| uploaded_at | TIMESTAMP | - | NON | CURRENT_TIMESTAMP | Date d'upload |
| verified_at | TIMESTAMP | - | OUI | NULL | Date de vérification |

**Types de documents:**
- certificat_enregistrement: Certificat d'enregistrement (obligatoire)
- certificat_fiscal: Certificat fiscal (obligatoire)
- piece_identite_representant: Pièce d'identité du représentant (obligatoire)
- licence_commerciale: Licence commerciale (selon secteur)
- certificat_origine: Certificat d'origine (produits alimentaires/agricoles)
- conformite_ce: Conformité CE (produits électroniques)
- certificat_sanitaire: Certificat sanitaire (produits alimentaires)
- autre: Autre document spécifique

## Table: `statistiques_produits`
| Champ | Type | Taille | Null | Défaut | Commentaire |
|-------|------|--------|------|--------|-------------|
| id | INT | 11 | NON | AUTO_INCREMENT | Identifiant unique |
| produit_id | INT | 11 | NON | - | Référence vers produits |
| date | DATE | - | NON | - | Date de la statistique |
| vues | INT | - | OUI | 0 | Nombre de vues |
| clics | INT | - | OUI | 0 | Nombre de clics |
| ajouts_favoris | INT | - | OUI | 0 | Ajouts aux favoris |
| partages | INT | - | OUI | 0 | Nombre de partages |
| created_at | TIMESTAMP | - | OUI | CURRENT_TIMESTAMP | Date de création |

**Contrainte:** Une seule entrée par produit et par date

## Table: `articles_blog`
| Champ | Type | Taille | Null | Défaut | Commentaire |
|-------|------|--------|------|--------|-------------|
| id | INT | 11 | NON | AUTO_INCREMENT | Identifiant unique |
| titre | VARCHAR | 255 | NON | - | Titre de l'article |
| slug | VARCHAR | 255 | NON | - | URL-friendly (unique) |
| extrait | TEXT | - | OUI | NULL | Extrait/résumé |
| contenu | LONGTEXT | - | NON | - | Contenu complet |
| image_principale | VARCHAR | 500 | OUI | NULL | Image principale |
| images_supplementaires | JSON | - | OUI | NULL | Images supplémentaires |
| auteur_id | INT | 11 | OUI | NULL | Référence vers utilisateurs |
| auteur_nom | VARCHAR | 255 | NON | - | Nom de l'auteur |
| categorie | VARCHAR | 100 | NON | - | Catégorie de l'article |
| tags | JSON | - | OUI | NULL | Tags de l'article |
| produits_lies | JSON | - | OUI | NULL | IDs des produits liés |
| est_a_la_une | TINYINT | 1 | OUI | 0 | Article à la une (0/1) |
| est_publie | TINYINT | 1 | OUI | 0 | Article publié (0/1) |
| date_publication | DATETIME | - | OUI | NULL | Date de publication |
| nombre_vues | INT | - | OUI | 0 | Nombre de vues |
| nombre_likes | INT | - | OUI | 0 | Nombre de likes |
| nombre_partages | INT | - | OUI | 0 | Nombre de partages |
| temps_lecture | INT | - | OUI | 0 | Temps de lecture estimé (minutes) |
| meta_description | VARCHAR | 160 | OUI | NULL | Description SEO |
| meta_mots_cles | VARCHAR | 255 | OUI | NULL | Mots-clés SEO |

## Table: `evenements_commerciaux`
| Champ | Type | Taille | Null | Défaut | Commentaire |
|-------|------|--------|------|--------|-------------|
| id | INT | 11 | NON | AUTO_INCREMENT | Identifiant unique |
| titre | VARCHAR | 255 | NON | - | Titre de l'événement |
| description | TEXT | - | OUI | NULL | Description complète |
| description_courte | VARCHAR | 500 | OUI | NULL | Description courte |
| type | ENUM | - | NON | - | Type d'événement |
| date_debut | DATETIME | - | NON | - | Date de début |
| date_fin | DATETIME | - | OUI | NULL | Date de fin |
| lieu | VARCHAR | 255 | OUI | NULL | Lieu physique |
| est_en_ligne | TINYINT | 1 | OUI | 0 | Événement en ligne (0/1) |
| lien_webinaire | VARCHAR | 500 | OUI | NULL | Lien du webinaire |
| organisateur_nom | VARCHAR | 255 | NON | - | Nom de l'organisateur |
| prix_participation | DECIMAL | 10,2 | OUI | 0.00 | Prix en FCFA |
| est_gratuit | TINYINT | 1 | OUI | 1 | Événement gratuit (0/1) |
| nombre_participants | INT | - | OUI | 0 | Nombre de participants |
| nombre_max_participants | INT | - | OUI | NULL | Limite de participants |
| est_populaire | TINYINT | 1 | OUI | 0 | Événement populaire (0/1) |
| est_actif | TINYINT | 1 | OUI | 1 | Événement actif (0/1) |
| tags | JSON | - | OUI | NULL | Tags de l'événement |
| produits_lies | JSON | - | OUI | NULL | IDs des produits liés |
| statut | ENUM | - | OUI | 'brouillon' | État de l'événement |

**Types d'événements:**
- salon: Salon professionnel
- conference: Conférence
- webinar: Webinaire en ligne
- promotion: Événement promotionnel
- lancement: Lancement de produit
- flash_sale: Vente flash
- partenariat: Événement de partenariat

**États possibles:**
- brouillon: En préparation
- programme: Programmé
- en_cours: En cours
- termine: Terminé
- annule: Annulé

## Tables administratives

## Table: `admin_audit_logs`
| Champ | Type | Taille | Null | Défaut | Commentaire |
|-------|------|--------|------|--------|-------------|
| id | INT | 11 | NON | AUTO_INCREMENT | Identifiant unique |
| admin_id | INT | 11 | NON | - | Administrateur concerné |
| action | VARCHAR | 100 | NON | - | Action effectuée |
| table_name | VARCHAR | 50 | NON | - | Table concernée |
| record_id | INT | 11 | OUI | NULL | ID de l'enregistrement |
| old_values | JSON | - | OUI | NULL | Anciennes valeurs |
| new_values | JSON | - | OUI | NULL | Nouvelles valeurs |
| ip_address | VARCHAR | 45 | OUI | NULL | Adresse IP |
| user_agent | TEXT | - | OUI | NULL | User agent |
| session_id | VARCHAR | 255 | OUI | NULL | ID de session |
| created_at | TIMESTAMP | - | OUI | CURRENT_TIMESTAMP | Date de l'action |

## Table: `admin_notifications`
| Champ | Type | Taille | Null | Défaut | Commentaire |
|-------|------|--------|------|--------|-------------|
| id | INT | 11 | NON | AUTO_INCREMENT | Identifiant unique |
| admin_id | INT | 11 | OUI | NULL | Administrateur destinataire |
| type | VARCHAR | 50 | NON | - | Type de notification |
| category | VARCHAR | 50 | OUI | 'general' | Catégorie |
| title | VARCHAR | 255 | NON | - | Titre |
| message | TEXT | - | NON | - | Message |
| data | JSON | - | OUI | NULL | Données structurées |
| is_read | TINYINT | 1 | OUI | 0 | Notification lue (0/1) |
| priority | ENUM | - | OUI | 'medium' | Priorité |
| user_id | INT | 11 | OUI | NULL | Utilisateur concerné |
| product_id | INT | 11 | OUI | NULL | Produit concerné |
| created_at | TIMESTAMP | - | OUI | CURRENT_TIMESTAMP | Date de création |
| read_at | TIMESTAMP | - | OUI | NULL | Date de lecture |

## Tables de sécurité

## Table: `password_reset_tokens`
| Champ | Type | Taille | Null | Défaut | Commentaire |
|-------|------|--------|------|--------|-------------|
| id | INT | 11 | NON | AUTO_INCREMENT | Identifiant unique |
| utilisateur_id | INT | 11 | NON | - | Utilisateur concerné |
| token | VARCHAR | 64 | NON | - | Token de réinitialisation (unique) |
| expires_at | DATETIME | - | NON | - | Date d'expiration |
| used | TINYINT | 1 | OUI | 0 | Token utilisé (0/1) |
| used_at | DATETIME | - | OUI | NULL | Date d'utilisation |
| created_at | TIMESTAMP | - | OUI | CURRENT_TIMESTAMP | Date de création |

## Table: `email_notifications`
| Champ | Type | Taille | Null | Défaut | Commentaire |
|-------|------|--------|------|--------|-------------|
| id | INT | 11 | NON | AUTO_INCREMENT | Identifiant unique |
| utilisateur_id | INT | 11 | NON | - | Destinataire |
| type_notification | VARCHAR | 50 | NON | - | Type de notification |
| sujet | VARCHAR | 255 | NON | - | Sujet de l'email |
| contenu | TEXT | - | NON | - | Contenu HTML |
| statut_envoi | ENUM | - | OUI | 'pending' | État d'envoi |
| tentatives | INT | - | OUI | 0 | Nombre de tentatives |
| erreur_envoi | TEXT | - | OUI | NULL | Erreur d'envoi |
| date_creation | TIMESTAMP | - | OUI | CURRENT_TIMESTAMP | Date de création |
| date_envoi | TIMESTAMP | - | OUI | NULL | Date d'envoi effectif |

**États d'envoi:**
- pending: En attente d'envoi
- sent: Envoyé avec succès
- failed: Échec d'envoi

## Vues

## Vue: `vue_produits_complets`
Vue combinant les informations des produits avec leurs catégories et fournisseurs.

**Colonnes principales:**
- Toutes les colonnes de `produits`
- `categorie_nom`: Nom de la catégorie
- `categorie_slug`: Slug de la catégorie  
- `entreprise_nom`: Nom de l'entreprise fournisseur

## Vue: `vue_produits_populaires`
Vue des produits triés par popularité avec informations enrichies.

**Colonnes supplémentaires:**
- `fournisseur_nom`: Nom du fournisseur
- `categorie_nom`: Nom de la catégorie
- `prix_final`: Prix final (avec promotion si applicable)

## Vue: `vue_produits_en_offre`
Vue des produits actuellement en promotion.

**Colonnes calculées:**
- `pourcentage_economie`: Pourcentage d'économie réalisée
- `jours_restants`: Nombre de jours restants pour la promotion
- `prix_final`: Prix après réduction

## Contraintes d'intégrité

### Contraintes de clés étrangères
- Toutes les tables référençant d'autres tables ont des contraintes FK
- Suppression en cascade pour les données dépendantes
- Suppression en SET NULL pour les références optionnelles

### Contraintes de validation
- Prix strictement positifs
- Notes entre 1 et 5
- Pourcentages entre 0 et 100
- Emails au format valide
- Dates de promotion cohérentes

### Contraintes d'unicité
- Email utilisateur unique
- Slug de catégorie unique
- Slug d'article unique
- Token de réinitialisation unique
- Un seul avis par utilisateur et produit
- Un seul favori par utilisateur et produit

### Index de performance
- Index sur clés étrangères
- Index composites pour requêtes fréquentes
- Index full-text pour recherche
- Index sur colonnes de tri et filtrage

## Règles métier implémentées

1. **Utilisateurs:**
   - Email unique obligatoire
   - Vérification email pour fournisseurs
   - Système de suspension avec raison

2. **Produits:**
   - Modération obligatoire avant publication
   - Calcul automatique score popularité
   - Gestion des promotions avec dates

3. **Conversations:**
   - Compteurs de messages non lus automatiques
   - Archivage automatique après inactivité

4. **Notifications:**
   - Priorités pour l'affichage
   - Catégorisation par type et utilisateur
   - Données JSON pour flexibilité

5. **Statistiques:**
   - Calcul quotidien automatique
   - Historique des vues et interactions
   - Mise à jour en temps réel des compteurs