-- Script SQL pour supprimer les colonnes bancaires de la table entreprises
-- Date: 2024-01-XX
-- Description: Suppression des informations bancaires suite à l'abandon du système de paiement

-- Vérifier si les colonnes existent avant de les supprimer
-- (Pour éviter les erreurs si les colonnes n'existent pas)

-- Supprimer la colonne nom_banque
ALTER TABLE entreprises DROP COLUMN IF EXISTS nom_banque;

-- Supprimer la colonne iban
ALTER TABLE entreprises DROP COLUMN IF EXISTS iban;

-- Supprimer la colonne nom_titulaire_compte
ALTER TABLE entreprises DROP COLUMN IF EXISTS nom_titulaire_compte;

-- Supprimer la colonne bic_swift
ALTER TABLE entreprises DROP COLUMN IF EXISTS bic_swift;

-- Afficher un message de confirmation
SELECT 'Colonnes bancaires supprimées avec succès de la table entreprises' AS message;
