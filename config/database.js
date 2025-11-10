const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'mysql-zigh-portfolio.alwaysdata.net',
    user: process.env.DB_USER || '404304',
    password: process.env.DB_PASSWORD || 'Campement@2024',
    database: process.env.DB_NAME || 'zigh-portfolio_gabmarkethub',
    port: parseInt(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10, // Augmenté pour la production
    queueLimit: 0, // Pas de limite de file d'attente
    // Configuration pour connexion distante avec timeouts étendus
    connectTimeout: 60000, // 60 secondes pour établir la connexion
    acquireTimeout: 60000,
    timeout: 60000,
    // Retirer l'option reconnect qui cause l'avertissement
    // Options de connexion MySQL
    ssl: false, // Désactiver SSL si problème de certificat
    multipleStatements: false
});

module.exports = pool;
