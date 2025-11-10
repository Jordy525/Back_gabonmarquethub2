# 🔧 Guide de Résolution des Problèmes OAuth

## 🚨 Problème : Erreur `invalid_client`

### **Symptômes :**
```
TokenError: Unauthorized
code: 'invalid_client'
```

### **Causes possibles :**

1. **Clés OAuth incorrectes**
   - `GOOGLE_CLIENT_ID` ne correspond pas
   - `GOOGLE_CLIENT_SECRET` ne correspond pas
   - Clés pour un autre projet Google

2. **Configuration Google Console incorrecte**
   - URI de redirection manquante ou incorrecte
   - Application en mode test sans utilisateurs autorisés
   - Clés OAuth supprimées ou régénérées

3. **Variables d'environnement**
   - Fichier `.env` manquant
   - Variables mal définies
   - Serveur non redémarré après modification

## 🔧 Solutions

### **1. Vérifier la configuration Google Console**

1. **Aller sur** : https://console.developers.google.com/
2. **Sélectionner le bon projet**
3. **Aller dans "Identifiants" > "OAuth 2.0 Client IDs"**
4. **Vérifier :**
   - ✅ Client ID correspond à `GOOGLE_CLIENT_ID`
   - ✅ Client Secret correspond à `GOOGLE_CLIENT_SECRET`
   - ✅ URI de redirection autorisée : `http://localhost:3000/api/auth/google/callback`

### **2. Régénérer les clés OAuth**

Si les clés ne correspondent pas :

1. **Supprimer l'ancien identifiant OAuth**
2. **Créer un nouveau** :
   - Type : Application web
   - URI de redirection : `http://localhost:3000/api/auth/google/callback`
3. **Copier les nouvelles clés**
4. **Mettre à jour le fichier `.env`**

### **3. Vérifier le mode de l'application**

**Mode Test :**
- Limite aux utilisateurs ajoutés manuellement
- Ajouter votre email dans "Utilisateurs de test"

**Mode Production :**
- Accessible à tous les utilisateurs Google
- Nécessite une vérification Google

### **4. Tester la configuration**

**Route de test :** `http://localhost:3000/api/auth/oauth-test-success`

Cette route simule une connexion OAuth réussie pour tester le système sans Google.

## 🧪 Tests de Validation

### **1. Test de configuration**
```bash
node scripts/check_oauth_config.js
```

### **2. Test du flux OAuth**
```bash
node scripts/test_oauth_flow.js
```

### **3. Test de bypass OAuth**
- Aller sur : `http://localhost:5173/oauth-test`
- Cliquer sur "Test OAuth (Bypass)"

## 📋 Checklist de Résolution

- [ ] Vérifier que le serveur backend fonctionne
- [ ] Vérifier les variables d'environnement OAuth
- [ ] Vérifier la configuration Google Console
- [ ] Tester avec la route de bypass
- [ ] Redémarrer le serveur après modification
- [ ] Tester avec un utilisateur autorisé (mode test)

## 🚀 Solution Temporaire

En cas de problème persistant, utiliser la route de bypass :

```javascript
// Route de test OAuth
GET /api/auth/oauth-test-success
```

Cette route crée un utilisateur de test et simule une connexion OAuth réussie.

## 📞 Support

Si le problème persiste :
1. Vérifier les logs du serveur
2. Tester avec la route de bypass
3. Vérifier la configuration Google Console
4. Régénérer les clés OAuth si nécessaire
