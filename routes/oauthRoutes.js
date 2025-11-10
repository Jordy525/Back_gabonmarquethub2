
const express = require('express');
const passport = require('passport');
const router = express.Router();
const config = require('../config/environment');
const oauthService = require('../services/oauthService');

// Route pour l'authentification Google
router.get('/google', (req, res, next) => {
  console.log('🔍 Tentative de connexion Google OAuth');
  console.log('🔧 Configuration Google:', {
    clientId: process.env.GOOGLE_CLIENT_ID ? 'Défini' : 'MANQUANT',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'Défini' : 'MANQUANT',
    callbackUrl: config.OAUTH.GOOGLE.CALLBACK_URL,
    frontendUrl: config.FRONTEND.URL
  });
  console.log('🌐 URL de redirection Google:', config.OAUTH.GOOGLE.CALLBACK_URL);
  
  passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  })(req, res, next);
});

// Callback Google
router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: config.FRONTEND.URL + config.REDIRECT.OAUTH_ERROR 
  }),
    async (req, res) => {
      try {
        console.log('🔍 Callback Google OAuth reçu');
        console.log('👤 Utilisateur:', req.user ? 'Présent' : 'Absent');
        if (req.user) {
          console.log('📋 Détails utilisateur Google:', {
            id: req.user.id,
            email: req.user.email,
            nom: req.user.nom,
            prenom: req.user.prenom,
            role_id: req.user.role_id
          });
        }
      
      const user = req.user;
      if (!user) {
        console.error('❌ Aucun utilisateur dans la requête');
        return res.redirect(config.FRONTEND.URL + config.REDIRECT.OAUTH_ERROR + '&error=no_user');
      }
      
      const token = oauthService.generateToken(user);
      
      // Rediriger vers le frontend avec le token
      const frontendUrl = config.FRONTEND.URL;
      const userData = encodeURIComponent(JSON.stringify({
        id: user.id,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        role_id: user.role_id,
        photo_profil: user.photo_profil
      }));
      
      // Rediriger directement vers le dashboard selon le rôle
      let dashboardUrl = '/';
      console.log(`🔍 Utilisateur OAuth - ID: ${user.id}, Email: ${user.email}, Role: ${user.role_id}`);
      
      if (user.role_id === 1) {
        // Acheteur
        dashboardUrl = '/buyer/dashboard';
        console.log('📱 Redirection vers dashboard acheteur:', dashboardUrl);
      } else if (user.role_id === 2) {
        // Fournisseur
        dashboardUrl = config.REDIRECT.SUPPLIER_DASHBOARD;
        console.log('🏢 Redirection vers dashboard fournisseur:', dashboardUrl);
      } else if (user.role_id === 3) {
        // Admin
        dashboardUrl = config.REDIRECT.ADMIN_DASHBOARD;
        console.log('👑 Redirection vers dashboard admin:', dashboardUrl);
      } else {
        // Par défaut
        dashboardUrl = config.REDIRECT.DASHBOARD;
        console.log('🔄 Redirection vers dashboard par défaut:', dashboardUrl);
      }
      
      const finalUrl = `${frontendUrl}${dashboardUrl}?oauth=success&token=${token}&user=${userData}`;
      console.log('🌐 URL de redirection finale:', finalUrl);
      
      res.redirect(finalUrl);
    } catch (error) {
      console.error('Erreur callback Google:', error);
      res.redirect(config.FRONTEND.URL + config.REDIRECT.OAUTH_ERROR + '&error=oauth_error');
    }
  }
);

// Route pour l'authentification Facebook
router.get('/facebook', (req, res, next) => {
  console.log('🔍 Tentative de connexion Facebook OAuth');
  console.log('🔧 Configuration Facebook:', {
    appId: process.env.FACEBOOK_APP_ID ? 'Défini' : 'MANQUANT',
    appSecret: process.env.FACEBOOK_APP_SECRET ? 'Défini' : 'MANQUANT',
    callbackUrl: config.OAUTH.FACEBOOK.CALLBACK_URL,
    frontendUrl: config.FRONTEND.URL
  });
  console.log('🌐 URL de redirection Facebook:', config.OAUTH.FACEBOOK.CALLBACK_URL);
  
  passport.authenticate('facebook', { 
    scope: ['email'] 
  })(req, res, next);
});

// Callback Facebook
router.get('/facebook/callback',
  passport.authenticate('facebook', { 
    failureRedirect: config.FRONTEND.URL + config.REDIRECT.OAUTH_ERROR 
  }),
  async (req, res) => {
    try {
      console.log('🔍 Callback Facebook OAuth reçu');
      console.log('👤 Utilisateur:', req.user ? 'Présent' : 'Absent');
      if (req.user) {
        console.log('📋 Détails utilisateur Facebook:', {
          id: req.user.id,
          email: req.user.email,
          nom: req.user.nom,
          prenom: req.user.prenom,
          role_id: req.user.role_id
        });
      }
      
      const user = req.user;
      if (!user) {
        console.error('❌ Aucun utilisateur dans la requête Facebook');
        return res.redirect(config.FRONTEND.URL + config.REDIRECT.OAUTH_ERROR + '&error=no_user');
      }
      
      const token = oauthService.generateToken(user);
      
      // Rediriger vers le frontend avec le token
      const frontendUrl = config.FRONTEND.URL;
      const userData = encodeURIComponent(JSON.stringify({
        id: user.id,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        role_id: user.role_id,
        photo_profil: user.photo_profil
      }));
      
      // Rediriger directement vers le dashboard selon le rôle
      let dashboardUrl = '/';
      console.log(`🔍 Utilisateur OAuth - ID: ${user.id}, Email: ${user.email}, Role: ${user.role_id}`);
      
      if (user.role_id === 1) {
        // Acheteur
        dashboardUrl = '/buyer/dashboard';
        console.log('📱 Redirection vers dashboard acheteur:', dashboardUrl);
      } else if (user.role_id === 2) {
        // Fournisseur
        dashboardUrl = config.REDIRECT.SUPPLIER_DASHBOARD;
        console.log('🏢 Redirection vers dashboard fournisseur:', dashboardUrl);
      } else if (user.role_id === 3) {
        // Admin
        dashboardUrl = config.REDIRECT.ADMIN_DASHBOARD;
        console.log('👑 Redirection vers dashboard admin:', dashboardUrl);
      } else {
        // Par défaut
        dashboardUrl = config.REDIRECT.DASHBOARD;
        console.log('🔄 Redirection vers dashboard par défaut:', dashboardUrl);
      }
      
      const finalUrl = `${frontendUrl}${dashboardUrl}?oauth=success&token=${token}&user=${userData}`;
      console.log('🌐 URL de redirection finale:', finalUrl);
      
      res.redirect(finalUrl);
    } catch (error) {
      console.error('Erreur callback Facebook:', error);
      res.redirect(config.FRONTEND.URL + config.REDIRECT.OAUTH_ERROR + '&error=oauth_error');
    }
  }
);

// Route de déconnexion
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Erreur lors de la déconnexion' });
    }
    res.json({ message: 'Déconnexion réussie' });
  });
});

// Route pour obtenir les informations de l'utilisateur connecté
router.get('/me', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      user: req.user,
      isAuthenticated: true
    });
  } else {
    res.json({
      user: null,
      isAuthenticated: false
    });
  }
});

module.exports = router;
