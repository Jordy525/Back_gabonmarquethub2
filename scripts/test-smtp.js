#!/usr/bin/env node

/**
 * Script de test pour vérifier la connexion SMTP
 * Usage: node scripts/test-smtp.js
 * 
 * Ce script teste la connexion au serveur SMTP sans dépendre du reste de l'application
 */

require('dotenv').config({ path: '.env' }); // Charger .env local d'abord

const nodemailer = require('nodemailer');
const net = require('net');

console.log('🔍 [SMTP Test] Démarrage du test de connexion SMTP...\n');

// Configuration
const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
const emailPort = parseInt(process.env.EMAIL_PORT, 10) || 465;
const emailUser = process.env.EMAIL_USER || null;
const emailPasswordRaw = process.env.EMAIL_PASSWORD || '';
const emailPassword = emailPasswordRaw.replace(/\s+/g, ''); // Sanitize

console.log('📋 Configuration détectée:');
console.log(`   Host: ${emailHost}`);
console.log(`   Port: ${emailPort}`);
console.log(`   User: ${emailUser ? '***configuré***' : 'MANQUANT'}`);
console.log(`   Password: ${emailPassword ? '***configuré***' : 'MANQUANT'}`);
console.log(`   Secure: ${emailPort === 465 ? 'true (TLS)' : 'false (STARTTLS)'}\n`);

// Étape 1 : Test de connectivité réseau
console.log('1️⃣  Test de connectivité réseau au serveur SMTP...');
const socket = net.createConnection(emailPort, emailHost, () => {
    console.log(`   ✅ Connexion TCP établie vers ${emailHost}:${emailPort}\n`);
    socket.end();
    testSMTP();
});

socket.on('error', (err) => {
    console.error(`   ❌ Erreur de connexion réseau:`, err.message);
    console.error(`   Impossible de joindre ${emailHost}:${emailPort}`);
    console.error(`   \n   Causes possibles:`);
    console.error(`   - Serveur SMTP indisponible`);
    console.error(`   - Pare-feu bloqueant le port ${emailPort}`);
    console.error(`   - Problème de réseau\n`);
    process.exit(1);
});

socket.setTimeout(5000, () => {
    console.error(`   ❌ Timeout lors de la connexion réseau (5s)`);
    socket.destroy();
    process.exit(1);
});

// Étape 2 : Test SMTP avec Nodemailer
async function testSMTP() {
    console.log('2️⃣  Test de vérification SMTP avec Nodemailer...');
    
    if (!emailUser || !emailPassword) {
        console.error('   ❌ Identifiants manquants:');
        console.error(`      EMAIL_USER: ${emailUser ? 'OK' : 'MANQUANT'}`);
        console.error(`      EMAIL_PASSWORD: ${emailPassword ? 'OK' : 'MANQUANT'}`);
        process.exit(1);
    }

    const transporter = nodemailer.createTransport({
        host: emailHost,
        port: emailPort,
        secure: emailPort === 465,
        auth: {
            user: emailUser,
            pass: emailPassword
        },
        tls: {
            rejectUnauthorized: false
        },
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 30000
    });

    try {
        const verified = await transporter.verify();
        console.log(`   ✅ SMTP vérifié avec succès`);
        console.log(`   ✅ Les emails devraient fonctionner correctement\n`);
        
        // Étape 3 : Optionnel - Test d'envoi
        console.log('3️⃣  Envoi d\'un email de test...');
        const testEmail = process.env.EMAIL_USER; // Envoyer à soi-même
        
        const info = await transporter.sendMail({
            from: `"GabMarketHub Test" <${emailUser}>`,
            to: testEmail,
            subject: '[Test] GabMarketHub - Vérification SMTP',
            html: `
                <h2>Test de configuration SMTP réussi ✅</h2>
                <p>Cet email a été envoyé avec succès.</p>
                <p>Timestamp: ${new Date().toLocaleString('fr-FR')}</p>
            `
        });
        
        console.log(`   ✅ Email de test envoyé avec succès`);
        console.log(`   Message ID: ${info.messageId}\n`);
        console.log('🎉 Tous les tests sont passés avec succès!');
        process.exit(0);
        
    } catch (error) {
        console.error(`   ❌ SMTP verification échouée:`);
        console.error(`   ${error && error.message ? error.message : error}\n`);
        
        if (error && error.code === 'ETIMEDOUT') {
            console.error('   Diagnostic ETIMEDOUT:');
            console.error('   - Vérifiez que le port SMTP est correct (généralement 465 ou 587)');
            console.error('   - Vérifiez que les identifiants sont corrects (pas d\'espaces!)');
            console.error('   - Vérifiez que secure=true pour port 465');
            console.error('   - L\'hébergeur bloque peut-être le port SMTP\n');
        }
        
        if (error && error.code === 'EAUTH') {
            console.error('   Diagnostic EAUTH (authentification échouée):');
            console.error('   - Vérifiez EMAIL_USER et EMAIL_PASSWORD');
            console.error('   - Pour Gmail: utilisez un mot de passe d\'application');
            console.error('   - Générez-le sur: https://myaccount.google.com/apppasswords\n');
        }
        
        process.exit(1);
    }
}
