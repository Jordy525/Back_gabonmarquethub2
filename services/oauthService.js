const db = require('../config/database');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const config = require('../config/environment');
const OAUTH_CONFIG = config.OAUTH;

class OAuthService {
  /**
   * Trouve ou crée un utilisateur via OAuth
   * @param {Object} profile - Profil OAuth (Google/Facebook)
   * @param {string} provider - Fournisseur OAuth ('google' ou 'facebook')
   * @returns {Object} - Utilisateur créé ou trouvé
   */
  async findOrCreateUser(profile, provider) {
    try {
      const { id, emails, name, photos } = profile;
      const email = emails && emails[0] ? emails[0].value : null;
      
      if (!email) {
        throw new Error('Email non fourni par le fournisseur OAuth');
      }

      // Vérifier si l'utilisateur existe déjà
      const [existingUsers] = await db.execute(
        'SELECT * FROM utilisateurs WHERE email = ?',
        [email]
      );

      if (existingUsers.length > 0) {
        const user = existingUsers[0];
        
        // Permettre à tous les utilisateurs de se connecter via OAuth
        // (acheteurs, fournisseurs, admins)
        console.log(`✅ Utilisateur OAuth existant trouvé: ${user.email} (role_id: ${user.role_id})`);

        // Mettre à jour la photo de profil si fournie
        if (photos && photos[0] && photos[0].value) {
          await db.execute(
            'UPDATE utilisateurs SET photo_profil = ? WHERE id = ?',
            [photos[0].value, user.id]
          );
          user.photo_profil = photos[0].value;
        }

        return user;
      }

      // Créer un nouvel utilisateur acheteur
      const newUser = await this.createOAuthUser(profile, provider, email);
      return newUser;

    } catch (error) {
      console.error('Erreur OAuth findOrCreateUser:', error);
      throw error;
    }
  }

  /**
   * Crée un nouvel utilisateur via OAuth
   * @param {Object} profile - Profil OAuth
   * @param {string} provider - Fournisseur OAuth
   * @param {string} email - Email de l'utilisateur
   * @returns {Object} - Utilisateur créé
   */
  async createOAuthUser(profile, provider, email) {
    try {
      const { name, photos } = profile;
      const nom = name ? name.familyName || name.lastName || '' : '';
      const prenom = name ? name.givenName || name.firstName || '' : '';
      const photo_profil = photos && photos[0] ? photos[0].value : null;

      // Générer un mot de passe aléatoire (non utilisé pour OAuth)
      const mot_de_passe = this.generateRandomPassword();

      const [result] = await db.execute(
        `INSERT INTO utilisateurs (
          email, mot_de_passe, nom, prenom, telephone, role_id, 
          email_verified, photo_profil, date_inscription, derniere_connexion
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [email, mot_de_passe, nom, prenom, null, 1, 1, photo_profil]
      );

      const userId = result.insertId;

      // Récupérer l'utilisateur créé
      const [users] = await db.execute(
        'SELECT * FROM utilisateurs WHERE id = ?',
        [userId]
      );

      return users[0];

    } catch (error) {
      console.error('Erreur création utilisateur OAuth:', error);
      throw error;
    }
  }

  /**
   * Génère un token JWT pour l'utilisateur
   * @param {Object} user - Utilisateur
   * @returns {string} - Token JWT
   */
  generateToken(user) {
    return jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role_id: user.role_id 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
  }

  /**
   * Génère un mot de passe aléatoire
   * @returns {string} - Mot de passe aléatoire
   */
  generateRandomPassword() {
    return Math.random().toString(36).slice(-12) + Date.now().toString(36);
  }

  /**
   * Configure les stratégies Passport
   */
  configureStrategies() {
    // Vérifier si la configuration OAuth existe
    if (!OAUTH_CONFIG || !OAUTH_CONFIG.GOOGLE || !OAUTH_CONFIG.FACEBOOK) {
      console.log('⚠️  Configuration OAuth manquante - Les stratégies OAuth ne seront pas configurées');
      console.log('📋 Ajoutez les variables d\'environnement OAuth pour activer Google et Facebook');
      return;
    }

    // Vérifier si les clés sont configurées
    if (!OAUTH_CONFIG.GOOGLE.CLIENT_ID || !OAUTH_CONFIG.GOOGLE.CLIENT_SECRET) {
      console.log('⚠️  Clés Google OAuth manquantes - Stratégie Google non configurée');
      console.log('📋 Définissez GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET dans .env');
    }

    if (!OAUTH_CONFIG.FACEBOOK.APP_ID || !OAUTH_CONFIG.FACEBOOK.APP_SECRET) {
      console.log('⚠️  Clés Facebook OAuth manquantes - Stratégie Facebook non configurée');
      console.log('📋 Définissez FACEBOOK_APP_ID et FACEBOOK_APP_SECRET dans .env');
    }

    // Stratégie Google (seulement si configurée)
    if (OAUTH_CONFIG.GOOGLE.CLIENT_ID && OAUTH_CONFIG.GOOGLE.CLIENT_SECRET) {
      passport.use(new GoogleStrategy({
        clientID: OAUTH_CONFIG.GOOGLE.CLIENT_ID,
        clientSecret: OAUTH_CONFIG.GOOGLE.CLIENT_SECRET,
        callbackURL: OAUTH_CONFIG.GOOGLE.CALLBACK_URL
      }, async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await this.findOrCreateUser(profile, 'google');
          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }));
      console.log('✅ Stratégie Google OAuth configurée');
    } else {
      console.log('⚠️  Google OAuth non configuré - GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET requis');
    }

    // Stratégie Facebook (seulement si configurée)
    if (OAUTH_CONFIG.FACEBOOK.APP_ID && OAUTH_CONFIG.FACEBOOK.APP_SECRET) {
      passport.use(new FacebookStrategy({
        clientID: OAUTH_CONFIG.FACEBOOK.APP_ID,
        clientSecret: OAUTH_CONFIG.FACEBOOK.APP_SECRET,
        callbackURL: OAUTH_CONFIG.FACEBOOK.CALLBACK_URL,
        profileFields: ['id', 'emails', 'name', 'picture']
      }, async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await this.findOrCreateUser(profile, 'facebook');
          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }));
      console.log('✅ Stratégie Facebook OAuth configurée');
    } else {
      console.log('⚠️  Facebook OAuth non configuré - FACEBOOK_APP_ID et FACEBOOK_APP_SECRET requis');
    }

    // Sérialisation de l'utilisateur
    passport.serializeUser((user, done) => {
      done(null, user.id);
    });

    // Désérialisation de l'utilisateur
    passport.deserializeUser(async (id, done) => {
      try {
        const [users] = await db.execute(
          'SELECT * FROM utilisateurs WHERE id = ?',
          [id]
        );
        done(null, users[0] || null);
      } catch (error) {
        done(error, null);
      }
    });
  }
}

module.exports = new OAuthService();
