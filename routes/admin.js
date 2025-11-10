const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { 
  createAdminNotification,
  notifyNewUser,
  notifyVerificationRequest,
  notifyUserSuspension,
  notifyUserReport,
  notifyProductModeration,
  notifyProductReport,
  notifyProductModificationRequest,
  notifySystemError,
  notifySecurityAlert,
  notifyPerformanceStats,
  notifyMaintenance
} = require('./admin-notifications');
const router = express.Router();

// Middleware pour vérifier les droits admin (role_id = 3)
const requireAdmin = requireRole([3]);

// Statistiques générales pour l'admin
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // Total des fournisseurs actifs
        const [totalFournisseurs] = await db.execute(`
            SELECT COUNT(DISTINCT e.id) as total 
            FROM entreprises e 
            JOIN utilisateurs u ON e.utilisateur_id = u.id 
            WHERE u.role_id = 2 AND u.statut = 'actif'
        `);

        // Total des acheteurs actifs
        const [totalAcheteurs] = await db.execute(`
            SELECT COUNT(*) as total 
            FROM utilisateurs 
            WHERE role_id = 1 AND statut = 'actif'
        `);

        // Total des produits
        const [totalProduits] = await db.execute(`
            SELECT COUNT(*) as total 
            FROM produits 
            WHERE statut = 'actif'
        `);

        // Vérifier si la table commandes existe
        let totalCommandes = [{ total: 0, chiffre_affaires: 0 }];
        let nouvellesCommandes = [{ total: 0, montant: 0 }];
        
        try {
            const [tables] = await db.execute(`
                SELECT TABLE_NAME 
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'commandes'
            `);
            
            if (tables.length > 0) {
                // Total des commandes
                totalCommandes = await db.execute(`
                    SELECT COUNT(*) as total, SUM(total_ttc) as chiffre_affaires
                    FROM commandes
                `);
                totalCommandes = totalCommandes[0];

                // Commandes récentes (7 derniers jours)
                nouvellesCommandes = await db.execute(`
                    SELECT COUNT(*) as total, SUM(total_ttc) as montant
                    FROM commandes 
                    WHERE date_commande >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                `);
                nouvellesCommandes = nouvellesCommandes[0];
            }
        } catch (error) {
            console.log('⚠️ Table commandes non accessible:', error.message);
        }

        // Utilisateurs récents (7 derniers jours)
        const [nouveauxUtilisateurs] = await db.execute(`
            SELECT COUNT(*) as total 
            FROM utilisateurs 
            WHERE date_inscription >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        `);

        // Statistiques par statut utilisateur
        const [statsUtilisateurs] = await db.execute(`
            SELECT 
                r.nom as role_nom,
                u.statut,
                COUNT(*) as count
            FROM utilisateurs u
            JOIN roles r ON u.role_id = r.id
            GROUP BY r.nom, u.statut
        `);

        res.json({
            total_fournisseurs: totalFournisseurs[0].total,
            total_acheteurs: totalAcheteurs[0].total,
            total_produits: totalProduits[0].total,
            total_commandes: Array.isArray(totalCommandes) ? totalCommandes[0].total : totalCommandes.total || 0,
            chiffre_affaires: Array.isArray(totalCommandes) ? (totalCommandes[0].chiffre_affaires || 0) : (totalCommandes.chiffre_affaires || 0),
            nouveaux_utilisateurs_7j: nouveauxUtilisateurs[0].total,
            nouvelles_commandes_7j: Array.isArray(nouvellesCommandes) ? nouvellesCommandes[0].total : nouvellesCommandes.total || 0,
            ca_7j: Array.isArray(nouvellesCommandes) ? (nouvellesCommandes[0].montant || 0) : (nouvellesCommandes.montant || 0),
            stats_utilisateurs: statsUtilisateurs
        });

    } catch (error) {
        console.error('Erreur récupération stats admin:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
    }
});

// Répartitions de paiements multi-fournisseurs
router.get('/payment-distributions', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20, statut } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = '';
        const params = [];

        if (statut) {
            whereClause = 'WHERE c.statut = ?';
            params.push(statut);
        }

        const [distributions] = await db.execute(`
            SELECT 
                c.id,
                c.numero_commande,
                c.total_ttc as montant_ttc,
                c.statut as statut_paiement,
                c.date_commande,
                c.mode_paiement,
                e.nom_entreprise as fournisseur_nom,
                e.iban,
                e.nom_banque,
                e.nom_titulaire_compte,
                CONCAT(u_acheteur.nom, ' ', COALESCE(u_acheteur.prenom, '')) as acheteur_nom,
                u_acheteur.email as acheteur_email,
                CONCAT(u_fournisseur.nom, ' ', COALESCE(u_fournisseur.prenom, '')) as fournisseur_contact,
                u_fournisseur.email as fournisseur_email
            FROM commandes c
            JOIN entreprises e ON c.fournisseur_id = e.id
            JOIN utilisateurs u_acheteur ON c.acheteur_id = u_acheteur.id
            JOIN utilisateurs u_fournisseur ON e.utilisateur_id = u_fournisseur.id
            ${whereClause}
            ORDER BY c.date_commande DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), parseInt(offset)]);

        // Calculer les totaux par statut
        const [totauxParStatut] = await db.execute(`
            SELECT 
                c.statut,
                COUNT(*) as nombre,
                SUM(c.total_ttc) as montant_total
            FROM commandes c
            GROUP BY c.statut
        `);

        res.json({
            distributions,
            totaux_par_statut: totauxParStatut,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: distributions.length
            }
        });

    } catch (error) {
        console.error('Erreur récupération répartitions paiements:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des répartitions de paiements' });
    }
});

// Détail d'une répartition de paiement
router.get('/payment-distributions/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [distribution] = await db.execute(`
            SELECT 
                c.*,
                e.nom_entreprise as fournisseur_nom,
                e.iban,
                e.nom_banque,
                e.nom_titulaire_compte,
                e.adresse as fournisseur_adresse,
                CONCAT(u_acheteur.nom, ' ', COALESCE(u_acheteur.prenom, '')) as acheteur_nom,
                u_acheteur.email as acheteur_email,
                u_acheteur.telephone as acheteur_telephone,
                CONCAT(u_fournisseur.nom, ' ', COALESCE(u_fournisseur.prenom, '')) as fournisseur_contact,
                u_fournisseur.email as fournisseur_email,
                u_fournisseur.telephone as fournisseur_telephone
            FROM commandes c
            JOIN entreprises e ON c.fournisseur_id = e.id
            JOIN utilisateurs u_acheteur ON c.acheteur_id = u_acheteur.id
            JOIN utilisateurs u_fournisseur ON e.utilisateur_id = u_fournisseur.id
            WHERE c.id = ?
        `, [req.params.id]);

        if (distribution.length === 0) {
            return res.status(404).json({ error: 'Répartition de paiement non trouvée' });
        }

        // Récupérer les détails de la commande
        const [details] = await db.execute(`
            SELECT 
                dc.*,
                p.nom as produit_nom,
                p.description as produit_description
            FROM details_commande dc
            JOIN produits p ON dc.produit_id = p.id
            WHERE dc.commande_id = ?
        `, [req.params.id]);

        res.json({
            ...distribution[0],
            details_commande: details
        });

    } catch (error) {
        console.error('Erreur récupération détail répartition:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération du détail de la répartition' });
    }
});

// Valider un paiement
router.patch('/payment-distributions/:id/validate', authenticateToken, requireAdmin, async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();

        const { notes_admin } = req.body;

        // Vérifier que la commande existe et est en attente
        const [commande] = await connection.execute(
            'SELECT * FROM commandes WHERE id = ? AND statut = "en_attente"',
            [req.params.id]
        );

        if (commande.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Commande non trouvée ou déjà traitée' });
        }

        // Mettre à jour le statut de la commande
        await connection.execute(`
            UPDATE commandes 
            SET statut = 'paye', 
                date_paiement = NOW(),
                notes_admin = ?
            WHERE id = ?
        `, [notes_admin || null, req.params.id]);

        // Créer un log de l'action admin
        await connection.execute(`
            INSERT INTO logs_admin (admin_id, action, table_cible, id_cible, details)
            VALUES (?, 'validation_paiement', 'commandes', ?, ?)
        `, [
            req.user.id, 
            req.params.id, 
            JSON.stringify({
                action: 'Validation paiement',
                montant: commande[0].total_ttc,
                notes: notes_admin
            })
        ]);

        await connection.commit();

        res.json({
            message: 'Paiement validé avec succès',
            commande_id: req.params.id
        });

    } catch (error) {
        await connection.rollback();
        console.error('Erreur validation paiement:', error);
        res.status(500).json({ error: 'Erreur lors de la validation du paiement' });
    } finally {
        connection.release();
    }
});

// Rejeter un paiement
router.patch('/payment-distributions/:id/reject', authenticateToken, requireAdmin, async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();

        const { raison_rejet, notes_admin } = req.body;

        if (!raison_rejet) {
            await connection.rollback();
            return res.status(400).json({ error: 'La raison du rejet est requise' });
        }

        // Vérifier que la commande existe
        const [commande] = await connection.execute(
            'SELECT * FROM commandes WHERE id = ?',
            [req.params.id]
        );

        if (commande.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Commande non trouvée' });
        }

        // Mettre à jour le statut de la commande
        await connection.execute(`
            UPDATE commandes 
            SET statut = 'echec', 
                raison_rejet = ?,
                notes_admin = ?,
                date_rejet = NOW()
            WHERE id = ?
        `, [raison_rejet, notes_admin || null, req.params.id]);

        // Créer un log de l'action admin
        await connection.execute(`
            INSERT INTO logs_admin (admin_id, action, table_cible, id_cible, details)
            VALUES (?, 'rejet_paiement', 'commandes', ?, ?)
        `, [
            req.user.id, 
            req.params.id, 
            JSON.stringify({
                action: 'Rejet paiement',
                raison: raison_rejet,
                montant: commande[0].total_ttc,
                notes: notes_admin
            })
        ]);

        await connection.commit();

        res.json({
            message: 'Paiement rejeté avec succès',
            commande_id: req.params.id
        });

    } catch (error) {
        await connection.rollback();
        console.error('Erreur rejet paiement:', error);
        res.status(500).json({ error: 'Erreur lors du rejet du paiement' });
    } finally {
        connection.release();
    }
});

// Rapport des paiements multi-fournisseurs
router.get('/reports/multi-supplier-payments', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { date_debut, date_fin, fournisseur_id } = req.query;

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (date_debut) {
            whereClause += ' AND DATE(c.date_commande) >= ?';
            params.push(date_debut);
        }

        if (date_fin) {
            whereClause += ' AND DATE(c.date_commande) <= ?';
            params.push(date_fin);
        }

        if (fournisseur_id) {
            whereClause += ' AND c.fournisseur_id = ?';
            params.push(fournisseur_id);
        }

        // Rapport par fournisseur
        const [rapportFournisseurs] = await db.execute(`
            SELECT 
                e.nom_entreprise,
                e.id as fournisseur_id,
                COUNT(c.id) as nombre_commandes,
                SUM(c.total_ht) as total_ht,
                SUM(c.tva) as total_tva,
                SUM(c.total_ttc) as total_ttc,
                AVG(c.total_ttc) as panier_moyen,
                COUNT(CASE WHEN c.statut = 'paye' THEN 1 END) as commandes_payees,
                COUNT(CASE WHEN c.statut = 'en_attente' THEN 1 END) as commandes_en_attente
            FROM commandes c
            JOIN entreprises e ON c.fournisseur_id = e.id
            ${whereClause}
            GROUP BY e.id, e.nom_entreprise
            ORDER BY total_ttc DESC
        `, params);

        // Évolution temporelle
        const [evolutionTemporelle] = await db.execute(`
            SELECT 
                DATE(c.date_commande) as date,
                COUNT(c.id) as nombre_commandes,
                SUM(c.total_ttc) as montant_total,
                COUNT(DISTINCT c.fournisseur_id) as nombre_fournisseurs
            FROM commandes c
            ${whereClause}
            GROUP BY DATE(c.date_commande)
            ORDER BY date DESC
            LIMIT 30
        `, params);

        res.json({
            rapport_fournisseurs: rapportFournisseurs,
            evolution_temporelle: evolutionTemporelle,
            periode: {
                date_debut: date_debut || 'Toutes',
                date_fin: date_fin || 'Toutes'
            }
        });

    } catch (error) {
        console.error('Erreur génération rapport:', error);
        res.status(500).json({ error: 'Erreur lors de la génération du rapport' });
    }
});

// ============================================================================
// GESTION DES UTILISATEURS
// ============================================================================

// Fonction utilitaire pour créer un log d'audit
async function createAuditLog(adminId, action, tableName, recordId, oldValues, newValues, req) {
    try {
        // Vérifier si la table admin_audit_logs existe
        const [tables] = await db.execute(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'admin_audit_logs'
        `);
        
        if (tables.length === 0) {
            // Créer la table si elle n'existe pas
            await db.execute(`
                CREATE TABLE admin_audit_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    admin_id INT NOT NULL,
                    action VARCHAR(100) NOT NULL,
                    table_name VARCHAR(100) NOT NULL,
                    record_id INT,
                    old_values JSON,
                    new_values JSON,
                    ip_address VARCHAR(45),
                    user_agent TEXT,
                    session_id VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (admin_id) REFERENCES utilisateurs(id)
                )
            `);
            console.log('✅ Table admin_audit_logs créée');
        }

        await db.execute(`
            INSERT INTO admin_audit_logs (admin_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            adminId,
            action,
            tableName,
            recordId,
            oldValues ? JSON.stringify(oldValues) : null,
            newValues ? JSON.stringify(newValues) : null,
            req.ip || req.connection.remoteAddress,
            req.get('User-Agent'),
            req.sessionID || 'unknown'
        ]);
    } catch (error) {
        console.error('Erreur création log audit:', error);
        // Ne pas faire échouer l'opération principale si le log échoue
    }
}

// GET /api/admin/users - Liste paginée des utilisateurs avec filtres
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            role, 
            status, 
            search
        } = req.query;

        const offset = (page - 1) * limit;
        let whereClause = 'WHERE 1=1';
        const params = [];

        // Filtres
        if (role) {
            whereClause += ' AND u.role_id = ?';
            params.push(role);
        }

        if (status) {
            whereClause += ' AND u.statut = ?';
            params.push(status);
        }

        if (search) {
            whereClause += ' AND (u.nom LIKE ? OR u.prenom LIKE ? OR u.email LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        // Requête principale avec les vraies colonnes de la base
        const [users] = await db.execute(`
            SELECT 
                u.id,
                u.nom,
                u.prenom,
                u.email,
                u.telephone,
                u.role_id,
                r.nom as role_nom,
                u.statut,
                u.date_inscription as date_creation,
                u.derniere_connexion as derniere_connexion,
                u.email_verified,
                u.phone_verified,
                u.photo_profil,
                u.suspension_reason,
                u.suspended_by,
                u.suspended_at,
                u.notes_admin,
                e.nom_entreprise,
                e.secteur_activite_id,
                e.id as entreprise_id
            FROM utilisateurs u
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN entreprises e ON u.id = e.utilisateur_id
            ${whereClause}
            ORDER BY u.date_inscription DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), parseInt(offset)]);

        // Fonction pour formater les dates au format français
        const formatDateFr = (date) => {
            if (!date) return null;
            
            try {
                const d = new Date(date);
                if (isNaN(d.getTime())) return null;
                
                const day = d.getDate().toString().padStart(2, '0');
                const month = (d.getMonth() + 1).toString().padStart(2, '0');
                const year = d.getFullYear();
                
                return `${day}/${month}/${year}`;
            } catch (error) {
                return null;
            }
        };

        // Convertir les dates et construire les URLs des photos
        users.forEach(user => {
            // Dates formatées au format français
            user.date_inscription_fr = formatDateFr(user.date_creation);
            user.derniere_connexion_fr = formatDateFr(user.derniere_connexion);
            
            // Garder aussi les formats ISO pour compatibilité
            if (user.date_creation) {
                user.date_creation = user.date_creation instanceof Date 
                    ? user.date_creation.toISOString() 
                    : user.date_creation.toString();
            }
            if (user.derniere_connexion) {
                user.derniere_connexion = user.derniere_connexion instanceof Date 
                    ? user.derniere_connexion.toISOString() 
                    : user.derniere_connexion.toString();
            }
            
            // Construire l'URL complète de la photo de profil
            if (user.photo_profil) {
                if (!user.photo_profil.startsWith('http')) {
                    const baseUrl = process.env.API_BASE_URL || `http://${process.env.HOST || 'localhost'}:${process.env.PORT || 3001}`;
                    user.photo_profil_url = `${baseUrl}${user.photo_profil}`;
                } else {
                    user.photo_profil_url = user.photo_profil;
                }
            } else {
                user.photo_profil_url = null;
            }
        });

        // Pour chaque utilisateur, calculer le statut effectif
        for (let user of users) {
            if (user.role_id === 2 && user.entreprise_id) {
                // C'est un fournisseur, vérifier ses documents
                try {
                    // Récupérer les catégories de produits du fournisseur
                    const [categoriesRows] = await db.execute(`
                        SELECT DISTINCT c.slug
                        FROM produits p
                        JOIN categories c ON p.categorie_id = c.id
                        WHERE p.fournisseur_id = ?
                    `, [user.entreprise_id]);

                    const categorySlugs = categoriesRows.map(row => row.slug);
                    
                    // Calculer les documents requis basés sur les catégories
                    const documentsRequired = [];
                    
                    // Documents obligatoires pour tous
                    documentsRequired.push('certificat_enregistrement', 'certificat_fiscal', 'piece_identite_representant');
                    
                    // Documents conditionnels basés sur les catégories
                    if (categorySlugs.some(slug => 
                        ['pharmaceutique', 'alcool', 'agroalimentaire-sensible', 'electronique-soumis-autorisation'].includes(slug)
                    )) {
                        documentsRequired.push('licence_commerciale');
                    }
                    
                    if (categorySlugs.some(slug => 
                        ['alimentaire', 'agricole', 'manufacture'].includes(slug)
                    )) {
                        documentsRequired.push('certificat_origine');
                    }
                    
                    if (categorySlugs.some(slug => 
                        ['electronique', 'jouets', 'cosmetiques', 'equipements-protection'].includes(slug)
                    )) {
                        documentsRequired.push('conformite_ce');
                    }
                    
                    if (categorySlugs.some(slug => 
                        ['alimentaire-frais', 'cosmetiques', 'pharmaceutique'].includes(slug)
                    )) {
                        documentsRequired.push('certificat_sanitaire');
                    }

                    // Récupérer les documents validés
                    const [documents] = await db.execute(`
                        SELECT type_document, statut_verification
                        FROM documents_entreprise 
                        WHERE entreprise_id = ? AND statut_verification = 'verifie'
                    `, [user.entreprise_id]);

                    const documentsValidated = documents.map(doc => doc.type_document);

                    // Vérifier si tous les documents requis sont validés
                    const allRequiredDocumentsValidated = documentsRequired.every(docType => 
                        documentsValidated.includes(docType)
                    );

                    // Le statut effectif est "actif" seulement si l'utilisateur est actif ET tous les documents requis sont validés
                    user.effective_status = (user.statut === 'actif' && allRequiredDocumentsValidated) ? 'actif' : 'en_attente';
                } catch (error) {
                    console.error('Erreur calcul statut effectif pour utilisateur', user.id, ':', error);
                    user.effective_status = user.statut;
                }
            } else {
                // Pour les non-fournisseurs, utiliser le statut de la base
                user.effective_status = user.statut;
            }
        }

        // Compter le total pour la pagination
        const [totalResult] = await db.execute(`
            SELECT COUNT(*) as total
            FROM utilisateurs u
            ${whereClause}
        `, params);

        // Statistiques par rôle
        const [roleStats] = await db.execute(`
            SELECT 
                r.nom as role_nom,
                r.id as role_id,
                COUNT(u.id) as count
            FROM roles r
            LEFT JOIN utilisateurs u ON r.id = u.role_id
            GROUP BY r.id, r.nom
        `);

        res.json({
            users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalResult[0].total,
                totalPages: Math.ceil(totalResult[0].total / limit)
            },
            roleStats
        });

    } catch (error) {
        console.error('Erreur récupération utilisateurs:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
    }
});

