# 🚀 Système de Messagerie Interne Complet

## Vue d'ensemble

Le système de messagerie interne permet aux utilisateurs de la plateforme d'échanger des messages privés, de recevoir des notifications et aux administrateurs de diffuser des annonces système.

## 🏗️ Architecture

### Base de données

Le système utilise 8 tables principales :

1. **conversations** - Gestion des conversations
2. **conversation_participants** - Participants aux conversations  
3. **messages** - Messages individuels
4. **message_attachments** - Fichiers joints
5. **message_read_status** - Statuts de lecture
6. **message_notifications** - Notifications de messages
7. **system_messages** - Messages système/annonces
8. **system_message_reads** - Suivi des lectures des messages système

### Backend (Node.js/Express)

- **Routes principales** : `/api/messages/*`
- **Routes admin** : `/api/admin/messages/*`
- **Authentification** : JWT avec middleware de sécurité
- **Upload de fichiers** : Multer avec validation des types
- **Gestion d'erreurs** : Système robuste avec retry et logging

### Frontend (React/TypeScript)

- **Composants modulaires** avec gestion d'erreurs intégrée
- **Hooks personnalisés** pour la gestion d'état
- **Client API** avec retry automatique et gestion réseau
- **Interface responsive** avec notifications temps réel

## 🔧 Installation et Configuration

### 1. Créer les tables de base de données

```bash
cd Backend_Ecommerce
node scripts/create-messaging-tables.js
```

### 2. Créer des données de test (optionnel)

```bash
node scripts/create-messaging-test-data.js
```

### 3. Tester le système

```bash
node scripts/test-messaging-system.js
```

### 4. Démarrer le serveur

```bash
npm start
```

## 📡 API Endpoints

### Routes Utilisateur (`/api/messages`)

#### Conversations
- `GET /conversations` - Liste des conversations de l'utilisateur
- `POST /conversations` - Créer une nouvelle conversation
- `GET /conversations/:id` - Détails d'une conversation
- `GET /conversations/:id/messages` - Messages d'une conversation
- `POST /conversations/:id/messages` - Envoyer un message

#### Notifications
- `GET /notifications` - Notifications de messages
- `PATCH /notifications/:id/read` - Marquer une notification comme lue

#### Recherche et Fichiers
- `GET /search` - Rechercher dans les messages
- `GET /attachments/:id` - Télécharger un fichier joint

### Routes Admin (`/api/admin/messages`)

#### Gestion des Conversations
- `GET /conversations` - Toutes les conversations (admin)
- `GET /conversations/:id` - Détails conversation (admin)
- `GET /conversations/:id/messages` - Messages conversation (admin)
- `DELETE /messages/:id` - Supprimer un message (admin)
- `PATCH /conversations/:id/archive` - Archiver une conversation

#### Messages Système
- `GET /system-messages` - Liste des messages système
- `POST /system-messages` - Créer un message système
- `PATCH /system-messages/:id` - Modifier un message système
- `DELETE /system-messages/:id` - Supprimer un message système

#### Statistiques
- `GET /stats` - Statistiques de messagerie

## 🎨 Composants Frontend

### Composants Principaux

1. **MessageCenter** - Composant principal avec gestion d'erreurs
2. **ConversationList** - Liste des conversations avec recherche
3. **MessageThread** - Thread de messages avec upload de fichiers
4. **NewConversationModal** - Modal de création de conversation
5. **NotificationPanel** - Panneau de notifications

### Hooks Personnalisés

- **useErrorHandler** - Gestion centralisée des erreurs
- **useApi** - Client API avec retry automatique

### Gestion d'Erreurs

- **ErrorBoundary** - Capture les erreurs React
- **NetworkErrorHandler** - Gestion des erreurs réseau
- **RetryWrapper** - Composant de retry avec backoff exponentiel

## 🔒 Sécurité

### Authentification
- JWT tokens avec expiration
- Middleware de vérification sur toutes les routes
- Gestion automatique de la déconnexion

### Validation des Données
- Validation côté serveur et client
- Sanitisation des entrées utilisateur
- Limitation de taille des fichiers (10MB max)

### Protection contre les Attaques
- Rate limiting sur les routes sensibles
- Validation des types de fichiers
- Protection CSRF avec headers personnalisés

## 📊 Fonctionnalités

### Pour les Utilisateurs
- ✅ Conversations privées multi-participants
- ✅ Messages avec fichiers joints
- ✅ Notifications temps réel
- ✅ Recherche dans les messages
- ✅ Statuts de lecture
- ✅ Réponses aux messages
- ✅ Interface responsive

