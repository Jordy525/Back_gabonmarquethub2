# 📚 Documentation Backend E-commerce Alibaba

## 📋 Table des Matières

1. [Architecture Générale](./ARCHITECTURE.md)
2. [API Documentation](./API.md)
3. [Base de Données](./DATABASE.md)
4. [Authentification & Sécurité](./SECURITY.md)
5. [Routes & Endpoints](./ROUTES.md)
6. [Middleware](./MIDDLEWARE.md)
7. [Services](./SERVICES.md)
8. [Socket.IO](./SOCKET.md)
9. [Configuration](./CONFIGURATION.md)
10. [Déploiement](./DEPLOYMENT_GUIDE.md)

## 🎯 Vue d'ensemble

Cette API REST complète pour plateforme e-commerce B2B type Alibaba offre plus de 50 tables et des fonctionnalités avancées incluant :

- **Authentification JWT** multi-rôles
- **Messagerie temps réel** avec Socket.IO
- **Gestion complète** des produits, commandes, utilisateurs
- **Sécurité renforcée** avec rate limiting et validation
- **Architecture modulaire** et scalable

## 🚀 Démarrage Rapide

```bash
# Installation
npm install

# Configuration
cp .env.example .env
# Modifier les variables d'environnement

# Base de données
mysql -u root -p < migrations/zigh-portfolio_gabmarkethub.sql

# Démarrage
npm run dev
```

## 🔗 Liens Utiles

- [Guide de déploiement](./DEPLOYMENT_GUIDE.md)
- [Rapport de validation](./VALIDATION_REPORT.md)
- [Exemples d'utilisation](./EXAMPLES.md)

---