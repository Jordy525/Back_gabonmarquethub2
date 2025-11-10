# 🛣️ Documentation des Routes Backend

## 🔐 Routes d'Authentification (/api/auth)

### POST /api/auth/register
**Inscription d'un nouvel utilisateur**

```javascript
// Middleware: authRateLimit, securityLogger, timingAttackProtection
// Validation: email, mot_de_passe (min 6), nom, role_id (1-3)

// Body
{
  "email": "user@example.com",
  "mot_de_passe": "password123",
  "nom": "Dupont",
  "prenom": "Jean",
  "telephone": "0123456789",
  "role_id": 1, // 1=Acheteur, 2=Fournisseur, 3=Admin
  "entreprise": { // Optionnel pour fournisseurs
    "nom_entreprise": "Ma Société",
    "secteur_activite_id": 1,
    "type_entreprise_id": 1,
    "adresse_ligne1": "123 Rue Example",
    "ville": "Paris",
    "code_postal": "75001",
    "numero_siret": "12345678901234"
  }
}

// Réponse 201
{
  "message": "Utilisateur créé avec succès",
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "nom": "Dupont",
    "role_id": 1,
    "entreprise_id": 123 // Si fournisseur
  }
}

// Logique métier
- Vérification unicité email
- Hachage bcrypt du mot de passe (12 rounds)
- Création utilisateur + entreprise (si fournisseur)
- Génération token JWT
- Transaction atomique
```

### POST /api/auth/login
**Connexion utilisateur avec debug complet**

```javascript
// Middleware: authRateLimit, securityLogger, timingAttackProtection
// Validation: email, mot_de_passe

// Body
{
  "email": "user@example.com",
  "mot_de_passe": "password123"
}

// Réponse 200
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

// Debug intégré
- Vérification variables d'environnement
- Test connexion base de données
- Logs détaillés à chaque étape
- Gestion d'erreurs spécifiques
- Mise à jour dernière_connexion
```

### GET /api/auth/me
**Profil utilisateur actuel**

```javascript
// Middleware: authenticateToken
// Headers: Authorization: Bearer <token>

// Réponse 200
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
  "entreprise": { // Si fournisseur
    "id": 123,
    "nom_entreprise": "Ma Société",
    "secteur_activite": {
      "id": 1,
      "nom": "Électronique"
    }
  },
  "adresses": []
}

// Logique
- Récupération avec jointures (roles, entreprises)
- Enrichissement des données de relation
- Adresses utilisateur
```

### POST /api/auth/logout
**Déconnexion (côté client)**

```javascript
// Middleware: authenticateToken
// Réponse 200
{
  "message": "Déconnexion réussie"
}
```

### GET /api/auth/test
**Diagnostic système**

```javascript
// Réponse 200
{
  "message": "Test de diagnostic auth",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "environment": {
    "JWT_SECRET": "Défini",
    "DB_HOST": "Défini"
  },
  "database": {
    "status": "OK",
    "userCount": 150
  },
  "modules": {
    "bcrypt": "OK",
    "jwt": "OK"
  }
}
```

## 🛍️ Routes Produits (/api/products)

### GET /api/products
**Liste des produits avec filtrage intelligent**

```javascript
// Query params: page, limit, search, categorie
// Filtrage automatique par rôle utilisateur

// Logique de filtrage
- Public: Tous les produits actifs
- Acheteur: Tous les produits actifs
- Fournisseur: Ses propres produits uniquement

// Réponse 200
{
  "products": [
    {
      "id": 1,
      "nom": "Smartphone XYZ",
      "prix_unitaire": 299.99,
      "stock_disponible": 100,
      "categorie_nom": "Électronique",
      "nom_entreprise": "TechCorp",
      "image_principale": "/uploads/products/image.jpg"
    }
  ]
}
```

### GET /api/products/featured
**Produits vedettes (8 produits)**

```javascript
// Réponse 200
{
  "products": [
    {
      "id": 1,
      "nom": "Produit Vedette",
      "prix_unitaire": 199.99,
      "image_principale": "/uploads/products/image.jpg",
      "note_moyenne": 0,
      "nombre_avis": 0
    }
  ]
}

// Logique
- Tri par date de création DESC
- Limite à 8 produits
- Jointures optimisées
- Gestion des tables vides
```

### GET /api/products/public
**Produits pour visiteurs non connectés**

```javascript
// Query params: page, limit, categorie, search

// Réponse 200
{
  "products": [
    {
      "id": 1,
      "nom": "Smartphone XYZ",
      "categorie_nom": "Électronique",
      "nom_entreprise": "TechCorp",
      "image_principale": "/uploads/products/image.jpg"
    }
  ]
}
```

### GET /api/products/:id
**Détail d'un produit**

```javascript
// Réponse 200
{
  "data": {
    "id": 1,
    "nom": "Smartphone XYZ",
    "description": "Description courte",
    "description_longue": "Description détaillée",
    "prix_unitaire": 299.99,
    "moq": 10,
    "stock_disponible": 100,
    "images": [
      {
        "id": 1,
        "url": "/uploads/products/image1.jpg",
        "principale": 1,
        "ordre": 0
      }
    ],
    "couleurs_disponibles": ["Rouge", "Bleu"],
    "certifications": ["CE", "FCC"],
    "prix_degressifs": []
  }
}

// Logique
- Récupération avec jointures
- Images triées par ordre
- Parsing JSON des champs complexes
- Gestion des erreurs de parsing
```

### POST /api/products
**Créer un produit avec images**

