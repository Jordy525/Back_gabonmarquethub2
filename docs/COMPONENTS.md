# 🧩 Documentation des Composants

## 🎨 Composants UI de Base (Shadcn/ui)

### Button
Composant bouton avec variants et tailles

```typescript
import { Button } from "@/components/ui/button";

// Utilisation
<Button variant="default" size="lg">
  Cliquer ici
</Button>

// Variants disponibles
- default: Style principal
- destructive: Actions dangereuses
- outline: Bordure uniquement
- secondary: Style secondaire
- ghost: Transparent
- link: Style lien

// Tailles disponibles
- default: Taille normale
- sm: Petit
- lg: Grand
- icon: Icône uniquement
```

### Input
Champ de saisie avec validation

```typescript
import { Input } from "@/components/ui/input";

<Input
  type="email"
  placeholder="votre@email.com"
  className="w-full"
  required
/>
```

### Card
Conteneur avec bordure et ombre

```typescript
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Titre de la carte</CardTitle>
  </CardHeader>
  <CardContent>
    Contenu de la carte
  </CardContent>
</Card>
```

### Dialog
Modal responsive

```typescript
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

<Dialog>
  <DialogTrigger asChild>
    <Button>Ouvrir modal</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Titre du modal</DialogTitle>
    </DialogHeader>
    <p>Contenu du modal</p>
  </DialogContent>
</Dialog>
```

## 🏗️ Composants Layout

### Header
En-tête principal avec navigation

```typescript
// Fonctionnalités
- Logo et branding
- Barre de recherche
- Navigation principale
- Menu utilisateur
- Panier (pour acheteurs)
- Notifications
- Messages non lus
- Menu mobile responsive

// Props
interface HeaderProps {
  // Aucune prop requise - utilise les hooks internes
}

// Hooks utilisés
- useIsAuthenticated(): Statut de connexion
- useCurrentUser(): Données utilisateur
- useCartCount(): Nombre d'articles dans le panier
- useUnreadCount(): Messages non lus
- useLogout(): Fonction de déconnexion
```

### Footer
Pied de page avec liens utiles

```typescript
// Sections
- Informations entreprise
- Liens rapides
- Support client
- Réseaux sociaux
- Mentions légales
```

### Layout
Conteneur principal de l'application

```typescript
import Layout from "@/components/layout/Layout";

<Layout>
  <YourPageContent />
</Layout>

// Structure
- Header fixe en haut
- Contenu principal
- Footer en bas
- Gestion responsive
```

## 🔐 Composants Authentification

### ProtectedRoute
Protection des routes par rôle

```typescript
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

<ProtectedRoute requiredRole={2}>
  <SupplierOnlyContent />
</ProtectedRoute>

// Rôles
- 1: Acheteur
- 2: Fournisseur  
- 3: Administrateur
```

### PublicRoute
Routes accessibles uniquement aux non-connectés

```typescript
import { PublicRoute } from "@/components/auth/PublicRoute";

<PublicRoute>
  <LoginForm />
</PublicRoute>
```

## 💬 Composants Messagerie

### MessageCenter
Centre de messagerie principal

```typescript
import { MessageCenter } from "@/components/messaging/MessageCenter";

<MessageCenter
  initialConversationId={123}
  onConversationChange={(conversation) => {
    console.log('Conversation changée:', conversation);
  }}
  className="h-[600px]"
/>

// Props
interface MessageCenterProps {
  initialConversationId?: number;
  onConversationChange?: (conversation: Conversation | null) => void;
  className?: string;
}
```

### ConversationList
Liste des conversations

```typescript
import { ConversationList } from "@/components/messaging/ConversationList";

<ConversationList
  conversations={conversations}
  selectedId={selectedConversationId}
  onSelect={(id) => setSelectedConversationId(id)}
  isLoading={isLoading}
/>
```

### MessageThread
Fil de messages d'une conversation

```typescript
import { MessageThread } from "@/components/messaging/MessageThread";

<MessageThread
  conversationId={123}
  messages={messages}
  currentUserId={currentUser.id}
  onSendMessage={(content) => sendMessage(content)}
/>
```

### TypingIndicator
Indicateur de frappe

```typescript
import { TypingIndicator } from "@/components/messaging/TypingIndicator";

<TypingIndicator
  isTyping={isTyping}
  userName="Jean Dupont"
/>
```

## 🛍️ Composants Produits

### ProductCard
Carte produit pour les listes

```typescript
import { ProductCard } from "@/components/product/ProductCard";

<ProductCard
  product={product}
  onAddToCart={(productId) => addToCart(productId)}
  onAddToFavorites={(productId) => addToFavorites(productId)}
  showSupplierInfo={true}
/>

// Props
interface ProductCardProps {
  product: Product;
  onAddToCart?: (productId: number) => void;
  onAddToFavorites?: (productId: number) => void;
  showSupplierInfo?: boolean;
  className?: string;
}
```

### ProductReviews
Système d'avis produits

```typescript
import { ProductReviews } from "@/components/product/ProductReviews";

<ProductReviews
  productId={123}
  averageRating={4.5}
  totalReviews={25}
  canReview={canUserReview}
/>
```

### ContactSupplierButton
Bouton de contact fournisseur

```typescript
import { ContactSupplierButton } from "@/components/product/ContactSupplierButton";

<ContactSupplierButton
  supplierId={456}
  productId={123}
  productName="Smartphone XYZ"
/>
```

