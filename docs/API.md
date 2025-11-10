# 📡 Documentation API E-commerce

## 🔐 Authentification

### POST /api/auth/register
Inscription d'un nouvel utilisateur

**Body:**
```json
{
  "email": "user@example.com",
  "mot_de_passe": "password123",
  "nom": "Dupont",
  "prenom": "Jean",
  "telephone": "0123456789",
  "role_id": 1,
  "entreprise": {
    "nom_entreprise": "Ma Société",
    "secteur_activite_id": 1,
    "type_entreprise_id": 1
  }
}
```

**Réponse:**
```json
{
  "message": "Utilisateur créé avec succès",
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "nom": "Dupont",
    "role_id": 1
  }
}
```

### POST /api/auth/login
Connexion utilisateur

**Body:**
```json
{
  "email": "user@example.com",
  "mot_de_passe": "password123"
}
```

**Réponse:**
```json
{
  "message": "Connexion réussie",
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "nom": "Dupont",
    "role_id": 1
  }
}
```

### GET /api/auth/me
Récupérer le profil utilisateur actuel

**Headers:** `Authorization: Bearer <token>`

**Réponse:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "nom": "Dupont",
  "prenom": "Jean",
  "role_id": 1,
  "role": {
    "id": 1,
    "nom": "Acheteur"
  },
  "adresses": []
}
```

## 🛍️ Produits

### GET /api/products
Lister les produits avec pagination

**Query Parameters:**
- `page` (int): Numéro de page (défaut: 1)
- `limit` (int): Nombre d'éléments par page (défaut: 20)
- `search` (string): Recherche textuelle
- `categorie` (string): Slug de catégorie

**Réponse:**
```json
{
  "products": [
    {
      "id": 1,
      "nom": "Smartphone XYZ",
      "description": "Description du produit",
      "prix_unitaire": 299.99,
      "moq": 10,
      "stock_disponible": 100,
      "categorie_nom": "Électronique",
      "nom_entreprise": "TechCorp",
      "image_principale": "/uploads/products/image.jpg"
    }
  ]
}
```

### GET /api/products/featured
Produits vedettes (8 produits)

**Réponse:**
```json
{
  "products": [
    {
      "id": 1,
      "nom": "Produit Vedette",
      "prix_unitaire": 199.99,
      "image_principale": "/uploads/products/image.jpg",
      "note_moyenne": 4.5,
      "nombre_avis": 23
    }
  ]
}
```

### GET /api/products/:id
Détail d'un produit

**Réponse:**
```json
{
  "data": {
    "id": 1,
    "nom": "Smartphone XYZ",
    "description": "Description courte",
    "description_longue": "Description détaillée",
    "prix_unitaire": 299.99,
    "moq": 10,
    "stock_disponible": 100,
    "unite": "pièce",
    "categorie_nom": "Électronique",
    "nom_entreprise": "TechCorp",
    "images": [
      {
        "id": 1,
        "url": "/uploads/products/image1.jpg",
        "principale": 1
      }
    ],
    "couleurs_disponibles": ["Rouge", "Bleu"],
    "certifications": ["CE", "FCC"]
  }
}
```

### POST /api/products
Créer un produit (Fournisseurs uniquement)

**Headers:** `Authorization: Bearer <token>`
**Content-Type:** `multipart/form-data`

**Body:**
```json
{
  "nom": "Nouveau Produit",
  "description_longue": "Description détaillée",
  "prix_unitaire": 199.99,
  "moq": 5,
  "stock_disponible": 50,
  "unite": "pièce",
  "categorie_id": 1,
  "couleurs_disponibles": ["Rouge", "Bleu"],
  "certifications": ["CE"]
}
```

**Files:** `images[]` (jusqu'à 10 images)

**Réponse:**
```json
{
  "message": "Produit créé avec succès",
  "productId": 123,
  "imagesCount": 3
}
```

### PUT /api/products/:id
Modifier un produit (Fournisseurs uniquement)

**Headers:** `Authorization: Bearer <token>`

**Body:** Mêmes champs que POST (optionnels)

**Réponse:**
```json
{
  "message": "Produit mis à jour avec succès"
}
```

### DELETE /api/products/:id
Supprimer un produit (Fournisseurs uniquement)

**Headers:** `Authorization: Bearer <token>`

**Réponse:**
```json
{
  "message": "Produit \"Nom du produit\" supprimé avec succès",
  "productId": 123
}
```

### POST /api/products/:id/images
Ajouter des images à un produit existant

**Headers:** `Authorization: Bearer <token>`
**Content-Type:** `multipart/form-data`

**Files:** `images[]` (jusqu'à 10 images)

**Réponse:**
```json
{
  "message": "Images ajoutées avec succès",
  "productId": 123,
  "imagesCount": 2
}
```

## 📂 Catégories

### GET /api/categories
Lister toutes les catégories

**Réponse:**
```json
{
  "categories": [
    {
      "id": 1,
      "nom": "Électronique",
      "slug": "electronique",
      "description": "Produits électroniques",
      "image": "/uploads/categories/electronique.jpg"
    }
  ]
}
```

## 👥 Utilisateurs

### GET /api/users/profile
Récupérer le profil utilisateur

**Headers:** `Authorization: Bearer <token>`

**Réponse:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "nom": "Dupont",
  "prenom": "Jean",
  "telephone": "0123456789",
  "role_id": 1,
  "entreprise": {
    "nom_entreprise": "Ma Société",
    "secteur_activite": "Technologie"
  }
}
```

