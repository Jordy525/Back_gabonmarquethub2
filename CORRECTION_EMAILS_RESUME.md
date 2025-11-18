# 📧 Correction Nodemailer - Résumé des Actions

**Date:** 18 novembre 2025  
**Problème:** Emails ne s'envoient pas - "Connection timeout"  
**Solution:** Retry automatique + port 465 + correction mot de passe  

---

## 🎯 Problème identifié

Le fichier `.env.production` contient un mot de passe Gmail avec des **espaces accidentels**:

```env
❌ INCORRECT:
EMAIL_PASSWORD=mssj rnrz ypqc nguy
```

Ces espaces causent un timeout de connexion SMTP car Nodemailer ne peut pas s'authentifier.

---

## ✅ Solutions appliquées

### 1. Correction `.env.production`
```env
AVANT:
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_PASSWORD=mssj rnrz ypqc nguy

APRÈS:
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_PASSWORD=mssjrnrzypqcnguy
```

**Pourquoi ces changements:**
- **Port 465:** Plus sûr et robuste (TLS directement)
- **EMAIL_SECURE=true:** Activation du chiffrement immédiat
- **Pas d'espaces:** Mot de passe complet et lisible

### 2. Améliorations `emailService.js`
✅ Retry automatique (3 tentatives)  
✅ Backoff exponentiel (1s, 2s, 4s entre essais)  
✅ Timeouts augmentés (10s → 30s)  
✅ Sanitation auto du mot de passe (suppression espaces)  
✅ Logging détaillé pour diagnostiquer  
✅ Verification SMTP au démarrage  

### 3. Nouveaux fichiers créés
- **`scripts/test-smtp.js`** → Script de test de connexion SMTP
- **`docs/NODEMAILER_TROUBLESHOOTING_FR.md`** → Guide complet en français
- **`NODEMAILER_SETUP_REQUIRED.md`** → Checklist avant production
- **`.env.example`** → Mis à jour avec instructions

---

## 🚀 Actions à faire

### Étape 1: Testez en local (2 min)

```bash
node scripts/test-smtp.js
```

**Résultat attendu:**
```
✅ Connexion TCP établie vers smtp.gmail.com:465
✅ SMTP vérifié avec succès  
✅ Email de test envoyé avec succès
🎉 Tous les tests sont passés!
```

### Étape 2: Mettez à jour Render (3 min)

Dans [dashboard.render.com](https://dashboard.render.com):

1. Ouvrir votre app "Back_gabonmarquethub2"
2. → Environment
3. Modifier ces variables:
   ```
   EMAIL_PORT=465
   EMAIL_SECURE=true
   EMAIL_PASSWORD=<votre mot de passe Gmail, SANS espaces>
   ```

**Pour obtenir le mot de passe d'application Gmail:**
- [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
- Générer un nouveau mot de passe
- Copier le code SANS les espaces visibles

### Étape 3: Déployer le code (2 min)

```bash
git add .
git commit -m "Fix: Nodemailer retry + port 465"
git push origin main
```

Render détectera et redéploiera automatiquement.

### Étape 4: Vérifier les logs (1 min)

Render Dashboard → Logs:
- Cherchez: `✅ [EmailService] SMTP ready — connexion OK`
- Si présent: ✅ Emails fonctionnent!
- Si absent ou erreur: Consultez `NODEMAILER_TROUBLESHOOTING_FR.md`

### Étape 5: Tester les emails (2 min)

1. Inscription new compte → Vérifier réception email
2. Mot de passe oublié → Vérifier réception email

---

## 📊 Flux d'envoi d'email (amélioré)

```
Demande d'envoi
    ↓
Créer notification en BD (statut='pending')
    ↓
Tentative 1 → Succès? OUI → Marquer 'sent' ✅
           → NON  → Attendre 1s
    ↓
Tentative 2 → Succès? OUI → Marquer 'sent' ✅
           → NON  → Attendre 2s
    ↓
Tentative 3 → Succès? OUI → Marquer 'sent' ✅
           → NON  → Marquer 'failed' + log erreur ❌
    ↓
Processus `processFailedEmails()` relancera les emails en erreur
```

---

## 🔍 Messages d'erreur courants

### "Connection timeout"
**Cause:** Port/TLS incorrect ou spécification manquante  
**Fix:** `EMAIL_PORT=465`, `EMAIL_SECURE=true`

### "Invalid login"
**Cause:** Mot de passe incorrect ou avec espaces  
**Fix:** Régénérer sur [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) + copier SANS espaces

### "EHOSTUNREACH"
**Cause:** Pare-feu bloquant le port SMTP  
**Fix:** Contact hébergeur / tester: `Test-NetConnection -ComputerName smtp.gmail.com -Port 465`

---

## 📚 Documentation

Consultez pour plus de détails:

1. **`NODEMAILER_SETUP_REQUIRED.md`**
   - Checklist complète
   - Tous les détails de configuration

2. **`docs/NODEMAILER_TROUBLESHOOTING_FR.md`**
   - Guide de dépannage exhaustif
   - Diagnostic des erreurs
   - Ressources externes

3. **`.env.example`**
   - Configuration de référence
   - Instructions pour chaque variable

4. **`scripts/test-smtp.js`**
   - Test automatique de la connexion
   - Diagnostic réseau + SMTP

---

## ✅ Checklist avant production

- [ ] Testé localement: `node scripts/test-smtp.js` ✅
- [ ] Variables Render mises à jour ✅
- [ ] Code committé et pushé ✅
- [ ] Render redéployé ✅
- [ ] Logs vérifiés: "SMTP ready" présent ✅
- [ ] Test inscription avec email réel ✅
- [ ] Test réinitialisation mot de passe ✅

---

## 💡 Notes importantes

✅ **Retry automatique:** Les emails seront automatiquement renvoyés 3 fois en cas d'erreur temporaire  
✅ **Backward compatible:** Aucun changement d'API, fonctionne avec du code existant  
✅ **Logging:** Chaque tentative est loggée pour diagnostiquer les problèmes  
✅ **Sécurisé:** Port 465 avec TLS + sanitation du mot de passe  

---

## 🎉 Résultat

Après ces étapes:
- ✅ Emails s'envoient sans timeout
- ✅ Retry automatique en cas de problème temporaire
- ✅ Logging détaillé pour diagnostiquer
- ✅ Meilleure sécurité (port 465 + TLS)

**Estimé:** 5-10 min pour appliquer tous les changements

---

**Besoin d'aide?**  
→ Consultez `NODEMAILER_TROUBLESHOOTING_FR.md`  
→ Lancez `node scripts/test-smtp.js` pour diagnostiquer
