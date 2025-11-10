# Configuration Email - GabMarketHub

## Problème identifié
L'envoi d'emails de vérification ne fonctionne pas car les identifiants SMTP ne sont pas configurés correctement.

## Solutions disponibles

### Option 1: Gmail (Recommandé pour le développement)

1. **Créer un compte Gmail dédié** ou utiliser un compte existant
2. **Activer l'authentification à 2 facteurs**
3. **Générer un mot de passe d'application** :
   - Aller dans les paramètres Google Account
   - Sécurité > Authentification à 2 facteurs > Mots de passe des applications
   - Générer un mot de passe pour "Mail"

4. **Mettre à jour le fichier .env** :
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre_email@gmail.com
SMTP_PASS=votre_mot_de_passe_application
FRONTEND_URL=http://localhost:5173
```

### Option 2: Mailtrap (Recommandé pour les tests)

Pour les tests de développement, Mailtrap capture tous les emails :

```env
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=votre_username_mailtrap
SMTP_PASS=votre_password_mailtrap
FRONTEND_URL=http://localhost:5173
```

### Option 3: SendGrid (Recommandé pour la production)

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=votre_api_key_sendgrid
FRONTEND_URL=https://votre-domaine.com
```

### Option 4: Mailgun

```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=votre_username_mailgun
SMTP_PASS=votre_password_mailgun
FRONTEND_URL=https://votre-domaine.com
```

## Test de la configuration

Après avoir configuré les identifiants, testez avec :

```bash
node scripts/test-email.js
```

## Fonctionnalités email actuelles

✅ **Implémentées** :
- Email de vérification lors de l'inscription
- Email de changement de statut (activation/suspension)
- Email de validation/rejet de documents
- Système de retry pour les emails échoués
- Stockage des notifications en base de données

## Prochaines étapes

1. Configurer les vrais identifiants SMTP
2. Tester l'envoi d'emails
3. Vérifier que les liens de vérification fonctionnent
4. Configurer les emails pour la production

## Notes importantes

- Les emails sont stockés dans la table `email_notifications`
- Le système gère automatiquement les tentatives de renvoi
- Les tokens de vérification expirent après 24h
- Les acheteurs sont activés automatiquement après vérification email
- Les fournisseurs doivent aussi télécharger des documents après vérification