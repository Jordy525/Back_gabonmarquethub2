const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Mettre à jour le profil utilisateur
router.put('/profile', authenticateToken, [
    body('nom').optional().trim().isLength({ min: 2 }),
    body('prenom').optional().trim(),
    body('email').optional().isEmail(),
    body('telephone').optional().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { nom, prenom, email, telephone } = req.body;
        const updates = [];
        const params = [];

        if (nom) {
            updates.push('nom = ?');
            params.push(nom);
        }
        if (prenom) {
            updates.push('prenom = ?');
            params.push(prenom);
        }
        if (email) {
            // Vérifier que l'email n'est pas déjà utilisé
            const [existingUser] = await db.execute(
                'SELECT id FROM utilisateurs WHERE email = ? AND id != ?',
                [email, req.user.id]
            );
            
            if (existingUser.length > 0) {
                return res.status(400).json({ error: 'Cet email est déjà utilisé' });
            }
            
            updates.push('email = ?');
            params.push(email);
        }
        if (telephone) {
            updates.push('telephone = ?');
            params.push(telephone);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
        }

        params.push(req.user.id);

        await db.execute(
            `UPDATE utilisateurs SET ${updates.join(', ')} WHERE id = ?`,
            params
        );

        res.json({ message: 'Profil mis à jour avec succès' });

    } catch (error) {
        console.error('Erreur mise à jour profil:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour du profil' });
    }
});

// Changer le mot de passe
router.put('/password', authenticateToken, [
    body('currentPassword').notEmpty().withMessage('Mot de passe actuel requis'),
    body('newPassword').isLength({ min: 6 }).withMessage('Le nouveau mot de passe doit contenir au moins 6 caractères')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { currentPassword, newPassword } = req.body;

        // Vérifier le mot de passe actuel
        const [user] = await db.execute(
            'SELECT mot_de_passe FROM utilisateurs WHERE id = ?',
            [req.user.id]
        );

        if (user.length === 0) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        const isValidPassword = await bcrypt.compare(currentPassword, user[0].mot_de_passe);
        if (!isValidPassword) {
            return res.status(400).json({ error: 'Mot de passe actuel incorrect' });
        }

        // Hasher le nouveau mot de passe
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // Mettre à jour le mot de passe
        await db.execute(
            'UPDATE utilisateurs SET mot_de_passe = ? WHERE id = ?',
            [hashedNewPassword, req.user.id]
        );

        res.json({ message: 'Mot de passe modifié avec succès' });

    } catch (error) {
        console.error('Erreur changement mot de passe:', error);
        res.status(500).json({ error: 'Erreur lors du changement de mot de passe' });
    }
});

// Créer la table des paramètres de notification si elle n'existe pas
const createNotificationSettingsTable = async () => {
    await db.execute(`
        CREATE TABLE IF NOT EXISTS notification_settings (
            id INT PRIMARY KEY AUTO_INCREMENT,
            utilisateur_id INT NOT NULL,
            email_notifications BOOLEAN DEFAULT TRUE,
            push_notifications BOOLEAN DEFAULT TRUE,
            message_notifications BOOLEAN DEFAULT TRUE,
            order_notifications BOOLEAN DEFAULT TRUE,
            marketing_emails BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
            UNIQUE KEY unique_user_settings (utilisateur_id)
        )
    `);
};

