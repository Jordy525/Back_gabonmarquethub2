# 🔔 Système de Notifications Admin

## Vue d'ensemble

Le système de notifications admin permet aux administrateurs de recevoir et gérer toutes les notifications importantes de la plateforme e-commerce. Il couvre la gestion des utilisateurs, des produits, du système et des commandes.

## 📋 Types de Notifications

### 👥 Gestion des Utilisateurs (`user_management`)

#### Nouvelles inscriptions (`new_user`)
- **Déclencheur** : Nouvel utilisateur inscrit
- **Priorité** : Moyenne
- **Actions** : Approuver, Voir profil

#### Demandes de vérification (`verification_request`)
- **Déclencheur** : Entreprise demande une vérification
- **Priorité** : Élevée
- **Actions** : Vérifier, Rejeter

#### Suspension d'utilisateur (`user_suspension`)
- **Déclencheur** : Utilisateur suspendu
- **Priorité** : Élevée
- **Actions** : Réactiver, Voir profil

#### Signalements d'utilisateur (`user_report`)
- **Déclencheur** : Utilisateur signalé
- **Priorité** : Urgente
- **Actions** : Enquêter, Ignorer

### 📦 Gestion des Produits (`product_management`)

#### Modération de produit (`product_moderation`)
- **Déclencheur** : Nouveau produit à modérer
- **Priorité** : Moyenne
- **Actions** : Approuver, Rejeter, Voir produit

#### Signalement de produit (`product_report`)
- **Déclencheur** : Produit signalé
- **Priorité** : Élevée
- **Actions** : Enquêter, Voir produit

#### Demande de modification (`product_modification_request`)
- **Déclencheur** : Produit nécessite des modifications
- **Priorité** : Moyenne
- **Actions** : Approuver, Voir produit

### ⚙️ Système (`system`)

#### Erreur système (`system_error`)
- **Déclencheur** : Erreur système détectée
- **Priorité** : Urgente
- **Actions** : Enquêter, Voir logs

#### Alerte de sécurité (`security_alert`)
- **Déclencheur** : Alerte de sécurité
- **Priorité** : Urgente
- **Actions** : Enquêter, Voir logs sécurité

#### Statistiques de performance (`performance_stats`)
- **Déclencheur** : Rapport de performance
- **Priorité** : Faible
- **Actions** : Voir rapport

#### Maintenance (`maintenance`)
- **Déclencheur** : Maintenance programmée
- **Priorité** : Moyenne
- **Actions** : Planifier, Voir détails

### 🛒 Gestion des Commandes (`order_management`)

#### Problème de commande (`order_issue`)
- **Déclencheur** : Commande en attente ou problème
- **Priorité** : Élevée
- **Actions** : Voir commande, Traiter

## 🎨 Composants Frontend

### AdminNotificationBell
Composant principal affichant la cloche de notifications avec compteur.

```tsx
import { AdminNotificationBell } from '@/components/admin';

<AdminNotificationBell />
```

### AdminNotificationDashboard
Tableau de bord complet avec statistiques et gestion des notifications.

```tsx
import { AdminNotificationDashboard } from '@/components/admin';

<AdminNotificationDashboard />
```

### AdminNotificationActions
Composant pour les actions rapides sur les notifications.

```tsx
import { AdminNotificationActions } from '@/components/admin';

<AdminNotificationActions 
  notification={notification} 
  onActionComplete={handleActionComplete} 
/>
```

## 🔧 Service Backend

### AdminNotificationService
Service principal pour gérer les notifications admin.

```typescript
import { adminNotificationService } from '@/services/adminNotificationService';

// Récupérer toutes les notifications
const notifications = await adminNotificationService.getAllNotifications();

// Récupérer les compteurs
const counts = await adminNotificationService.getNotificationCounts();

// Marquer comme lu
await adminNotificationService.markAsRead(notificationId);

// Actions spécifiques
await adminNotificationService.approveUser(userId);
await adminNotificationService.suspendUser(userId, reason);
await adminNotificationService.approveProduct(productId);
await adminNotificationService.rejectProduct(productId, reason);
```

## 🗄️ Base de Données

### Table `admin_notifications`

```sql
CREATE TABLE admin_notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  admin_id INT NULL,
  type ENUM('user_management','product_management','system','order_management'),
  category VARCHAR(50),
  title VARCHAR(255),
  message TEXT,
  data JSON,
  is_read BOOLEAN DEFAULT FALSE,
  priority ENUM('low','medium','high','urgent') DEFAULT 'medium',
  user_id INT NULL,
  product_id INT NULL,
  order_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## 🚀 API Endpoints

### Récupérer les notifications
```http
GET /api/admin/notifications
Query params: page, limit, type, priority, unread
```

### Récupérer les compteurs
```http
GET /api/admin/notifications/counts
```

### Marquer comme lu
```http
PATCH /api/admin/notifications/:id/read
```

### Marquer toutes comme lues
```http
PATCH /api/admin/notifications/mark-all-read
```

### Supprimer une notification
```http
DELETE /api/admin/notifications/:id
```

### Supprimer toutes les lues
```http
DELETE /api/admin/notifications/delete-read
```

## 🔄 Intégration avec les Événements

### Création automatique de notifications

```javascript
// Dans les routes existantes
const { notifyNewUser, notifyVerificationRequest } = require('./admin-notifications');

// Nouvel utilisateur
await notifyNewUser(userId, userData);

// Demande de vérification
await notifyVerificationRequest(entrepriseId, entrepriseData);
```

## 📊 Fonctionnalités

### Filtrage
- Par type (utilisateurs, produits, système, commandes)
- Par priorité (urgent, élevée, moyenne, faible)
- Par statut (lues, non lues)
- Par date

### Actions Rapides
- Approuver/Rejeter utilisateurs
- Approuver/Rejeter produits
- Enquêter sur les signalements
- Voir les détails des éléments

### Notifications Temps Réel
- Polling automatique toutes les 30 secondes
- Mise à jour en temps réel des compteurs
- Notifications push (à implémenter)

## 🧪 Tests

Exécuter le script de test :

```bash
cd Backend_Ecommerce
node test-admin-notifications.js
```

## 📝 Migration

Exécuter la migration pour créer la table :

```bash
mysql -u username -p database_name < migrations/add_admin_notifications.sql
```

## 🔒 Sécurité

- Seuls les administrateurs (role_id = 3) peuvent accéder aux notifications
- Validation des données d'entrée
- Logs d'audit pour toutes les actions
- Protection contre les injections SQL

## 🎯 Prochaines Étapes

1. ✅ Implémentation du système de base
2. ✅ Composants frontend
3. ✅ API backend
4. ✅ Tests de base
5. 🔄 Intégration avec les événements existants
6. 📋 Notifications push en temps réel
7. 📋 Système de templates de notifications
8. 📋 Rapports et analytics des notifications
