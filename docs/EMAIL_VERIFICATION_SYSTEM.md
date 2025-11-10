# 📧 Système de Vérification Email et Reset de Mot de Passe

---



## 🎯 Vue d'ensemble

Ce système implémente une vérification email obligatoire lors de l'inscription et un système de réinitialisation de mot de passe sécurisé.

## ✨ Fonctionnalités

### 1. Vérification Email Obligatoire

- **Code à 6 chiffres** envoyé par email
- **Validité de 10 minutes** pour le code
- **Interface intuitive** avec auto-focus entre les champs
- **Renvoi de code** possible
- **Timer visuel** du temps restant

### 2. Reset de Mot de Passe

- **Lien sécurisé** envoyé par email
- **Validité de 1 heure** pour le lien
- **Page externe** de réinitialisation
- **Validation robuste** du nouveau mot de passe

## 🗄️ Structure de la Base de Données

### Nouvelles Tables

#### `utilisateurs_temp`

```sql
- id (INT, AUTO_INCREMENT, PRIMARY KEY)
- email (VARCHAR(255), UNIQUE)
- verification_code (VARCHAR(6))
- code_expires_at (DATETIME)
- created_at (TIMESTAMP)
```

#### `password_reset_tokens`

```sql
- id (INT, AUTO_INCREMENT, PRIMARY KEY)
- utilisateur_id (INT, FOREIGN KEY)
- token (VARCHAR(64), UNIQUE)
- expires_at (DATETIME)
- used (TINYINT(1), DEFAULT 0)
- used_at (DATETIME, NULL)
- created_at (TIMESTAMP)
```

### Colonnes Ajoutées à `utilisateurs`

```sql
- email_verified (TINYINT(1), DEFAULT 0)
- email_verified_at (DATETIME, NULL)
- email_verification_token (VARCHAR(64), NULL)
- email_verification_expires (DATETIME, NULL)
```

## 🚀 Installation

### 1. Exécuter les Migrations

```bash
cd Backend_Ecommerce
node scripts/setup_email_verification.js
```

### 2. Tester le Système

```bash
node scripts/test_email_system.js
```

### 3. Redémarrer le Serveur

```bash
npm start
```

## 📡 API Endpoints

### Inscription avec Vérification

#### 1. Envoyer le Code de Vérification

```http
POST /api/auth/register/send-verification
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Réponse:**

```json
{
  "message": "Code de vérification envoyé par email",
  "email": "user@example.com",
  "expires_in": 600
}
```

#### 2. Vérifier le Code et Finaliser l'Inscription

```http
POST /api/auth/register/verify-code
Content-Type: application/json

{
  "email": "user@example.com",
  "verification_code": "123456",
  "mot_de_passe": "password123",
  "nom": "Dupont",
  "prenom": "Jean",
  "telephone": "0123456789",
  "role_id": 1
}
```

**Réponse:**

```json
{
  "message": "Compte créé et vérifié avec succès",
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "nom": "Dupont",
    "prenom": "Jean",
    "role_id": 1
  }
}
```

### Reset de Mot de Passe

#### 1. Demander la Réinitialisation

```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Réponse:**

```json
{
  "message": "Si cet email existe dans notre système, vous recevrez un lien de réinitialisation"
}
```

#### 2. Vérifier la Validité du Token

```http
GET /api/auth/reset-password/verify/{token}
```

**Réponse:**

```json
{
  "valid": true,
  "user": {
    "email": "user@example.com",
    "nom": "Dupont",
    "prenom": "Jean"
  }
}
```

#### 3. Réinitialiser le Mot de Passe

```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset_token_here",
  "newPassword": "newpassword123"
}
```

**Réponse:**

```json
{
  "message": "Mot de passe réinitialisé avec succès"
}
```

## 🎨 Interface Frontend

### Pages Créées

1. **`/register-verification`** - Inscription avec vérification email
2. **`/reset-password`** - Page de réinitialisation de mot de passe
3. **Composant `EmailVerification`** - Interface de saisie du code

### Utilisation

#### Inscription

```tsx
// Rediriger vers la nouvelle page d'inscription
navigate('/register-verification?type=acheteur');
navigate('/register-verification?type=fournisseur');
```

#### Reset de Mot de Passe

```tsx
// Lien automatique dans l'email
https://votre-domaine.com/reset-password?token=abc123
```

## 🔒 Sécurité

### Mesures Implémentées

- **Codes à usage unique** (supprimés après utilisation)
- **Expiration automatique** des tokens
- **Pas d'énumération d'emails** (même message pour tous)
- **Validation côté serveur** de tous les codes
- **Nettoyage automatique** des données temporaires

### Bonnes Pratiques

- Les codes expirent automatiquement
- Les tokens de reset sont invalidés après utilisation
- Les données temporaires sont nettoyées
- Les emails inexistants ne révèlent pas d'informations

## 🧪 Tests

### Test Automatique

```bash
node scripts/test_email_system.js
```

### Test Manuel

1. Aller sur `/register-verification`
2. Saisir un email valide
3. Vérifier la réception du code
4. Saisir le code reçu
5. Tester la finalisation de l'inscription

## 📧 Configuration Email

### Variables d'Environnement Requises

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-mot-de-passe-app
FRONTEND_URL=http://localhost:3000
```

### Templates Email

- **Code de vérification** : Design moderne avec code en évidence
- **Reset de mot de passe** : Lien sécurisé avec instructions claires
- **Responsive** : Compatible mobile et desktop

## 🐛 Dépannage

### Problèmes Courants

#### 1. Code de Vérification Non Reçu

- Vérifier les spams
- Vérifier la configuration SMTP
- Vérifier les logs du serveur

#### 2. Token de Reset Invalide

- Vérifier que le token n'a pas expiré
- Vérifier que le token n'a pas été utilisé
- Vérifier la base de données

#### 3. Erreurs de Base de Données

- Exécuter les migrations
- Vérifier les permissions
- Vérifier la connexion

### Logs Utiles

```bash
# Logs du serveur
tail -f logs/app.log

# Logs de base de données
tail -f logs/mysql.log
```

## 📈 Monitoring

### Métriques à Surveiller

- Taux de vérification email
- Temps de traitement des codes
- Erreurs d'envoi d'email
- Utilisation des tokens de reset

### Alertes Recommandées

- Échec d'envoi d'email > 5%
- Codes expirés non utilisés > 50%
- Erreurs de base de données

## 🔄 Maintenance

### Nettoyage Automatique

- Les codes expirés sont automatiquement supprimés
- Les tokens de reset utilisés sont marqués
- Les données temporaires sont nettoyées

### Nettoyage Manuel (si nécessaire)

```sql
-- Supprimer les codes expirés
DELETE FROM utilisateurs_temp WHERE code_expires_at < NOW();

-- Supprimer les tokens de reset expirés
DELETE FROM password_reset_tokens WHERE expires_at < NOW();
```

## 📚 Documentation Supplémentaire

- [Configuration SMTP](./EMAIL_SETUP.md)
- [API Documentation](./ROUTES.md)
- [Sécurité](./SECURITY.md)