// POST /api/admin/users - Créer un nouvel utilisateur
router.post('/users', authenticateToken, requireAdmin, async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();

        const {
            nom,
            prenom,
            email,
            telephone,
            mot_de_passe,
            role_id,
            statut = 'actif',
            email_verified = false,
            notes_admin
        } = req.body;

        // Validation des données
        if (!nom || !email || !mot_de_passe || !role_id) {
            await connection.rollback();
            return res.status(400).json({ 
                error: 'Les champs nom, email, mot_de_passe et role_id sont requis' 
            });
        }

        // Vérifier que l'email n'existe pas déjà
        const [existingUser] = await connection.execute(
            'SELECT id FROM utilisateurs WHERE email = ?',
            [email]
        );

        if (existingUser.length > 0) {
            await connection.rollback();
            return res.status(409).json({ error: 'Un utilisateur avec cet email existe déjà' });
        }

        // Hasher le mot de passe
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(mot_de_passe, 10);

        // Créer l'utilisateur
        const [result] = await connection.execute(`
            INSERT INTO utilisateurs (
                nom, prenom, email, telephone, mot_de_passe, role_id, statut, 
                email_verified, notes_admin, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [nom, prenom, email, telephone, hashedPassword, role_id, statut, email_verified, notes_admin]);

        const userId = result.insertId;

        // Créer le log d'audit
        await createAuditLog(
            req.user.id,
            'create_user',
            'utilisateurs',
            userId,
            null,
            { nom, prenom, email, role_id, statut },
            req
        );

        await connection.commit();

        // Récupérer l'utilisateur créé avec ses détails
        const [newUser] = await connection.execute(`
            SELECT 
                u.id, u.nom, u.prenom, u.email, u.telephone, u.role_id,
                r.nom as role_nom, u.statut, u.email_verified, u.created_at
            FROM utilisateurs u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.id = ?
        `, [userId]);

        res.status(201).json({
            message: 'Utilisateur créé avec succès',
            user: newUser[0]
        });

    } catch (error) {
        await connection.rollback();
        console.error('Erreur création utilisateur:', error);
        res.status(500).json({ error: 'Erreur lors de la création de l\'utilisateur' });
    } finally {
        connection.release();
    }
});

// GET /api/admin/users/:id - Détails d'un utilisateur
router.get('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        console.log('🔍 Récupération utilisateur ID:', req.params.id);

        // Vérifier que l'ID est valide
        const userId = parseInt(req.params.id);
        if (isNaN(userId)) {
            return res.status(400).json({ error: 'ID utilisateur invalide' });
        }

        // Récupérer l'utilisateur avec son rôle
        const [users] = await db.execute(`
            SELECT 
                u.id,
                u.nom,
                u.prenom,
                u.email,
                u.telephone,
                u.role_id,
                r.nom as role_nom,
                u.statut,
                u.date_inscription as date_creation,
                u.derniere_connexion as derniere_connexion,
                u.email_verified,
                u.phone_verified,
                u.photo_profil,
                u.suspension_reason,
                u.suspended_by,
                u.suspended_at,
                u.notes_admin
            FROM utilisateurs u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.id = ?
        `, [userId]);

        if (users.length === 0) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        const userData = users[0];
        console.log('✅ Utilisateur trouvé:', userData.email);

        // Si c'est un fournisseur, récupérer les infos entreprise
        let entrepriseData = null;
        if (userData.role_id === 2) {
            try {
                const [entreprises] = await db.execute(`
                    SELECT *
                    FROM entreprises
                    WHERE utilisateur_id = ?
                `, [userId]);

                if (entreprises.length > 0) {
                    entrepriseData = entreprises[0];
                    console.log('✅ Données entreprise trouvées');
                }
            } catch (e) {
                console.log('⚠️ Pas de données entreprise ou table inexistante');
            }
        }

        // Construire l'URL de la photo de profil
        let photo_profil_url = null;
        if (userData.photo_profil) {
            if (!userData.photo_profil.startsWith('http')) {
                const baseUrl = process.env.API_BASE_URL || `http://${process.env.HOST || 'localhost'}:${process.env.PORT || 3001}`;
                photo_profil_url = `${baseUrl}${userData.photo_profil}`;
            } else {
                photo_profil_url = userData.photo_profil;
            }
        }

        // Fonction pour formater les dates au format français
        const formatDateFr = (date) => {
            if (!date) return null;
            
            try {
                const d = new Date(date);
                if (isNaN(d.getTime())) return null;
                
                const day = d.getDate().toString().padStart(2, '0');
                const month = (d.getMonth() + 1).toString().padStart(2, '0');
                const year = d.getFullYear();
                
                return `${day}/${month}/${year}`;
            } catch (error) {
                console.error('Erreur formatage date:', error);
                return null;
            }
        };

        // Construire la réponse (SANS la section stats pour supprimer "Statistiques d'activité")
        const response = {
            id: userData.id,
            nom: userData.nom,
            prenom: userData.prenom,
            email: userData.email,
            telephone: userData.telephone,
            role_id: userData.role_id,
            role_nom: userData.role_nom,
            statut: userData.statut,
            photo_profil: userData.photo_profil,
            photo_profil_url: photo_profil_url,
            // Dates formatées au format français DD/MM/YYYY
            date_inscription: formatDateFr(userData.date_inscription),
            date_inscription_iso: userData.date_inscription instanceof Date 
                ? userData.date_inscription.toISOString() 
                : userData.date_inscription?.toString(),
            derniere_connexion: formatDateFr(userData.derniere_connexion),
            derniere_connexion_iso: userData.derniere_connexion instanceof Date 
                ? userData.derniere_connexion.toISOString() 
                : userData.derniere_connexion?.toString(),
            email_verified: userData.email_verified || false,
            phone_verified: userData.phone_verified || false,
            suspension_reason: userData.suspension_reason,
            suspended_by: userData.suspended_by,
            suspended_at: userData.suspended_at,
            notes_admin: userData.notes_admin,
            ...(entrepriseData && {
                entreprise: entrepriseData
            })
            // SUPPRESSION de la section stats pour enlever "Statistiques d'activité"
        };

        console.log('✅ Réponse construite avec succès');
        res.json(response);

    } catch (error) {
        console.error('❌ Erreur récupération détails utilisateur:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération des détails de l\'utilisateur',
            details: error.message 
        });
    }
});

