# Aide Rapide - Nodemailer en 5 Étapes

## Étape 1: Testez en local ✅

```bash
cd Back_gabonmarquethub2
node scripts/test-smtp.js
```

**Résultat attendu:**
```
✅ Connexion TCP établie vers smtp.gmail.com:465
✅ SMTP vérifié avec succès
✅ Email de test envoyé avec succès
🎉 Tous les tests sont passés!
```

**Si ça échoue:**
- Vérifiez que `.env` a les bonnes variables EMAIL_*
- Lisez `NODEMAILER_TROUBLESHOOTING_FR.md`

---

## Étape 2: Mettez à jour Render 🎯

Allez sur **[https://dashboard.render.com](https://dashboard.render.com)**

1. Cliquez sur votre service: **Back_gabonmarquethub2**
2. Onglet: **Environment**
3. **Mettez à jour** (ou créez si absent):
   ```
   EMAIL_PORT = 465
   EMAIL_SECURE = true
   EMAIL_PASSWORD = <votre_mot_de_passe_gmail>
   ```
4. Cliquez: **Save**

**⚠️ Important pour EMAIL_PASSWORD:**
- Allez sur: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
- Générez un nouveau mot de passe
- Copier-coller le code **SANS les espaces**
- Exemple: `xxxx xxxx xxxx xxxx` → copier en tant que `xxxxxxxxxxxxxxxx`

---

## Étape 3: Déployez le code 📦

```bash
# Dans le répertoire racine (SOUTENANCE/)
git add .
git commit -m "Fix: Nodemailer - Retry + port 465"
git push origin main
```

**Render redéploiera automatiquement** (~2-3 min)

---

## Étape 4: Vérifiez les logs 📋

Dans le [dashboard Render](https://dashboard.render.com):
- Onglet: **Logs**
- Cherchez: `✅ [EmailService] SMTP ready — connexion OK`

**Si vous voyez ça:** ✅ C'est bon!

**Si vous voyez une erreur:**
- Lisez le message d'erreur
- Consultez `NODEMAILER_TROUBLESHOOTING_FR.md`

---

## Étape 5: Testez les emails 🧪

1. Allez sur votre site (frontend)
2. Essayez de vous **inscrire**
3. Entrez une **vraie adresse email**
4. Vérifiez que vous **recevez l'email de vérification**

**Succès?** ✅ Les emails fonctionnent!

**Pas d'email?**
- Attendez 30s (les serveurs peuvent être lents)
- Vérifiez votre dossier **Spam**
- Lancez `node scripts/test-smtp.js` pour diagnostiquer
- Lisez `NODEMAILER_TROUBLESHOOTING_FR.md`

---

## 🚨 Erreurs courantes

### "Connection timeout"
```
SOLUTION:
1. Vérifiez EMAIL_PORT=465 dans Render
2. Vérifiez EMAIL_SECURE=true dans Render
3. Testez: node scripts/test-smtp.js
```

### "Invalid login"
```
SOLUTION:
1. Régénérez un mot de passe d'app Gmail
2. Copier-collez SANS les espaces visibles
3. Mettez à jour Render
4. Testez: node scripts/test-smtp.js
```

### "Connection refused"
```
SOLUTION:
1. Vérifiez EMAIL_HOST=smtp.gmail.com
2. Testez la connectivité: ping smtp.gmail.com
3. Si Render bloque, contactez le support
```

---

## 📞 Besoin d'aide?

1. **Test rapide:** `node scripts/test-smtp.js`
2. **Erreur spécifique?** Lisez: `NODEMAILER_TROUBLESHOOTING_FR.md`
3. **Vue d'ensemble?** Lisez: `CORRECTION_EMAILS_RESUME.md`
4. **Checklist complète?** Lisez: `NODEMAILER_SETUP_REQUIRED.md`

---

## ⏱️ Résumé du temps

```
Test local:       2 min
Render update:    3 min (création compte si nouveau)
Deploy code:      2 min
Render redeploy:  3 min
Test final:       2 min
─────────────────────────
TOTAL:           ~12 min
```

---

## ✅ Avant de dire "C'est bon!"

- [ ] `node scripts/test-smtp.js` affiche "✅ SMTP ready"
- [ ] Variables Render mises à jour (EMAIL_PORT, EMAIL_SECURE, EMAIL_PASSWORD)
- [ ] Code déployé (`git push`)
- [ ] Logs Render affichent "✅ [EmailService] SMTP ready"
- [ ] Test d'inscription reçoit un email

---

**Prêt?** Commencez par l'étape 1! 🚀