```javascript
// Middleware: authenticateToken, requireRole([2]), upload.array('images', 10)
// Content-Type: multipart/form-data

// Body (form-data)
{
  "nom": "Nouveau Produit",
  "description_longue": "Description détaillée",
  "prix_unitaire": 199.99,
  "moq": 5,
  "stock_disponible": 50,
  "categorie_id": 1,
  "couleurs_disponibles": ["Rouge", "Bleu"],
  "certifications": ["CE"]
}
// + files: images[]

// Réponse 201
{
  "message": "Produit créé avec succès",
  "productId": 123,
  "imagesCount": 3
}

// Logique
- Vérification entreprise fournisseur
- Validation champs obligatoires
- Génération slug automatique
- Traitement champs JSON
- Upload et insertion images
- Transaction atomique
- Debug complet des images
```

### PUT /api/products/:id
**Modifier un produit**

```javascript
// Middleware: authenticateToken, requireRole([2])
// Vérification propriété du produit

// Body: Champs à modifier (optionnels)
{
  "nom": "Nom modifié",
  "prix_unitaire": 249.99,
  "stock_disponible": 75
}

// Réponse 200
{
  "message": "Produit mis à jour avec succès"
}

// Logique
- Vérification droits de modification
- Mise à jour sélective des champs
- Traitement des types de données
- Gestion des champs JSON
```

### DELETE /api/products/:id
**Supprimer un produit**

```javascript
// Middleware: authenticateToken, requireRole([2])

// Réponse 200
{
  "message": "Produit \"Nom du produit\" supprimé avec succès",
  "productId": 123
}

// Logique
- Vérification propriété
- Suppression en cascade (images, etc.)
```

### POST /api/products/:id/images
**Ajouter des images à un produit existant**

```javascript
// Middleware: authenticateToken, requireRole([2]), upload.array('images', 10)

// Réponse 201
{
  "message": "Images ajoutées avec succès",
  "productId": 123,
  "imagesCount": 2
}

// Logique
- Vérification propriété produit
- Gestion image principale automatique
- Ordre séquentiel des images
- Debug complet du processus
```

### GET /api/products/:id/images
**Debug - Images d'un produit**

```javascript
// Réponse 200
{
  "productId": "123",
  "images": [
    {
      "id": 1,
      "url": "/uploads/products/image1.jpg",
      "ordre": 0,
      "principale": 1
    }
  ],
  "count": 1
}
```


## 👤 Routes Utilisateurs (/api/users)

### GET /api/users/profile
**Profil utilisateur détaillé**

```javascript
// Middleware: authenticateToken

// Réponse 200
{
  "id": 1,
  "email": "user@example.com",
  "nom": "Dupont",
  "prenom": "Jean",
  "telephone": "0123456789",
  "role_id": 1,
  "created_at": "2024-01-01T00:00:00.000Z",
  "adresses": [
    {
      "id": 1,
      "type": "livraison",
      "nom_complet": "Jean Dupont",
      "adresse_ligne1": "123 Rue de la Paix",
      "ville": "Paris",
      "par_defaut": true
    }
  ]
}
```

### PUT /api/users/profile
**Modifier le profil**

```javascript
// Middleware: authenticateToken

// Body
{
  "nom": "Nouveau nom",
  "prenom": "Nouveau prénom",
  "telephone": "0987654321"
}

// Réponse 200
{
  "message": "Profil mis à jour avec succès"
}
```

### POST /api/users/addresses
**Ajouter une adresse**

```javascript
// Middleware: authenticateToken

// Body
{
  "type": "livraison",
  "nom_complet": "Jean Dupont",
  "adresse_ligne1": "123 Rue de la Paix",
  "ville": "Paris",
  "code_postal": "75001",
  "pays": "France",
  "par_defaut": true
}

// Réponse 201
{
  "message": "Adresse ajoutée avec succès",
  "adresse_id": 123
}
```

## 📂 Routes Catégories (/api/categories)

### GET /api/categories
**Liste des catégories**

```javascript
// Réponse 200
[
  {
    "id": 1,
    "nom": "Électronique",
    "slug": "electronique",
    "description": "Produits électroniques",
    "parent_id": null,
    "niveau": 0,
    "nombre_produits": 150,
    "image_url": "/uploads/categories/electronique.jpg"
  }
]
```

### GET /api/categories/tree
**Arbre hiérarchique des catégories**

```javascript
// Réponse 200
[
  {
    "id": 1,
    "nom": "Électronique",
    "slug": "electronique",
    "enfants": [
      {
        "id": 2,
        "nom": "Smartphones",
        "slug": "smartphones",
        "parent_id": 1,
        "enfants": []
      }
    ]
  }
]
```

## 🛒 Routes Panier (/api/cart)

### GET /api/cart
**Contenu du panier**

```javascript
// Middleware: authenticateToken

// Réponse 200
{
  "items": [
    {
      "id": 1,
      "produit_id": 123,
      "produit_nom": "Smartphone XYZ",
      "quantite": 2,
      "prix_unitaire": 299.99,
      "total_ligne": 599.98,
      "image_principale": "/uploads/products/image.jpg",
      "stock_disponible": 100
    }
  ],
  "total": 599.98,
  "nombre_articles": 2
}
```

### POST /api/cart/add
**Ajouter au panier**

```javascript
// Middleware: authenticateToken

// Body
{
  "produit_id": 123,
  "quantite": 2
}

// Réponse 201
{
  "message": "Produit ajouté au panier",
  "item_id": 456
}
```

### PUT /api/cart/:id
**Modifier quantité**

```javascript
// Middleware: authenticateToken

// Body
{
  "quantite": 3
}

// Réponse 200
{
  "message": "Quantité mise à jour"
}
```

### DELETE /api/cart/:id
**Supprimer du panier**

```javascript
// Middleware: authenticateToken

// Réponse 200
{
  "message": "Article supprimé du panier"
}
```

---

*Routes conçues pour la sécurité, la performance et la facilité d'utilisation*