// Mettre à jour les paramètres de notification
router.put('/notifications-settings', authenticateToken, async (req, res) => {
    try {
        await createNotificationSettingsTable();

        const {
            emailNotifications,
            pushNotifications,
            messageNotifications,
            orderNotifications,
            marketingEmails
        } = req.body;

        // Vérifier si des paramètres existent déjà
        const [existing] = await db.execute(
            'SELECT id FROM notification_settings WHERE utilisateur_id = ?',
            [req.user.id]
        );

        if (existing.length > 0) {
            // Mettre à jour
            await db.execute(`
                UPDATE notification_settings 
                SET email_notifications = ?, push_notifications = ?, 
                    message_notifications = ?, order_notifications = ?, 
                    marketing_emails = ?, updated_at = NOW()
                WHERE utilisateur_id = ?
            `, [
                emailNotifications, pushNotifications, messageNotifications,
                orderNotifications, marketingEmails, req.user.id
            ]);
        } else {
            // Créer
            await db.execute(`
                INSERT INTO notification_settings 
                (utilisateur_id, email_notifications, push_notifications, 
                 message_notifications, order_notifications, marketing_emails)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                req.user.id, emailNotifications, pushNotifications,
                messageNotifications, orderNotifications, marketingEmails
            ]);
        }

        res.json({ message: 'Paramètres de notification mis à jour' });

    } catch (error) {
        console.error('Erreur paramètres notification:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour des paramètres' });
    }
});

// Créer la table des paramètres de confidentialité si elle n'existe pas
const createPrivacySettingsTable = async () => {
    await db.execute(`
        CREATE TABLE IF NOT EXISTS privacy_settings (
            id INT PRIMARY KEY AUTO_INCREMENT,
            utilisateur_id INT NOT NULL,
            profile_visible BOOLEAN DEFAULT TRUE,
            show_email BOOLEAN DEFAULT FALSE,
            show_phone BOOLEAN DEFAULT FALSE,
            allow_messages BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
            UNIQUE KEY unique_user_privacy (utilisateur_id)
        )
    `);
};

// Mettre à jour les paramètres de confidentialité
router.put('/privacy-settings', authenticateToken, async (req, res) => {
    try {
        await createPrivacySettingsTable();

        const {
            profileVisible,
            showEmail,
            showPhone,
            allowMessages
        } = req.body;

        // Vérifier si des paramètres existent déjà
        const [existing] = await db.execute(
            'SELECT id FROM privacy_settings WHERE utilisateur_id = ?',
            [req.user.id]
        );

        if (existing.length > 0) {
            // Mettre à jour
            await db.execute(`
                UPDATE privacy_settings 
                SET profile_visible = ?, show_email = ?, 
                    show_phone = ?, allow_messages = ?, updated_at = NOW()
                WHERE utilisateur_id = ?
            `, [
                profileVisible, showEmail, showPhone, allowMessages, req.user.id
            ]);
        } else {
            // Créer
            await db.execute(`
                INSERT INTO privacy_settings 
                (utilisateur_id, profile_visible, show_email, show_phone, allow_messages)
                VALUES (?, ?, ?, ?, ?)
            `, [
                req.user.id, profileVisible, showEmail, showPhone, allowMessages
            ]);
        }

        res.json({ message: 'Paramètres de confidentialité mis à jour' });

    } catch (error) {
        console.error('Erreur paramètres confidentialité:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour des paramètres' });
    }
});

// Récupérer les paramètres de notification
router.get('/notifications-settings', authenticateToken, async (req, res) => {
    try {
        await createNotificationSettingsTable();

        const [settings] = await db.execute(
            'SELECT * FROM notification_settings WHERE utilisateur_id = ?',
            [req.user.id]
        );

        if (settings.length === 0) {
            // Retourner les paramètres par défaut
            return res.json({
                emailNotifications: true,
                pushNotifications: true,
                messageNotifications: true,
                orderNotifications: true,
                marketingEmails: false
            });
        }

        const setting = settings[0];
        res.json({
            emailNotifications: setting.email_notifications,
            pushNotifications: setting.push_notifications,
            messageNotifications: setting.message_notifications,
            orderNotifications: setting.order_notifications,
            marketingEmails: setting.marketing_emails
        });

    } catch (error) {
        console.error('Erreur récupération paramètres notification:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des paramètres' });
    }
});

// Récupérer les paramètres de confidentialité
router.get('/privacy-settings', authenticateToken, async (req, res) => {
    try {
        await createPrivacySettingsTable();

        const [settings] = await db.execute(
            'SELECT * FROM privacy_settings WHERE utilisateur_id = ?',
            [req.user.id]
        );

        if (settings.length === 0) {
            // Retourner les paramètres par défaut
            return res.json({
                profileVisible: true,
                showEmail: false,
                showPhone: false,
                allowMessages: true
            });
        }

        const setting = settings[0];
        res.json({
            profileVisible: setting.profile_visible,
            showEmail: setting.show_email,
            showPhone: setting.show_phone,
            allowMessages: setting.allow_messages
        });

    } catch (error) {
        console.error('Erreur récupération paramètres confidentialité:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des paramètres' });
    }
});

module.exports = router;