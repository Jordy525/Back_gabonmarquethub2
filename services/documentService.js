const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const db = require('../config/database');

class DocumentService {
    constructor() {
        // Configuration du stockage des fichiers
        this.storage = multer.diskStorage({
            destination: async (req, file, cb) => {
                const uploadDir = path.join(__dirname, '../uploads/documents');
                try {
                    await fs.mkdir(uploadDir, { recursive: true });
                    cb(null, uploadDir);
                } catch (error) {
                    cb(error);
                }
            },
            filename: (req, file, cb) => {
                // Format: userId_documentType_timestamp.extension
                const userId = req.user.id;
                const timestamp = Date.now();
                const ext = path.extname(file.originalname);
                const documentType = req.body.type_document || 'document';
                cb(null, `${userId}_${documentType}_${timestamp}${ext}`);
            }
        });

        // Configuration de multer
        this.upload = multer({
            storage: this.storage,
            limits: {
                fileSize: 10 * 1024 * 1024, // 10MB max
            },
            fileFilter: (req, file, cb) => {
                // Types de fichiers autorisés
                const allowedTypes = [
                    'application/pdf',
                    'image/jpeg',
                    'image/jpg',
                    'image/png',
                    'image/webp'
                ];

                if (allowedTypes.includes(file.mimetype)) {
                    cb(null, true);
                } else {
                    cb(new Error('Type de fichier non autorisé. Seuls PDF, JPEG, PNG et WebP sont acceptés.'));
                }
            }
        });
    }

    // Middleware pour l'upload de documents
    getUploadMiddleware() {
        return this.upload.array('documents', 5); // Max 5 fichiers
    }

    // Enregistrer un document en base
    async saveDocument(userId, file, documentType, commentaire = null) {
        try {
            // Récupérer l'ID de l'entreprise pour cet utilisateur
            const [entreprise] = await db.execute(
                'SELECT id FROM entreprises WHERE utilisateur_id = ?',
                [userId]
            );

            if (entreprise.length === 0) {
                throw new Error('Profil entreprise non trouvé');
            }

            const [result] = await db.execute(`
                INSERT INTO documents_entreprise 
                (entreprise_id, type_document, nom_fichier, chemin_fichier, taille_fichier, type_mime, statut_verification)
                VALUES (?, ?, ?, ?, ?, ?, 'en_attente')
            `, [
                entreprise[0].id,
                documentType,
                file.originalname,
                file.path,
                file.size,
                file.mimetype
            ]);

            return result.insertId;
        } catch (error) {
            console.error('Erreur sauvegarde document:', error);
            throw error;
        }
    }

    // Récupérer les documents d'un utilisateur
    async getUserDocuments(userId) {
        try {
            // Récupérer l'ID de l'entreprise pour cet utilisateur
            const [entreprise] = await db.execute(
                'SELECT id FROM entreprises WHERE utilisateur_id = ?',
                [userId]
            );

            if (entreprise.length === 0) {
                return [];
            }

            const [documents] = await db.execute(`
                SELECT 
                    id,
                    entreprise_id,
                    type_document,
                    nom_fichier,
                    chemin_fichier,
                    taille_fichier,
                    type_mime,
                    CASE 
                        WHEN statut_verification = 'verifie' THEN 'valide'
                        WHEN statut_verification = 'rejete' THEN 'rejete'
                        ELSE statut_verification
                    END as statut,
                    commentaire_verification as commentaire_admin,
                    uploaded_at as date_upload,
                    verified_at as date_validation
                FROM documents_entreprise 
                WHERE entreprise_id = ?
                ORDER BY uploaded_at DESC
            `, [entreprise[0].id]);

            return documents;
        } catch (error) {
            console.error('Erreur récupération documents:', error);
            throw error;
        }
    }

    // Récupérer tous les documents en attente de validation
    async getPendingDocuments() {
        try {
            const [documents] = await db.execute(`
                SELECT 
                    de.*,
                    u.nom,
                    u.prenom,
                    u.email,
                    e.nom_entreprise
                FROM documents_entreprise de
                JOIN entreprises e ON de.entreprise_id = e.id
                JOIN utilisateurs u ON e.utilisateur_id = u.id
                WHERE de.statut_verification = 'en_attente'
                ORDER BY de.uploaded_at ASC
            `);

            return documents;
        } catch (error) {
            console.error('Erreur récupération documents en attente:', error);
            throw error;
        }
    }

