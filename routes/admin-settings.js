const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

// Middleware pour vérifier les droits admin (role_id = 3)
const requireAdmin = requireRole([3]);

// GET /api/admin/settings - Récupérer tous les paramètres
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        console.log('🔍 Récupération des paramètres admin...');

        // Vérifier si la table admin_settings existe
        const [tables] = await db.execute(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'admin_settings'
        `);

        if (tables.length === 0) {
            // Créer la table si elle n'existe pas
            await db.execute(`
                CREATE TABLE admin_settings (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    setting_key VARCHAR(100) NOT NULL UNIQUE,
                    setting_value TEXT,
                    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
                    category VARCHAR(50) DEFAULT 'general',
                    description TEXT,
                    is_public BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    updated_by INT,
                    FOREIGN KEY (updated_by) REFERENCES utilisateurs(id)
                )
            `);

            // Insérer les paramètres par défaut
            const defaultSettings = [
                // Paramètres généraux
                ['site_name', 'Gabon Trade Hub', 'string', 'general', 'Nom du site', true],
                ['site_description', 'Plateforme e-commerce du Gabon', 'string', 'general', 'Description du site', true],
                ['site_logo', '/uploads/logo.png', 'string', 'general', 'Logo du site', true],
                ['contact_email', 'contact@gabontradehub.com', 'string', 'general', 'Email de contact', true],
                ['contact_phone', '+241 01 23 45 67', 'string', 'general', 'Téléphone de contact', true],
                ['maintenance_mode', 'false', 'boolean', 'general', 'Mode maintenance', false],
                
                // Paramètres utilisateurs
                ['max_login_attempts', '5', 'number', 'users', 'Tentatives de connexion max', false],
                ['account_lockout_duration', '15', 'number', 'users', 'Durée de verrouillage (minutes)', false],
                ['password_min_length', '8', 'number', 'users', 'Longueur minimale mot de passe', false],
                ['require_email_verification', 'true', 'boolean', 'users', 'Vérification email obligatoire', false],
                ['auto_approve_suppliers', 'false', 'boolean', 'users', 'Approbation automatique fournisseurs', false],
                
                // Paramètres commandes
                ['order_auto_cancel_hours', '24', 'number', 'orders', 'Annulation auto commandes (heures)', false],
                ['min_order_amount', '1000', 'number', 'orders', 'Montant minimum commande (FCFA)', false],
                ['max_order_amount', '10000000', 'number', 'orders', 'Montant maximum commande (FCFA)', false],
                ['commission_rate', '5', 'number', 'orders', 'Taux de commission (%)', false],
                
                // Paramètres produits
                ['max_products_per_supplier', '1000', 'number', 'products', 'Produits max par fournisseur', false],
                ['product_approval_required', 'true', 'boolean', 'products', 'Approbation produits requise', false],
                ['max_product_images', '10', 'number', 'products', 'Images max par produit', false],
                ['max_image_size_mb', '5', 'number', 'products', 'Taille max image (MB)', false],
                
                // Paramètres notifications
                ['email_notifications', 'true', 'boolean', 'notifications', 'Notifications email', false],
                ['sms_notifications', 'false', 'boolean', 'notifications', 'Notifications SMS', false],
                ['admin_notification_email', 'admin@gabontradehub.com', 'string', 'notifications', 'Email notifications admin', false],
                
                // Paramètres sécurité
                ['enable_two_factor', 'false', 'boolean', 'security', 'Authentification 2FA', false],
                ['session_timeout_minutes', '60', 'number', 'security', 'Timeout session (minutes)', false],
                ['enable_ip_whitelist', 'false', 'boolean', 'security', 'Liste blanche IP', false],
                ['max_file_upload_mb', '10', 'number', 'security', 'Taille max upload (MB)', false],
                
                // Paramètres paiement
                ['payment_methods', '["bank_transfer", "mobile_money", "cash"]', 'json', 'payment', 'Méthodes de paiement', false],
                ['default_currency', 'XAF', 'string', 'payment', 'Devise par défaut', true],
                ['tax_rate', '18', 'number', 'payment', 'Taux de TVA (%)', false],
                
                // Paramètres API
                ['api_rate_limit', '1000', 'number', 'api', 'Limite requêtes API/heure', false],
                ['api_key_expiry_days', '365', 'number', 'api', 'Expiration clés API (jours)', false],
                
                // Paramètres système
                ['backup_frequency_hours', '24', 'number', 'system', 'Fréquence sauvegarde (heures)', false],
                ['log_retention_days', '30', 'number', 'system', 'Rétention logs (jours)', false],
                ['cleanup_temp_files_hours', '6', 'number', 'system', 'Nettoyage fichiers temp (heures)', false]
            ];

            for (const [key, value, type, category, description, isPublic] of defaultSettings) {
                await db.execute(`
                    INSERT INTO admin_settings (setting_key, setting_value, setting_type, category, description, is_public, updated_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [key, value, type, category, description, isPublic, req.user.id]);
            }

            console.log('✅ Table admin_settings créée avec paramètres par défaut');
        }

        // Récupérer tous les paramètres
        const [settings] = await db.execute(`
            SELECT 
                s.*,
                u.nom as updated_by_name
            FROM admin_settings s
            LEFT JOIN utilisateurs u ON s.updated_by = u.id
            ORDER BY s.category, s.setting_key
        `);

        // Grouper par catégorie
        const settingsByCategory = {};
        settings.forEach(setting => {
            if (!settingsByCategory[setting.category]) {
                settingsByCategory[setting.category] = [];
            }
            
            // Convertir la valeur selon le type
            let value = setting.setting_value;
            if (setting.setting_type === 'number') {
                value = parseFloat(value);
            } else if (setting.setting_type === 'boolean') {
                value = value === 'true';
            } else if (setting.setting_type === 'json') {
                try {
                    value = JSON.parse(value);
                } catch (e) {
                    value = setting.setting_value;
                }
            }

            settingsByCategory[setting.category].push({
                ...setting,
                setting_value: value
            });
        });

        res.json({
            settings: settingsByCategory,
            categories: Object.keys(settingsByCategory),
            total: settings.length
        });

    } catch (error) {
        console.error('Erreur récupération paramètres admin:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des paramètres' });
    }
});