// PUT /api/admin/users/:id - Modifier un utilisateur
router.put('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        console.log('🔧 Modification utilisateur ID:', req.params.id);
        console.log('🔧 Données reçues:', req.body);

        // Vérifier que l'utilisateur existe
        const [oldUser] = await db.execute(
            'SELECT * FROM utilisateurs WHERE id = ?',
            [req.params.id]
        );

        if (oldUser.length === 0) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        const {
            nom,
            prenom,
            email,
            telephone,
            role_id,
            statut,
            email_verified,
            phone_verified,
            two_factor_enabled,
            notes_admin
        } = req.body;

        // Vérifier que l'email n'est pas déjà utilisé par un autre utilisateur
        if (email && email !== oldUser[0].email) {
            const [existingUser] = await db.execute(
                'SELECT id FROM utilisateurs WHERE email = ? AND id != ?',
                [email, req.params.id]
            );

            if (existingUser.length > 0) {
                return res.status(409).json({ error: 'Un autre utilisateur utilise déjà cet email' });
            }
        }

        // Construire la requête UPDATE dynamiquement
        const updateFields = [];
        const updateValues = [];

        if (nom !== undefined) {
            updateFields.push('nom = ?');
            updateValues.push(nom);
        }
        if (prenom !== undefined) {
            updateFields.push('prenom = ?');
            updateValues.push(prenom);
        }
        if (email !== undefined) {
            updateFields.push('email = ?');
            updateValues.push(email);
        }
        if (telephone !== undefined) {
            updateFields.push('telephone = ?');
            updateValues.push(telephone);
        }
        if (role_id !== undefined) {
            updateFields.push('role_id = ?');
            updateValues.push(role_id);
        }
        if (statut !== undefined) {
            updateFields.push('statut = ?');
            updateValues.push(statut);
        }
        if (email_verified !== undefined) {
            updateFields.push('email_verified = ?');
            updateValues.push(email_verified);
        }
        if (phone_verified !== undefined) {
            updateFields.push('phone_verified = ?');
            updateValues.push(phone_verified);
        }
        if (two_factor_enabled !== undefined) {
            updateFields.push('two_factor_enabled = ?');
            updateValues.push(two_factor_enabled);
        }
        if (notes_admin !== undefined) {
            updateFields.push('notes_admin = ?');
            updateValues.push(notes_admin);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
        }

        // Mettre à jour l'utilisateur
        updateValues.push(req.params.id);
        await db.execute(`
            UPDATE utilisateurs SET ${updateFields.join(', ')}
            WHERE id = ?
        `, updateValues);

        console.log('✅ Utilisateur mis à jour avec succès');

        // Créer le log d'audit (sans bloquer en cas d'erreur)
        try {
            await createAuditLog(
                req.user.id,
                'update_user',
                'utilisateurs',
                req.params.id,
                oldUser[0],
                req.body,
                req
            );
        } catch (auditError) {
            console.warn('⚠️ Erreur log audit (non bloquant):', auditError.message);
        }

        // Récupérer l'utilisateur mis à jour
        const [updatedUser] = await db.execute(`
            SELECT 
                u.id, u.nom, u.prenom, u.email, u.telephone, u.role_id,
                r.nom as role_nom, u.statut, u.email_verified, u.photo_profil
            FROM utilisateurs u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.id = ?
        `, [req.params.id]);

        // Construire l'URL de la photo
        if (updatedUser[0].photo_profil && !updatedUser[0].photo_profil.startsWith('http')) {
            const baseUrl = process.env.API_BASE_URL || `http://${process.env.HOST || 'localhost'}:${process.env.PORT || 3001}`;
            updatedUser[0].photo_profil_url = `${baseUrl}${updatedUser[0].photo_profil}`;
        } else {
            updatedUser[0].photo_profil_url = updatedUser[0].photo_profil;
        }

        res.json({
            message: 'Utilisateur mis à jour avec succès',
            user: updatedUser[0]
        });

    } catch (error) {
        console.error('❌ Erreur modification utilisateur:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la modification de l\'utilisateur',
            details: error.message 
        });
    }
});

// PATCH /api/admin/users/:id/suspend - Suspendre un utilisateur
router.patch('/users/:id/suspend', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { suspension_reason } = req.body;

        if (!suspension_reason) {
            return res.status(400).json({ error: 'La raison de la suspension est requise' });
        }

        console.log('🔍 Tentative de suspension utilisateur:', {
            userId: req.params.id,
            adminId: req.user?.id,
            reason: suspension_reason
        });

        // Récupérer l'utilisateur actuel
        const [user] = await db.execute(
            'SELECT id, statut FROM utilisateurs WHERE id = ?',
            [req.params.id]
        );

        if (user.length === 0) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        if (user[0].statut === 'suspendu') {
            return res.status(400).json({ error: 'L\'utilisateur est déjà suspendu' });
        }

        console.log('✅ Utilisateur trouvé, statut actuel:', user[0].statut);

        // Suspendre l'utilisateur (sans transaction pour simplifier)
        const [result] = await db.execute(`
            UPDATE utilisateurs SET
                statut = 'suspendu',
                suspension_reason = ?,
                suspended_by = ?,
                suspended_at = NOW()
            WHERE id = ?
        `, [suspension_reason, req.user.id, req.params.id]);

        console.log('✅ Utilisateur suspendu, lignes affectées:', result.affectedRows);

        // Créer le log d'audit (optionnel, sans faire planter si ça échoue)
        try {
            await createAuditLog(
                req.user.id,
                'suspend_user',
                'utilisateurs',
                req.params.id,
                { statut: user[0].statut },
                { statut: 'suspendu', suspension_reason },
                req
            );
            console.log('✅ Log d\'audit créé');
        } catch (auditError) {
            console.warn('⚠️ Erreur création log audit (non bloquante):', auditError.message);
        }

        res.json({
            message: 'Utilisateur suspendu avec succès',
            user_id: req.params.id
        });

    } catch (error) {
        console.error('❌ Erreur suspension utilisateur:', error);
        
        // Log plus détaillé pour le debug
        console.error('Détails de l\'erreur:', {
            message: error.message,
            stack: error.stack,
            userId: req.params.id,
            adminId: req.user?.id,
            suspensionReason: req.body?.suspension_reason
        });
        
        res.status(500).json({ 
            error: 'Erreur lors de la suspension de l\'utilisateur',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/admin/documents/pending - Récupérer les documents en attente
router.get('/documents/pending', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const documentService = require('../services/documentService');
        const documents = await documentService.getPendingDocuments();
        
        res.json({ documents });
    } catch (error) {
        console.error('Erreur récupération documents en attente:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des documents' });
    }
});

// GET /api/admin/documents/:id/download - Télécharger un document
router.get('/documents/:id/download', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const documentService = require('../services/documentService');
        const document = await documentService.getDocumentPath(req.params.id, req.user.id);
        
        const path = require('path');
        const filePath = path.join(__dirname, '..', document.chemin_fichier);
        
        res.download(filePath, document.nom_fichier);
    } catch (error) {
        console.error('Erreur téléchargement document:', error);
        res.status(500).json({ error: 'Erreur lors du téléchargement du document' });
    }
});

// PATCH /api/admin/documents/:id/validate - Valider ou rejeter un document
router.patch('/documents/:id/validate', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { status, commentaire } = req.body;
        
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Statut invalide' });
        }
        
        if (status === 'rejected' && !commentaire) {
            return res.status(400).json({ error: 'Commentaire requis pour un rejet' });
        }
        
        const documentService = require('../services/documentService');
        const result = await documentService.validateDocument(
            req.params.id, 
            req.user.id, 
            status, 
            commentaire
        );
        
        res.json({
            message: `Document ${status === 'approved' ? 'approuvé' : 'rejeté'} avec succès`,
            document: result.document
        });
    } catch (error) {
        console.error('Erreur validation document:', error);
        res.status(500).json({ error: 'Erreur lors de la validation du document' });
    }
});

// GET /api/admin/users/:id/documents - Récupérer les documents d'un utilisateur
router.get('/users/:id/documents', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const documentService = require('../services/documentService');
        const documents = await documentService.getUserDocuments(req.params.id);
        
        res.json({ documents });
    } catch (error) {
        console.error('Erreur récupération documents utilisateur:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des documents' });
    }
});

