# 🛒 API E-commerce Alibaba

API REST complète pour plateforme e-commerce B2B type Alibaba avec 50+ tables et fonctionnalités avancées.

## 🚀 Installation

### 1. Cloner et installer
```bash
git clone <votre-repo>
cd Projet4
npm install
```

### 2. Configuration base de données
```bash
# Importer la base de données
mysql -u root -p < database_complete.sql
```

### 3. Configuration environnement
Modifier `.env` avec vos paramètres :
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=votre_mot_de_passe
DB_NAME=ecommerce_alibaba
JWT_SECRET=votre_secret_jwt_super_securise
PORT=3000
```

### 4. Démarrer le serveur
```bash
npm run dev
```
API accessible sur `http://localhost:3000`

## 📡 Endpoints API

### 🔐 Authentification
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "mot_de_passe": "password123",
  "nom": "Dupont",
  "prenom": "Jean",
  "telephone": "0123456789",
  "role_id": 1
}
```

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "mot_de_passe": "password123"
}
```

### 👤 Utilisateurs
```http
GET /api/users/profile
Authorization: Bearer <token>
```

```http
PUT /api/users/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "nom": "Nouveau nom",
  "telephone": "0987654321"
}
```

```http
POST /api/users/addresses
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "livraison",
  "nom_complet": "Jean Dupont",
  "adresse_ligne1": "123 Rue de la Paix",
  "ville": "Paris",
  "code_postal": "75001",
  "pays": "France",
  "par_defaut": true
}
```

### 🛍️ Produits
```http
GET /api/products?page=1&limit=20&search=smartphone&categorie=electronique
```

```http
GET /api/products/123
```

```http
POST /api/products
Authorization: Bearer <token>
Content-Type: application/json

{
  "nom": "Smartphone XYZ",
  "description": "Description du produit",
  "prix_unitaire": 299.99,
  "moq": 10,
  "stock_disponible": 100,
  "categorie_id": 1,
  "unite": "pièce"
}
```

### 📦 Commandes
```http
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "produits": [
    {
      "produit_id": 1,
      "quantite": 5
    }
  ],
  "adresse_livraison_id": 1,
  "adresse_facturation_id": 1,
  "notes": "Livraison urgente"
}
```

```http
GET /api/orders/mes-commandes?page=1&limit=10
Authorization: Bearer <token>
```

```http
PATCH /api/orders/123/statut
Authorization: Bearer <token>
Content-Type: application/json

{
  "statut": "expediee"
}
```

### 📂 Catégories
```http
GET /api/categories
```

```http
GET /api/categories/tree
```

### 💬 Messages
```http
GET /api/messages/conversations
Authorization: Bearer <token>
```

```http
POST /api/messages/conversations
Authorization: Bearer <token>
Content-Type: application/json

{
  "fournisseur_id": 2,
  "sujet": "Question sur le produit",
  "produit_id": 1
}
```

```http
GET /api/messages/conversations/123/messages
Authorization: Bearer <token>
```

```http
POST /api/messages/conversations/123/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "contenu": "Bonjour, j'aimerais avoir plus d'informations..."
}
```

## 🔑 Rôles utilisateurs

- **1** = Acheteur (peut commander, envoyer messages)
- **2** = Fournisseur (peut créer produits, gérer commandes)
- **3** = Administrateur (accès complet)

## 📊 Réponses API

### Succès
```json
{
  "message": "Opération réussie",
  "data": {...}
}
```

### Erreur
```json
{
  "error": "Message d'erreur",
  "details": [...]
}
```

### Pagination
```json
{
  "products": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

## 🛡️ Sécurité

- **JWT** pour l'authentification
- **Bcrypt** pour les mots de passe
- **Rate limiting** (100 req/15min)
- **Helmet** pour la sécurité HTTP
- **CORS** configuré

## 🗄️ Base de données

### Tables principales
- `utilisateurs`, `entreprises`, `produits`, `commandes`
- `conversations`, `messages`, `avis`, `paiements`

### Tables avancées
- `favoris`, `coupons_reduction`, `notifications`
- `encheres`, `devis`, `certifications`, `devises`
- `statistiques_vues`, `audit_trail`, `gdpr_consentements`

## 🔧 Scripts disponibles

```bash
npm start          # Production
npm run dev        # Développement avec nodemon
```

## 📝 Exemples d'utilisation

### Inscription fournisseur
```javascript
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'fournisseur@example.com',
    mot_de_passe: 'password123',
    nom: 'Entreprise ABC',
    role_id: 2
  })
});
```

### Recherche produits
```javascript
const products = await fetch('/api/products?search=smartphone&page=1');
const data = await products.json();
```

### Créer commande
```javascript
const order = await fetch('/api/orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    produits: [{ produit_id: 1, quantite: 10 }],
    adresse_livraison_id: 1,
    adresse_facturation_id: 1
  })
});
```

## 🚨 Codes d'erreur

- **400** - Données invalides
- **401** - Non authentifié
- **403** - Accès refusé
- **404** - Ressource non trouvée
- **500** - Erreur serveur

## 📞 Support

Pour toute question, contactez l'équipe de développement.

---
*API E-commerce Alibaba v1.0 - Prêt pour la production* 🚀