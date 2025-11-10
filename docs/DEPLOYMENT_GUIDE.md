# Guide de Déploiement - Système de Messagerie Corrigé

## 🎯 Objectif

Ce guide détaille le déploiement du système de messagerie acheteur-fournisseur avec toutes les corrections de bugs appliquées et validées.

---

## ✅ Prérequis de Déploiement

### Environnement Technique
- **Node.js** : Version 16+ 
- **Base de données** : MySQL 8.0+ ou PostgreSQL 12+
- **Redis** : Version 6+ (pour Socket.IO clustering)
- **Serveur Web** : Nginx (recommandé) ou Apache
- **SSL/TLS** : Certificat valide pour HTTPS

### Dépendances Système
```bash
# Installation des dépendances globales
npm install -g pm2 # Gestionnaire de processus
npm install -g @playwright/test # Tests E2E
```

---

## 🔧 Configuration Environnement

### Variables d'Environnement Backend
```bash
# .env.production
NODE_ENV=production
PORT=3001

# Base de données
DB_HOST=localhost
DB_PORT=3306
DB_NAME=marketplace_messaging
DB_USER=messaging_user
DB_PASSWORD=secure_password

# Redis (Socket.IO)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password

# JWT
JWT_SECRET=your_super_secure_jwt_secret_key
JWT_EXPIRES_IN=24h

# Socket.IO
SOCKET_IO_ENABLED=true
SOCKET_IO_CORS_ORIGIN=https://votre-domaine.com

# Sécurité
RATE_LIMIT_MESSAGES=30
MESSAGE_MAX_LENGTH=5000
BCRYPT_ROUNDS=12

# Monitoring
LOG_LEVEL=info
SENTRY_DSN=https://your-sentry-dsn
```

### Variables d'Environnement Frontend
```bash
# .env.production
REACT_APP_API_URL=https://api.votre-domaine.com
REACT_APP_SOCKET_URL=https://api.votre-domaine.com
REACT_APP_ENVIRONMENT=production
REACT_APP_SENTRY_DSN=https://your-frontend-sentry-dsn
```

---

## 🗄️ Configuration Base de Données

### 1. Création de la Base de Données
```sql
-- Création de la base de données
CREATE DATABASE marketplace_messaging CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Création de l'utilisateur
CREATE USER 'messaging_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON marketplace_messaging.* TO 'messaging_user'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Exécution des Migrations
```bash
# Depuis le répertoire backend
cd Projet4/backend

# Exécution des migrations dans l'ordre
mysql -u messaging_user -p marketplace_messaging < migrations/001_create_conversations.sql
mysql -u messaging_user -p marketplace_messaging < migrations/002_create_messages.sql
mysql -u messaging_user -p marketplace_messaging < migrations/003_add_indexes.sql
mysql -u messaging_user -p marketplace_messaging < migrations/004_add_notifications.sql
```

### 3. Vérification du Schéma
```bash
# Script de vérification
node scripts/verify-database.js
```

---

## 🚀 Déploiement Backend

### 1. Préparation du Code
```bash
# Clone et installation
git clone https://github.com/votre-repo/marketplace-messaging.git
cd marketplace-messaging/Projet4/backend

# Installation des dépendances
npm ci --production

# Build si nécessaire
npm run build
```

### 2. Configuration PM2
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'messaging-api',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

### 3. Démarrage du Service
```bash
# Démarrage avec PM2
pm2 start ecosystem.config.js

# Sauvegarde de la configuration
pm2 save
pm2 startup

# Vérification du statut
pm2 status
pm2 logs messaging-api
```

---

## 🌐 Déploiement Frontend

### 1. Build de Production
```bash
cd Projet4/frontend

# Installation des dépendances
npm ci

# Build optimisé
npm run build

# Vérification du build
ls -la build/
```

### 2. Configuration Nginx
```nginx
# /etc/nginx/sites-available/messaging-frontend
server {
    listen 443 ssl http2;
    server_name votre-domaine.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/private.key;

    root /var/www/messaging-frontend/build;
    index index.html;

    # Gestion des routes React
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache des assets statiques
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy vers l'API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Sécurité
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}

