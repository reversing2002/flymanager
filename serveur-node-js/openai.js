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

Au début de chaque conversation, tu dois:
1. Souhaiter la bienvenue en citant le nom du club. Remercier l'utilisateur pour sa confiance dans 4Fly. Lui indiquer qu\'à tout moment il peut contacter le support si besoin. en cliquant sur "Support" en haut à droite.
2. Faire un récapitulatif des informations déjà connues:
   - Nom et coordonnées du club
   - Liste des ULM ou avions déjà enregistrés avec leurs immatriculations
   - Liste des membres déjà enregistrés
3. Indiquer clairement les informations qu'il reste à collecter

Tu disposes deja des informations concernant le club et l'admin avec qui tu discutes.
ne demande pas d'information sur les administrateurs.

Voici les informations qu'il te reste à collecter :

1. FLOTTE
   - Types d'appareils (PLANE ou ULM uniquement)
   - Immatriculations
   - Tarifs horaires
   - Capacités (optionnel, normalement les avions sont 4 places et les ulm 2 places maximum)
   - Maintenance  : considère les appareils comment étant AVAILABLE, l'utilisateur pourra modifier ça par la suite.

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

N'utilise pas de code ou de termes en anglais, par exemple au lieu de 
"Voyons ensemble la section sur les membres du club. Pouvez-vous me donner les détails du premier membre, ainsi que son rôle dans le club ?  
Prénom, nom, email et rôle (ADMIN, INSTRUCTOR, PILOT, MECHANIC)."
Demande plutot "Voyons ensemble la section sur les membres du club. Pouvez-vous me donner les détails du premier membre, ainsi que son rôle dans le club ?  
Prénom, nom, email et rôle (pilote, instructeur, mécanicien, etc)."

Le membre avec qui tu discutes a un rôle d'administrateur et ne pourra cumuler ce role avec un autre. S'il veut done egalement etre pilote ou instructeur par exemple il devré créer un compte supplmériaire avec une autre adresse e-mail.

Insère systematiquement un bloc JSON contenant toutes les données structurées à la fin de ton message, 
entre les balises <config> et </config>. Ne place jamais ce bloc au milieu de ta réponse.  

Si une information est manquante, redemande-la.  
Si l’information a déjà été fournie, ne la redemande pas.  
Pour le type PLANE ou ULM demande en français si ce sont des avions ou ulm, prévoit 4 places par defaut dans les avions et 2 places dans les ulm.

Ne change pas de sujet : tu es uniquement là pour configurer un club aérien.  
Pose les questions nécessaires et guide l’utilisateur jusqu’à ce que la configuration soit complète.

Ne parle pas à l'utilisateur de station méteo ou station de vent.

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
  const message = response.choices[0].message;
  const parsedContent = JSON.parse(message.content);
  return {
    content: parsedContent.content,
    role: message.role,
    config: parsedContent.config
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

    const existingAircrafts = clubConfig.existingData?.aircrafts;
    let existingAircraftsInfo = '';
    
    if (existingAircrafts && existingAircrafts.length > 0) {
      existingAircraftsInfo = 'Voici la flotte existante de votre club :\n';
      existingAircrafts.forEach((plane, index) => {
        existingAircraftsInfo += `- ${plane.registration} (${plane.type}, ${plane.hourlyRate} €/h)\n`;
      });
      existingAircraftsInfo += '\n';
    }
    
    const initialMessage = `
    Bonjour ! Je vois que nous allons configurer le club "${club.name}" (${club.oaci}). 
    
    ${stationsInfo}
    ${existingAircraftsInfo}
    Je vais maintenant vous aider à configurer votre club.
    Commençons par la flotte : avez-vous des avions ou des ULM ?
    `;
    

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: initialMessage }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-2024-08-06',
      messages: messages,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "club_configuration",
          strict: true,
          schema: {
            type: "object",
            properties: {
              content: {
                type: "string",
                description: "The assistant's response message"
              },
              config: {
                type: "object",
                properties: {
                  members: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        role: {
                          type: "string",
                          enum: ["ADMIN", "INSTRUCTOR", "PILOT", "MECHANIC"]
                        },
                        firstName: {
                          type: "string",
                          description: "Member's first name"
                        },
                        lastName: {
                          type: "string",
                          description: "Member's last name"
                        },
                        email: {
                          type: "string",
                          description: "Member's email address"
                        }
                      },
                      required: ["role", "firstName", "lastName", "email"],
                      additionalProperties: false
                    }
                  },
                  aircrafts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: {
                          type: "string",
                          enum: ["PLANE", "ULM"]
                        },
                        registration: {
                          type: "string",
                          description: "Aircraft registration number"
                        },
                        hourlyRate: {
                          type: "number",
                          description: "Hourly rate for the aircraft"
                        },
                        capacity: {
                          type: "number",
                          description: "Aircraft capacity"
                        },
                        status: {
                          type: "string",
                          enum: ["AVAILABLE", "MAINTENANCE", "RESERVED"]
                        }
                      },
                      required: ["type", "registration", "hourlyRate", "capacity", "status"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["members", "aircrafts"],
                additionalProperties: false
              }
            },
            required: ["content", "config"],
            additionalProperties: false
          }
        }
      }
    });

    // Handle potential refusals or errors
    if (completion.choices[0].message.refusal) {
      console.log('🚫 GPT-4 refused to respond:', completion.choices[0].message.refusal);
      return res.status(400).json({ error: 'Response refused by AI' });
    }

    if (completion.choices[0].finish_reason === "length") {
      console.log('⚠️ Response was truncated due to length');
      return res.status(400).json({ error: 'Response was incomplete' });
    }

    if (completion.choices[0].finish_reason === "content_filter") {
      console.log('⚠️ Response was filtered for content');
      return res.status(400).json({ error: 'Response was filtered' });
    }

    console.log('📤 Réponse de GPT-4:', JSON.stringify(completion.choices[0].message, null, 2));

    // Créer la configuration initiale avec l'admin
