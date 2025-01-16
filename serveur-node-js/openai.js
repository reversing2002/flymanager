const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const claudeRouter = require('./claude');
const { verifyToken } = require('./middleware/auth');

// Vérifier quelle API utiliser
if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.length === 0) {
  console.log('🤖 Clé OpenAI non trouvée, utilisation de Claude comme fallback');
  module.exports = claudeRouter;
} else {
  console.log('🤖 Utilisation de GPT-4 pour l\'assistant');
  
  // Initialiser le client OpenAI avec la clé API
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

// Configuration du système pour GPT-4
const systemPrompt = `
Tu es un assistant spécialisé dans la configuration de clubs aériens sur la plateforme 4fly.
Ton rôle est de guider l'utilisateur pour configurer son club de la façon la plus simple possible, 
en posant des questions pertinentes et en récupérant les informations essentielles.

Au démarrage de la conversation, tu recevras la liste des stations météo disponibles entre les balises <stations></stations>.
Tu dois utiliser ces informations pour proposer automatiquement la station météo la plus proche du club,
en te basant sur les coordonnées GPS fournies.

Tu disposes deja des informations concernant le club et l'admin avec qui tu discutes.
ne demande pas d'information sur les administrateurs.

Voici les informations qu'il te reste à collecter :

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
   Pour chacun : prénom, nom, email, rôle (INSTRUCTOR, PILOT, etc.)


Ton objectif est de poser une question à la fois et de t’assurer de collecter toutes les informations
de manière progressive. Sois amical et professionnel.

Ne montre jamais à l’utilisateur le JSON de configuration, ne lui parle jamais de « configuration ».  
Tu discutes avec lui comme un conseiller qui l’aide à configurer son club.  
N’évoque pas ton fonctionnement interne.  

Insère systematiquement un bloc JSON contenant toutes les données structurées à la fin de ton message, 
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

// Fonction pour formater la réponse de GPT-4
function formatGPTResponse(response) {
  return {
    content: response.choices[0].message.content,
    role: response.choices[0].message.role,
  };
}

// Stocker les conversations en cours
const conversations = new Map();
const lastStartTime = new Map();

// Route pour démarrer une nouvelle conversation
router.post('/start', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = Date.now();
    const lastStart = lastStartTime.get(userId) || 0;
    
    // Empêcher les appels multiples dans un court intervalle (5 secondes)
    if (now - lastStart < 5000) {
      const existingConversation = conversations.get(userId);
      if (existingConversation) {
        const lastMessage = existingConversation.messages[existingConversation.messages.length - 1];
        return res.json(formatGPTResponse({ choices: [{ message: lastMessage }] }));
      }
    }
    
    lastStartTime.set(userId, now);
    console.log('🤖 Démarrage de la conversation GPT-4');
    console.log('👤 Utilisateur:', JSON.stringify(req.user, null, 2));
    console.log('📥 Données reçues:', JSON.stringify(req.body, null, 2));

    const { clubConfig } = req.body;
    const club = clubConfig.club;

    let stationsInfo = '';
    // Ne récupérer les stations que si on a des coordonnées GPS
    if (club.coordinates?.browser?.latitude && club.coordinates?.browser?.longitude) {
      const stationsResponse = await fetch(`https://stripe.linked.fr/api/meteo/stations?latitude=${club.coordinates.browser.latitude}&longitude=${club.coordinates.browser.longitude}`);
      const stations = await stationsResponse.json();
      stationsInfo = `<stations>${JSON.stringify(stations.slice(0, 3))}</stations>\n\n`;
    }

    // Créer le message initial avec les informations du club et des stations météo
    const initialMessage = `Bonjour ! Je vois que nous allons configurer le club "${club.name}" (${club.oaci}). 

    ${stationsInfo}Je vais maintenant vous aider à configurer votre club.
    Commençons par la flotte : avez-vous des avions ou des ULM ?`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: initialMessage }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages
    });

    console.log('📤 Réponse de GPT-4:', JSON.stringify(completion.choices[0].message, null, 2));

    // Créer la configuration initiale avec l'admin
    const initialConfig = {
      members: [{
        role: "ADMIN",
        firstName: club.contact.admin.firstName,
        lastName: club.contact.admin.lastName,
        email: club.contact.admin.email
      }]
    };

    // Ajouter les coordonnées GPS si disponibles
    if (club.coordinates?.browser?.latitude && club.coordinates?.browser?.longitude) {
      initialConfig.coordinates = {
        latitude: club.coordinates.browser.latitude,
        longitude: club.coordinates.browser.longitude
      };
    }

    // Stocker la conversation avec la réponse de GPT-4
    conversations.set(req.user.id, {
      messages: [
        ...messages,
        completion.choices[0].message
      ],
      config: initialConfig,
      step: 'fleet'
    });

    const response = formatGPTResponse(completion);
    
    // Ajouter la configuration initiale à la réponse
    response.config = initialConfig;
    
    // Si des stations ont été récupérées, les ajouter à la config
    if (stationsInfo) {
      try {
        const stations = JSON.parse(stationsInfo.match(/<stations>(.*?)<\/stations>/s)[1]);
        if (stations && stations.length > 0) {
          response.config.weatherStation = stations[0];
        }
      } catch (error) {
        console.error('Erreur lors du parsing des stations:', error);
      }
    }
    
    // Extraire la configuration si présente
    const config = extractConfig(response.content);
    if (config) {
      response.config = config;
      response.configComplete = checkConfigComplete(config);
    }
    
    res.json(response);
  } catch (error) {
    console.error('Erreur lors du démarrage de la conversation:', error);
    res.status(500).json({ error: 'Erreur lors du démarrage de la conversation' });
  }
});

