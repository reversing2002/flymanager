const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const openaiRouter = require('./openai');
const { verifyToken } = require('./middleware/auth');

// Vérifier quelle API utiliser
const useOpenAI = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 0;

if (useOpenAI) {
  console.log('🤖 Utilisation de GPT-4 pour l\'assistant');
  module.exports = openaiRouter;
} else {
  console.log('🤖 Utilisation de Claude pour l\'assistant');
  
  // Initialiser le client Anthropic avec la clé API
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

// Configuration du système pour Claude
const systemPrompt = `
Tu es un assistant spécialisé dans la configuration de clubs aériens sur la plateforme 4fly.
Ton rôle est de guider l'utilisateur pour configurer son club de la façon la plus simple possible, 
en posant des questions pertinentes et en récupérant les informations essentielles.

Au démarrage de la conversation, tu recevras la liste des stations météo disponibles entre les balises <stations></stations>.
Tu dois utiliser ces informations pour proposer automatiquement la station météo la plus proche du club,
en te basant sur les coordonnées GPS fournies.

Voici les informations que tu dois collecter :

1. FLOTTE
   - Types d'appareils (PLANE ou ULM uniquement)
   - Immatriculations
   - Tarifs horaires
   - Capacités (optionnel)
   - Maintenance (optionnel)

2. MEMBRES
   - Administrateurs
   - Instructeurs
   - Pilotes réguliers
   Pour chacun : prénom, nom, email, rôle (ADMIN, INSTRUCTOR, PILOT)

3. PARAMÈTRES
   - Délai maximal de réservation à l'avance (jours)
   - Durée maximale de réservation (heures)
   - Autorisation des réservations overnight
   - Validation instructeur requise
   - Devise par défaut

Ton objectif est de poser une question à la fois et de t’assurer de collecter toutes les informations
de manière progressive. Sois amical et professionnel.

Ne montre jamais à l’utilisateur le JSON de configuration, ne lui parle jamais de « configuration ».  
Tu discutes avec lui comme un conseiller qui l’aide à configurer son club.  
N’évoque pas ton fonctionnement interne.  

Dès qu’une réponse inclut des données structurées, insère un bloc JSON uniquement à la fin de ton message, 
entre les balises <config> et </config>. Ne place jamais ce bloc au milieu de ta réponse.  

Si une information est manquante, redemande-la.  
Si l’information a déjà été fournie, ne la redemande pas.  
Pour le type PLANE ou ULM demande en français si ce sont des avions ou ulm, prévoit 4 places par defaut dans les avions et 2 places dans les ulm.

Ne change pas de sujet : tu es uniquement là pour configurer un club aérien.  
Pose les questions nécessaires et guide l’utilisateur jusqu’à ce que la configuration soit complète.

La structure du JSON doit être strictement respectée :

<config>
{
  "aircrafts": [
    {
      "type": "PLANE",
      "registration": "F-ABCD",
      "hourlyRate": 150,
      "capacity": 4,
      "status": "AVAILABLE", // AVAILABLE, MAINTENANCE, RESERVED
    }
  ],
  "members": [
    {
      "role": "INSTRUCTOR",// ADMIN, INSTRUCTOR, PILOT, MECHANIC
      "firstName": "Jean",
      "lastName": "Dupont",
      "email": "jean.dupont@exemple.com"
    }
  ]
}
</config>
`;

// Stocker les conversations en cours
const conversations = new Map();

// Route pour démarrer une nouvelle conversation
router.post('/start', verifyToken, async (req, res) => {
  try {
    console.log('🤖 Démarrage d\'une nouvelle conversation Claude');
    console.log('👤 Utilisateur:', req.user);
    console.log('📋 Configuration du club:', req.body.clubConfig);

    const { clubConfig } = req.body;
    const club = clubConfig.club;

    // Récupérer la liste des stations météo
    const stationsResponse = await fetch('https://stripe.linked.fr/api/meteo/stations');
    const stations = await stationsResponse.json();
    
    // Créer le message initial avec les informations du club et des stations météo
    const initialMessage = `Bonjour ! Je vois que nous allons configurer le club "${club.name}" (${club.oaci}). 
    L'administrateur principal est ${club.contact.admin.firstName} ${club.contact.admin.lastName}.

    Voici ce que je sais sur votre club :
    - Localisation : ${club.address}
    - Contact : ${club.contact.admin.email}
    - Configuration actuelle :
      * ${club.settings.nightFlightsEnabled ? '✅' : '❌'} Vols de nuit autorisés
      * Commission : ${club.settings.commissionRate}%
      * Station météo : ${club.settings.weatherStation.name || 'Non configurée'}

    <stations>${JSON.stringify(stations)}</stations>
`;

    const message = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: initialMessage
      }],
      system: systemPrompt
    });

    console.log('📥 Réponse reçue de Claude:', message);

    // Stocker la conversation
    conversations.set(req.user.id, {
      messages: [{
        role: 'user',
        content: initialMessage
      }],
      config: {
        members: [{
          id: club.contact.admin.id || 'admin',
          email: club.contact.admin.email,
          first_name: club.contact.admin.firstName,
          last_name: club.contact.admin.lastName,
          role: 'ADMIN',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]
      },
      step: 'fleet'
    });

    console.log('💾 Conversation stockée pour l\'utilisateur:', req.user.id);

    // Check if message has content before accessing it
    const content = message.content && message.content.length > 0 
      ? message.content[0].text 
      : message.messages && message.messages.length > 0 
        ? message.messages[0].content 
        : '';

    res.json({
      messageId: message.id,
      content: content
    });

  } catch (error) {
    console.error('❌ Erreur lors du démarrage de la conversation:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Erreur lors du démarrage de la conversation',
      details: error.message 
    });
  }
});