// Créer la configuration initiale avec l'admin et les données existantes
const initialConfig = {
  members: [{
    role: "ADMIN",
    firstName: club.contact.admin.firstName,
    lastName: club.contact.admin.lastName,
    email: club.contact.admin.email
  }],
  aircrafts: clubConfig.existingData?.aircrafts || []
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
    const { message, clubConfig } = req.body;

    // Préparer le contexte initial avec les données du club
    let contextMessage = '';
    if (clubConfig?.club) {
      contextMessage = `Configuration en cours pour le club "${clubConfig.club.name}" (${clubConfig.club.oaci}).\n\n`;
    }
    
    // Ajouter les données existantes
    if (clubConfig?.existingData) {
      const { aircrafts, members } = clubConfig.existingData;
      
      if (aircrafts && aircrafts.length > 0) {
        contextMessage += 'Voici la flotte existante :\n';
        aircrafts.forEach(aircraft => {
          contextMessage += `- ${aircraft.type} ${aircraft.registration} (${aircraft.capacity} places, ${aircraft.hourlyRate}€/h)\n`;
        });
        contextMessage += '\n';
      }
      
      if (members && members.length > 0) {
        contextMessage += 'Voici les membres existants :\n';
        members.forEach(member => {
          contextMessage += `- ${member.firstName} ${member.lastName} (${member.email})\n`;
        });
        contextMessage += '\n';
      }
    }

    // Ajouter les informations de la station météo
    if (clubConfig?.weatherStations?.[0]) {
      const station = clubConfig.weatherStations[0];
      contextMessage += `La station météo la plus proche est ${station.Nom_usuel} (distance : ${station.distance.toFixed(2)} km).\n\n`;
    }

    // Récupérer ou créer la conversation
    let conversation = conversations.get(userId);
    if (!conversation) {
      // Initialiser la conversation avec le contexte complet
      conversation = {
        messages: [{
          role: 'system',
          content: `${systemPrompt}\n\nContexte actuel:\n${contextMessage}`
        }, {
          role: 'assistant',
          content: `Bienvenue dans la configuration du club "${clubConfig.club.name}" !\n\n${contextMessage}\nQue souhaitez-vous configurer maintenant ?`
        }],
        config: {
          members: clubConfig.existingData?.members || [],
          aircrafts: clubConfig.existingData?.aircrafts || []
        }
      };
      conversations.set(userId, conversation);
    }

    // Ajouter le message de l'utilisateur s'il existe
    if (message) {
      conversation.messages.push({
        role: 'user',
        content: message
      });

      // Créer la complétion
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-2024-08-06',
        messages: conversation.messages,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "club_configuration",
            strict: true,
            schema: {
              type: "object",
              properties: {
                content: {
                  type: "string",
                  description: "The assistant's response message"
                },
                config: {
                  type: "object",
                  properties: {
                    members: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          role: {
                            type: "string",
                            enum: ["ADMIN", "INSTRUCTOR", "PILOT", "MECHANIC"]
                          },
                          firstName: {
                            type: "string",
                            description: "Member's first name"
                          },
                          lastName: {
                            type: "string",
                            description: "Member's last name"
                          },
                          email: {
                            type: "string",
                            description: "Member's email address"
                          }
                        },
                        required: ["role", "firstName", "lastName", "email"],
                        additionalProperties: false
                      }
                    },
                    aircrafts: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          type: {
                            type: "string",
                            enum: ["PLANE", "ULM"]
                          },
                          registration: {
                            type: "string",
                            description: "Aircraft registration number"
                          },
                          hourlyRate: {
                            type: "number",
                            description: "Hourly rate for the aircraft"
                          },
                          capacity: {
                            type: "number",
                            description: "Aircraft capacity"
                          },
                          status: {
                            type: "string",
                            enum: ["AVAILABLE", "MAINTENANCE", "RESERVED"]
                          }
                        },
                        required: ["type", "registration", "hourlyRate", "capacity", "status"],
                        additionalProperties: false
                      }
                    }
                  },
                  required: ["members", "aircrafts"],
                  additionalProperties: false
                }
              },
              required: ["content", "config"],
              additionalProperties: false
            }
          }
        }
      });

      // Handle potential refusals or errors
      if (completion.choices[0].message.refusal) {
        console.log('🚫 GPT-4 refused to respond:', completion.choices[0].message.refusal);
        return res.status(400).json({ error: 'Response refused by AI' });
      }

      if (completion.choices[0].finish_reason === "length") {
        console.log('⚠️ Response was truncated due to length');
        return res.status(400).json({ error: 'Response was incomplete' });
      }

      if (completion.choices[0].finish_reason === "content_filter") {
        console.log('⚠️ Response was filtered for content');
        return res.status(400).json({ error: 'Response was filtered' });
      }

      // Ajouter la réponse à l'historique
      conversation.messages.push(completion.choices[0].message);
      
      // Mettre à jour la conversation
      conversations.set(userId, conversation);

      // Envoyer la réponse
      res.json(formatGPTResponse(completion));
    } else {
      // Si pas de message, envoyer le dernier message assistant
      res.json({
        role: 'assistant',
        content: conversation.messages[conversation.messages.length - 1].content
      });
    }
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