// PATCH /api/admin/users/:id/activate - Activer un utilisateur
router.patch('/users/:id/activate', authenticateToken, requireAdmin, async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();

        // Récupérer l'utilisateur actuel
        const [user] = await connection.execute(
            'SELECT * FROM utilisateurs WHERE id = ?',
            [req.params.id]
        );

        if (user.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        if (user[0].statut === 'actif') {
            await connection.rollback();
            return res.status(400).json({ error: 'L\'utilisateur est déjà actif' });
        }

        // Activer l'utilisateur
        await connection.execute(`
            UPDATE utilisateurs SET
                statut = 'actif',
                suspension_reason = NULL,
                suspended_by = NULL,
                suspended_at = NULL,
                locked_until = NULL,
                login_attempts = 0
            WHERE id = ?
        `, [req.params.id]);

        // Créer le log d'audit
        await connection.execute(`
            INSERT INTO admin_audit_logs (admin_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            req.user.id,
            'activate_user',
            'utilisateurs',
            req.params.id,
            JSON.stringify({ statut: user[0].statut }),
            JSON.stringify({ statut: 'actif' }),
            req.ip || req.connection.remoteAddress,
            req.get('User-Agent'),
            req.sessionID || 'unknown'
        ]);

        await connection.commit();

        res.json({
            message: 'Utilisateur activé avec succès',
            user_id: req.params.id
        });

    } catch (error) {
        await connection.rollback();
        console.error('Erreur activation utilisateur:', error);
        res.status(500).json({ error: 'Erreur lors de l\'activation de l\'utilisateur' });
    } finally {
        connection.release();
    }
});

// DELETE /api/admin/users/:id - Supprimer un utilisateur (soft delete)
router.delete('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        const userId = parseInt(req.params.id);
        
        if (!userId || isNaN(userId)) {
            return res.status(400).json({ error: 'ID utilisateur invalide' });
        }

        await connection.beginTransaction();

        // Récupérer l'utilisateur avec plus de détails
        const [user] = await connection.execute(
            'SELECT id, nom, prenom, email, role_id, statut FROM utilisateurs WHERE id = ?',
            [userId]
        );

        if (user.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        console.log('🗑️ Tentative de suppression utilisateur:', {
            id: userId,
            nom: user[0].nom,
            email: user[0].email,
            role_id: user[0].role_id
        });

        // Empêcher la suppression d'un admin
        if (user[0].role_id === 3) {
            await connection.rollback();
            return res.status(403).json({ error: 'Impossible de supprimer un administrateur' });
        }

        // Supprimer les données liées dans l'ordre correct pour éviter les erreurs de contraintes
        // Basé sur l'analyse des vraies contraintes FK de la base de données
        const tablesToClean = [
            // Tables avec contraintes directes vers utilisateurs (dans l'ordre de dépendance)
            { table: 'admin_audit_logs', column: 'admin_id' },
            { table: 'admin_notifications', column: 'admin_id' },
            { table: 'admin_sessions', column: 'admin_id' },
            { table: 'system_message_reads', column: 'user_id' },
            { table: 'message_notifications', column: 'user_id' },
            { table: 'message_read_status', column: 'user_id' },
            { table: 'conversation_participants', column: 'utilisateur_id' },
            { table: 'typing_indicators', column: 'utilisateur_id' },
            { table: 'message_reactions', column: 'utilisateur_id' },
            { table: 'product_reports', column: 'reporter_id' },
            { table: 'product_reports', column: 'handled_by' },
            { table: 'sessions_utilisateurs', column: 'utilisateur_id' },
            { table: 'statistiques_vues', column: 'utilisateur_id' },
            { table: 'utilisateurs_segments', column: 'utilisateur_id' },
            { table: 'recommandations', column: 'utilisateur_id' },
            { table: 'logs_admin', column: 'admin_id' },
            { table: 'logs_activite', column: 'utilisateur_id' },
            { table: 'notifications', column: 'utilisateur_id' },
            { table: 'messages', column: 'expediteur_id' },
            { table: 'gdpr_consentements', column: 'utilisateur_id' },
            { table: 'litiges', column: 'demandeur_id' },
            { table: 'litiges', column: 'admin_id' },
            { table: 'encheres', column: 'acheteur_id' },
            { table: 'devis', column: 'acheteur_id' },
            { table: 'conversations', column: 'acheteur_id' },
            { table: 'conversations', column: 'fournisseur_id' },
            { table: 'avis_produits', column: 'utilisateur_id' },
            { table: 'avis', column: 'acheteur_id' },
            { table: 'audit_trail', column: 'utilisateur_id' },
            { table: 'adresses', column: 'utilisateur_id' },
            { table: 'utilisations_coupons', column: 'utilisateur_id' },
            { table: 'panier', column: 'utilisateur_id' },
            { table: 'favoris', column: 'utilisateur_id' },
            { table: 'entreprises', column: 'utilisateur_id' },
            // Commandes en dernier car elles peuvent avoir des dépendances complexes
            { table: 'commandes', column: 'acheteur_id' },
            { table: 'commandes', column: 'dispute_opened_by' },
            { table: 'commandes', column: 'dispute_resolved_by' },
            { table: 'commandes', column: 'refund_processed_by' }
        ];

        let deletedRecords = 0;
        
        for (const { table, column } of tablesToClean) {
            try {
                const [result] = await connection.execute(`DELETE FROM ${table} WHERE ${column} = ?`, [userId]);
                if (result.affectedRows > 0) {
                    deletedRecords += result.affectedRows;
                    console.log(`🧹 Supprimé ${result.affectedRows} enregistrement(s) de ${table}.${column}`);
                }
            } catch (e) {
                // Ignorer les erreurs de tables/colonnes inexistantes
                if (!e.message.includes("doesn't exist") && !e.message.includes("Unknown column")) {
                    console.log(`⚠️ Erreur nettoyage ${table}.${column}:`, e.message);
                }
            }
        }
        
        console.log(`🧹 Total: ${deletedRecords} enregistrement(s) supprimé(s) dans les tables liées`);

        // Supprimer l'utilisateur
        const [deleteResult] = await connection.execute('DELETE FROM utilisateurs WHERE id = ?', [userId]);
        
        if (deleteResult.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Utilisateur non trouvé lors de la suppression' });
        }

        // Log d'audit simple
        try {
            await connection.execute(`
                INSERT INTO admin_audit_logs (admin_id, action, table_name, record_id, old_values, ip_address, user_agent, created_at)
                VALUES (?, 'DELETE_USER', 'utilisateurs', ?, ?, ?, ?, NOW())
            `, [
                req.user.id,
                userId,
                JSON.stringify(user[0]),
                req.ip || 'unknown',
                req.get('User-Agent') || 'unknown'
            ]);
        } catch (e) {
            // Ignorer si la table d'audit n'existe pas
            console.log('⚠️ Table audit non disponible:', e.message);
        }

        await connection.commit();

        console.log('✅ Utilisateur supprimé avec succès:', userId);

        res.json({
            message: 'Utilisateur supprimé avec succès',
            user_id: userId,
            deleted_user: {
                nom: user[0].nom,
                prenom: user[0].prenom,
                email: user[0].email
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('❌ Erreur suppression utilisateur:', {
            error: error.message,
            code: error.code,
            errno: error.errno,
            sqlState: error.sqlState,
            sqlMessage: error.sqlMessage,
            userId: req.params.id
        });
        
        // Messages d'erreur plus spécifiques
        let errorMessage = 'Erreur lors de la suppression de l\'utilisateur';
        
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            errorMessage = 'Impossible de supprimer cet utilisateur car il est référencé dans d\'autres données';
        } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            errorMessage = 'Erreur de référence dans la base de données';
        }
        
        res.status(500).json({ 
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        connection.release();
    }
});

// ============================================================================
// GESTION DES PRODUITS ET MODÉRATION
// ============================================================================

// GET /api/admin/products - Liste des produits avec statut de modération
router.get('/products', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            statut_moderation, 
            fournisseur_id,
            search,
            signalements = false,
            sortBy = 'created_at',
            sortOrder = 'DESC'
        } = req.query;

        const offset = (page - 1) * limit;
        let whereClause = 'WHERE 1=1';
        const params = [];

        // Filtres
        if (statut_moderation) {
            whereClause += ' AND p.statut_moderation = ?';
            params.push(statut_moderation);
        }

        if (fournisseur_id) {
            whereClause += ' AND e.id = ?';
            params.push(fournisseur_id);
        }

        if (search) {
            whereClause += ' AND (p.nom LIKE ? OR p.description LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }

        if (signalements === 'true') {
            whereClause += ' AND p.signalements_count > 0';
        }

        // Requête principale
        const [products] = await db.execute(`
            SELECT 
                p.id,
                p.nom,
                p.description,
                p.prix,
                p.stock,
                p.statut,
                p.statut_moderation,
                p.moderated_by,
                p.moderated_at,
                p.moderation_notes,
                p.rejection_reason,
                p.signalements_count,
                p.last_signalement,
                p.admin_notes,
                p.created_at,
                p.updated_at,
                e.nom_entreprise as fournisseur_nom,
                e.id as fournisseur_id,
                CONCAT(u.nom, ' ', COALESCE(u.prenom, '')) as fournisseur_contact,
                u.email as fournisseur_email,
                CONCAT(mod.nom, ' ', COALESCE(mod.prenom, '')) as moderated_by_name,
                c.nom as categorie_nom
            FROM produits p
            LEFT JOIN entreprises e ON p.fournisseur_id = e.id
            LEFT JOIN utilisateurs u ON e.utilisateur_id = u.id
            LEFT JOIN utilisateurs mod ON p.moderated_by = mod.id
            LEFT JOIN categories c ON p.categorie_id = c.id
            ${whereClause}
            ORDER BY p.${sortBy} ${sortOrder}
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), parseInt(offset)]);

        // Compter le total
        const [totalResult] = await db.execute(`
            SELECT COUNT(*) as total
            FROM produits p
            LEFT JOIN entreprises e ON p.fournisseur_id = e.id
            ${whereClause}
        `, params);

        // Statistiques de modération
        const [moderationStats] = await db.execute(`
            SELECT 
                statut_moderation,
                COUNT(*) as count
            FROM produits
            GROUP BY statut_moderation
        `);

        // Produits avec signalements
        const [reportedStats] = await db.execute(`
            SELECT 
                COUNT(*) as total_reported,
                SUM(signalements_count) as total_reports
            FROM produits 
            WHERE signalements_count > 0
        `);

        res.json({
            products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalResult[0].total,
                totalPages: Math.ceil(totalResult[0].total / limit)
            },
            moderationStats,
            reportedStats: reportedStats[0]
        });

    } catch (error) {
        console.error('Erreur récupération produits:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des produits' });
    }
});

// GET /api/admin/products/reported - Produits signalés
router.get('/products/reported', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        // Produits avec signalements
        const [reportedProducts] = await db.execute(`
            SELECT 
                p.id,
                p.nom,
                p.description,
                p.prix,
                p.signalements_count,
                p.last_signalement,
                p.statut_moderation,
                e.nom_entreprise as fournisseur_nom,
                COUNT(pr.id) as reports_count
            FROM produits p
            LEFT JOIN entreprises e ON p.fournisseur_id = e.id
            LEFT JOIN product_reports pr ON p.id = pr.product_id AND pr.status = 'en_attente'
            WHERE p.signalements_count > 0
            GROUP BY p.id
            ORDER BY p.signalements_count DESC, p.last_signalement DESC
            LIMIT ? OFFSET ?
        `, [parseInt(limit), parseInt(offset)]);

        // Détails des signalements pour chaque produit
        for (let product of reportedProducts) {
            const [reports] = await db.execute(`
                SELECT 
                    pr.*,
                    CONCAT(u.nom, ' ', COALESCE(u.prenom, '')) as reporter_name,
                    u.email as reporter_email
                FROM product_reports pr
                LEFT JOIN utilisateurs u ON pr.reporter_id = u.id
                WHERE pr.product_id = ? AND pr.status = 'en_attente'
                ORDER BY pr.created_at DESC
            `, [product.id]);
            
            product.reports = reports;
        }

        res.json({
            reportedProducts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Erreur récupération produits signalés:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des produits signalés' });
    }
});

// PATCH /api/admin/products/:id/moderate - Approuver/Rejeter un produit
router.patch('/products/:id/moderate', authenticateToken, requireAdmin, async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();

        const { action, reason, notes } = req.body;

        if (!action || !['approve', 'reject', 'request_changes'].includes(action)) {
            await connection.rollback();
            return res.status(400).json({ 
                error: 'Action requise: approve, reject, ou request_changes' 
            });
        }

        // Récupérer le produit
        const [product] = await connection.execute(
            'SELECT * FROM produits WHERE id = ?',
            [req.params.id]
        );

        if (product.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Produit non trouvé' });
        }

        let newStatus;
        let updateFields = {
            moderated_by: req.user.id,
            moderated_at: 'NOW()',
            moderation_notes: notes || null
        };

        switch (action) {
            case 'approve':
                newStatus = 'approuve';
                updateFields.statut = 'actif'; // Rendre le produit visible
                break;
            case 'reject':
                newStatus = 'rejete';
                updateFields.rejection_reason = reason || 'Produit rejeté par l\'administration';
                updateFields.statut = 'inactif'; // Masquer le produit
                break;
            case 'request_changes':
                newStatus = 'revision_requise';
                updateFields.rejection_reason = reason || 'Modifications requises';
                break;
        }

        updateFields.statut_moderation = newStatus;

        // Construire la requête de mise à jour
        const setClause = Object.keys(updateFields)
            .map(key => key === 'moderated_at' ? `${key} = NOW()` : `${key} = ?`)
            .join(', ');
        
        const values = Object.values(updateFields).filter(val => val !== 'NOW()');

        await connection.execute(`
            UPDATE produits SET ${setClause}, updated_at = NOW()
            WHERE id = ?
        `, [...values, req.params.id]);

        // Créer le log d'audit
        await createAuditLog(
            req.user.id,
            `moderate_product_${action}`,
            'produits',
            req.params.id,
            { statut_moderation: product[0].statut_moderation },
            { statut_moderation: newStatus, reason, notes },
            req
        );

        // Notifier le fournisseur (optionnel - créer une notification)
        const [supplier] = await connection.execute(`
            SELECT u.id, u.email, u.nom, u.prenom
            FROM utilisateurs u
            JOIN entreprises e ON u.id = e.utilisateur_id
            WHERE e.id = ?
        `, [product[0].fournisseur_id]);

        if (supplier.length > 0) {
            let notificationMessage;
            switch (action) {
                case 'approve':
                    notificationMessage = `Votre produit "${product[0].nom}" a été approuvé et est maintenant visible sur la plateforme.`;
                    break;
                case 'reject':
                    notificationMessage = `Votre produit "${product[0].nom}" a été rejeté. Raison: ${reason || 'Non spécifiée'}`;
                    break;
                case 'request_changes':
                    notificationMessage = `Des modifications sont requises pour votre produit "${product[0].nom}". Raison: ${reason || 'Non spécifiée'}`;
                    break;
            }

            await connection.execute(`
                INSERT INTO admin_notifications (admin_id, type, title, message, data, priority)
                VALUES (NULL, 'product_moderation', 'Modération de produit', ?, ?, 'medium')
            `, [notificationMessage, JSON.stringify({
                product_id: req.params.id,
                supplier_id: supplier[0].id,
                action: action
            })]);
        }

        await connection.commit();

        res.json({
            message: `Produit ${action === 'approve' ? 'approuvé' : action === 'reject' ? 'rejeté' : 'marqué pour révision'} avec succès`,
            product_id: req.params.id,
            new_status: newStatus
        });

    } catch (error) {
        await connection.rollback();
        console.error('Erreur modération produit:', error);
        res.status(500).json({ error: 'Erreur lors de la modération du produit' });
    } finally {
        connection.release();
    }
});

