# 👨‍💼 Guide d'Insertion d'un Administrateur - GabMarketHub

Ce guide vous explique **3 méthodes différentes** pour insérer un administrateur dans votre plateforme GabMarketHub.

## 📋 Informations sur le Système

### Structure des Rôles
- **ID 1** : `acheteur` - Utilisateur qui achète des produits
- **ID 2** : `fournisseur` - Entreprise qui vend des produits  
- **ID 3** : `administrateur` - Gestionnaire de la plateforme

### Table Utilisateurs
L'administrateur sera inséré dans la table `utilisateurs` avec les champs principaux :
- `nom`, `prenom`, `email`, `telephone`
- `mot_de_passe` (haché avec bcrypt)
- `role_id = 3` (administrateur)
- `statut = 'actif'`
- `email_verified = 1`

---

## 🔧 Méthode 1 : Script Node.js Automatisé (Recommandée)

### Utilisation

1. **Modifier les données dans le script** :
   ```bash
   # Ouvrez le fichier
   c:\Users\CHEICK\Desktop\gabonmarquethub\Back_gabonmarquethub\scripts\create-admin.js
   
   # Modifiez ces valeurs dans adminData :
   nom: 'Votre Nom'
   prenom: 'Votre Prénom'  
   email: 'votre@email.com'
   telephone: '0600000000'
   mot_de_passe: 'VotreMotDePasseSecurise123!'
   ```

2. **Exécuter le script** :
   ```bash
   cd c:\Users\CHEICK\Desktop\gabonmarquethub\Back_gabonmarquethub
   node scripts/create-admin.js
   ```

### Avantages ✅
- ✅ Validation automatique des données
- ✅ Vérification si l'email existe déjà
- ✅ Hachage sécurisé du mot de passe
- ✅ Gestion des transactions (rollback en cas d'erreur)
- ✅ Création automatique des logs d'audit
- ✅ Messages d'information détaillés
- ✅ Vérification de la création

---

## 🗄️ Méthode 2 : Script SQL Direct

### Utilisation

1. **Préparer le mot de passe haché** :
   ```bash
   # Dans Node.js (console ou script temporaire)
   const bcrypt = require('bcryptjs');
   const hash = await bcrypt.hash('VotreMotDePasse123!', 12);
   console.log(hash);
   ```

2. **Modifier le script SQL** :
   ```sql
   -- Ouvrez : c:\Users\CHEICK\Desktop\gabonmarquethub\Back_gabonmarquethub\scripts\create-admin.sql
   -- Changez ces valeurs :
   'admin@gabmarkethub.com',                     -- email
   '$2b$12$VOTRE_HASH_ICI',                     -- mot de passe haché
   'Votre Nom',                                 -- nom
   'Votre Prénom',                              -- prenom
   '0600000000'                                 -- telephone
   ```

3. **Exécuter via MySQL** :
   ```bash
   mysql -u username -p database_name < scripts/create-admin.sql
   ```

### Avantages ✅
- ✅ Exécution rapide
- ✅ Pas de dépendances Node.js
- ✅ Commandes de vérification incluses
- ✅ Scripts utilitaires pour la gestion

---

## 🌐 Méthode 3 : Via l'API Admin Existante

Si vous avez déjà un admin ou accès à l'API :

### Utilisation avec curl
```bash
curl -X POST http://localhost:3001/api/admin/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_TOKEN_ADMIN" \
  -d '{
    "nom": "Nouvel",
    "prenom": "Admin", 
    "email": "nouvel.admin@gabmarkethub.com",
    "telephone": "0600000000",
    "mot_de_passe": "MotDePasseSecurise123!",
    "role_id": 3,
    "statut": "actif",
    "email_verified": true,
    "notes_admin": "Créé via API"
  }'
```

### Utilisation via Frontend
1. Connectez-vous avec un compte admin existant
2. Allez dans "Gestion des utilisateurs"
3. Cliquez "Créer un utilisateur"
4. Sélectionnez `role_id = 3` (administrateur)
5. Remplissez les informations et validez

---

## 🚨 Sécurité et Bonnes Pratiques

### ⚠️ Points Importants

1. **Changez le mot de passe par défaut** immédiatement après la première connexion
2. **Utilisez un email valide** pour la récupération de compte
3. **Choisissez un mot de passe fort** :
   - Minimum 12 caractères
   - Majuscules, minuscules, chiffres, symboles
   - Pas de mots du dictionnaire

### 🔐 Recommandations de Sécurité

```bash
# Exemples de mots de passe forts :
AdminGabMarket2024!@#
Gb$ecur3_2024_$tr0ng
M@rketHub_Admin_2024!
```

### 📝 Après Création

1. **Testez la connexion** :
   - URL : `http://localhost:3000/login` (ou votre domaine)
   - Email : celui que vous avez configuré
   - Mot de passe : celui que vous avez défini

2. **Vérifiez les permissions** :
   - Accès au dashboard admin
   - Gestion des utilisateurs
   - Gestion des produits
   - Notifications admin

3. **Configurez la sécurité** :
   - Activez la double authentification si disponible
   - Configurez les notifications par email
   - Vérifiez les logs d'audit

---

## 🔍 Vérification et Dépannage

### Vérifier la Création
```sql
-- Vérifier que l'admin existe
SELECT 
    u.id, u.nom, u.prenom, u.email, u.role_id,
    r.nom as role_nom, u.statut, u.email_verified
FROM utilisateurs u
LEFT JOIN roles r ON u.role_id = r.id  
WHERE u.role_id = 3;
```

### Problèmes Courants

1. **"Email déjà existant"** :
   ```sql
   -- Vérifier l'utilisateur existant
   SELECT * FROM utilisateurs WHERE email = 'votre@email.com';
   
   -- Le promouvoir admin si nécessaire
   UPDATE utilisateurs SET role_id = 3 WHERE email = 'votre@email.com';
   ```

2. **"Erreur de connexion à la base"** :
   - Vérifiez `config/database.js`
   - Testez la connexion MySQL
   - Vérifiez les credentials

3. **"Table utilisateurs n'existe pas"** :
   ```bash
   # Exécuter les migrations
   cd Back_gabonmarquethub
   node scripts/run-migration.js
   ```

### Logs et Monitoring
```sql
-- Voir les dernières actions admin
SELECT * FROM admin_audit_logs 
WHERE action LIKE '%ADMIN%' 
ORDER BY created_at DESC 
LIMIT 10;

-- Voir les connexions récentes
SELECT id, email, derniere_connexion, login_attempts 
FROM utilisateurs 
WHERE role_id = 3 
ORDER BY derniere_connexion DESC;
```

---

## 📞 Support

Si vous rencontrez des problèmes :

1. Vérifiez les logs dans `logs/`
2. Consultez la documentation dans `docs/`
3. Testez la connexion avec `scripts/test-db-connection.js`

---

## 📚 Fichiers Concernés

- **Script principal** : `scripts/create-admin.js`
- **Script SQL** : `scripts/create-admin.sql`
- **API Admin** : `routes/admin.js`
- **Configuration DB** : `config/database.js`
- **Schéma utilisateurs** : `migrations/zigh-portfolio_gabmarkethub.sql`

---

*Dernière mise à jour : Novembre 2024*