## 📂 Composants Catégories

### MegaMenu
Menu déroulant des catégories

```typescript
import MegaMenu from "@/components/categories/MegaMenu";

<MegaMenu />

// Fonctionnalités
- Affichage hiérarchique des catégories
- Hover pour afficher les sous-catégories
- Navigation vers les pages catégories
- Responsive design
```

### CategorySidebar
Barre latérale de filtrage

```typescript
import { CategorySidebar } from "@/components/categories/CategorySidebar";

<CategorySidebar
  categories={categories}
  selectedCategory={selectedCategory}
  onCategorySelect={(category) => setSelectedCategory(category)}
/>
```

### CategoryCard
Carte de catégorie

```typescript
import { CategoryCard } from "@/components/categories/CategoryCard";

<CategoryCard
  category={category}
  productCount={150}
  onClick={() => navigate(`/categories/${category.slug}`)}
/>
```

## 🔔 Composants Notifications

### NotificationBell
Cloche de notifications

```typescript
import { NotificationBell } from "@/components/notifications/NotificationBell";

<NotificationBell />

// Fonctionnalités
- Compteur de notifications non lues
- Dropdown avec liste des notifications
- Marquer comme lu
- Navigation vers les détails
```

### NotificationDropdown
Liste déroulante des notifications

```typescript
import { NotificationDropdown } from "@/components/layout/NotificationDropdown";

<NotificationDropdown
  notifications={notifications}
  unreadCount={unreadCount}
  onMarkAsRead={(id) => markAsRead(id)}
  onMarkAllAsRead={() => markAllAsRead()}
/>
```

## 🏠 Composants Page d'Accueil

### HeroSection
Section héro principale

```typescript
import { HeroSection } from "@/components/home/HeroSection";

<HeroSection />

// Contenu
- Message de bienvenue
- Boutons d'action principaux
- Image de fond
- Statistiques clés
```

### FeaturedProducts
Produits vedettes

```typescript
import { FeaturedProducts } from "@/components/home/FeaturedProducts";

<FeaturedProducts
  products={featuredProducts}
  isLoading={isLoading}
/>
```

### CategoriesSection
Section des catégories populaires

```typescript
import { CategoriesSection } from "@/components/home/CategoriesSection";

<CategoriesSection
  categories={popularCategories}
  onCategoryClick={(category) => navigate(`/categories/${category.slug}`)}
/>
```

## 🏢 Composants Fournisseurs

### SupplierProfile
Profil détaillé du fournisseur

```typescript
import { SupplierProfile } from "@/components/supplier/SupplierProfile";

<SupplierProfile
  supplier={supplier}
  canEdit={isOwner}
  onEdit={() => setEditMode(true)}
/>
```

### CompanyInfoForm
Formulaire d'informations entreprise

```typescript
import { CompanyInfoForm } from "@/components/supplier/CompanyInfoForm";

<CompanyInfoForm
  initialData={companyData}
  onSubmit={(data) => updateCompany(data)}
  isLoading={isUpdating}
/>
```

### DocumentUpload
Upload de documents

```typescript
import { DocumentUpload } from "@/components/supplier/DocumentUpload";

<DocumentUpload
  acceptedTypes={['.pdf', '.jpg', '.png']}
  maxSize={5 * 1024 * 1024} // 5MB
  onUpload={(files) => handleUpload(files)}
/>
```

  onSelect={(method) => setSelectedMethod(method)}
/>
```

## 🎛️ Composants Utilitaires

### ErrorFallback
Composant d'erreur de fallback

```typescript
import { ErrorFallback } from "@/components/ErrorFallback";

<ErrorBoundary FallbackComponent={ErrorFallback}>
  <YourComponent />
</ErrorBoundary>
```

### LoadingSpinner
Indicateur de chargement

```typescript
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

<LoadingSpinner size="lg" />
```

### ServerStatus
Indicateur de statut serveur

```typescript
import { ServerStatus } from "@/components/ServerStatus";

<ServerStatus />
```

## 📱 Responsive Design

### Breakpoints Utilisés
```css
/* Mobile first approach */
sm: 640px   /* Mobile large */
md: 768px   /* Tablette */
lg: 1024px  /* Desktop */
xl: 1280px  /* Desktop large */
2xl: 1536px /* Desktop XL */
```

### Patterns Responsive
```typescript
// Grille adaptive
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

// Texte responsive
<h1 className="text-2xl sm:text-3xl lg:text-4xl">

// Espacement responsive
<div className="p-4 sm:p-6 lg:p-8">

// Visibilité responsive
<div className="hidden md:block">Desktop only</div>
<div className="block md:hidden">Mobile only</div>
```

## 🎨 Système de Couleurs

### Palette Principale
```css
/* Couleurs primaires */
--primary: 142 69% 58%;     /* Vert principal */
--primary-foreground: 0 0% 98%;

/* Couleurs secondaires */
--secondary: 210 40% 98%;
--secondary-foreground: 222.2 84% 4.9%;

/* États */
--destructive: 0 84% 60%;   /* Rouge erreur */
--warning: 38 92% 50%;      /* Orange avertissement */
--success: 142 76% 36%;     /* Vert succès */
```

### Utilisation
```typescript
// Classes Tailwind
<Button className="bg-primary text-primary-foreground">
<div className="text-destructive">Erreur</div>
<span className="text-success">Succès</span>
```

---

*Composants conçus pour la réutilisabilité et la cohérence*