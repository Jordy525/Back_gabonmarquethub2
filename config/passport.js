const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const db = require('./database');
const config = require('./environment');
const OAuthService = require('../services/oauthService');

// Configuration Google OAuth
if (config.OAUTH.GOOGLE.CLIENT_ID && config.OAUTH.GOOGLE.CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: config.OAUTH.GOOGLE.CLIENT_ID,
        clientSecret: config.OAUTH.GOOGLE.CLIENT_SECRET,
        callbackURL: config.OAUTH.GOOGLE.CALLBACK_URL,
        scope: ['profile', 'email']
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            console.log('🔍 Google OAuth Profile:', profile);
            
            // Utiliser le service OAuth centralisé
            const user = await OAuthService.findOrCreateUser(profile, 'google');
            console.log('✅ Utilisateur Google traité:', user.email);
            return done(null, user);

        } catch (error) {
            console.error('❌ Erreur Google OAuth:', error);
            return done(error, null);
        }
    }));
} else {
    console.log('⚠️ Google OAuth non configuré - CLIENT_ID ou CLIENT_SECRET manquant');
}

// Configuration Facebook OAuth
if (config.OAUTH.FACEBOOK.APP_ID && config.OAUTH.FACEBOOK.APP_SECRET) {
    passport.use(new FacebookStrategy({
        clientID: config.OAUTH.FACEBOOK.APP_ID,
        clientSecret: config.OAUTH.FACEBOOK.APP_SECRET,
        callbackURL: config.OAUTH.FACEBOOK.CALLBACK_URL,
        profileFields: ['id', 'emails', 'name', 'picture']
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            console.log('🔍 Facebook OAuth Profile:', profile);
            
            // Utiliser le service OAuth centralisé
            const user = await OAuthService.findOrCreateUser(profile, 'facebook');
            console.log('✅ Utilisateur Facebook traité:', user.email);
            return done(null, user);

        } catch (error) {
            console.error('❌ Erreur Facebook OAuth:', error);
            return done(error, null);
        }
    }));
} else {
    console.log('⚠️ Facebook OAuth non configuré - APP_ID ou APP_SECRET manquant');
}

// Sérialisation des utilisateurs
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const [users] = await db.execute(
            'SELECT * FROM utilisateurs WHERE id = ?',
            [id]
        );
        
        if (users.length > 0) {
            done(null, users[0]);
        } else {
            done(null, false);
        }
    } catch (error) {
        done(error, null);
    }
});

module.exports = passport;