### Pour les Administrateurs
- ✅ Vue d'ensemble de toutes les conversations
- ✅ Modération des messages
- ✅ Messages système/annonces
- ✅ Statistiques détaillées
- ✅ Archivage des conversations
- ✅ Gestion des utilisateurs actifs

## 🚀 Utilisation

### Démarrer une Conversation

```typescript
// Frontend - Créer une nouvelle conversation
const handleCreateConversation = async (data: {
  participants: number[];
  subject: string;
  initialMessage: string;
}) => {
  try {
    const response = await apiClient.post('/messages/conversations', data);
    console.log('Conversation créée:', response.data);
  } catch (error) {
    handleError(error, 'création de conversation');
  }
};
```

### Envoyer un Message

```typescript
// Frontend - Envoyer un message avec fichiers
const sendMessage = async (conversationId: number, content: string, files: File[]) => {
  const formData = new FormData();
  formData.append('content', content);
  files.forEach(file => formData.append('attachments', file));

  try {
    const response = await apiClient.post(
      `/messages/conversations/${conversationId}/messages`,
      formData
    );
    console.log('Message envoyé:', response.data);
  } catch (error) {
    handleError(error, 'envoi de message');
  }
};
```

### Créer un Message Système (Admin)

```typescript
// Frontend - Créer un message système
const createSystemMessage = async (data: {
  title: string;
  content: string;
  message_type: 'info' | 'warning' | 'success' | 'error';
  target_audience: 'all' | 'buyers' | 'suppliers' | 'admins';
}) => {
  try {
    const response = await apiClient.post('/admin/messages/system-messages', data);
    console.log('Message système créé:', response.data);
  } catch (error) {
    handleError(error, 'création de message système');
  }
};
```

## 🔧 Configuration

### Variables d'Environnement

```env
# Base de données
DB_HOST=your_db_host
DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h

# Upload
MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_DIR=uploads/messages
```

### Configuration Frontend

```typescript
// Configuration du client API
export const apiClient = new ApiClient({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 10000,
  retries: 3,
  retryDelay: 1000
});
```

## 🐛 Dépannage

### Problèmes Courants

1. **Erreur 401 - Non autorisé**
   - Vérifiez que le token JWT est valide
   - Vérifiez l'expiration du token

2. **Erreur 500 - Erreur serveur**
   - Vérifiez que les tables de messagerie existent
   - Vérifiez la connexion à la base de données

3. **Upload de fichiers échoue**
   - Vérifiez la taille du fichier (max 10MB)
   - Vérifiez le type de fichier autorisé

4. **Messages non reçus**
   - Vérifiez les notifications
   - Vérifiez que l'utilisateur fait partie de la conversation

### Logs et Debug

```bash
# Activer les logs détaillés
DEBUG=messaging:* npm start

# Vérifier les tables
node scripts/check-messaging-tables.js

# Tester l'API
node scripts/test-messaging-system.js
```

## 📈 Performance

### Optimisations Implémentées

- **Pagination** sur toutes les listes
- **Indexation** des tables pour les requêtes fréquentes
- **Lazy loading** des messages anciens
- **Debounce** sur la recherche
- **Cache** des conversations récentes

### Métriques à Surveiller

- Temps de réponse des API
- Nombre de connexions simultanées
- Taille des fichiers uploadés
- Nombre de messages par conversation

## 🔄 Maintenance

### Tâches Régulières

1. **Nettoyage des fichiers** - Supprimer les fichiers orphelins
2. **Archivage** - Archiver les anciennes conversations
3. **Statistiques** - Analyser l'utilisation du système
4. **Sauvegardes** - Sauvegarder les données importantes

### Scripts de Maintenance

```bash
# Nettoyer les fichiers orphelins
node scripts/cleanup-orphaned-files.js

# Archiver les anciennes conversations
node scripts/archive-old-conversations.js

# Générer un rapport d'utilisation
node scripts/generate-usage-report.js
```

## 🎯 Roadmap

### Fonctionnalités Futures

- [ ] Messages vocaux
- [ ] Appels vidéo intégrés
- [ ] Traduction automatique
- [ ] Intégration avec calendrier
- [ ] Messages programmés
- [ ] Groupes de discussion thématiques
- [ ] Intégration avec système de tickets

---

**Développé avec ❤️ pour la plateforme Gabon Trade Hub**

*Pour toute question ou support, contactez l'équipe de développement.*