// PUT /api/admin/settings/:key - Mettre à jour un paramètre
router.put('/:key', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { setting_value } = req.body;
        const settingKey = req.params.key;

        console.log('🔧 Mise à jour paramètre:', settingKey, '=', setting_value);

        // Vérifier que le paramètre existe
        const [existing] = await db.execute(
            'SELECT * FROM admin_settings WHERE setting_key = ?',
            [settingKey]
        );

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Paramètre non trouvé' });
        }

        // Valider la valeur selon le type
        const setting = existing[0];
        let validatedValue = setting_value;

        if (setting.setting_type === 'number') {
            validatedValue = parseFloat(setting_value);
            if (isNaN(validatedValue)) {
                return res.status(400).json({ error: 'Valeur numérique invalide' });
            }
            validatedValue = validatedValue.toString();
        } else if (setting.setting_type === 'boolean') {
            validatedValue = setting_value === true || setting_value === 'true' ? 'true' : 'false';
        } else if (setting.setting_type === 'json') {
            try {
                JSON.parse(setting_value);
                validatedValue = setting_value;
            } catch (e) {
                return res.status(400).json({ error: 'JSON invalide' });
            }
        }

        // Mettre à jour le paramètre
        await db.execute(`
            UPDATE admin_settings 
            SET setting_value = ?, updated_by = ?
            WHERE setting_key = ?
        `, [validatedValue, req.user.id, settingKey]);

        // Récupérer le paramètre mis à jour
        const [updated] = await db.execute(`
            SELECT 
                s.*,
                u.nom as updated_by_name
            FROM admin_settings s
            LEFT JOIN utilisateurs u ON s.updated_by = u.id
            WHERE s.setting_key = ?
        `, [settingKey]);

        res.json({
            message: 'Paramètre mis à jour avec succès',
            setting: updated[0]
        });

    } catch (error) {
        console.error('Erreur mise à jour paramètre:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour du paramètre' });
    }
});

// POST /api/admin/settings - Créer un nouveau paramètre
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const {
            setting_key,
            setting_value,
            setting_type = 'string',
            category = 'general',
            description,
            is_public = false
        } = req.body;

        if (!setting_key || setting_value === undefined) {
            return res.status(400).json({ error: 'Clé et valeur du paramètre requis' });
        }

        // Vérifier que la clé n'existe pas déjà
        const [existing] = await db.execute(
            'SELECT id FROM admin_settings WHERE setting_key = ?',
            [setting_key]
        );

        if (existing.length > 0) {
            return res.status(409).json({ error: 'Un paramètre avec cette clé existe déjà' });
        }

        // Créer le paramètre
        await db.execute(`
            INSERT INTO admin_settings (setting_key, setting_value, setting_type, category, description, is_public, updated_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [setting_key, setting_value, setting_type, category, description, is_public, req.user.id]);

        res.status(201).json({
            message: 'Paramètre créé avec succès',
            setting_key
        });

    } catch (error) {
        console.error('Erreur création paramètre:', error);
        res.status(500).json({ error: 'Erreur lors de la création du paramètre' });
    }
});

// DELETE /api/admin/settings/:key - Supprimer un paramètre
router.delete('/:key', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const settingKey = req.params.key;

        const [result] = await db.execute(
            'DELETE FROM admin_settings WHERE setting_key = ?',
            [settingKey]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Paramètre non trouvé' });
        }

        res.json({
            message: 'Paramètre supprimé avec succès'
        });

    } catch (error) {
        console.error('Erreur suppression paramètre:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression du paramètre' });
    }
});

// GET /api/admin/settings/public - Récupérer les paramètres publics (sans auth)
router.get('/public', async (req, res) => {
    try {
        const [settings] = await db.execute(`
            SELECT setting_key, setting_value, setting_type
            FROM admin_settings 
            WHERE is_public = TRUE
            ORDER BY setting_key
        `);

        const publicSettings = {};
        settings.forEach(setting => {
            let value = setting.setting_value;
            if (setting.setting_type === 'number') {
                value = parseFloat(value);
            } else if (setting.setting_type === 'boolean') {
                value = value === 'true';
            } else if (setting.setting_type === 'json') {
                try {
                    value = JSON.parse(value);
                } catch (e) {
                    value = setting.setting_value;
                }
            }
            publicSettings[setting.setting_key] = value;
        });

        res.json(publicSettings);

    } catch (error) {
        console.error('Erreur récupération paramètres publics:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des paramètres publics' });
    }
});

module.exports = router;