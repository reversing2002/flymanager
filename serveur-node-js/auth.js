const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

// Initialisation du client Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Middleware de vérification du token JWT
const verifyToken = async (req, res, next) => {
  try {
    console.log('🔒 Vérification du token JWT...');
    
    // Récupérer le token du header Authorization
    const authHeader = req.headers.authorization;
    console.log('📨 Header Authorization:', authHeader);
    
    if (!authHeader) {
      console.log('❌ Token manquant');
      return res.status(401).json({ error: 'Token manquant' });
    }

    // Vérifier le format du token (Bearer token)
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      console.log('❌ Format de token invalide');
      return res.status(401).json({ error: 'Format de token invalide' });
    }

    const token = parts[1];
    console.log('🔑 Token extrait:', token.substring(0, 20) + '...');

    // Vérifier le token avec Supabase
    console.log('🔍 Vérification du token avec Supabase...');
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
      console.error('❌ Erreur Supabase:', error);
      return res.status(401).json({ error: 'Token invalide', details: error.message });
    }

    if (!user) {
      console.log('❌ Utilisateur non trouvé');
      return res.status(401).json({ error: 'Utilisateur non trouvé' });
    }

    console.log('✅ Token valide pour l\'utilisateur:', user.id);
    
    // Ajouter l'utilisateur à la requête
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Erreur d\'authentification:', error);
    console.error('Stack trace:', error.stack);
    res.status(401).json({ 
      error: 'Erreur d\'authentification',
      details: error.message
    });
  }
};

module.exports = {
  verifyToken
};
