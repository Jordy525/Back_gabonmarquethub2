-- Tables pour le système de vérification email et reset de mot de passe

-- Table pour les utilisateurs temporaires (pendant la vérification email)
CREATE TABLE IF NOT EXISTS utilisateurs_temp (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    verification_code VARCHAR(6) NOT NULL,
    code_expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_code (verification_code),
    INDEX idx_expires (code_expires_at)
);

-- Table pour les tokens de reset de mot de passe
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    utilisateur_id INT NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used TINYINT(1) DEFAULT 0,
    used_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_expires (expires_at),
    INDEX idx_used (used)
);

-- Ajouter les colonnes manquantes à la table utilisateurs si elles n'existent pas
ALTER TABLE utilisateurs 
ADD COLUMN IF NOT EXISTS email_verified TINYINT(1) DEFAULT 0,
ADD COLUMN IF NOT EXISTS email_verified_at DATETIME NULL,
ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(64) NULL,
ADD COLUMN IF NOT EXISTS email_verification_expires DATETIME NULL;

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_email_verified ON utilisateurs(email_verified);
CREATE INDEX IF NOT EXISTS idx_email_verification_token ON utilisateurs(email_verification_token);