// PUT /api/admin/products/:id - Modifier un produit (admin)
router.put('/products/:id', authenticateToken, requireAdmin, async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();

        // Récupérer le produit actuel
        const [oldProduct] = await connection.execute(
            'SELECT * FROM produits WHERE id = ?',
            [req.params.id]
        );

        if (oldProduct.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Produit non trouvé' });
        }

        const {
            nom,
            description,
            prix,
            stock,
            statut,
            categorie_id,
            admin_notes
        } = req.body;

        // Mettre à jour le produit
        await connection.execute(`
            UPDATE produits SET
                nom = COALESCE(?, nom),
                description = COALESCE(?, description),
                prix = COALESCE(?, prix),
                stock = COALESCE(?, stock),
                statut = COALESCE(?, statut),
                categorie_id = COALESCE(?, categorie_id),
                admin_notes = COALESCE(?, admin_notes),
                updated_at = NOW()
            WHERE id = ?
        `, [nom, description, prix, stock, statut, categorie_id, admin_notes, req.params.id]);

        // Créer le log d'audit
        await createAuditLog(
            req.user.id,
            'update_product',
            'produits',
            req.params.id,
            oldProduct[0],
            req.body,
            req
        );

        await connection.commit();

        // Récupérer le produit mis à jour
        const [updatedProduct] = await connection.execute(`
            SELECT 
                p.*,
                e.nom_entreprise as fournisseur_nom,
                c.nom as categorie_nom
            FROM produits p
            LEFT JOIN entreprises e ON p.fournisseur_id = e.id
            LEFT JOIN categories c ON p.categorie_id = c.id
            WHERE p.id = ?
        `, [req.params.id]);

        res.json({
            message: 'Produit mis à jour avec succès',
            product: updatedProduct[0]
        });

    } catch (error) {
        await connection.rollback();
        console.error('Erreur modification produit:', error);
        res.status(500).json({ error: 'Erreur lors de la modification du produit' });
    } finally {
        connection.release();
    }
});

// DELETE /api/admin/products/:id - Supprimer un produit
router.delete('/products/:id', authenticateToken, requireAdmin, async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();

        // Récupérer le produit
        const [product] = await connection.execute(
            'SELECT * FROM produits WHERE id = ?',
            [req.params.id]
        );

        if (product.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Produit non trouvé' });
        }

        // Vérifier s'il y a des commandes liées
        const [orders] = await connection.execute(
            'SELECT COUNT(*) as count FROM details_commande WHERE produit_id = ?',
            [req.params.id]
        );

        if (orders[0].count > 0) {
            // Soft delete si des commandes existent
            await connection.execute(`
                UPDATE produits SET
                    statut = 'supprime',
                    statut_moderation = 'rejete',
                    admin_notes = CONCAT(COALESCE(admin_notes, ''), ' - Supprimé par admin le ', NOW()),
                    updated_at = NOW()
                WHERE id = ?
            `, [req.params.id]);
        } else {
            // Hard delete si aucune commande
            await connection.execute('DELETE FROM produits WHERE id = ?', [req.params.id]);
        }

        // Créer le log d'audit
        await createAuditLog(
            req.user.id,
            'delete_product',
            'produits',
            req.params.id,
            product[0],
            { deleted: true },
            req
        );

        await connection.commit();

        res.json({
            message: 'Produit supprimé avec succès',
            product_id: req.params.id
        });

    } catch (error) {
        await connection.rollback();
        console.error('Erreur suppression produit:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression du produit' });
    } finally {
        connection.release();
    }
});

// POST /api/admin/products/:id/reports/:reportId/handle - Traiter un signalement
router.post('/products/:id/reports/:reportId/handle', authenticateToken, requireAdmin, async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();

        const { action, admin_notes } = req.body;

        if (!action || !['approve', 'reject'].includes(action)) {
            await connection.rollback();
            return res.status(400).json({ error: 'Action requise: approve ou reject' });
        }

        // Récupérer le signalement
        const [report] = await connection.execute(
            'SELECT * FROM product_reports WHERE id = ? AND product_id = ?',
            [req.params.reportId, req.params.id]
        );

        if (report.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Signalement non trouvé' });
        }

        // Mettre à jour le signalement
        const newStatus = action === 'approve' ? 'traite' : 'rejete';
        await connection.execute(`
            UPDATE product_reports SET
                status = ?,
                handled_by = ?,
                handled_at = NOW(),
                admin_notes = ?
            WHERE id = ?
        `, [newStatus, req.user.id, admin_notes, req.params.reportId]);

        // Si le signalement est approuvé, prendre des mesures sur le produit
        if (action === 'approve') {
            await connection.execute(`
                UPDATE produits SET
                    statut_moderation = 'revision_requise',
                    admin_notes = CONCAT(COALESCE(admin_notes, ''), ' - Signalement validé: ', ?)
                WHERE id = ?
            `, [admin_notes || 'Signalement approuvé', req.params.id]);
        }

        // Créer le log d'audit
        await createAuditLog(
            req.user.id,
            `handle_report_${action}`,
            'product_reports',
            req.params.reportId,
            report[0],
            { status: newStatus, admin_notes },
            req
        );

        await connection.commit();

        res.json({
            message: `Signalement ${action === 'approve' ? 'approuvé' : 'rejeté'} avec succès`,
            report_id: req.params.reportId
        });

    } catch (error) {
        await connection.rollback();
        console.error('Erreur traitement signalement:', error);
        res.status(500).json({ error: 'Erreur lors du traitement du signalement' });
    } finally {
        connection.release();
    }
});

// ============================================================================
// GESTION DES COMMANDES
// ============================================================================

// GET /api/admin/orders - Liste des commandes avec filtres complets
router.get('/orders', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            statut,
            fournisseur_id,
            acheteur_id,
            date_debut,
            date_fin,
            montant_min,
            montant_max,
            dispute_status,
            admin_priority,
            search,
            sortBy = 'created_at',
            sortOrder = 'DESC'
        } = req.query;

        const offset = (page - 1) * limit;
        let whereClause = 'WHERE 1=1';
        const params = [];

        // Filtres
        if (statut) {
            whereClause += ' AND c.statut = ?';
            params.push(statut);
        }

        if (fournisseur_id) {
            whereClause += ' AND c.fournisseur_id = ?';
            params.push(fournisseur_id);
        }

        if (acheteur_id) {
            whereClause += ' AND c.acheteur_id = ?';
            params.push(acheteur_id);
        }

        if (date_debut) {
            whereClause += ' AND DATE(c.created_at) >= ?';
            params.push(date_debut);
        }

        if (date_fin) {
            whereClause += ' AND DATE(c.created_at) <= ?';
            params.push(date_fin);
        }

        if (montant_min) {
            whereClause += ' AND c.total_ttc >= ?';
            params.push(parseFloat(montant_min));
        }

        if (montant_max) {
            whereClause += ' AND c.total_ttc <= ?';
            params.push(parseFloat(montant_max));
        }

        if (dispute_status) {
            whereClause += ' AND c.dispute_status = ?';
            params.push(dispute_status);
        }

        if (admin_priority) {
            whereClause += ' AND c.admin_priority = ?';
            params.push(admin_priority);
        }

        if (search) {
            whereClause += ' AND (c.numero_commande LIKE ? OR acheteur.nom LIKE ? OR acheteur.email LIKE ? OR e.nom_entreprise LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        // Requête principale
        const [orders] = await db.execute(`
            SELECT 
                c.id,
                c.numero_commande,
                c.statut,
                c.total_ht,
                c.tva,
                c.total_ttc,
                c.mode_paiement,
                c.admin_priority,
                c.dispute_status,
                c.dispute_reason,
                c.dispute_opened_at,
                c.refund_amount,
                c.refund_reason,
                c.refund_processed_at,
                c.notes_admin,
                c.created_at,
                c.updated_at,
                c.date_commande,
                e.nom_entreprise as fournisseur_nom,
                e.id as fournisseur_id,
                CONCAT(fournisseur.nom, ' ', COALESCE(fournisseur.prenom, '')) as fournisseur_contact,
                fournisseur.email as fournisseur_email,
                fournisseur.telephone as fournisseur_telephone,
                CONCAT(acheteur.nom, ' ', COALESCE(acheteur.prenom, '')) as acheteur_nom,
                acheteur.email as acheteur_email,
                acheteur.telephone as acheteur_telephone,
                CONCAT(dispute_opener.nom, ' ', COALESCE(dispute_opener.prenom, '')) as dispute_opened_by_name,
                CONCAT(refund_processor.nom, ' ', COALESCE(refund_processor.prenom, '')) as refund_processed_by_name
            FROM commandes c
            LEFT JOIN entreprises e ON c.fournisseur_id = e.id
            LEFT JOIN utilisateurs fournisseur ON e.utilisateur_id = fournisseur.id
            LEFT JOIN utilisateurs acheteur ON c.acheteur_id = acheteur.id
            LEFT JOIN utilisateurs dispute_opener ON c.dispute_opened_by = dispute_opener.id
            LEFT JOIN utilisateurs refund_processor ON c.refund_processed_by = refund_processor.id
            ${whereClause}
            ORDER BY c.${sortBy} ${sortOrder}
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), parseInt(offset)]);

        // Compter le total
        const [totalResult] = await db.execute(`
            SELECT COUNT(*) as total
            FROM commandes c
            LEFT JOIN entreprises e ON c.fournisseur_id = e.id
            LEFT JOIN utilisateurs acheteur ON c.acheteur_id = acheteur.id
            ${whereClause}
        `, params);

        // Statistiques des commandes
        const [orderStats] = await db.execute(`
            SELECT 
                statut,
                COUNT(*) as count,
                SUM(total_ttc) as total_amount
            FROM commandes
            GROUP BY statut
        `);

        // Statistiques des litiges
        const [disputeStats] = await db.execute(`
            SELECT 
                dispute_status,
                COUNT(*) as count
            FROM commandes
            WHERE dispute_status != 'none'
            GROUP BY dispute_status
        `);

        res.json({
            orders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalResult[0].total,
                totalPages: Math.ceil(totalResult[0].total / limit)
            },
            orderStats,
            disputeStats
        });

    } catch (error) {
        console.error('Erreur récupération commandes:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des commandes' });
    }
});

// GET /api/admin/orders/:id - Détails complets d'une commande
router.get('/orders/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // Informations principales de la commande
        const [order] = await db.execute(`
            SELECT 
                c.*,
                e.nom_entreprise as fournisseur_nom,
                e.adresse as fournisseur_adresse,
                e.telephone as fournisseur_telephone,
                e.email as fournisseur_email,
                CONCAT(fournisseur.nom, ' ', COALESCE(fournisseur.prenom, '')) as fournisseur_contact,
                CONCAT(acheteur.nom, ' ', COALESCE(acheteur.prenom, '')) as acheteur_nom,
                acheteur.email as acheteur_email,
                acheteur.telephone as acheteur_telephone,
                acheteur.adresse as acheteur_adresse,
                CONCAT(dispute_opener.nom, ' ', COALESCE(dispute_opener.prenom, '')) as dispute_opened_by_name,
                CONCAT(dispute_resolver.nom, ' ', COALESCE(dispute_resolver.prenom, '')) as dispute_resolved_by_name,
                CONCAT(refund_processor.nom, ' ', COALESCE(refund_processor.prenom, '')) as refund_processed_by_name
            FROM commandes c
            LEFT JOIN entreprises e ON c.fournisseur_id = e.id
            LEFT JOIN utilisateurs fournisseur ON e.utilisateur_id = fournisseur.id
            LEFT JOIN utilisateurs acheteur ON c.acheteur_id = acheteur.id
            LEFT JOIN utilisateurs dispute_opener ON c.dispute_opened_by = dispute_opener.id
            LEFT JOIN utilisateurs dispute_resolver ON c.dispute_resolved_by = dispute_resolver.id
            LEFT JOIN utilisateurs refund_processor ON c.refund_processed_by = refund_processor.id
            WHERE c.id = ?
        `, [req.params.id]);

        if (order.length === 0) {
            return res.status(404).json({ error: 'Commande non trouvée' });
        }

        // Détails des produits commandés
        const [orderItems] = await db.execute(`
            SELECT 
                dc.*,
                p.nom as produit_nom,
                p.description as produit_description,
                p.prix as prix_actuel,
                c.nom as categorie_nom
            FROM details_commande dc
            LEFT JOIN produits p ON dc.produit_id = p.id
            LEFT JOIN categories c ON p.categorie_id = c.id
            WHERE dc.commande_id = ?
        `, [req.params.id]);

        // Historique des changements de statut
        const [statusHistory] = await db.execute(`
            SELECT 
                osh.*,
                CONCAT(u.nom, ' ', COALESCE(u.prenom, '')) as changed_by_name
            FROM order_status_history osh
            LEFT JOIN utilisateurs u ON osh.changed_by = u.id
            WHERE osh.order_id = ?
            ORDER BY osh.created_at DESC
        `, [req.params.id]);

        // Logs d'audit pour cette commande
        const [auditLogs] = await db.execute(`
            SELECT 
                aal.*,
                CONCAT(u.nom, ' ', COALESCE(u.prenom, '')) as admin_name
            FROM admin_audit_logs aal
            LEFT JOIN utilisateurs u ON aal.admin_id = u.id
            WHERE aal.table_name = 'commandes' AND aal.record_id = ?
            ORDER BY aal.created_at DESC
            LIMIT 20
        `, [req.params.id]);

        res.json({
            order: order[0],
            items: orderItems,
            statusHistory,
            auditLogs
        });

    } catch (error) {
        console.error('Erreur récupération détails commande:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des détails de la commande' });
    }
});

// PATCH /api/admin/orders/:id/status - Changer le statut d'une commande
router.patch('/orders/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();

        const { new_status, change_reason, notes, admin_priority } = req.body;

        if (!new_status) {
            await connection.rollback();
            return res.status(400).json({ error: 'Le nouveau statut est requis' });
        }

        // Récupérer la commande actuelle
        const [order] = await connection.execute(
            'SELECT * FROM commandes WHERE id = ?',
            [req.params.id]
        );

        if (order.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Commande non trouvée' });
        }

        const oldStatus = order[0].statut;

        // Mettre à jour la commande
        await connection.execute(`
            UPDATE commandes SET
                statut = ?,
                admin_priority = COALESCE(?, admin_priority),
                notes_admin = COALESCE(?, notes_admin),
                updated_at = NOW()
            WHERE id = ?
        `, [new_status, admin_priority, notes, req.params.id]);

        // Ajouter à l'historique des statuts
        await connection.execute(`
            INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, change_reason, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [req.params.id, oldStatus, new_status, req.user.id, change_reason, notes]);

        // Créer le log d'audit
        await createAuditLog(
            req.user.id,
            'change_order_status',
            'commandes',
            req.params.id,
            { statut: oldStatus },
            { statut: new_status, change_reason, notes },
            req
        );

        await connection.commit();

        res.json({
            message: 'Statut de la commande mis à jour avec succès',
            order_id: req.params.id,
            old_status: oldStatus,
            new_status: new_status
        });

    } catch (error) {
        await connection.rollback();
        console.error('Erreur changement statut commande:', error);
        res.status(500).json({ error: 'Erreur lors du changement de statut de la commande' });
    } finally {
        connection.release();
    }
});

