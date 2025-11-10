# 📄 Documentation des Pages

## 🏠 Pages Publiques

### Index.tsx - Page d'Accueil
Page principale accessible à tous les visiteurs

```typescript
// Route: /
// Accès: Public

// Sections principales
- HeroSection: Message de bienvenue et CTA
- FeaturedProducts: Produits vedettes (8 produits)
- CategoriesSection: Catégories populaires
- SuppliersSection: Fournisseurs recommandés
- TrendingProducts: Produits tendance
- NewsletterSection: Inscription newsletter
- CompanyInfo: Informations sur la plateforme

// Fonctionnalités
- Recherche globale dans le header
- Navigation vers les sections principales
- Prévisualisation des produits sans connexion
- Statistiques de la plateforme
```

### Login.tsx - Connexion
Page de connexion utilisateur

```typescript
// Route: /login
// Accès: Non-connectés uniquement

// Formulaire
interface LoginForm {
  email: string;
  mot_de_passe: string;
}

// Fonctionnalités
- Validation en temps réel
- Gestion des erreurs
- Redirection après connexion
- Lien vers inscription
- Récupération de mot de passe

// Hooks utilisés
- useLogin(): Fonction de connexion
- useForm(): Gestion du formulaire
- useNavigate(): Redirection
```

### Register.tsx - Inscription Acheteur
Inscription pour les acheteurs

```typescript
// Route: /register
// Accès: Non-connectés uniquement

// Formulaire
interface RegisterForm {
  email: string;
  mot_de_passe: string;
  confirm_password: string;
  nom: string;
  prenom: string;
  telephone: string;
  accepte_conditions: boolean;
}

// Étapes
1. Informations personnelles
2. Informations de contact
3. Conditions d'utilisation
4. Confirmation par email
```

### UserTypeSelection.tsx - Sélection Type Utilisateur
Choix entre acheteur et fournisseur

```typescript
// Route: /user-type
// Accès: Non-connectés uniquement

// Options
- Acheteur: Acheter des produits
- Fournisseur: Vendre des produits

// Navigation
- Acheteur → /register
- Fournisseur → /supplier/register
```

### Products.tsx - Catalogue Produits
Liste des produits avec filtres

```typescript
// Route: /products
// Accès: Public

// Query Parameters
- search: Recherche textuelle
- category: Filtrage par catégorie
- page: Pagination
- limit: Nombre par page
- sort: Tri (prix, date, popularité)
- min_price: Prix minimum
- max_price: Prix maximum

// Fonctionnalités
- Grille responsive de produits
- Filtres avancés
- Pagination
- Tri multiple
- Recherche en temps réel
- Favoris (si connecté)
- Ajout au panier (si acheteur)

// Composants
- ProductCard: Carte produit
- CategorySidebar: Filtres latéraux
- SearchFilters: Filtres de recherche
- Pagination: Navigation pages
```

### ProductDetail.tsx - Détail Produit
Page détaillée d'un produit

```typescript
// Route: /products/:id
// Accès: Public

// Sections
- Galerie d'images
- Informations produit
- Prix et MOQ
- Description détaillée
- Spécifications techniques
- Avis clients
- Produits similaires
- Informations fournisseur

// Actions (si connecté)
- Ajouter au panier
- Ajouter aux favoris
- Contacter le fournisseur
- Demander un devis

// Hooks utilisés
- useProduct(id): Données produit
- useAddToCart(): Ajout panier
- useAddToFavorites(): Ajout favoris
```

### Categories.tsx - Navigation Catégories
Exploration des catégories

```typescript
// Route: /categories
// Accès: Public

// Affichage
- Grille de catégories principales
- Sous-catégories par hover
- Nombre de produits par catégorie
- Images représentatives

// Navigation
- Clic → /categories/:slug
- Breadcrumb de navigation
```

### CategoryDetail.tsx - Détail Catégorie
Produits d'une catégorie spécifique

```typescript
// Route: /categories/:slug
// Accès: Public

// Contenu
- Informations catégorie
- Sous-catégories
- Liste des produits
- Filtres spécifiques
- Fournisseurs de la catégorie

// Héritage de Products.tsx avec filtrage automatique
```

### Suppliers.tsx - Liste Fournisseurs
Annuaire des fournisseurs

```typescript
// Route: /suppliers
// Accès: Public

// Informations affichées
- Nom entreprise
- Secteur d'activité
- Localisation
- Nombre de produits
- Note moyenne
- Logo entreprise

// Filtres
- Secteur d'activité
- Localisation
- Note minimum
- Certifications

// Actions
- Voir profil fournisseur
- Voir produits du fournisseur
- Contacter (si connecté)
```