// Fonction pour formater la réponse de Claude
function formatClaudeResponse(response) {
  return {
    content: response.content[0].text,
    role: response.role || 'assistant'
  };
}

// Route pour continuer la conversation
router.post('/chat', verifyToken, async (req, res) => {
  try {
    console.log('🤖 Continuation de la conversation Claude');
    console.log('👤 Utilisateur:', req.user);
    
    const userId = req.user.id;
    console.log('🔑 ID Utilisateur:', userId);
    
    const { message: userMessage } = req.body;

    // Récupérer la conversation existante
    const conversation = conversations.get(userId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation non trouvée' });
    }

    console.log('💬 Message de l\'utilisateur:', userMessage);

    // Ajouter le message de l'utilisateur
    conversation.messages.push({
      role: 'user',
      content: userMessage
    });

    // Analyser le message avec Claude
    console.log('📤 Envoi du message à Claude...');
    const completion = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 1024,
      temperature: 0.7,
      system: systemPrompt,
      messages: conversation.messages
    });

    console.log('📥 Réponse reçue de Claude:', completion);

    // Formater la réponse
    const response = formatClaudeResponse(completion);

    // Ajouter la réponse à l'historique
    conversation.messages.push({
      role: 'assistant',
      content: response.content
    });

    // Extraire la configuration si présente
    const config = extractConfig(response.content);
    if (config) {
      // Fusionner la nouvelle config avec la config existante
      conversation.config = {
        ...conversation.config,  // Préserve les coordonnées GPS et la station météo
        ...config,              // Ajoute les nouvelles informations
        members: [
          ...(conversation.config.members || []),  // Préserve les membres existants
          ...(config.members || [])               // Ajoute les nouveaux membres s'il y en a
        ]
      };
    }

    // Vérifier si la configuration est complète
    const configComplete = checkConfigComplete(conversation.config);

    // Mettre à jour la conversation dans le Map
    conversations.set(userId, conversation);

    res.json({
      ...response,
      config: conversation.config,
      configComplete
    });

  } catch (error) {
    console.error('❌ Erreur lors de la conversation:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Erreur lors de la conversation',
      details: error.message 
    });
  }
});

// Route pour récupérer la configuration finale
router.get('/config', verifyToken, (req, res) => {
  const userId = req.user.id;
  const conversation = conversations.get(userId);
  
  if (!conversation) {
    return res.status(404).json({ error: 'Configuration non trouvée' });
  }

  console.log('💾 Configuration finale pour l\'utilisateur:', userId);
  res.json({ config: conversation.config });
});

// Fonction pour extraire la configuration des réponses
function extractConfig(message) {
  try {
    console.log('🔍 Extraction de la configuration...');
    // Chercher le contenu entre les balises <config></config>
    const configMatch = message.match(/<config>([\s\S]*?)<\/config>/);
    if (configMatch && configMatch[1]) {
      const config = JSON.parse(configMatch[1]);
      console.log('💡 Configuration extraite:', config);
      return config;
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'extraction de la configuration:', error);
  }
  return null;
}

// Vérifier si la configuration est complète
function checkConfigComplete(config) {
  console.log('🔍 Vérification de la complétude de la configuration...');
  const requiredSections = ['aircraft', 'members', 'settings'];
  return requiredSections.every(section => {
    if (!config[section]) return false;
    if (Array.isArray(config[section])) {
      return config[section].length > 0;
    }
    return Object.keys(config[section]).length > 0;
  });
}

module.exports = router;
}