// POST /api/admin/orders/:id/refund - Traiter un remboursement
router.post('/orders/:id/refund', authenticateToken, requireAdmin, async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();

        const { refund_amount, refund_reason, notes } = req.body;

        if (!refund_amount || !refund_reason) {
            await connection.rollback();
            return res.status(400).json({ error: 'Le montant et la raison du remboursement sont requis' });
        }

        // Récupérer la commande
        const [order] = await connection.execute(
            'SELECT * FROM commandes WHERE id = ?',
            [req.params.id]
        );

        if (order.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Commande non trouvée' });
        }

        // Vérifier que le montant du remboursement ne dépasse pas le total
        if (parseFloat(refund_amount) > parseFloat(order[0].total_ttc)) {
            await connection.rollback();
            return res.status(400).json({ 
                error: 'Le montant du remboursement ne peut pas dépasser le total de la commande' 
            });
        }

        // Mettre à jour la commande avec les informations de remboursement
        await connection.execute(`
            UPDATE commandes SET
                refund_amount = ?,
                refund_reason = ?,
                refund_processed_by = ?,
                refund_processed_at = NOW(),
                statut = 'rembourse',
                notes_admin = COALESCE(CONCAT(notes_admin, ' - '), '') || ?,
                updated_at = NOW()
            WHERE id = ?
        `, [refund_amount, refund_reason, req.user.id, notes || `Remboursement de ${refund_amount} FCFA`, req.params.id]);

        // Ajouter à l'historique des statuts
        await connection.execute(`
            INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, change_reason, notes)
            VALUES (?, ?, 'rembourse', ?, ?, ?)
        `, [req.params.id, order[0].statut, req.user.id, `Remboursement: ${refund_reason}`, notes]);

        // Créer le log d'audit
        await createAuditLog(
            req.user.id,
            'process_refund',
            'commandes',
            req.params.id,
            order[0],
            { refund_amount, refund_reason, notes },
            req
        );

        await connection.commit();

        res.json({
            message: 'Remboursement traité avec succès',
            order_id: req.params.id,
            refund_amount: refund_amount
        });

    } catch (error) {
        await connection.rollback();
        console.error('Erreur traitement remboursement:', error);
        res.status(500).json({ error: 'Erreur lors du traitement du remboursement' });
    } finally {
        connection.release();
    }
});

// POST /api/admin/orders/:id/dispute/open - Ouvrir un litige
router.post('/orders/:id/dispute/open', authenticateToken, requireAdmin, async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();

        const { dispute_reason } = req.body;

        if (!dispute_reason) {
            await connection.rollback();
            return res.status(400).json({ error: 'La raison du litige est requise' });
        }

        // Récupérer la commande
        const [order] = await connection.execute(
            'SELECT * FROM commandes WHERE id = ?',
            [req.params.id]
        );

        if (order.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Commande non trouvée' });
        }

        if (order[0].dispute_status !== 'none') {
            await connection.rollback();
            return res.status(400).json({ error: 'Un litige est déjà ouvert pour cette commande' });
        }

        // Ouvrir le litige
        await connection.execute(`
            UPDATE commandes SET
                dispute_status = 'open',
                dispute_reason = ?,
                dispute_opened_by = ?,
                dispute_opened_at = NOW(),
                admin_priority = 'high',
                updated_at = NOW()
            WHERE id = ?
        `, [dispute_reason, req.user.id, req.params.id]);

        // Ajouter à l'historique
        await connection.execute(`
            INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, change_reason, notes)
            VALUES (?, ?, ?, ?, 'Ouverture de litige', ?)
        `, [req.params.id, order[0].statut, order[0].statut, req.user.id, dispute_reason]);

        // Créer le log d'audit
        await createAuditLog(
            req.user.id,
            'open_dispute',
            'commandes',
            req.params.id,
            { dispute_status: 'none' },
            { dispute_status: 'open', dispute_reason },
            req
        );

        await connection.commit();

        res.json({
            message: 'Litige ouvert avec succès',
            order_id: req.params.id
        });

    } catch (error) {
        await connection.rollback();
        console.error('Erreur ouverture litige:', error);
        res.status(500).json({ error: 'Erreur lors de l\'ouverture du litige' });
    } finally {
        connection.release();
    }
});

// POST /api/admin/orders/:id/dispute/resolve - Résoudre un litige
router.post('/orders/:id/dispute/resolve', authenticateToken, requireAdmin, async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();

        const { resolution_notes } = req.body;

        if (!resolution_notes) {
            await connection.rollback();
            return res.status(400).json({ error: 'Les notes de résolution sont requises' });
        }

        // Récupérer la commande
        const [order] = await connection.execute(
            'SELECT * FROM commandes WHERE id = ?',
            [req.params.id]
        );

        if (order.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Commande non trouvée' });
        }

        if (order[0].dispute_status === 'none' || order[0].dispute_status === 'resolved') {
            await connection.rollback();
            return res.status(400).json({ error: 'Aucun litige ouvert à résoudre' });
        }

        // Résoudre le litige
        await connection.execute(`
            UPDATE commandes SET
                dispute_status = 'resolved',
                dispute_resolved_by = ?,
                dispute_resolved_at = NOW(),
                admin_priority = 'normal',
                notes_admin = COALESCE(CONCAT(notes_admin, ' - '), '') || ?,
                updated_at = NOW()
            WHERE id = ?
        `, [req.user.id, `Litige résolu: ${resolution_notes}`, req.params.id]);

        // Ajouter à l'historique
        await connection.execute(`
            INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, change_reason, notes)
            VALUES (?, ?, ?, ?, 'Résolution de litige', ?)
        `, [req.params.id, order[0].statut, order[0].statut, req.user.id, resolution_notes]);

        // Créer le log d'audit
        await createAuditLog(
            req.user.id,
            'resolve_dispute',
            'commandes',
            req.params.id,
            { dispute_status: order[0].dispute_status },
            { dispute_status: 'resolved', resolution_notes },
            req
        );

        await connection.commit();

        res.json({
            message: 'Litige résolu avec succès',
            order_id: req.params.id
        });

    } catch (error) {
        await connection.rollback();
        console.error('Erreur résolution litige:', error);
        res.status(500).json({ error: 'Erreur lors de la résolution du litige' });
    } finally {
        connection.release();
    }
});

// ============================================================================
// ANALYTICS ET STATISTIQUES COMPLÈTES
// ============================================================================

// GET /api/admin/analytics/dashboard - Métriques du tableau de bord
router.get('/analytics/dashboard', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { period = '30' } = req.query; // Période en jours
        const periodDays = parseInt(period);

        // Statistiques générales
        const [generalStats] = await db.execute(`
            SELECT 
                (SELECT COUNT(*) FROM utilisateurs WHERE role_id = 1 AND statut = 'actif') as total_acheteurs,
                (SELECT COUNT(*) FROM utilisateurs WHERE role_id = 2 AND statut = 'actif') as total_fournisseurs,
                (SELECT COUNT(*) FROM produits WHERE statut = 'actif') as total_produits,
                (SELECT COUNT(*) FROM commandes) as total_commandes,
                (SELECT COALESCE(SUM(total_ttc), 0) FROM commandes WHERE statut != 'annule') as chiffre_affaires_total,
                (SELECT COUNT(*) FROM commandes WHERE statut = 'en_attente') as commandes_en_attente,
                (SELECT COUNT(*) FROM produits WHERE statut_moderation = 'en_attente') as produits_en_attente_moderation,
                (SELECT COUNT(*) FROM commandes WHERE dispute_status != 'none') as litiges_ouverts
        `);

        // Évolution sur la période
        const [evolutionStats] = await db.execute(`
            SELECT 
                DATE(created_at) as date,
                COUNT(CASE WHEN role_id = 1 THEN 1 END) as nouveaux_acheteurs,
                COUNT(CASE WHEN role_id = 2 THEN 1 END) as nouveaux_fournisseurs
            FROM utilisateurs 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `, [periodDays]);

        // Évolution des commandes
        const [orderEvolution] = await db.execute(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as nombre_commandes,
                SUM(total_ttc) as chiffre_affaires_jour,
                AVG(total_ttc) as panier_moyen
            FROM commandes 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `, [periodDays]);

        // Top fournisseurs
        const [topSuppliers] = await db.execute(`
            SELECT 
                e.nom_entreprise,
                e.id,
                COUNT(c.id) as nombre_commandes,
                SUM(c.total_ttc) as chiffre_affaires,
                AVG(c.total_ttc) as panier_moyen
            FROM entreprises e
            LEFT JOIN commandes c ON e.id = c.fournisseur_id 
                AND c.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                AND c.statut != 'annule'
            GROUP BY e.id, e.nom_entreprise
            HAVING nombre_commandes > 0
            ORDER BY chiffre_affaires DESC
            LIMIT 10
        `, [periodDays]);

        // Catégories populaires
        const [topCategories] = await db.execute(`
            SELECT 
                cat.nom as categorie,
                COUNT(p.id) as nombre_produits,
                COUNT(dc.id) as nombre_ventes,
                SUM(dc.quantite * dc.prix_unitaire) as chiffre_affaires_categorie
            FROM categories cat
            LEFT JOIN produits p ON cat.id = p.categorie_id
            LEFT JOIN details_commande dc ON p.id = dc.produit_id
            LEFT JOIN commandes c ON dc.commande_id = c.id 
                AND c.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                AND c.statut != 'annule'
            GROUP BY cat.id, cat.nom
            ORDER BY chiffre_affaires_categorie DESC
            LIMIT 10
        `, [periodDays]);

        // Statistiques de modération
        const [moderationStats] = await db.execute(`
            SELECT 
                statut_moderation,
                COUNT(*) as count
            FROM produits
            GROUP BY statut_moderation
        `);

        res.json({
            period: periodDays,
            generalStats: generalStats[0],
            evolutionStats,
            orderEvolution,
            topSuppliers,
            topCategories,
            moderationStats
        });

    } catch (error) {
        console.error('Erreur récupération analytics dashboard:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des analytics' });
    }
});

// GET /api/admin/analytics/users - Statistiques utilisateurs détaillées
router.get('/analytics/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { period = '30' } = req.query;
        const periodDays = parseInt(period);

        // Répartition par rôle
        const [roleDistribution] = await db.execute(`
            SELECT 
                r.nom as role_nom,
                r.id as role_id,
                COUNT(u.id) as total,
                COUNT(CASE WHEN u.statut = 'actif' THEN 1 END) as actifs,
                COUNT(CASE WHEN u.statut = 'suspendu' THEN 1 END) as suspendus,
                COUNT(CASE WHEN u.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) THEN 1 END) as nouveaux
            FROM roles r
            LEFT JOIN utilisateurs u ON r.id = u.role_id
            GROUP BY r.id, r.nom
        `, [periodDays]);

        // Évolution des inscriptions
        const [registrationEvolution] = await db.execute(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as total_inscriptions,
                COUNT(CASE WHEN role_id = 1 THEN 1 END) as acheteurs,
                COUNT(CASE WHEN role_id = 2 THEN 1 END) as fournisseurs,
                COUNT(CASE WHEN role_id = 3 THEN 1 END) as admins
            FROM utilisateurs 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `, [periodDays]);

        // Utilisateurs les plus actifs (par commandes)
        const [activeUsers] = await db.execute(`
            SELECT 
                CONCAT(u.nom, ' ', COALESCE(u.prenom, '')) as nom_complet,
                u.email,
                u.role_id,
                r.nom as role_nom,
                COUNT(c.id) as nombre_commandes,
                SUM(c.total_ttc) as total_depense,
                u.last_login
            FROM utilisateurs u
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN commandes c ON (u.id = c.acheteur_id OR u.id IN (
                SELECT e.utilisateur_id FROM entreprises e WHERE e.id = c.fournisseur_id
            )) AND c.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            WHERE u.role_id IN (1, 2)
            GROUP BY u.id
            HAVING nombre_commandes > 0
            ORDER BY nombre_commandes DESC
            LIMIT 20
        `, [periodDays]);

        // Statistiques de connexion
        const [loginStats] = await db.execute(`
            SELECT 
                COUNT(CASE WHEN last_login >= DATE_SUB(NOW(), INTERVAL 1 DAY) THEN 1 END) as connexions_24h,
                COUNT(CASE WHEN last_login >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as connexions_7j,
                COUNT(CASE WHEN last_login >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as connexions_30j,
                COUNT(CASE WHEN last_login IS NULL THEN 1 END) as jamais_connecte
            FROM utilisateurs
            WHERE role_id IN (1, 2)
        `);

        res.json({
            period: periodDays,
            roleDistribution,
            registrationEvolution,
            activeUsers,
            loginStats: loginStats[0]
        });

    } catch (error) {
        console.error('Erreur récupération analytics utilisateurs:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des analytics utilisateurs' });
    }
});