## 🔐 Pages Authentifiées

### Dashboard.tsx - Tableau de Bord Général
Redirection vers le dashboard approprié selon le rôle

```typescript
// Route: /dashboard
// Accès: Connectés uniquement

// Logique de redirection
- Acheteur (role_id: 1) → /buyer-dashboard
- Fournisseur (role_id: 2) → /supplier-dashboard
- Admin (role_id: 3) → /admin-dashboard
```

### BuyerDashboard.tsx - Dashboard Acheteur
Tableau de bord pour les acheteurs

```typescript
// Route: /buyer-dashboard
// Accès: Acheteurs uniquement (role_id: 1)

// Sections
- Statistiques personnelles
- Favoris récents
- Messages non lus
- Recommandations produits
- Historique des achats

// Widgets
- Fournisseurs favoris
- Alertes et notifications

// Actions rapides
- Voir tous les favoris
- Accéder aux messages
- Gérer le profil
```

### SupplierDashboard.tsx - Dashboard Fournisseur
Tableau de bord pour les fournisseurs

```typescript
// Route: /supplier-dashboard
// Accès: Fournisseurs uniquement (role_id: 2)

// Sections
- Statistiques de vente
- Produits populaires
- Messages clients
- Performance des produits
- Chiffre d'affaires

// Widgets
- Graphique des ventes
- Stock faible
- Avis récents

// Actions rapides
- Ajouter un produit
- Répondre aux messages
- Modifier le profil entreprise
```

### Messages.tsx - Messagerie
Centre de messagerie unifié

```typescript
// Route: /messages
// Accès: Connectés uniquement

// Layout
- Sidebar: Liste des conversations
- Main: Fil de messages sélectionné
- Header: Informations conversation

// Fonctionnalités
- Conversations temps réel
- Indicateurs de frappe
- Messages non lus
- Recherche dans les conversations
- Pièces jointes
- Historique complet

// Hooks utilisés
- useConversations(): Liste conversations
- useMessages(conversationId): Messages
- useSocket(): Communication temps réel
```

### Cart.tsx - Panier
Gestion du panier d'achat

```typescript
// Route: /cart
// Accès: Acheteurs uniquement

// Contenu
- Liste des articles
- Quantités modifiables
- Prix unitaires et totaux
- Répartition par fournisseur
- Frais de livraison estimés
- Total général

// Actions
- Modifier quantités
- Supprimer articles
- Vider le panier
- Procéder au checkout
- Sauvegarder pour plus tard

// Fonctionnalités
- Calcul automatique des totaux
- Vérification du stock
- Groupement par fournisseur
- Estimation des délais
```

- Gestion des stocks

// Filtres
- Par statut
- Par période
- Par fournisseur/acheteur
- Par montant
```

### Favorites.tsx - Favoris
Produits sauvegardés

```typescript
// Route: /favorites
// Accès: Acheteurs uniquement

// Fonctionnalités
- Grille des produits favoris
- Tri par date d'ajout
- Filtres par catégorie
- Actions rapides
- Notifications de prix
- Partage de listes

// Actions
- Supprimer des favoris
- Ajouter au panier
- Créer des listes
- Partager la liste
```

### Profile.tsx - Profil Utilisateur
Gestion du profil personnel

```typescript
// Route: /profile
// Accès: Connectés uniquement

// Sections
- Informations personnelles
- Adresses de livraison
- Préférences de compte
- Sécurité et mot de passe
- Notifications
- Historique d'activité

// Formulaires
- Modification des données
- Ajout/suppression d'adresses
- Changement de mot de passe
- Paramètres de notification
```

### Settings.tsx - Paramètres
Configuration du compte

```typescript
// Route: /settings
// Accès: Connectés uniquement

// Onglets
- Compte: Informations de base
- Sécurité: Mot de passe, 2FA
- Notifications: Préférences email/SMS
- Confidentialité: Données personnelles

// Actions
- Exporter les données
- Supprimer le compte
- Gérer les sessions
- Historique de connexion
```

## 🏢 Pages Fournisseur

### SupplierHome.tsx - Accueil Fournisseur
Page d'accueil spécifique aux fournisseurs

```typescript
// Route: /supplier
// Accès: Fournisseurs uniquement

// Contenu
- Résumé des performances
- Actions rapides
- Notifications importantes
- Conseils et astuces
- Actualités de la plateforme