    // Valider ou rejeter un document
    async validateDocument(documentId, adminId, status, commentaire = null) {
        console.log('🔍 [validateDocument] Début validation:', { documentId, adminId, status, commentaire });
        
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();
            console.log('✅ [validateDocument] Transaction démarrée');

            // Convertir les statuts
            const statutVerification = status === 'approved' ? 'verifie' : 'rejete';
            console.log('🔄 [validateDocument] Statut converti:', statutVerification);

            // Mettre à jour le document
            console.log('📝 [validateDocument] Mise à jour du document...');
            const [updateResult] = await connection.execute(`
                UPDATE documents_entreprise 
                SET statut_verification = ?, commentaire_verification = ?, verified_at = NOW()
                WHERE id = ?
            `, [statutVerification, commentaire, documentId]);
            
            console.log('✅ [validateDocument] Document mis à jour:', updateResult);

            // Récupérer les infos du document et de l'utilisateur
            const [docInfo] = await connection.execute(`
                SELECT de.*, u.id as user_id, u.nom, u.prenom, u.email, u.role_id
                FROM documents_entreprise de
                JOIN entreprises e ON de.entreprise_id = e.id
                JOIN utilisateurs u ON e.utilisateur_id = u.id
                WHERE de.id = ?
            `, [documentId]);

            if (docInfo.length === 0) {
                throw new Error('Document non trouvé');
            }

            const document = docInfo[0];

            // Si tous les documents du fournisseur sont approuvés, activer le compte
            if (status === 'approved') {
                // Vérifier si tous les documents obligatoires sont validés pour activer le compte
                const requiredDocumentTypes = [
                    'certificat_enregistrement',
                    'certificat_fiscal',
                    'piece_identite_representant'
                ];

                // Vérifier que tous les types de documents requis sont validés
                const [validatedDocs] = await connection.execute(`
                    SELECT type_document, COUNT(*) as count
                    FROM documents_entreprise 
                    WHERE entreprise_id = ? AND statut_verification = 'verifie'
                    GROUP BY type_document
                `, [document.entreprise_id]);

                const validatedTypes = validatedDocs.map(doc => doc.type_document);
                const allRequiredValidated = requiredDocumentTypes.every(type => 
                    validatedTypes.includes(type)
                );

                if (allRequiredValidated) {
                    // Tous les documents requis sont validés, activer le compte
                    await connection.execute(`
                        UPDATE utilisateurs 
                        SET statut = 'actif',
                            documents_valides = 1
                        WHERE id = ?
                    `, [document.user_id]);

                    console.log('✅ [validateDocument] Tous les documents requis validés, compte activé');

                    // Envoyer email de validation (optionnel, peut échouer sans bloquer)
                    try {
                        const emailService = require('./emailService');
                        await emailService.sendDocumentValidationEmail(document, 'approved');
                        await emailService.sendStatusChangeEmail(document, 'actif');
                        console.log('✅ [validateDocument] Emails de validation envoyés');
                    } catch (emailError) {
                        console.warn('⚠️ [validateDocument] Erreur envoi emails de validation:', emailError.message);
                    }
                } else {
                    console.log('ℹ️ [validateDocument] Documents validés mais pas tous les documents requis');
                }
            } else if (status === 'rejected') {
                // Marquer le compte comme suspendu pour rejet de documents
                await connection.execute(`
                    UPDATE utilisateurs 
                    SET statut = 'suspendu',
                        suspension_reason = ?,
                        suspended_by = ?,
                        suspended_at = NOW()
                    WHERE id = ?
                `, [commentaire, adminId, document.user_id]);

                console.log('✅ [validateDocument] Utilisateur suspendu pour rejet de document');

                // Envoyer email de rejet (optionnel, peut échouer sans bloquer)
                try {
                    const emailService = require('./emailService');
                    await emailService.sendDocumentValidationEmail(document, 'rejected', commentaire);
                    console.log('✅ [validateDocument] Email de rejet envoyé');
                } catch (emailError) {
                    console.warn('⚠️ [validateDocument] Erreur envoi email de rejet:', emailError.message);
                }
            }

            await connection.commit();
            return { success: true, document };

        } catch (error) {
            await connection.rollback();
            console.error('Erreur validation document:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    // Supprimer un document
    async deleteDocument(documentId, userId = null) {
        try {
            // Récupérer les infos du fichier
            const whereClause = userId ? 'id = ? AND utilisateur_id = ?' : 'id = ?';
            const params = userId ? [documentId, userId] : [documentId];

            const [documents] = await db.execute(`
                SELECT chemin_fichier FROM documents_entreprise WHERE ${whereClause}
            `, params);

            if (documents.length === 0) {
                throw new Error('Document non trouvé');
            }

            const filePath = documents[0].chemin_fichier;

            // Supprimer de la base
            await db.execute(`DELETE FROM documents_entreprise WHERE ${whereClause}`, params);

            // Supprimer le fichier physique
            try {
                await fs.unlink(filePath);
            } catch (fileError) {
                console.warn('Impossible de supprimer le fichier physique:', fileError.message);
            }

            return { success: true };

        } catch (error) {
            console.error('Erreur suppression document:', error);
            throw error;
        }
    }

    // Obtenir le chemin sécurisé d'un document pour téléchargement
    async getDocumentPath(documentId, adminId) {
        try {
            const [documents] = await db.execute(`
                SELECT chemin_fichier, nom_fichier, type_mime
                FROM documents_entreprise 
                WHERE id = ?
            `, [documentId]);

            if (documents.length === 0) {
                throw new Error('Document non trouvé');
            }

            return documents[0];

        } catch (error) {
            console.error('Erreur récupération chemin document:', error);
            throw error;
        }
    }

    // Nettoyer les anciens documents (tâche de maintenance)
    async cleanupOldDocuments(daysOld = 90) {
        try {
            // Récupérer les documents anciens et rejetés
            const [oldDocuments] = await db.execute(`
                SELECT id, chemin_fichier 
                FROM documents_entreprise 
                WHERE statut_verification = 'rejete' 
                AND uploaded_at < DATE_SUB(NOW(), INTERVAL ? DAY)
            `, [daysOld]);

            let deletedCount = 0;

            for (const doc of oldDocuments) {
                try {
                    await this.deleteDocument(doc.id);
                    deletedCount++;
                } catch (error) {
                    console.warn(`Impossible de supprimer le document ${doc.id}:`, error.message);
                }
            }

            console.log(`Nettoyage terminé: ${deletedCount} documents supprimés`);
            return deletedCount;

        } catch (error) {
            console.error('Erreur nettoyage documents:', error);
            throw error;
        }
    }
}

module.exports = new DocumentService();