### PUT /api/users/profile
Modifier le profil utilisateur

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "nom": "Nouveau Nom",
  "prenom": "Nouveau Prénom",
  "telephone": "0987654321"
}
```

**Réponse:**
```json
{
  "message": "Profil mis à jour avec succès"
}
```

## 💬 Messagerie

### GET /api/messages/conversations
Lister les conversations

**Headers:** `Authorization: Bearer <token>`

**Réponse:**
```json
{
  "conversations": [
    {
      "id": 1,
      "other_party": {
        "id": 2,
        "nom": "Jean Dupont",
        "nom_entreprise": "TechCorp"
      },
      "last_message": {
        "contenu": "Bonjour, je suis intéressé par votre produit",
        "created_at": "2024-01-15T10:00:00.000Z"
      },
      "unread_count": 2
    }
  ]
}
```

### GET /api/messages/conversations/:id
Récupérer les messages d'une conversation

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (int): Numéro de page
- `limit` (int): Nombre de messages par page

**Réponse:**
```json
{
  "messages": [
    {
      "id": 1,
      "contenu": "Bonjour, je suis intéressé par votre produit",
      "expediteur_id": 2,
      "created_at": "2024-01-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### POST /api/messages/conversations/:id/messages
Envoyer un message

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "contenu": "Merci pour votre intérêt !"
}
```

**Réponse:**
```json
{
  "message": "Message envoyé avec succès",
  "message_id": 123
}
```

## 📄 Documents

### POST /api/supplier/documents/upload
Uploader un document (Fournisseurs uniquement)

**Headers:** `Authorization: Bearer <token>`
**Content-Type:** `multipart/form-data`

**Body:**
- `type_document` (string): Type de document
- `document` (file): Fichier à uploader

**Réponse:**
```json
{
  "message": "Document uploadé avec succès",
  "document_id": 123
}
```

### GET /api/supplier/documents
Lister les documents du fournisseur

**Headers:** `Authorization: Bearer <token>`

**Réponse:**
```json
{
  "documents": [
    {
      "id": 1,
      "type_document": "certificat_enregistrement",
      "nom_fichier": "certificat.pdf",
      "statut_verification": "en_attente",
      "uploaded_at": "2024-01-15T10:00:00.000Z"
    }
  ],
  "stats": {
    "total": 5,
    "en_attente": 2,
    "valides": 3
  }
}
```

### DELETE /api/supplier/documents/:id
Supprimer un document

**Headers:** `Authorization: Bearer <token>`

**Réponse:**
```json
{
  "message": "Document supprimé avec succès"
}
```

## 🔧 Administration

### GET /api/admin/stats
Statistiques administrateur

**Headers:** `Authorization: Bearer <token>`

**Réponse:**
```json
{
  "total_fournisseurs": 25,
  "total_acheteurs": 150
}
```

### GET /api/admin/users
Lister tous les utilisateurs

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (int): Numéro de page
- `limit` (int): Nombre d'éléments par page
- `role` (int): Filtrer par rôle
- `statut` (string): Filtrer par statut
- `search` (string): Recherche textuelle

**Réponse:**
```json
{
  "users": [
    {
      "id": 1,
      "nom": "Dupont",
      "prenom": "Jean",
      "email": "user@example.com",
      "role_nom": "Acheteur",
      "statut": "actif",
      "created_at": "2024-01-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### PATCH /api/admin/users/:id/activate
Activer un utilisateur

**Headers:** `Authorization: Bearer <token>`

**Réponse:**
```json
{
  "message": "Utilisateur activé avec succès"
}
```

### PATCH /api/admin/users/:id/suspend
Suspendre un utilisateur

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "raison": "Violation des conditions d'utilisation"
}
```

**Réponse:**
```json
{
  "message": "Utilisateur suspendu avec succès"
}
```

### GET /api/admin/users/:id/documents
Récupérer les documents d'un utilisateur

**Headers:** `Authorization: Bearer <token>`

**Réponse:**
```json
{
  "documents": [
    {
      "id": 1,
      "type_document": "certificat_enregistrement",
      "nom_fichier": "certificat.pdf",
      "statut_verification": "en_attente",
      "uploaded_at": "2024-01-15T10:00:00.000Z"
    }
  ]
}
```

### PATCH /api/admin/documents/:id/validate
Valider ou rejeter un document

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "status": "approved",
  "commentaire": "Document conforme"
}
```

**Réponse:**
```json
{
  "message": "Document validé avec succès"
}
```

## 🔑 Rôles Utilisateurs

- **1** = Acheteur (peut consulter produits, envoyer messages)
- **2** = Fournisseur (peut créer produits, gérer documents)
- **3** = Administrateur (accès complet)

## 📝 Codes de Statut

### Statuts Utilisateur
- `actif` = Compte actif
- `inactif` = Compte inactif (fournisseurs en attente de validation)
- `suspendu` = Compte suspendu

### Statuts Document
- `en_attente` = En attente de validation
- `verifie` = Validé
- `rejete` = Rejeté

## 🚨 Codes d'Erreur

- `400` = Requête invalide
- `401` = Non authentifié
- `403` = Accès refusé
- `404` = Ressource non trouvée
- `422` = Données de validation invalides
- `500` = Erreur serveur interne