// Widgets
- Ventes du jour
- Nouveaux messages
- Produits à réapprovisionner
```

### AddProduct.tsx - Ajouter Produit
Formulaire d'ajout de produit

```typescript
// Route: /supplier/products/add
// Accès: Fournisseurs uniquement

// Étapes du formulaire
1. Informations de base
2. Description détaillée
3. Prix et stock
4. Images et médias
5. Spécifications techniques
6. Conditions de vente

// Validation
- Champs obligatoires
- Formats d'images
- Cohérence des prix
- Vérification des données

// Fonctionnalités
- Sauvegarde brouillon
- Prévisualisation
- Upload multiple d'images
- Catégorisation automatique
```

### EditProduct.tsx - Modifier Produit
Modification d'un produit existant

```typescript
// Route: /supplier/products/:id/edit
// Accès: Propriétaire du produit uniquement

// Fonctionnalités
- Pré-remplissage des données
- Historique des modifications
- Gestion des images existantes
- Mise à jour du stock
- Activation/désactivation

// Validation
- Vérification des droits
- Cohérence des modifications
```

### SupplierProfile.tsx - Profil Fournisseur
Profil public et privé du fournisseur

```typescript
// Route: /supplier/profile
// Accès: Fournisseur propriétaire

// Sections
- Informations entreprise
- Certifications
- Galerie de produits
- Avis clients
- Coordonnées de contact
- Historique et statistiques

// Mode édition
- Modification des informations
- Upload de documents
- Gestion des certifications
- Paramètres de visibilité
```

## 👨‍💼 Pages Administrateur

### AdminDashboard.tsx - Dashboard Admin
Tableau de bord administrateur

```typescript
// Route: /admin
// Accès: Administrateurs uniquement (role_id: 3)

// Sections
- Statistiques globales
- Gestion des utilisateurs
- Modération du contenu
- Rapports financiers
- Logs système
- Configuration plateforme

// Widgets
- Utilisateurs actifs
- Transactions du jour
- Signalements en attente
- Performance système
```

## 🔧 Pages Utilitaires

### NotFound.tsx - Page 404
Page d'erreur pour les routes inexistantes

```typescript
// Route: *
// Accès: Public

// Contenu
- Message d'erreur convivial
- Liens de navigation
- Recherche alternative
- Contact support
```

### Privacy.tsx - Politique de Confidentialité
```typescript
// Route: /privacy
// Accès: Public
```

### Terms.tsx - Conditions d'Utilisation
```typescript
// Route: /terms
// Accès: Public
```

## 📱 Navigation et Routing

### Structure des Routes
```typescript
// Routes publiques
/ → Index
/login → Login
/register → Register
/user-type → UserTypeSelection
/products → Products
/products/:id → ProductDetail
/categories → Categories
/categories/:slug → CategoryDetail
/suppliers → Suppliers

// Routes authentifiées
/dashboard → Dashboard (redirection)
/buyer-dashboard → BuyerDashboard
/supplier-dashboard → SupplierDashboard
/messages → Messages
/cart → Cart (acheteurs)
/favorites → Favorites (acheteurs)
/profile → Profile
/settings → Settings

// Routes fournisseur
/supplier → SupplierHome
/supplier/products/add → AddProduct
/supplier/products/:id/edit → EditProduct
/supplier/profile → SupplierProfile

// Routes admin
/admin → AdminDashboard

// Routes utilitaires
/privacy → Privacy
/terms → Terms
* → NotFound
```

### Protection des Routes
```typescript
// Middleware de protection
<ProtectedRoute requiredRole={1}>
  <BuyerOnlyPage />
</ProtectedRoute>

<ProtectedRoute requiredRole={2}>
  <SupplierOnlyPage />
</ProtectedRoute>

<PublicRoute>
  <LoginPage />
</PublicRoute>
```

## 🎨 Layout et Design

### Responsive Breakpoints
```css
/* Mobile first */
default: < 640px
sm: 640px - 767px
md: 768px - 1023px
lg: 1024px - 1279px
xl: 1280px - 1535px
2xl: ≥ 1536px
```

### Patterns de Layout
```typescript
// Layout principal
<Layout>
  <Header />
  <main className="min-h-screen">
    <PageContent />
  </main>
  <Footer />
</Layout>

// Layout fournisseur
<SupplierLayout>
  <SupplierHeader />
  <SupplierSidebar />
  <main>
    <SupplierContent />
  </main>
</SupplierLayout>
```

---

*Pages conçues pour une expérience utilisateur optimale et une navigation intuitive*