// GET /api/admin/analytics/products - Statistiques produits détaillées
router.get('/analytics/products', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { period = '30' } = req.query;
        const periodDays = parseInt(period);

        // Statistiques générales des produits
        const [productStats] = await db.execute(`
            SELECT 
                COUNT(*) as total_produits,
                COUNT(CASE WHEN statut = 'actif' THEN 1 END) as produits_actifs,
                COUNT(CASE WHEN statut = 'inactif' THEN 1 END) as produits_inactifs,
                COUNT(CASE WHEN statut_moderation = 'en_attente' THEN 1 END) as en_attente_moderation,
                COUNT(CASE WHEN statut_moderation = 'approuve' THEN 1 END) as approuves,
                COUNT(CASE WHEN statut_moderation = 'rejete' THEN 1 END) as rejetes,
                COUNT(CASE WHEN signalements_count > 0 THEN 1 END) as produits_signales,
                AVG(prix) as prix_moyen,
                SUM(stock) as stock_total
        `);

        // Évolution des créations de produits
        const [productEvolution] = await db.execute(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as nouveaux_produits,
                COUNT(CASE WHEN statut_moderation = 'approuve' THEN 1 END) as approuves_jour
            FROM produits 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `, [periodDays]);

        // Produits les plus vendus
        const [bestSellingProducts] = await db.execute(`
            SELECT 
                p.nom as produit_nom,
                p.id as produit_id,
                p.prix,
                e.nom_entreprise as fournisseur,
                cat.nom as categorie,
                SUM(dc.quantite) as quantite_vendue,
                SUM(dc.quantite * dc.prix_unitaire) as chiffre_affaires_produit,
                COUNT(DISTINCT dc.commande_id) as nombre_commandes
            FROM produits p
            LEFT JOIN details_commande dc ON p.id = dc.produit_id
            LEFT JOIN commandes c ON dc.commande_id = c.id 
                AND c.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                AND c.statut != 'annule'
            LEFT JOIN entreprises e ON p.fournisseur_id = e.id
            LEFT JOIN categories cat ON p.categorie_id = cat.id
            GROUP BY p.id
            HAVING quantite_vendue > 0
            ORDER BY quantite_vendue DESC
            LIMIT 20
        `, [periodDays]);

        // Analyse par catégorie
        const [categoryAnalysis] = await db.execute(`
            SELECT 
                cat.nom as categorie,
                COUNT(p.id) as nombre_produits,
                COUNT(CASE WHEN p.statut = 'actif' THEN 1 END) as produits_actifs,
                AVG(p.prix) as prix_moyen,
                SUM(COALESCE(dc.quantite, 0)) as total_vendu,
                SUM(COALESCE(dc.quantite * dc.prix_unitaire, 0)) as chiffre_affaires
            FROM categories cat
            LEFT JOIN produits p ON cat.id = p.categorie_id
            LEFT JOIN details_commande dc ON p.id = dc.produit_id
            LEFT JOIN commandes c ON dc.commande_id = c.id 
                AND c.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                AND c.statut != 'annule'
            GROUP BY cat.id, cat.nom
            ORDER BY chiffre_affaires DESC
        `, [periodDays]);

        // Fournisseurs les plus productifs
        const [topProductiveSuppliers] = await db.execute(`
            SELECT 
                e.nom_entreprise,
                e.id as fournisseur_id,
                COUNT(p.id) as nombre_produits,
                COUNT(CASE WHEN p.statut_moderation = 'approuve' THEN 1 END) as produits_approuves,
                COUNT(CASE WHEN p.statut_moderation = 'rejete' THEN 1 END) as produits_rejetes,
                AVG(p.prix) as prix_moyen_produits
            FROM entreprises e
            LEFT JOIN produits p ON e.id = p.fournisseur_id
            GROUP BY e.id, e.nom_entreprise
            HAVING nombre_produits > 0
            ORDER BY produits_approuves DESC
            LIMIT 15
        `);

        res.json({
            period: periodDays,
            productStats: productStats[0],
            productEvolution,
            bestSellingProducts,
            categoryAnalysis,
            topProductiveSuppliers
        });

    } catch (error) {
        console.error('Erreur récupération analytics produits:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des analytics produits' });
    }
});

// GET /api/admin/analytics/orders - Statistiques commandes détaillées
router.get('/analytics/orders', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { period = '30' } = req.query;
        const periodDays = parseInt(period);

        // Statistiques générales des commandes
        const [orderStats] = await db.execute(`
            SELECT 
                COUNT(*) as total_commandes,
                COUNT(CASE WHEN statut = 'en_attente' THEN 1 END) as en_attente,
                COUNT(CASE WHEN statut = 'confirmee' THEN 1 END) as confirmees,
                COUNT(CASE WHEN statut = 'expediee' THEN 1 END) as expediees,
                COUNT(CASE WHEN statut = 'livree' THEN 1 END) as livrees,
                COUNT(CASE WHEN statut = 'annule' THEN 1 END) as annulees,
                COUNT(CASE WHEN dispute_status != 'none' THEN 1 END) as avec_litiges,
                SUM(total_ttc) as chiffre_affaires_total,
                AVG(total_ttc) as panier_moyen,
                MIN(total_ttc) as commande_min,
                MAX(total_ttc) as commande_max
        `);

        // Évolution des commandes et CA
        const [orderEvolution] = await db.execute(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as nombre_commandes,
                SUM(total_ttc) as chiffre_affaires,
                AVG(total_ttc) as panier_moyen,
                COUNT(CASE WHEN statut = 'livree' THEN 1 END) as commandes_livrees
            FROM commandes 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `, [periodDays]);

        // Analyse par mode de paiement
        const [paymentAnalysis] = await db.execute(`
            SELECT 
                mode_paiement,
                COUNT(*) as nombre_commandes,
                SUM(total_ttc) as montant_total,
                AVG(total_ttc) as panier_moyen
            FROM commandes 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            AND statut != 'annule'
            GROUP BY mode_paiement
            ORDER BY montant_total DESC
        `, [periodDays]);

        // Analyse des paniers (nombre d'articles)
        const [basketAnalysis] = await db.execute(`
            SELECT 
                CASE 
                    WHEN article_count = 1 THEN '1 article'
                    WHEN article_count BETWEEN 2 AND 5 THEN '2-5 articles'
                    WHEN article_count BETWEEN 6 AND 10 THEN '6-10 articles'
                    ELSE '10+ articles'
                END as taille_panier,
                COUNT(*) as nombre_commandes,
                AVG(total_ttc) as panier_moyen,
                SUM(total_ttc) as chiffre_affaires
            FROM (
                SELECT 
                    c.id,
                    c.total_ttc,
                    COUNT(dc.id) as article_count
                FROM commandes c
                LEFT JOIN details_commande dc ON c.id = dc.commande_id
                WHERE c.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                AND c.statut != 'annule'
                GROUP BY c.id, c.total_ttc
            ) as basket_sizes
            GROUP BY taille_panier
            ORDER BY chiffre_affaires DESC
        `, [periodDays]);

        // Top acheteurs
        const [topBuyers] = await db.execute(`
            SELECT 
                CONCAT(u.nom, ' ', COALESCE(u.prenom, '')) as acheteur_nom,
                u.email,
                COUNT(c.id) as nombre_commandes,
                SUM(c.total_ttc) as total_depense,
                AVG(c.total_ttc) as panier_moyen,
                MAX(c.created_at) as derniere_commande
            FROM utilisateurs u
            LEFT JOIN commandes c ON u.id = c.acheteur_id 
                AND c.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                AND c.statut != 'annule'
            WHERE u.role_id = 1
            GROUP BY u.id
            HAVING nombre_commandes > 0
            ORDER BY total_depense DESC
            LIMIT 20
        `, [periodDays]);

        // Analyse des litiges
        const [disputeAnalysis] = await db.execute(`
            SELECT 
                dispute_status,
                COUNT(*) as nombre_litiges,
                AVG(total_ttc) as montant_moyen_litige,
                AVG(TIMESTAMPDIFF(HOUR, dispute_opened_at, COALESCE(dispute_resolved_at, NOW()))) as duree_moyenne_heures
            FROM commandes 
            WHERE dispute_status != 'none'
            AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY dispute_status
        `, [periodDays]);

        res.json({
            period: periodDays,
            orderStats: orderStats[0],
            orderEvolution,
            paymentAnalysis,
            basketAnalysis,
            topBuyers,
            disputeAnalysis
        });

    } catch (error) {
        console.error('Erreur récupération analytics commandes:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des analytics commandes' });
    }
});

