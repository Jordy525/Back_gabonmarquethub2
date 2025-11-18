# Guide de Dépannage - Emails avec Nodemailer

## Problème : "Connection timeout" lors de l'envoi d'emails

### Étapes de diagnostic et correction

#### 1. Vérifiez votre mot de passe Gmail

**⚠️ Le problème principal identifié:** Le mot de passe dans `.env.production` contient des **espaces**

```env
❌ INCORRECT:
EMAIL_PASSWORD=mssj rnrz ypqc nguy

✅ CORRECT:
EMAIL_PASSWORD=mssjrnrzypqcnguy
```

**Pour Gmail:**
1. Allez sur [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Sélectionnez "Mail" et "Windows"
3. Générez un mot de passe d'application
4. **Copier-colez directement SANS ESPACES** (les espaces visibles sont juste du formatage pour lire)

#### 2. Mettez à jour `.env.production`

Remplacez ces lignes:
```env
❌ AVANT:
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_PASSWORD=mssj rnrz ypqc nguy

✅ APRÈS:
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_PASSWORD=mssjrnrzypqcnguy
```

**Pourquoi le port 465 avec TLS:**
- Plus robuste et sécurisé
- Moins sujet aux timeouts
- Recommandé par Gmail pour les scripts

#### 3. Testez la connexion SMTP en local

```bash
# Assurez-vous d'avoir les bonnes variables d'environnement
# dans .env (développement) ou .env.production

# Lancer le test
node scripts/test-smtp.js
```

**Résultats attendus:**
```
✅ Connexion TCP établie
✅ SMTP vérifié avec succès
✅ Email de test envoyé avec succès
🎉 Tous les tests sont passés avec succès!
```

#### 4. Déployez sur Render

1. **Mettez à jour les variables d'environnement dans Render:**
   - Dashboard Render → Your App → Environment
   - Mettez à jour:
     - `EMAIL_PORT=465`
     - `EMAIL_SECURE=true`
     - `EMAIL_PASSWORD=<mot de passe correct, SANS ESPACES>`

2. **Déployez ou redémarrez le service:**
   - Commit et push des changements du code:
     ```bash
     git add Back_gabonmarquethub2/services/emailService.js Back_gabonmarquethub2/.env.production
     git commit -m "Fix: Améliorer Nodemailer avec retry et port 465"
     git push origin main
     ```
   - Render déploiera automatiquement

3. **Vérifiez les logs:**
   - Regardez la section "Logs" du tableau de bord Render
   - Cherchez les messages:
     - `✅ [EmailService] SMTP ready — connexion OK` → Bonne configuration
     - `✅ [EmailService] Email envoyé avec succès` → L'envoi fonctionne
     - `❌ [EmailService] SMTP verify failed` → Il y a toujours un problème

### Messages d'erreur courants

#### "ETIMEDOUT"
```
Causes:
- Port SMTP incorrect
- Mot de passe avec espaces
- EMAIL_SECURE incorrect pour le port
- Pare-feu/Hébergeur bloqueant le port

Solutions:
1. Vérifiez EMAIL_PORT=465 et EMAIL_SECURE=true
2. Vérifiez que EMAIL_PASSWORD n'a pas d'espaces
3. Testez avec: node scripts/test-smtp.js
```

#### "EAUTH" (Authentification échouée)
```
Causes:
- EMAIL_USER incorrect
- EMAIL_PASSWORD incorrect
- Gmail a rejeté les identifiants

Solutions:
1. Vérifiez EMAIL_USER (devrait être votre adresse Gmail)
2. Régénérez le mot de passe d'application sur myaccount.google.com/apppasswords
3. Assurez-vous de ne pas avoir d'espaces dans le mot de passe
```

#### "EHOSTUNREACH"
```
Causes:
- Réseau/DNS ne peut pas joindre smtp.gmail.com
- Pare-feu bloquant les connexions sortantes

Solutions:
1. Vérifiez la connectivité: ping smtp.gmail.com
2. Testez le port: nc -vz smtp.gmail.com 465
3. Contactez votre fournisseur d'hébergement
```

### Améliorations implémentées

Le fichier `emailService.js` a été mis à jour avec:

✅ **Retry automatique**
- 3 tentatives avant abandon
- Backoff exponentiel (1s, 2s, 4s)
- Logging détaillé de chaque tentative

✅ **Meilleurs timeouts**
- 30s pour chaque phase (connexion, greeting, données)
- Pool de connexions optimisé (3 connexions max)
- Gestion intelligente de `EMAIL_SECURE` basée sur le port

✅ **Logging amélioré**
- Diagnostic immédiat au démarrage avec `transporter.verify()`
- Messages clairs pour chaque tentative
- Codes d'erreur SMTP affichés pour diagnostiquer

✅ **Sanitation du mot de passe**
- Les espaces/newlines accidentels sont supprimés
- Protection contre les erreurs de copier-coller

### Flux d'envoi d'email

```
1. Création notification en BD (statut='pending')
   ↓
2. Tentative 1 d'envoi
   ├─ Succès → Mettre à jour BD (statut='sent')
   └─ Échoue → Attendre 1s
   ↓
3. Tentative 2 d'envoi
   ├─ Succès → Mettre à jour BD (statut='sent')
   └─ Échoue → Attendre 2s
   ↓
4. Tentative 3 d'envoi
   ├─ Succès → Mettre à jour BD (statut='sent')
   └─ Échoue → Mettre à jour BD (statut='failed')
   ↓
5. Possibilité de retraiter manuellement via processFailedEmails()
```

### En cas de problème persistant

1. **Vérifiez votre compte Gmail:**
   - 2FA activé ? (Il faut utiliser un mot de passe d'application)
   - Compte suspendu ? Accédez à [accounts.google.com/signin/recovery](https://accounts.google.com/signin/recovery)
   - Accès appliqué refusé ? Allez à [myaccount.google.com/device-activity](https://myaccount.google.com/device-activity)

2. **Essayez un test simple en PowerShell:**
   ```powershell
   # Tester la connectivité réseau
   Test-NetConnection -ComputerName smtp.gmail.com -Port 465
   
   # Résultat attendu:
   # TcpTestSucceeded : True
   ```

3. **Contactez le support:**
   - Si les tests locaux passent mais Render échoue, c'est un problème d'hébergement
   - Render peut bloquer les ports SMTP sortants

### Ressources utiles

- [Gmail App Passwords](https://myaccount.google.com/apppasswords)
- [Nodemailer Documentation](https://nodemailer.com)
- [Gmail SMTP Settings](https://support.google.com/mail/answer/7126229?hl=en)
- [Render.com Troubleshooting](https://render.com/docs/troubleshooting-deploys)

---

**Mise à jour:** 18 novembre 2025
**Service:** GabonMarketHub Backend
**Nodemailer:** v7.0.5