# Redirection HTTP vers HTTPS
server {
    listen 80;
    server_name votre-domaine.com;
    return 301 https://$server_name$request_uri;
}
```

### 3. Déploiement des Fichiers
```bash
# Copie des fichiers build
sudo cp -r build/* /var/www/messaging-frontend/

# Permissions
sudo chown -R www-data:www-data /var/www/messaging-frontend/
sudo chmod -R 755 /var/www/messaging-frontend/

# Activation du site
sudo ln -s /etc/nginx/sites-available/messaging-frontend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔍 Validation Post-Déploiement

### 1. Tests Automatisés
```bash
# Validation système complète
node scripts/validate-system.js

# Tests E2E sur l'environnement de production
npm run test:e2e:production
```

### 2. Vérifications Manuelles

#### API Backend
```bash
# Test de santé
curl https://api.votre-domaine.com/health

# Test authentification
curl -X POST https://api.votre-domaine.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Test conversations
curl https://api.votre-domaine.com/api/conversations/user/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Socket.IO
```javascript
// Test de connexion Socket.IO (console navigateur)
const socket = io('https://api.votre-domaine.com');
socket.on('connect', () => console.log('✅ Socket.IO connecté'));
socket.on('disconnect', () => console.log('❌ Socket.IO déconnecté'));
```

#### Frontend
- ✅ Chargement de la page d'accueil
- ✅ Connexion utilisateur
- ✅ Navigation vers les messages
- ✅ Envoi d'un message test
- ✅ Réception temps réel
- ✅ Redirection depuis produit

---

## 📊 Monitoring et Surveillance

### 1. Métriques Système
```bash
# Installation des outils de monitoring
npm install -g clinic
npm install newrelic

# Monitoring PM2
pm2 install pm2-server-monit
```

### 2. Logs et Alertes
```javascript
// Configuration Sentry (backend)
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1
});

// Configuration Sentry (frontend)
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  environment: process.env.REACT_APP_ENVIRONMENT,
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 0.1
});
```

### 3. Métriques Métier
- **Messages/minute** : Surveillance du volume
- **Temps de réponse API** : < 500ms
- **Taux d'erreur** : < 1%
- **Connexions Socket.IO** : Actives simultanées
- **Utilisation mémoire** : < 1GB par instance

---

## 🔄 Procédures de Maintenance

### 1. Mise à Jour du Code
```bash
# Script de déploiement automatisé
#!/bin/bash
set -e

echo "🚀 Déploiement en cours..."

# Backup de la base de données
mysqldump -u messaging_user -p marketplace_messaging > backup_$(date +%Y%m%d_%H%M%S).sql

# Mise à jour du code
git pull origin main

# Backend
cd Projet4/backend
npm ci --production
pm2 reload messaging-api

# Frontend
cd ../frontend
npm ci
npm run build
sudo cp -r build/* /var/www/messaging-frontend/

# Tests post-déploiement
node ../scripts/validate-system.js

echo "✅ Déploiement terminé avec succès"
```

### 2. Sauvegarde Automatisée
```bash
# Crontab pour sauvegardes quotidiennes
0 2 * * * /usr/local/bin/backup-messaging-db.sh
0 3 * * * /usr/local/bin/backup-messaging-files.sh
```

### 3. Rotation des Logs
```bash
# Configuration logrotate
/var/log/messaging/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reloadLogs
    endscript
}
```

---

## 🚨 Plan de Récupération d'Urgence

### 1. Rollback Rapide
```bash
# Rollback vers la version précédente
git checkout HEAD~1
pm2 reload messaging-api

# Restauration base de données si nécessaire
mysql -u messaging_user -p marketplace_messaging < backup_YYYYMMDD_HHMMSS.sql
```

### 2. Monitoring d'Urgence
- **Alertes Sentry** : Erreurs critiques
- **Monitoring serveur** : CPU/Mémoire/Disque
- **Tests de santé** : Endpoint /health toutes les minutes
- **Notifications** : Slack/Email pour les équipes

### 3. Contacts d'Urgence
- **Équipe technique** : tech@votre-domaine.com
- **Responsable produit** : product@votre-domaine.com
- **Support client** : support@votre-domaine.com

---

## ✅ Checklist de Déploiement

### Pré-déploiement
- [ ] Tests E2E passés en local
- [ ] Validation système complète
- [ ] Sauvegarde base de données
- [ ] Variables d'environnement configurées
- [ ] Certificats SSL valides

### Déploiement
- [ ] Code déployé (backend + frontend)
- [ ] Migrations base de données exécutées
- [ ] Services redémarrés (PM2 + Nginx)
- [ ] Configuration monitoring active
- [ ] Tests post-déploiement réussis

### Post-déploiement
- [ ] Métriques système normales
- [ ] Fonctionnalités critiques testées
- [ ] Logs sans erreurs critiques
- [ ] Performance dans les seuils
- [ ] Équipes notifiées du succès

---

**🎉 Le système de messagerie corrigé est maintenant prêt pour la production !**

Tous les bugs identifiés ont été corrigés et le système a été validé par des tests automatisés complets. Le déploiement peut être effectué en toute confiance avec ce guide.