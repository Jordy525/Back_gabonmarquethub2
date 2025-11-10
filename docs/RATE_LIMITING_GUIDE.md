# Guide de Résolution des Erreurs 429 (Rate Limiting)

## 🚦 Qu'est-ce qu'une erreur 429 ?

L'erreur 429 "Too Many Requests" indique que votre application fait trop de requêtes trop rapidement vers le serveur. C'est un mécanisme de protection pour éviter la surcharge du serveur.

## 🔍 Identification du Problème

### Symptômes courants :
- Messages d'erreur "Trop de requêtes"
- Fonctionnalités qui cessent de fonctionner temporairement
- Délais d'attente avant de pouvoir réessayer
- Notifications de rate limiting dans l'interface

### Causes principales :
1. **Reconnexions Socket.IO excessives**
2. **Envoi rapide de messages**
3. **Création multiple de conversations**
4. **Requêtes API en boucle**
5. **Tests automatisés sans délais**

## ⚙️ Configuration Actuelle

### Limites en Production :
- **Global** : 1000 requêtes par IP / 15 minutes
- **Authentification** : 20 tentatives / 15 minutes
- **Messages** : 30 messages / minute par utilisateur
- **Conversations** : 10 nouvelles / heure par utilisateur

### Limites en Développement :
- **Global** : 5000 requêtes par IP / 15 minutes
- **Authentification** : 100 tentatives / 15 minutes
- **Messages** : 100 messages / minute par utilisateur
- **Conversations** : 50 nouvelles / heure par utilisateur

## 🛠️ Solutions Implémentées

### 1. Configuration Flexible par Environnement

```javascript
// Désactiver complètement en développement
DISABLE_RATE_LIMIT=true

// Ou ajuster les limites
const messageRateLimit = rateLimit({
  max: process.env.NODE_ENV === 'development' ? 100 : 30,
  skip: (req) => process.env.DISABLE_RATE_LIMIT === 'true'
});
```

### 2. Retry Automatique avec Backoff Exponentiel

```typescript
import { withRateLimitRetry } from '@/utils/rateLimitHandler';

const result = await withRateLimitRetry(async () => {
  return await fetch('/api/messages', { method: 'POST', body: data });
}, { maxRetries: 3 });
```

### 3. Client API avec Gestion Automatique

```typescript
import { api } from '@/utils/apiClient';

// Retry automatique intégré
const response = await api.post('/messages', messageData);
```

### 4. Notifications Utilisateur

```typescript
import { useRateLimitNotification } from '@/components/ui/RateLimitNotification';

const { showRateLimitNotification, RateLimitNotificationComponent } = useRateLimitNotification();

// Afficher automatiquement lors d'une erreur 429
if (error.status === 429) {
  showRateLimitNotification(error.message, error.retryAfter);
}
```

## 🚀 Actions Immédiates

### Pour les Développeurs :

1. **Activer le mode développement permissif** :
   ```bash
   # Dans Projet4/.env
   DISABLE_RATE_LIMIT=true
   
   # Dans .env (frontend)
   VITE_DISABLE_RATE_LIMIT=true
   ```

2. **Redémarrer les serveurs** :
   ```bash
   # Backend
   cd Projet4
   npm restart
   
   # Frontend
   npm run dev
   ```

3. **Vérifier les logs** :
   ```bash
   # Surveiller les erreurs de rate limiting
   tail -f Projet4/logs/app.log | grep "429\|rate"
   ```

### Pour les Tests :

1. **Ajouter des délais entre les requêtes** :
   ```javascript
   // Attendre entre les requêtes
   await new Promise(resolve => setTimeout(resolve, 1000));
   ```

2. **Utiliser le pool de requêtes** :
   ```typescript
   import { RateLimitedRequestPool } from '@/utils/rateLimitHandler';
   
   const pool = new RateLimitedRequestPool(10); // 10 req/sec max
   const result = await pool.add(() => fetch('/api/endpoint'));
   ```

## 🔧 Configuration Avancée

### Personnaliser les Limites

```javascript
// middleware/messageValidation.js
const messageRateLimit = rateLimit({
  windowMs: 60 * 1000, // Fenêtre de temps
  max: 50, // Nombre max de requêtes
  keyGenerator: (req) => `messages_${req.user.id}`, // Clé unique
  skip: (req) => req.user?.role === 'admin' // Exceptions
});
```

### Monitoring et Alertes

```javascript
// Ajouter des métriques
const rateLimitMetrics = {
  blocked: 0,
  allowed: 0,
  resetTime: Date.now()
};

app.use((req, res, next) => {
  if (res.statusCode === 429) {
    rateLimitMetrics.blocked++;
    console.warn('🚦 Rate limit hit:', {
      ip: req.ip,
      user: req.user?.id,
      endpoint: req.path
    });
  }
  next();
});
```

## 📊 Surveillance

### Métriques à Surveiller :
- Nombre de requêtes 429 par heure
- Temps de réponse moyen
- Taux de retry réussis
- Utilisateurs les plus actifs

### Logs Utiles :
```bash
# Erreurs de rate limiting
grep "429\|rate.*limit" logs/app.log

# Reconnexions Socket.IO excessives
grep "connexion.*socket" logs/app.log | wc -l

# Utilisateurs avec le plus de requêtes
grep "Rate limit" logs/app.log | cut -d' ' -f5 | sort | uniq -c | sort -nr
```

## 🎯 Bonnes Pratiques

### Côté Frontend :
1. **Debounce les actions utilisateur**
2. **Cache les réponses API**
3. **Utilise des indicateurs de chargement**
4. **Implémente le retry intelligent**
5. **Informe l'utilisateur des limites**

### Côté Backend :
1. **Utilise des clés de rate limiting spécifiques**
2. **Implémente des exceptions pour les admins**
3. **Log les violations pour analyse**
4. **Utilise Redis pour la persistance**
5. **Configure des alertes de monitoring**

### Côté Socket.IO :
1. **Limite les reconnexions automatiques**
2. **Utilise un backoff exponentiel**
3. **Implémente des heartbeats intelligents**
4. **Cache les états de connexion**

## 🆘 Dépannage Rapide

### Erreur persistante ?

1. **Vérifier les variables d'environnement** :
   ```bash
   echo $DISABLE_RATE_LIMIT
   echo $NODE_ENV
   ```

2. **Nettoyer le cache** :
   ```bash
   # Redis (si utilisé)
   redis-cli FLUSHALL
   
   # Redémarrer les services
   pm2 restart all
   ```

3. **Vérifier la configuration** :
   ```bash
   # Tester une requête simple
   curl -I http://localhost:3000/api/health
   ```

### Contact Support :
- 📧 Email : support@gabmarkethub.com
- 💬 Slack : #dev-support
- 📱 Urgence : +33 X XX XX XX XX

---

**Dernière mise à jour** : 26 août 2025
**Version** : 1.0.0