// GET /api/admin/analytics/export - Export des données
router.get('/analytics/export', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { type, format = 'json', period = '30' } = req.query;
        const periodDays = parseInt(period);

        if (!type || !['users', 'products', 'orders', 'all'].includes(type)) {
            return res.status(400).json({ error: 'Type d\'export requis: users, products, orders, ou all' });
        }

        let exportData = {};

        if (type === 'users' || type === 'all') {
            const [users] = await db.execute(`
                SELECT 
                    u.id,
                    u.nom,
                    u.prenom,
                    u.email,
                    u.telephone,
                    r.nom as role,
                    u.statut,
                    u.email_verified,
                    u.last_login,
                    u.created_at,
                    e.nom_entreprise
                FROM utilisateurs u
                LEFT JOIN roles r ON u.role_id = r.id
                LEFT JOIN entreprises e ON u.id = e.utilisateur_id
                WHERE u.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                ORDER BY u.created_at DESC
            `, [periodDays]);
            exportData.users = users;
        }

        if (type === 'products' || type === 'all') {
            const [products] = await db.execute(`
                SELECT 
                    p.id,
                    p.nom,
                    p.description,
                    p.prix,
                    p.stock,
                    p.statut,
                    p.statut_moderation,
                    p.signalements_count,
                    p.created_at,
                    e.nom_entreprise as fournisseur,
                    cat.nom as categorie
                FROM produits p
                LEFT JOIN entreprises e ON p.fournisseur_id = e.id
                LEFT JOIN categories cat ON p.categorie_id = cat.id
                WHERE p.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                ORDER BY p.created_at DESC
            `, [periodDays]);
            exportData.products = products;
        }

        if (type === 'orders' || type === 'all') {
            const [orders] = await db.execute(`
                SELECT 
                    c.id,
                    c.numero_commande,
                    c.statut,
                    c.total_ht,
                    c.tva,
                    c.total_ttc,
                    c.mode_paiement,
                    c.dispute_status,
                    c.created_at,
                    e.nom_entreprise as fournisseur,
                    CONCAT(u.nom, ' ', COALESCE(u.prenom, '')) as acheteur
                FROM commandes c
                LEFT JOIN entreprises e ON c.fournisseur_id = e.id
                LEFT JOIN utilisateurs u ON c.acheteur_id = u.id
                WHERE c.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                ORDER BY c.created_at DESC
            `, [periodDays]);
            exportData.orders = orders;
        }

        // Créer le log d'audit pour l'export
        await createAuditLog(
            req.user.id,
            'export_data',
            'analytics',
            null,
            null,
            { type, format, period: periodDays, recordCount: Object.keys(exportData).reduce((sum, key) => sum + exportData[key].length, 0) },
            req
        );

        if (format === 'csv') {
            // Conversion en CSV (simplifié pour l'exemple)
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="export_${type}_${new Date().toISOString().split('T')[0]}.csv"`);
            
            let csvContent = '';
            Object.keys(exportData).forEach(key => {
                if (exportData[key].length > 0) {
                    csvContent += `\n\n=== ${key.toUpperCase()} ===\n`;
                    csvContent += Object.keys(exportData[key][0]).join(',') + '\n';
                    exportData[key].forEach(row => {
                        csvContent += Object.values(row).map(val => `"${val || ''}"`).join(',') + '\n';
                    });
                }
            });
            
            res.send(csvContent);
        } else {
            res.json({
                exportType: type,
                period: periodDays,
                exportDate: new Date().toISOString(),
                data: exportData
            });
        }

    } catch (error) {
        console.error('Erreur export analytics:', error);
        res.status(500).json({ error: 'Erreur lors de l\'export des données' });
    }
});

// ============================================================================
// GESTION DES DOCUMENTS
// ============================================================================

const fs = require('fs').promises;
const path = require('path');

// Obtenir tous les documents en attente de validation
router.get('/pending-documents', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [documents] = await db.execute(`
      SELECT 
        du.id,
        du.utilisateur_id,
        du.type_document,
        du.nom_fichier,
        du.chemin_fichier,
        du.statut_validation,
        du.date_soumission,
        u.nom,
        u.prenom,
        u.email,
        u.role_id,
        r.nom as role_nom
      FROM documents_utilisateur du
      JOIN utilisateurs u ON du.utilisateur_id = u.id
      JOIN roles r ON u.role_id = r.id
      WHERE du.statut_validation = 'en_attente'
      ORDER BY du.date_soumission ASC
    `);

    res.json({
      success: true,
      data: documents
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des documents en attente:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Obtenir les documents d'un utilisateur spécifique
router.get('/user-documents/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [documents] = await db.execute(`
      SELECT 
        du.*,
        u.nom,
        u.prenom,
        u.email,
        u.role_id
      FROM documents_utilisateur du
      JOIN utilisateurs u ON du.utilisateur_id = u.id
      WHERE du.utilisateur_id = ?
      ORDER BY du.date_soumission DESC
    `, [req.params.userId]);

    res.json({
      success: true,
      data: documents
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des documents utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Télécharger un document pour validation (admin seulement)
router.get('/download-document/:documentId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [documents] = await db.execute(`
      SELECT 
        du.chemin_fichier, 
        du.nom_fichier, 
        du.type_document,
        u.nom,
        u.prenom
      FROM documents_utilisateur du
      JOIN utilisateurs u ON du.utilisateur_id = u.id
      WHERE du.id = ?
    `, [req.params.documentId]);

    if (documents.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }

    const document = documents[0];
    const filePath = document.chemin_fichier;

    // Vérifier que le fichier existe
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Fichier non trouvé sur le serveur'
      });
    }

    // Définir les headers pour le téléchargement
    res.setHeader('Content-Disposition', `attachment; filename="${document.nom_fichier}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    // Envoyer le fichier
    res.sendFile(path.resolve(filePath));

  } catch (error) {
    console.error('Erreur lors du téléchargement admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Valider un document spécifique
router.put('/validate-document/:documentId', authenticateToken, requireAdmin, async (req, res) => {
  const { status, reason } = req.body;
  const { documentId } = req.params;

  if (!['approuve', 'rejete'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Statut invalide. Utilisez "approuve" ou "rejete"'
    });
  }

  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // Mettre à jour le document spécifique
    const [result] = await connection.execute(`
      UPDATE documents_utilisateur 
      SET statut_validation = ?, commentaire_admin = ?, date_validation = NOW()
      WHERE id = ?
    `, [status, reason || null, documentId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }

    // Récupérer les informations du document et de l'utilisateur
    const [documents] = await connection.execute(`
      SELECT 
        du.utilisateur_id,
        du.type_document,
        u.email,
        u.nom,
        u.prenom,
        u.role_id
      FROM documents_utilisateur du
      JOIN utilisateurs u ON du.utilisateur_id = u.id
      WHERE du.id = ?
    `, [documentId]);

    if (documents.length > 0) {
      const document = documents[0];
      
      // Vérifier si tous les documents requis sont approuvés
      const [requiredDocs] = await connection.execute(`
        SELECT COUNT(*) as total_required
        FROM documents_utilisateur 
        WHERE utilisateur_id = ? AND type_document IN ('registre_commerce', 'piece_identite', 'justificatif_domicile')
      `, [document.utilisateur_id]);

      const [approvedDocs] = await connection.execute(`
        SELECT COUNT(*) as total_approved
        FROM documents_utilisateur 
        WHERE utilisateur_id = ? 
        AND type_document IN ('registre_commerce', 'piece_identite', 'justificatif_domicile')
        AND statut_validation = 'approuve'
      `, [document.utilisateur_id]);

      // Si tous les documents requis sont approuvés, activer le compte
      if (status === 'approuve' && approvedDocs[0].total_approved === requiredDocs[0].total_required) {
        await connection.execute(`
          UPDATE utilisateurs 
          SET statut = 'actif', documents_valides = true
          WHERE id = ?
        `, [document.utilisateur_id]);

        // Envoyer email de validation complète
        try {
          await emailService.sendDocumentValidationEmail(document, 'approved');
        } catch (emailError) {
          console.error('Erreur envoi email:', emailError);
        }
      } else if (status === 'rejete') {
        // Envoyer email de rejet
        try {
          await emailService.sendDocumentValidationEmail(document, 'rejected', reason);
        } catch (emailError) {
          console.error('Erreur envoi email:', emailError);
        }
      }
    }

    await connection.commit();

    res.json({
      success: true,
      message: `Document ${status === 'approuve' ? 'approuvé' : 'rejeté'} avec succès`
    });

  } catch (error) {
    await connection.rollback();
    console.error('Erreur lors de la validation du document:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  } finally {
    connection.release();
  }
});

// Valider tous les documents d'un utilisateur
router.put('/validate-user-documents/:userId', authenticateToken, requireAdmin, async (req, res) => {
  const { status, reason } = req.body;
  const { userId } = req.params;

  if (!['approuve', 'rejete'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Statut invalide. Utilisez "approuve" ou "rejete"'
    });
  }

  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // Mettre à jour tous les documents en attente de l'utilisateur
    await connection.execute(`
      UPDATE documents_utilisateur 
      SET statut_validation = ?, commentaire_admin = ?, date_validation = NOW()
      WHERE utilisateur_id = ? AND statut_validation = 'en_attente'
    `, [status, reason || null, userId]);

    // Si approuvé, activer le compte utilisateur
    if (status === 'approuve') {
      await connection.execute(`
        UPDATE utilisateurs 
        SET statut = 'actif', documents_valides = true
        WHERE id = ?
      `, [userId]);
    }

    // Récupérer les informations de l'utilisateur pour l'email
    const [users] = await connection.execute(`
      SELECT email, nom, prenom, role_id
      FROM utilisateurs 
      WHERE id = ?
    `, [userId]);

    if (users.length > 0) {
      const user = users[0];
      
      // Envoyer l'email de notification
      try {
        await emailService.sendDocumentValidationEmail(user, status, reason);
      } catch (emailError) {
        console.error('Erreur envoi email:', emailError);
        // Ne pas faire échouer la transaction pour un problème d'email
      }
    }

    await connection.commit();

    res.json({
      success: true,
      message: `Documents ${status === 'approuve' ? 'approuvés' : 'rejetés'} avec succès`
    });

  } catch (error) {
    await connection.rollback();
    console.error('Erreur lors de la validation des documents:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  } finally {
    connection.release();
  }
});

// Statistiques des documents
router.get('/documents-stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [stats] = await db.execute(`
      SELECT 
        statut_validation,
        COUNT(*) as count
      FROM documents_utilisateur
      GROUP BY statut_validation
    `);

    const [typeStats] = await db.execute(`
      SELECT 
        type_document,
        COUNT(*) as count,
        COUNT(CASE WHEN statut_validation = 'approuve' THEN 1 END) as approved,
        COUNT(CASE WHEN statut_validation = 'rejete' THEN 1 END) as rejected,
        COUNT(CASE WHEN statut_validation = 'en_attente' THEN 1 END) as pending
      FROM documents_utilisateur
      GROUP BY type_document
    `);

    const [recentActivity] = await db.execute(`
      SELECT 
        du.id,
        du.type_document,
        du.statut_validation,
        du.date_soumission,
        du.date_validation,
        u.nom,
        u.prenom,
        u.email
      FROM documents_utilisateur du
      JOIN utilisateurs u ON du.utilisateur_id = u.id
      ORDER BY COALESCE(du.date_validation, du.date_soumission) DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        statusStats: stats,
        typeStats: typeStats,
        recentActivity: recentActivity
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// ==================== ROUTES DE NOTIFICATIONS ADMIN ====================

// Intégrer les routes de notifications admin
router.use('/notifications', require('./admin-notifications').router);

// ==================== ACTIONS RAPIDES POUR NOTIFICATIONS ====================

// Approuver un utilisateur depuis une notification
router.patch('/users/:id/approve', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    
    await db.execute(`
      UPDATE utilisateurs 
      SET statut = 'actif', updated_at = NOW()
      WHERE id = ? AND statut = 'en_attente'
    `, [userId]);

    // Créer une notification de confirmation
    await createAdminNotification(
      'user_management',
      'user_approved',
      'Utilisateur approuvé',
      `L'utilisateur ID ${userId} a été approuvé avec succès`,
      'medium',
      { userId },
      userId
    );

    res.json({ message: 'Utilisateur approuvé avec succès' });
  } catch (error) {
    console.error('Erreur approbation utilisateur:', error);
    res.status(500).json({ error: 'Erreur lors de l\'approbation de l\'utilisateur' });
  }
});

// Suspendre un utilisateur depuis une notification
router.patch('/users/:id/suspend', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { reason } = req.body;
    
    await db.execute(`
      UPDATE utilisateurs 
      SET statut = 'suspendu', suspension_reason = ?, updated_at = NOW()
      WHERE id = ?
    `, [reason || 'Raison non spécifiée', userId]);

    // Notifier la suspension
    await notifyUserSuspension(userId, { id: userId }, reason);

    res.json({ message: 'Utilisateur suspendu avec succès' });
  } catch (error) {
    console.error('Erreur suspension utilisateur:', error);
    res.status(500).json({ error: 'Erreur lors de la suspension de l\'utilisateur' });
  }
});

// Approuver un produit depuis une notification
router.patch('/products/:id/approve', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const productId = req.params.id;
    
    await db.execute(`
      UPDATE produits 
      SET statut_moderation = 'approuve', moderated_at = NOW(), updated_at = NOW()
      WHERE id = ? AND statut_moderation = 'en_attente'
    `, [productId]);

    // Créer une notification de confirmation
    await createAdminNotification(
      'product_management',
      'product_approved',
      'Produit approuvé',
      `Le produit ID ${productId} a été approuvé avec succès`,
      'medium',
      { productId },
      null,
      productId
    );

    res.json({ message: 'Produit approuvé avec succès' });
  } catch (error) {
    console.error('Erreur approbation produit:', error);
    res.status(500).json({ error: 'Erreur lors de l\'approbation du produit' });
  }
});

// Rejeter un produit depuis une notification
router.patch('/products/:id/reject', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const productId = req.params.id;
    const { reason } = req.body;
    
    await db.execute(`
      UPDATE produits 
      SET statut_moderation = 'rejete', moderation_reason = ?, moderated_at = NOW(), updated_at = NOW()
      WHERE id = ?
    `, [reason || 'Raison non spécifiée', productId]);

    // Créer une notification de confirmation
    await createAdminNotification(
      'product_management',
      'product_rejected',
      'Produit rejeté',
      `Le produit ID ${productId} a été rejeté. Raison: ${reason}`,
      'medium',
      { productId, reason },
      null,
      productId
    );

    res.json({ message: 'Produit rejeté avec succès' });
  } catch (error) {
    console.error('Erreur rejet produit:', error);
    res.status(500).json({ error: 'Erreur lors du rejet du produit' });
  }
});

module.exports = router;