// Route pour continuer la conversation
router.post('/chat', verifyToken, async (req, res) => {
  try {
    console.log('🤖 Continuation de la conversation GPT-4');
    console.log('👤 Utilisateur:', JSON.stringify(req.user, null, 2));
    console.log('📥 Message reçu:', JSON.stringify(req.body, null, 2));

    const userId = req.user.id;
    const userMessage = req.body.message;

    // Récupérer la conversation existante
    const conversation = conversations.get(userId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation non trouvée' });
    }

    // Ajouter le message de l'utilisateur à l'historique
    conversation.messages.push({
      role: 'user',
      content: userMessage
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: conversation.messages
  
    });

    console.log('📤 Réponse de GPT-4:', JSON.stringify(completion.choices[0].message, null, 2));

    // Ajouter la réponse à l'historique
    conversation.messages.push(completion.choices[0].message);

    // Mettre à jour la conversation dans le Map
    conversations.set(userId, conversation);

    // Extraire la configuration si présente
    const response = formatGPTResponse(completion);
    const config = extractConfig(response.content);

    if (config) {
      // Fusionner la nouvelle config avec la config existante
      conversation.config = {
        ...conversation.config,  // Préserve les coordonnées GPS et la station météo
        ...config,              // Ajoute les nouvelles informations
        members: [
          ...conversation.config.members,  // Préserve les membres existants
          ...(config.members || [])        // Ajoute les nouveaux membres s'il y en a
        ]
      };
      response.config = conversation.config;
      response.configComplete = checkConfigComplete(conversation.config);
    }

    res.json(response);
  } catch (error) {
    console.error('Erreur lors de la conversation:', error);
    res.status(500).json({ error: 'Erreur lors de la conversation' });
  }
});

// Fonction pour extraire la configuration des réponses
function extractConfig(message) {
  const configMatch = message.match(/<config>(.*?)<\/config>/s);
  if (configMatch) {
    try {
      return JSON.parse(configMatch[1]);
    } catch (error) {
      console.error('Erreur lors du parsing de la configuration:', error);
      return null;
    }
  }
  return null;
}

// Vérifier si la configuration est complète
function checkConfigComplete(config) {
  // Vérifier si l'objet config existe
  if (!config) return false;

  // Liste des champs requis
  const requiredFields = ['members', 'aircrafts'];
  
  // Vérifier la présence de tous les champs requis
  const hasAllFields = requiredFields.every(field => config.hasOwnProperty(field));
  if (!hasAllFields) return false;
  
  // Vérifier que les tableaux ne sont pas vides
  if (!config.members.length || !config.aircrafts.length) return false;
  
  // Vérifier la présence d'au moins un admin et un autre membre
  const hasAdmin = config.members.some(member => member.role === 'ADMIN');
  const hasOtherMember = config.members.some(member => member.role !== 'ADMIN');
  if (!hasAdmin || !hasOtherMember) return false;

  return true;
}

module.exports = router;
}
