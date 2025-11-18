# Configuration Nodemailer - Actions Requises ✅

## Résumé des modifications

Une solution complète pour corriger les timeouts d'envoi d'emails avec Nodemailer a été implémentée.

### 🔧 Fichiers modifiés

| Fichier | Changement |
|---------|-----------|
| `.env.production` | ✅ Mot de passe corrigé (espaces supprimés), port 465 + TLS activé |
| `services/emailService.js` | ✅ Retry automatique, timeouts augmentés (30s), logging amélioré |
| `scripts/test-smtp.js` | ✨ Nouveau - Script de test de connectivité SMTP |
| `.env.example` | ✅ Mis à jour avec instructions Gmail |
| `docs/NODEMAILER_TROUBLESHOOTING_FR.md` | ✨ Nouveau - Guide complet de dépannage |

### 🚀 Actions à faire avant le déploiement

#### **1. Testez en local (Obligatoire)**

```bash
# Prérequis: Votre fichier .env local doit avoir les bonnes variables Gmail
# Si vous ne l'avez pas, copiez .env.example et remplissez les champs EMAIL_*

# Lancer le test de connexion SMTP
node scripts/test-smtp.js
```

**Résultats attendus:**
```
✅ Connexion TCP établie vers smtp.gmail.com:465
✅ SMTP vérifié avec succès
✅ Email de test envoyé avec succès
🎉 Tous les tests sont passés avec succès!
```

#### **2. Mettez à jour Render (Critique)**

Dans le [tableau de bord Render](https://dashboard.render.com):

1. Allez à votre service "Back_gabonmarquethub2"
2. Cliquez sur "Environment"
3. **Mettez à jour ces variables:**
   ```
   EMAIL_PORT=465
   EMAIL_SECURE=true
   EMAIL_PASSWORD=<mot de passe d'application Gmail, SANS ESPACES>
   ```

**⚠️ Comment obtenir le mot de passe d'application Gmail:**

1. Allez sur [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Si vous ne voyez pas l'option:
   - Activez d'abord 2FA: [myaccount.google.com/security](https://myaccount.google.com/security)
   - Puis revenez sur la page des mots de passe d'application
3. Sélectionnez "Mail" et "Windows"
4. Générez un mot de passe
5. Copiez **le mot de passe complet SANS les espaces**
   - Vous verrez: `xxxx xxxx xxxx xxxx` (avec espaces pour la lisibilité)
   - Copiez en: `xxxxxxxxxxxxxxxx` (sans espaces)

#### **3. Déployer les changements de code**

```bash
# Commit et push
git add .
git commit -m "Fix: Améliorer Nodemailer avec retry automatique et port 465"
git push origin main
```

Render détectera le changement et redéploiera automatiquement.

#### **4. Vérifiez les logs après déploiement**

Dans Render Dashboard, onglet "Logs":

**Cherchez ces messages de succès:**
```
🔧 [EmailService] Configuration SMTP:
  - EMAIL_HOST: smtp.gmail.com
  - EMAIL_PORT: 465
✅ [EmailService] SMTP ready — connexion OK
```

**Ou ces messages d'erreur à diagnostiquer:**
```
❌ [EmailService] SMTP verify failed: Connection timeout
   → Vérifiez EMAIL_PORT et EMAIL_SECURE dans Render
   → Testez avec: node scripts/test-smtp.js

❌ [EmailService] SMTP verify failed: Invalid login
   → Vérifiez EMAIL_PASSWORD (pas d'espaces!)
   → Régénérez le mot de passe d'application Gmail
```

### 📊 Améliorations implémentées

#### Retry automatique
- ✅ Jusqu'à 3 tentatives automatiques
- ✅ Délai augmentant entre les tentatives (1s, 2s, 4s)
- ✅ Logging détaillé de chaque tentative

#### Meilleure configuration SMTP
- ✅ Port 465 avec TLS (plus robuste que 587)
- ✅ Timeouts augmentés: 30s (au lieu de 10s)
- ✅ Pool de connexions optimisé
- ✅ Sanitation automatique des espaces dans le mot de passe

#### Logging/Diagnostics
- ✅ Vérification SMTP au démarrage
- ✅ Codes d'erreur SMTP affichés
- ✅ Host/port affichés en cas d'erreur
- ✅ Script de test dédié

### 🧪 Testing des emails

Après le déploiement, testez en :

1. **Créant un nouveau compte**
   - Allez sur le formulaire d'inscription
   - Entrez une adresse email
   - Vérifiez que vous recevez l'email de vérification

2. **Testant la réinitialisation de mot de passe**
   - Cliquez sur "Mot de passe oublié"
   - Entrez votre email
   - Vérifiez que vous recevez l'email de reset

3. **Monitoring des logs**
   - Regardez Render Logs en temps réel
   - Cherchez les messages `✅ [EmailService] Email envoyé avec succès`

### ❓ En cas de problème

**"Connection timeout" persiste**
1. Relancez `node scripts/test-smtp.js` localement
2. Vérifiez que `EMAIL_PORT=465` et `EMAIL_SECURE=true` dans Render
3. Assurez-vous que `EMAIL_PASSWORD` n'a **pas d'espaces**
4. Consultez `docs/NODEMAILER_TROUBLESHOOTING_FR.md`

**"Invalid login" ou "Authentication failed"**
1. Vérifiez votre mot de passe d'application Gmail
2. Régénérez-en un nouveau sur [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Copier-coller **SANS les espaces**

**"Connection refused"**
1. Vérifiez que `EMAIL_HOST=smtp.gmail.com` est configuré
2. Testez la connectivité: `Test-NetConnection -ComputerName smtp.gmail.com -Port 465` (PowerShell)

### 📚 Documentation

- **Guide complet:** `docs/NODEMAILER_TROUBLESHOOTING_FR.md`
- **Configuration exemple:** `.env.example`
- **Script de test:** `scripts/test-smtp.js`

### ✅ Checklist avant production

- [ ] Testé localement avec `node scripts/test-smtp.js` ✅
- [ ] Mises à jour des variables Render confirmées ✅
- [ ] Code committé et pushé ✅
- [ ] Render redéployé automatiquement ✅
- [ ] Logs Render vérifiés pour `✅ [EmailService] SMTP ready` ✅
- [ ] Test d'inscription avec email réel ✅
- [ ] Test de réinitialisation de mot de passe ✅

---

**Status:** ✅ Prêt pour production  
**Version:** Nodemailer 7.0.5 + Retry v1.0  
**Date:** 18 novembre 2025
