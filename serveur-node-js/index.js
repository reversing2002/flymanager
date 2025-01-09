const express = require("express");
const Stripe = require("stripe");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require('path');
const twilio = require('twilio');
const Mailjet = require('node-mailjet');
const { createClient } = require('@supabase/supabase-js');
const cron = require('node-cron');
const { format, parseISO } = require('date-fns');
const { fr } = require('date-fns/locale');
const icalGenerator = require('ical-generator');
const crypto = require('crypto');
const puppeteer = require('puppeteer');

dotenv.config({ path: path.join(__dirname, '.env') });

// Initialisation du client Supabase avec la clé de service
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const app = express();
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  throw new Error('La clé Stripe est manquante dans les variables d\'environnement');
}

// Configuration de Stripe
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: true,
});

// Configuration CORS
const allowedOrigins = [
  process.env.FRONTEND_URL,  // URL de production
  'http://localhost:5173',   // URL de développement
  'https://4fly.io' // URL de production
];

// Import admin router
const adminRouter = require('./admin');

// Stripe webhook should be before any parsing middleware
app.post("/api/webhooks/stripe", 
  express.raw({type: 'application/json'}), 
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    try {
      const event = stripe.webhooks.constructEvent(
        req.body, // raw body
        sig,
        webhookSecret
      );
      
      // Handle the event
      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object;
          console.log('PaymentIntent was successful!');
          break;
        case 'checkout.session.completed':
          const session = event.data.object;
          console.log('Checkout session completed:', session);
          // Check if this is an account credit payment
          if (session.metadata?.entryTypeId) {
            try {
              const { data: entryData, error: entryError } = await supabase
                .from('account_entries')
                .insert([{
                  user_id: session.metadata.userId,
                  assigned_to_id: session.metadata.userId,
                  entry_type_id: session.metadata.entryTypeId,
                  payment_method: 'CARD',
                  is_validated: true,
                  is_club_paid: false,
                  amount: parseFloat(session.metadata.amount),
                  date: new Date().toISOString(),
                  description:'Crédit de compte via Stripe'
                }])
                .select()
                .single();
              
              if (entryError) throw entryError;
              
              console.log(`Account credit entry created: ${entryData.id}`);
            } catch (err) {
              console.error('Error processing account credit payment:', err);
            }
          }
          // Handle discovery flight payment
          else if (session.metadata?.flightId) {
            try {
              // Update flight status in database
              const { data: flightData, error: flightError } = await supabase
                .from('discovery_flights')
                .update({ payment_status: 'paid' })
                .eq('id', session.metadata.flightId)
                .select('*')
                .single();
              
              if (flightError) throw flightError;
              
              console.log(`Vol découverte ${session.metadata.flightId} marqué comme payé`);
        
              // Attendre un peu avant de créer la conversation
              await new Promise(resolve => setTimeout(resolve, 2000));
        
              // D'abord nettoyer les conversations existantes
              await cleanupExistingConversations(session.metadata.flightId, session.metadata.customerPhone);
              
              // Attendre après le nettoyage
              await new Promise(resolve => setTimeout(resolve, 2000));
        
              // Créer la conversation avec gestion des erreurs
              try {
                const conversation = await getOrCreateConversation(
                  session.metadata.flightId, 
                  session.metadata.customerPhone
                );
                
                if (conversation) {
                  // Attendre avant d'envoyer le message
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  await sendConfirmationMessage(session.metadata.flightId, flightData);
                  console.log('Message de confirmation envoyé avec succès');
                }
              } catch (convError) {
                console.error('Erreur lors de la gestion de la conversation:', convError);
                // Ne pas propager l'erreur pour ne pas bloquer le webhook
              }
            } catch (err) {
              console.error('Erreur lors du traitement du paiement:', err);
            }
          }
          break;
        // Add other event types as needed
        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      res.json({received: true});
    } catch (err) {
      console.error('Webhook Error:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
});

// Apply JSON parsing middleware after the Stripe webhook route
app.use(express.json());

app.use(
  cors({
    origin: function(origin, callback) {
      // Permettre les requêtes sans origine (comme les appels API directs)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin) || origin.match(/^http:\/\/localhost:\d+$/)) {
        callback(null, true);
      } else {
        callback(new Error('Bloqué par CORS'));
      }
    },
    credentials: true,
  })
);

// Mount admin router
app.use('/admin', adminRouter);

// Configuration Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

// Vérification des variables d'environnement Twilio
if (!accountSid || !authToken) {
  console.error('Les identifiants Twilio sont manquants dans les variables d\'environnement');
  process.exit(1);
}

const twilioClient = require('twilio')(accountSid, authToken);

// Fonction utilitaire pour le logging
const log = (title, content) => {
  console.log('\n' + '='.repeat(50));
  console.log(title);
  console.log('='.repeat(50));
  console.log(content);
};

// Fonction pour nettoyer les conversations existantes
async function cleanupExistingConversations(flightId, customerPhone) {
  try {
    log('Nettoyage', 'Recherche des conversations existantes...');
    
    const conversations = await twilioClient.conversations.v1.conversations
      .list({limit: 20});
    
    const conversationUniqueName = `flight_${flightId}`;
    for (const conversation of conversations) {
      // Check if this is our target conversation or if it contains our customer
      const shouldCheck = conversation.uniqueName === conversationUniqueName;
      
      if (shouldCheck || customerPhone) {
        // Get participants for this conversation
        const participants = await twilioClient.conversations.v1
          .conversations(conversation.sid)
          .participants
          .list();
          
        // Check if any participant matches our customer's phone
        const hasCustomer = customerPhone && participants.some(p => 
          p.messagingBinding && p.messagingBinding.address === customerPhone
        );
        
        if (shouldCheck || hasCustomer) {
          log('Suppression Conversation', conversation.sid);
          await twilioClient.conversations.v1.conversations(conversation.sid)
            .remove();
          if (shouldCheck) break; // If this was our target conversation, we can stop
        }
      }
    }
    
    log('Nettoyage Terminé', `Conversations nettoyées pour le vol ${flightId}`);
  } catch (error) {
    log('Erreur Nettoyage', error);
    throw error;
  }
}

// Fonction pour nettoyer les participants d'une conversation
async function cleanupParticipants(conversationSid) {
  try {
    log('Nettoyage Participants', 'Recherche des participants existants...');
    
    const participants = await twilioClient.conversations.v1
      .conversations(conversationSid)
      .participants
      .list();
    
    for (const participant of participants) {
      log('Suppression Participant', participant.sid);
      await twilioClient.conversations.v1
        .conversations(conversationSid)
        .participants(participant.sid)
        .remove();
    }
    
    log('Nettoyage Participants Terminé', `${participants.length} participants supprimés`);
  } catch (error) {
    log('Erreur Nettoyage Participants', error);
    throw error;
  }
}

// Fonction mise à jour pour créer ou récupérer une conversation
async function getOrCreateConversation(flightId, customerPhone) {
  try {
    log('Configuration Conversation', `Début pour vol ${flightId}`);
    
    await cleanupExistingConversations(flightId, customerPhone);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const conversation = await twilioClient.conversations.v1.conversations
      .create({
        friendlyName: `Vol Découverte #${flightId}`,
        uniqueName: `flight_${flightId}`
      });
    
    log('Conversation Créée', conversation);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      // Nettoyer les participants existants avant d'en ajouter de nouveaux
      await cleanupParticipants(conversation.sid);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      log('Ajout Client', 'Ajout du participant client...');
      const customer = await twilioClient.conversations.v1.conversations(conversation.sid)
        .participants
        .create({
          "messagingBinding.address": customerPhone,
          "messagingBinding.proxyAddress": process.env.TWILIO_PHONE_NUMBER
        });
      
      log('Client Ajouté', customer);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      log('Ajout Service', 'Ajout du participant service...');
      const agent = await twilioClient.conversations.v1.conversations(conversation.sid)
        .participants
        .create({
          identity: 'service_agent_1'
        });
      
      log('Service Ajouté', agent);
    } catch (error) {
      log('Erreur Participants', error);
      throw error;
    }
    
    return conversation;
  } catch (error) {
    log('Erreur Conversation', error);
    throw error;
  }
}

// Fonction mise à jour pour envoyer un message de confirmation
async function sendConfirmationMessage(flightId, flightDetails) {
  try {
    log('Envoi Message', 'Préparation du message de confirmation...');
    
    const message = `🎉 Confirmation de votre vol découverte\n\n` +
      `Bonjour,\n\n` +
      `Nous avons bien reçu votre réservation et votre paiement pour votre vol découverte. ` +
      `Notre équipe va étudier vos disponibilités et vous recontacter très prochainement pour confirmer la date et l'heure de votre vol.\n\n` +
      `Détails de votre réservation :\n` +
      `- Nombre de passagers : ${flightDetails.passenger_count}\n` +
      `- Dates souhaitées : ${flightDetails.preferred_dates || 'Non spécifiées'}\n` +
      `- Commentaires : ${flightDetails.comments || 'Aucun'}\n\n` +
      `N'hésitez pas à utiliser cette conversation pour toute question concernant votre vol découverte.\n\n` +
      `À très bientôt !`;

    await new Promise(resolve => setTimeout(resolve, 2000));

    const messageResult = await twilioClient.conversations.v1
      .conversations(`flight_${flightId}`)
      .messages
      .create({
        author: 'service_agent_1',
        body: message,
        attributes: JSON.stringify({
          deliveryType: 'sms'
        })
      });

    log('Message Envoyé', messageResult);

    const { error } = await supabase
      .from('discovery_flights')
      .update({ status: 'CONFIRMED' })
      .eq('id', flightId);

    if (error) {
      log('Erreur Update Status', error);
      throw error;
    }

    log('Status Mis à Jour', `Vol ${flightId} confirmé`);
  } catch (error) {
    log('Erreur Message', error);
    throw error;
  }
}

// Route pour créer une nouvelle conversation pour un vol découverte
app.post('/api/conversations/create', async (req, res) => {
  const { flightId, customerPhone } = req.body;
  console.log('Création de conversation pour:', { flightId, customerPhone });

  if (!flightId || !customerPhone) {
    return res.status(400).json({ 
      error: 'flightId et customerPhone sont requis' 
    });
  }

  const conversationUniqueName = `flight_${flightId}`;
  
  try {
    let conversation = await twilioClient.conversations.v1.conversations
      .list({uniqueName: conversationUniqueName});
    
    if (conversation.length > 0) {
      conversation = conversation[0];
      console.log('Conversation existante trouvée:', conversation.sid);
      return res.json({
        success: true,
        conversationSid: conversation.sid,
        message: 'Conversation existante récupérée'
      });
    } else {
      console.log('Création d\'une nouvelle conversation...');
      const newConversation = await twilioClient.conversations.v1.conversations.create({
        uniqueName: conversationUniqueName,
        friendlyName: `Vol Découverte #${flightId}`
      });

      // Ajouter le numéro du client à la conversation
      await twilioClient.conversations.v1
        .conversations(newConversation.sid)
        .participants
        .create({
          'messagingBinding.address': customerPhone,
          'messagingBinding.proxyAddress': process.env.TWILIO_PHONE_NUMBER
        });

      // Ajouter le numéro de service comme participant
      await twilioClient.conversations.v1
        .conversations(newConversation.sid)
        .participants
        .create({
          'messagingBinding.address': process.env.TWILIO_PHONE_NUMBER,
          'messagingBinding.proxyAddress': customerPhone
        });

      console.log('Nouvelle conversation créée:', newConversation.sid);
      return res.json({
        success: true,
        conversationSid: newConversation.sid,
        message: 'Nouvelle conversation créée'
      });
    }
  } catch (error) {
    console.error('Erreur lors de la création de la conversation:', error);
    return res.status(500).json({ 
      error: 'Erreur lors de la création de la conversation',
      details: error.message 
    });
  }
});

// Route pour envoyer un message dans une conversation Twilio
app.post('/api/conversations/send-message', async (req, res) => {
  try {
    const { flightId, message, sender } = req.body;
    const conversationUniqueName = `flight_${flightId}`;

    // Récupérer la conversation
    const conversation = await twilioClient.conversations.v1
      .conversations(conversationUniqueName)
      .fetch();

    // Envoyer le message
    const messageResponse = await twilioClient.conversations.v1
      .conversations(conversationUniqueName)
      .messages
      .create({
        author: sender,
        body: message
      });

    res.json({
      success: true,
      message: messageResponse
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi du message:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi du message' });
  }
});

// Route pour envoyer un message dans une conversation
app.post('/api/conversations/send-message', async (req, res) => {
  try {
    const { flightId, message, sender } = req.body;

    if (!flightId || !message || !sender) {
      return res.status(400).json({ error: 'flightId, message et sender sont requis' });
    }

    const conversationUniqueName = `flight_${flightId}`;
    const conversation = await twilioClient.conversations.v1.conversations(conversationUniqueName).fetch();

    await twilioClient.conversations.v1
      .conversations(conversationUniqueName)
      .messages
      .create({
        author: sender,
        body: message
      });

    res.json({
      success: true,
      message: 'Message envoyé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi du message:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi du message' });
  }
});

// Webhook pour recevoir les événements de conversation Twilio
app.post('/api/webhooks/twilio-conversations', async (req, res) => {
  try {
    const { EventType, ConversationSid, MessageSid, Body, Author } = req.body;

    console.log(`Événement Twilio reçu: ${EventType}`);

    if (EventType === 'onMessageAdded') {
      // Ici, vous pouvez ajouter la logique pour traiter les nouveaux messages
      console.log(`Nouveau message reçu dans la conversation ${ConversationSid}`);
      console.log(`Message de ${Author}: ${Body}`);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Erreur dans le webhook Twilio:', error);
    res.status(500).json({ error: 'Erreur dans le webhook Twilio' });
  }
});

// Route pour récupérer les messages d'une conversation Twilio
app.get('/api/conversations/:flightId/messages', async (req, res) => {
  try {
    const { flightId } = req.params;
    const conversationUniqueName = `flight_${flightId}`;

    let conversation;
    try {
      // Essayer de récupérer la conversation existante
      conversation = await twilioClient.conversations.v1
        .conversations(conversationUniqueName)
        .fetch();

    } catch (error) {
      if (error.code === 20404) { // Conversation not found
        // Récupérer les informations du vol depuis Supabase
        const { data: flightData, error: flightError } = await supabase
          .from('discovery_flights')
          .select('*')
          .eq('id', flightId)
          .single();

        if (flightError) throw flightError;
        if (!flightData) {
          return res.status(404).json({ error: 'Vol non trouvé' });
        }

        if (!flightData.customer_phone) {
          return res.status(400).json({ error: 'Numéro de téléphone du client manquant' });
        }

        // Créer la conversation
        conversation = await getOrCreateConversation(flightId, flightData.customer_phone);
        
        // Ajouter un message de bienvenue
        await twilioClient.conversations.v1
          .conversations(conversation.sid)
          .messages
          .create({
            author: 'system',
            body: 'Bienvenue dans votre conversation pour le vol découverte. Un agent vous répondra dans les plus brefs délais.'
          });
      } else {
        throw error;
      }
    }

    // Récupérer les messages de la conversation
    const messages = await twilioClient.conversations.v1
      .conversations(conversationUniqueName)
      .messages
      .list({limit: 50}); // Limite à 50 messages

    res.json({
      conversation: {
        sid: conversation.sid,
        friendlyName: conversation.friendlyName,
        messages: messages.map(msg => ({
          sid: msg.sid,
          author: msg.author,
          body: msg.body,
          dateCreated: msg.dateCreated
        }))
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des messages:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des messages' });
  }
});

// Fonction utilitaire pour attendre
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fonction pour envoyer un email avec retry
async function sendEmailWithRetry(mailjetClient, emailData, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await mailjetClient
        .post('send', { 
          version: 'v3.1',
          timeout: 10000 // 10 secondes timeout
        })
        .request(emailData);
      
      return result;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Si c'est une erreur de connexion, attendre avant de réessayer
      if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
        console.log(`⚠️ Tentative ${attempt}/${maxRetries} échouée, nouvelle tentative dans ${attempt * 2} secondes...`);
        await wait(attempt * 2000); // Attendre 2s, puis 4s, puis 6s
        continue;
      }
      
      // Pour les autres types d'erreurs, les propager immédiatement
      throw error;
    }
  }
}

// Fonction pour traiter les notifications en attente
async function processNotifications() {
  console.log('📧 Configuration du cron job pour les notifications...');
  try {
    // Récupérer tous les clubs
    console.log('📥 Récupération des clubs...');
    const { data: clubs, error } = await supabase
      .from('clubs')
      .select('id');

    if (error) {
      console.error('❌ Erreur lors de la récupération des clubs:', error);
      throw error;
    }

    if (!clubs?.length) {
      console.log('ℹ️ Aucun club trouvé');
      return;
    }

    console.log(`📋 Traitement des notifications pour ${clubs.length} clubs`);

    // Traiter les notifications pour chaque club
    for (const club of clubs) {
      console.log(`\n🏢 Traitement du club ${club.id}...`);
      try {
        // Récupérer d'abord les paramètres du club
        console.log(`⚙️ Récupération des paramètres pour le club ${club.id}...`);
        const { data: settings, error: settingsError } = await supabase
          .from('notification_settings')
          .select('*')
          .eq('club_id', club.id)
          .single();

        if (settingsError) {
          console.error(`❌ Erreur lors de la récupération des paramètres du club ${club.id}:`, settingsError);
          continue;
        }

        if (!settings) {
          console.error(`⚠️ Paramètres de notification non trouvés pour le club ${club.id}`);
          continue;
        }

        console.log(`✅ Paramètres trouvés pour le club ${club.id}`);
        console.log(`📧 Configuration email: ${settings.sender_email || 'Non défini'}`);

        // Initialiser Mailjet avec les clés API du club
        if (!settings.mailjet_api_key || !settings.mailjet_api_secret) {
          console.error(`❌ Clés Mailjet manquantes pour le club ${club.id}`);
          continue;
        }

        console.log(`🔑 Initialisation de Mailjet pour le club ${club.id}...`);
        const mailjetClient = Mailjet.apiConnect(
          settings.mailjet_api_key,
          settings.mailjet_api_secret
        );

        console.log(`📬 Recherche des notifications en attente pour le club ${club.id}...`);
        const { data: notifications, error: notifError } = await supabase
          .from('notifications')
          .select(`
            *,
            users!notifications_user_id_fkey (
              id,
              first_name,
              last_name,
              email
            )
          `)
          .eq('club_id', club.id)
          .eq('sent', false)
          .lte('scheduled_date', new Date().toISOString());

        if (notifError) {
          console.error(`❌ Erreur lors de la récupération des notifications pour le club ${club.id}:`, notifError);
          continue;
        }

        if (!notifications?.length) {
          console.log(`ℹ️ Aucune notification en attente pour le club ${club.id}`);
          continue;
        }

        console.log(`📬 ${notifications.length} notifications à envoyer pour le club ${club.id}`);

        for (const notification of notifications) {
          console.log(`\n📨 Traitement de la notification ${notification.id}...`);
          try {
            if (!notification.users?.email) {
              console.error(`❌ Email manquant pour l'utilisateur de la notification ${notification.id}`);
              continue;
            }

            // Récupérer le template correspondant au type de notification
            const { data: template, error: templateError } = await supabase
              .from('notification_templates')
              .select('*')
              .eq('club_id', club.id)
              .eq('notification_type', notification.type)
              .single();

            if (templateError) {
              console.error(`❌ Erreur lors de la récupération du template pour la notification ${notification.id}:`, templateError);
              continue;
            }

            if (!template) {
              console.error(`❌ Template non trouvé pour le type ${notification.type}`);
              continue;
            }

            console.log(`📝 Préparation de l'email pour ${notification.users.email}...`);
            console.log(`📋 Template: ${template.name}`);

            // Remplacer les variables dans le HTML
            let htmlContent = template.html_content;
            for (const [key, value] of Object.entries(notification.variables)) {
              let formattedValue = value;
              
              // Détecter si la valeur ressemble à une date ISO
              if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
                try {
                  const date = parseISO(value);
                  // Format: "24 décembre 2024 à 09:15"
                  formattedValue = format(date, "d MMMM yyyy 'à' HH:mm", { locale: fr });
                } catch (e) {
                  console.error(`Erreur lors du formatage de la date ${value}:`, e);
                  formattedValue = value;
                }
              }
              
              htmlContent = htmlContent.replace(new RegExp(`{${key}}`, 'g'), formattedValue);
            }

            const emailData = {
              Messages: [
                {
                  From: {
                    Email: settings.sender_email,
                    Name: settings.sender_name,
                  },
                  To: [
                    {
                      Email: process.env.NODE_ENV === 'production' ? notification.users.email : 'eddy@yopmail.com',
                      Name: `${notification.users.first_name} ${notification.users.last_name}`
                    }
                  ],
                  Subject: notification.type === 'bulk_email' 
                    ? notification.variables.subject 
                    : template.subject,
                  HTMLPart: htmlContent
                }
              ]
            };

            // Envoyer l'email avec retry
            console.log(`📤 Envoi de l'email pour la notification ${notification.id}...`);
            await sendEmailWithRetry(mailjetClient, emailData);

            // Marquer la notification comme envoyée
            console.log(`✍️ Mise à jour du statut de la notification ${notification.id}...`);
            const { error: updateError } = await supabase
              .from('notifications')
              .update({ 
                sent: true, 
                sent_date: new Date().toISOString(),
                status: 'SENT'
              })
              .eq('id', notification.id);

            if (updateError) {
              console.error(`❌ Erreur lors de la mise à jour de la notification ${notification.id}:`, updateError);
              throw updateError;
            }

            console.log(`✅ Notification ${notification.id} envoyée avec succès`);
          } catch (error) {
            console.error(`❌ Erreur lors de l'envoi de la notification ${notification.id}:`, error);
            // Mettre à jour le statut de la notification en erreur
            await supabase
              .from('notifications')
              .update({ 
                status: 'ERROR',
                error: error.message || 'Une erreur est survenue lors de l\'envoi'
              })
              .eq('id', notification.id);
          }
        }
      } catch (error) {
        console.error(`❌ Erreur lors du traitement des notifications pour le club ${club.id}:`, error);
      }
    }
    console.log('\n✨ Cycle de traitement des notifications terminé');
  } catch (error) {
    console.error('❌ Erreur lors du traitement des notifications:', error);
  }
}

// Fonction pour synchroniser les calendriers des instructeurs
async function syncInstructorCalendars() {
  console.log('🗓️ Début de la synchronisation des calendriers...');
  try {
    // Récupérer tous les instructeurs avec leurs calendriers Google
    const { data: instructors, error: instructorsError } = await supabase
      .from('instructor_calendars')
      .select('*')
      .not('calendar_id', 'is', null);

    if (instructorsError) throw instructorsError;

    console.log(`📊 ${instructors?.length || 0} instructeurs avec calendriers trouvés`);

    // Pour chaque instructeur, synchroniser son calendrier
    for (const instructor of (instructors || [])) {
      try {
        console.log(`🔄 Synchronisation du calendrier pour l'instructeur ${instructor.instructor_id}...`);
        
        // Récupérer le club_id de l'instructeur
        const { data: memberData, error: memberError } = await supabase
          .from('club_members')
          .select('club_id')
          .eq('user_id', instructor.instructor_id)
          .eq('status', 'ACTIVE')
          .single();

        if (memberError) {
          console.error(`❌ Erreur lors de la récupération du club pour l'instructeur ${instructor.instructor_id}:`, memberError);
          continue;
        }

        if (!memberData?.club_id) {
          console.error(`❌ L'instructeur ${instructor.instructor_id} n'est associé à aucun club actif`);
          continue;
        }

        // Supprimer les anciennes indisponibilités Google Calendar
        const { error: deleteError } = await supabase
          .from('availabilities')
          .delete()
          .eq('user_id', instructor.instructor_id)
          .eq('slot_type', 'unavailability')
          .like('reason', '[Google Calendar]%');

        if (deleteError) throw deleteError;

        // Récupérer les événements du calendrier
        const now = new Date();
        const timeMin = now.toISOString();
        const timeMax = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();

        if (!process.env.GOOGLE_CALENDAR_API_KEY) {
          throw new Error('Clé API Google Calendar non configurée');
        }

        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${instructor.calendar_id}/events?` +
          new URLSearchParams({
            key: process.env.GOOGLE_CALENDAR_API_KEY,
            timeMin,
            timeMax,
            singleEvents: 'true',
            orderBy: 'startTime'
          })
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Erreur API Google Calendar: ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const events = data.items || [];

        // Convertir les événements en indisponibilités
        const availabilities = events.map(event => ({
          user_id: instructor.instructor_id,
          start_time: new Date(event.start.dateTime || event.start.date),
          end_time: new Date(event.end.dateTime || event.end.date),
          slot_type: 'unavailability',
          is_recurring: false,
          reason: `[Google Calendar] ${event.summary || 'Indispo'}`,
          club_id: memberData.club_id
        }));

        // Fusionner les indisponibilités qui se chevauchent
        const mergedAvailabilities = mergeOverlappingUnavailabilities(availabilities);

        // Insérer par lots de 50
        const batchSize = 50;
        for (let i = 0; i < mergedAvailabilities.length; i += batchSize) {
          const batch = mergedAvailabilities.slice(i, i + batchSize);
          const { error: batchError } = await supabase
            .from('availabilities')
            .insert(batch);

          if (batchError) throw batchError;
        }

        console.log(`✅ Calendrier synchronisé pour l'instructeur ${instructor.instructor_id}`);
      } catch (err) {
        console.error(`❌ Erreur lors de la synchronisation pour l'instructeur ${instructor.instructor_id}:`, err);
      }
    }

    console.log('✅ Synchronisation des calendriers terminée');
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation des calendriers:', error);
  }
}

// Fonction pour fusionner les indisponibilités qui se chevauchent
function mergeOverlappingUnavailabilities(availabilities) {
  if (availabilities.length === 0) return [];
  
  const sorted = [...availabilities].sort((a, b) => 
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );
  
  const merged = [sorted[0]];
  
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];
    
    if (new Date(current.start_time) <= new Date(last.end_time)) {
      last.end_time = new Date(Math.max(
        new Date(last.end_time).getTime(),
        new Date(current.end_time).getTime()
      ));
      if (current.reason !== last.reason) {
        last.reason = `${last.reason} + ${current.reason}`;
      }
    } else {
      merged.push(current);
    }
  }
  
  return merged;
}

// Cron job pour traiter les notifications en attente
console.log('📧 Configuration du cron job pour les notifications...');
cron.schedule('*/5 * * * *', processNotifications);

// Cron job pour synchroniser les calendriers (toutes les 10 minutes entre 7h et 22h)
console.log('🗓️ Configuration du cron job pour la synchronisation des calendriers...');
cron.schedule('*/10 7-22 * * *', () => {
  const now = new Date();
  const hour = now.getHours();
  
  // Double vérification que nous sommes bien dans la plage horaire souhaitée
  if (hour >= 7 && hour <= 22) {
    console.log(`🗓️ Lancement de la synchronisation planifiée à ${now.toLocaleTimeString('fr-FR')}`);
    syncInstructorCalendars();
  }
});

// Route de test
app.get("/api/hello", (req, res) => {
  console.log("👋 Route /api/hello appelée");
  res.json({ message: "Hello World!" });
});

app.post("/api/create-stripe-session", async (req, res) => {
  try {
    const { amount, userId, entryTypeId, clubId } = req.body;
    console.log('Création session - Body:', { amount, userId, entryTypeId, clubId });
    console.log('Stripe Secret Key:', process.env.STRIPE_SECRET_KEY?.substring(0, 8) + '...');

    if (!clubId) {
      throw new Error('Club ID non fourni');
    }

    // Récupérer l'ID du compte Stripe du club
    const { data: clubData, error: clubError } = await supabase
      .from('clubs')
      .select('stripe_account_id, name, commission_rate')
      .eq('id', clubId)
      .single();

    console.log('Club data:', clubData);
    console.log('Club error:', clubError);

    if (clubError || !clubData?.stripe_account_id) {
      console.error('Erreur club:', clubError);
      console.error('Club data:', clubData);
      throw new Error('Configuration Stripe du club non trouvée');
    }

    console.log('Création session Stripe avec compte:', clubData.stripe_account_id);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Crédit de compte',
              description: `Crédit de compte pour ${clubData.name}`,
            },
            unit_amount: amount * 100,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/accounts?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/accounts?canceled=true`,
      customer_email: req.body.customerEmail,
      metadata: {
        userId,
        entryTypeId,
        amount: amount.toString(),
      },
      payment_intent_data: {
        application_fee_amount: amount * (clubData.commission_rate ? parseFloat(clubData.commission_rate) / 100 : 0.03) * 100,
        transfer_data: {
          destination: clubData.stripe_account_id,
        },
      },
      submit_type: 'pay',
      locale: 'fr',
    });

    console.log('Session créée:', session.id);
    console.log('URLs de redirection:', {
      success: session.success_url,
      cancel: session.cancel_url
    });
    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Erreur détaillée:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route pour l'envoi d'emails
app.post("/api/send-email", async (req, res) => {
  try {
    const { email, subject, content } = req.body;

    if (!email || !subject || !content) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email, subject et content sont requis' 
      });
    }

    const { data: settings } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (!settings) {
      return res.status(500).json({ 
        success: false, 
        error: 'Configuration Mailjet manquante' 
      });
    }

    const mailjetClient = Mailjet.apiConnect(
      settings.mailjet_api_key,
      settings.mailjet_api_secret
    );

    const result = await mailjetClient
      .post('send', { version: 'v3.1' })
      .request({
        Messages: [
          {
            From: {
              Email: settings.sender_email,
              Name: settings.sender_name,
            },
            To: [
              {
                Email: email
              }
            ],
            Subject: subject,
            TextPart: content,
            HTMLPart: content.replace(/\n/g, '<br>')
          }
        ]
      });

    if (result.response.status === 200) {
      res.json({ success: true });
    } else {
      throw new Error('Erreur lors de l\'envoi de l\'email');
    }
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Route pour l'envoi de SMS
app.post("/api/send-sms", async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone et message sont requis' 
      });
    }

    if (!twilioClient) {
      return res.status(500).json({ 
        success: false, 
        error: 'Configuration Twilio manquante' 
      });
    }

    await twilioClient.messages.create({
      body: message,
      to: phone,
      from: process.env.TWILIO_PHONE_NUMBER
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de l\'envoi du SMS:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Route pour créer une session de paiement pour un vol découverte
app.post("/api/create-discovery-session", async (req, res) => {
  console.log("⭐ Début de la requête create-discovery-session");
  console.log("📦 Body complet reçu:", req.body);
  try {
    const { flightId, customerEmail } = req.body;
    console.log("📦 Données extraites:", { flightId, customerEmail });

    if (!flightId) {
      console.log("❌ ID du vol manquant");
      res.status(400).json({
        error: "ID du vol manquant",
        received: { flightId, customerEmail },
      });
      return;
    }

    if (!customerEmail) {
      console.log("⚠️ Email du client manquant");
    }

    console.log("✨ Tentative de création session Stripe pour vol découverte...");
    const successUrl = process.env.FRONTEND_URL 
      ? `${process.env.FRONTEND_URL}/discovery/success?session_id={CHECKOUT_SESSION_ID}&flight_id=${flightId}`
      : `http://localhost:5173/discovery/success?session_id={CHECKOUT_SESSION_ID}&flight_id=${flightId}`;

    const cancelUrl = process.env.FRONTEND_URL 
      ? `${process.env.FRONTEND_URL}/discovery/cancel?flight_id=${flightId}`
      : 'http://localhost:5173/discovery/cancel?flight_id=${flightId}';

    const sessionConfig = {
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Vol découverte",
              description: "Réservation d'un vol découverte",
            },
            unit_amount: 9900, // 99€ en centimes
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        flightId,
        type: 'discovery_flight'
      }
    };

    // Ajouter l'email seulement s'il est présent
    if (customerEmail) {
      sessionConfig.customer_email = customerEmail;
      console.log("📧 Ajout de l'email client:", customerEmail);
    }

    console.log("📦 Configuration finale de la session:", JSON.stringify(sessionConfig, null, 2));
    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log("✅ Session Stripe créée:", {
      sessionId: session.id,
      customerEmail: session.customer_email,
      customer_details: session.customer_details
    });
    res.json({ sessionId: session.id });
  } catch (error) {
    console.error("❌ Erreur lors de la création de la session:", error);
    res.status(500).json({ error: error.message });
  }
});

// Route pour créer une session de paiement Stripe pour un vol découverte
app.post("/api/stripe/create-discovery-flight-session", async (req, res) => {
  try {
    const { flightId, customerEmail, customerPhone } = req.body;
    console.log('Création de session pour le vol:', flightId);

    // Récupérer les détails du vol depuis Supabase
    const { data: flight, error: flightError } = await supabase
      .from('discovery_flights')
      .select('*, clubs:club_id(name)')
      .eq('id', flightId)
      .single();

    if (flightError) {
      console.error('Erreur lors de la récupération du vol:', flightError);
      return res.status(404).json({ error: 'Vol non trouvé' });
    }

    if (!flight) {
      console.error('Vol non trouvé:', flightId);
      return res.status(404).json({ error: 'Vol non trouvé' });
    }

    console.log('Vol trouvé:', {
      id: flight.id,
      club_id: flight.club_id,
      club_name: flight.clubs?.name
    });

    // Vérifier si le prix existe déjà
    const { data: existingPrice, error: checkError } = await supabase
      .from('discovery_flight_prices')
      .select('*')
      .eq('club_id', flight.club_id);

    console.log('Prix existants pour le club:', existingPrice);

    // Si le prix n'existe pas, créer un prix par défaut
    if (!existingPrice || existingPrice.length === 0) {
      console.log('Création d\'un prix par défaut pour le club:', flight.club_id);
      const { data: newPrice, error: insertError } = await supabase
        .from('discovery_flight_prices')
        .insert([
          { club_id: flight.club_id, price: 199.99 } // Prix par défaut
        ])
        .select()
        .single();

      if (insertError) {
        console.error('Erreur lors de la création du prix par défaut:', insertError);
        return res.status(500).json({ error: 'Erreur lors de la création du prix' });
      }

      console.log('Prix par défaut créé:', newPrice);
      priceData = newPrice;
    } else {
      priceData = existingPrice[0];
    }

    console.log('Prix final utilisé:', priceData);

    // Créer la session de paiement Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Vol découverte',
              description: `Vol découverte - ${flight.clubs?.name || 'Réservation'}`,
            },
            unit_amount: Math.round(priceData.price * 100), // Convertir en centimes et s'assurer que c'est un entier
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/discovery-flight/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/discovery-flight/cancel?flight_id=${flightId}`,
      customer_email: customerEmail,
      metadata: {
        flightId,
        customerPhone,
      },
    });

    res.json({ id: session.id });
  } catch (error) {
    console.error('Erreur lors de la création de la session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route pour déclencher manuellement la synchronisation des calendriers
app.post("/api/sync-calendars", async (req, res) => {
  try {
    await syncInstructorCalendars();
    res.json({ success: true, message: 'Synchronisation des calendriers terminée' });
  } catch (error) {
    console.error('Erreur lors de la synchronisation manuelle:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la synchronisation des calendriers',
      error: error.message 
    });
  }
});

// Route pour la synchronisation SMILE
app.post('/api/smile/sync', async (req, res) => {
  try {
    // Récupérer les pilotes avec des identifiants SMILE
    console.log('Récupération des pilotes avec des identifiants SMILE...');
    const { data: credentials, error: credError } = await supabase
      .from('ffa_credentials')
      .select(`
        id,
        user_id,
        ffa_login,
        ffa_password,
        users!ffa_credentials_user_id_fkey1 (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .not('ffa_login', 'is', null)
      .not('ffa_password', 'is', null);

    if (credError) {
      console.error('Erreur lors de la récupération des credentials:', {
        error: credError,
        code: credError.code,
        details: credError.details,
        hint: credError.hint,
        message: credError.message
      });
      throw credError;
    }

    console.log('Nombre de pilotes à traiter:', credentials.length);
    
    const results = [];
    for (const cred of credentials) {
      try {
        console.log('Traitement du pilote avec login:', cred.ffa_login);
        
        // Extraire les données du pilote depuis SMILE
        const pilotData = await extractPilotData(cred.ffa_login, cred.ffa_password, cred.user_id);
        console.log('Données extraites:', JSON.stringify(pilotData, null, 2));
        
        // Gestion de la qualification SEP(T)
        console.log('Début de la gestion de la qualification SEP(T)...');
        console.log('Données qualificationsPilote complètes:', pilotData.qualificationsPilote);
        
        // Accéder aux données SEP(T) avec la bonne structure
        const sepTData = {
          checked: pilotData.qualificationsPilote?.qcSepT === true,
          validiteJusquau: pilotData.qualificationsPilote?.validiteSepT
        };
        console.log('Données SEP(T) extraites:', sepTData);
        
        // Vérifier si la case SEP(T) est cochée
        const isSepTChecked = sepTData.checked;
        console.log('La case SEP(T) est-elle cochée ?', isSepTChecked);

        if (isSepTChecked && sepTData.validiteJusquau) {
          console.log('Préparation des données pour la qualification SEP(T)...');
          console.log('Date de validité SEP(T):', sepTData.validiteJusquau);
          
          const sepTQualificationData = {
            pilot_id: cred.user_id,
            qualification_type_id: 'a6587ca1-053e-4bbd-9463-29da5b5ed235',
            obtained_at: new Date().toISOString(),
            expires_at: parseSmileDate(sepTData.validiteJusquau).toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          console.log('Données de qualification SEP(T) préparées:', sepTQualificationData);
          console.log('Tentative d\'insertion/mise à jour dans la base de données...');
          
          const { data: sepTQualificationResult, error: sepTQualificationError } = await supabase
            .from('pilot_qualifications')
            .upsert(sepTQualificationData, {
              onConflict: 'pilot_id,qualification_type_id',
              ignoreDuplicates: false
            });

          if (sepTQualificationError) {
            console.error('Erreur lors de la mise à jour de la qualification SEP(T):', sepTQualificationError);
            console.error('Détails de l\'erreur:', JSON.stringify(sepTQualificationError, null, 2));
          } else {
            console.log('Qualification SEP(T) mise à jour avec succès');
            console.log('Résultat:', sepTQualificationResult);
          }
        }

        // Gestion de la qualification SEP(H)
        if (pilotData.qualificationsPilote?.qcSepHydro && pilotData.qualificationsPilote?.validiteSepHydro) {
          console.log('Préparation des données pour la qualification SEP(H)...');
          console.log('Date de validité SEP(H):', pilotData.qualificationsPilote.validiteSepHydro);
          
          const sepHQualificationData = {
            pilot_id: cred.user_id,
            qualification_type_id: '20d6a61d-919e-4be3-b361-fbded2be9e39',
            obtained_at: new Date().toISOString(),
            expires_at: parseSmileDate(pilotData.qualificationsPilote.validiteSepHydro).toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          console.log('Données de qualification SEP(H) préparées:', sepHQualificationData);
          
          const { data: sepHQualificationResult, error: sepHQualificationError } = await supabase
            .from('pilot_qualifications')
            .upsert(sepHQualificationData, {
              onConflict: 'pilot_id,qualification_type_id',
              ignoreDuplicates: false
            });

          if (sepHQualificationError) {
            console.error('Erreur lors de la mise à jour de la qualification SEP(H):', sepHQualificationError);
          } else {
            console.log('Qualification SEP(H) mise à jour avec succès');
            console.log('Résultat:', sepHQualificationResult);
          }
        }

        // Gestion de la qualification Nuit
        if (pilotData.qualificationsPilote?.nuit) {
          console.log('Préparation des données pour la qualification Nuit...');
          
          const nuitQualificationData = {
            pilot_id: cred.user_id,
            qualification_type_id: 'b248341d-a837-420d-bd86-c169f3f2a195',
            obtained_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          console.log('Données de qualification Nuit préparées:', nuitQualificationData);
          
          const { data: nuitQualificationResult, error: nuitQualificationError } = await supabase
            .from('pilot_qualifications')
            .upsert(nuitQualificationData, {
              onConflict: 'pilot_id,qualification_type_id',
              ignoreDuplicates: false
            });

          if (nuitQualificationError) {
            console.error('Erreur lors de la mise à jour de la qualification Nuit:', nuitQualificationError);
          } else {
            console.log('Qualification Nuit mise à jour avec succès');
            console.log('Résultat:', nuitQualificationResult);
          }
        }

        // Gestion de la qualification Voltige
        if (pilotData.qualificationsPilote?.voltige) {
          console.log('Préparation des données pour la qualification Voltige...');
          
          const voltigeQualificationData = {
            pilot_id: cred.user_id,
            qualification_type_id: '5c1703da-349a-43e0-90b3-86c288b45d98',
            obtained_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          console.log('Données de qualification Voltige préparées:', voltigeQualificationData);
          
          const { data: voltigeQualificationResult, error: voltigeQualificationError } = await supabase
            .from('pilot_qualifications')
            .upsert(voltigeQualificationData, {
              onConflict: 'pilot_id,qualification_type_id',
              ignoreDuplicates: false
            });

          if (voltigeQualificationError) {
            console.error('Erreur lors de la mise à jour de la qualification Voltige:', voltigeQualificationError);
          } else {
            console.log('Qualification Voltige mise à jour avec succès');
            console.log('Résultat:', voltigeQualificationResult);
          }
        }

        // Gestion de la qualification Montagne Roues
        if (pilotData.qualificationsPilote?.montagneRoues) {
          console.log('Préparation des données pour la qualification Montagne Roues...');
          
          const montagneRouesQualificationData = {
            pilot_id: cred.user_id,
            qualification_type_id: '8161e84f-5a3d-4c23-978c-e893fc698a31',
            obtained_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          console.log('Données de qualification Montagne Roues préparées:', montagneRouesQualificationData);
          
          const { data: montagneRouesQualificationResult, error: montagneRouesQualificationError } = await supabase
            .from('pilot_qualifications')
            .upsert(montagneRouesQualificationData, {
              onConflict: 'pilot_id,qualification_type_id',
              ignoreDuplicates: false
            });

          if (montagneRouesQualificationError) {
            console.error('Erreur lors de la mise à jour de la qualification Montagne Roues:', montagneRouesQualificationError);
          } else {
            console.log('Qualification Montagne Roues mise à jour avec succès');
            console.log('Résultat:', montagneRouesQualificationResult);
          }
        }

        // Gestion de la qualification Montagne Skis
        if (pilotData.qualificationsPilote?.montagneSkis) {
          console.log('Préparation des données pour la qualification Montagne Skis...');
          
          const montagneSkisQualificationData = {
            pilot_id: cred.user_id,
            qualification_type_id: '292683cd-4532-48dd-8b0f-0882cac2dc85',
            obtained_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          console.log('Données de qualification Montagne Skis préparées:', montagneSkisQualificationData);
          
          const { data: montagneSkisQualificationResult, error: montagneSkisQualificationError } = await supabase
            .from('pilot_qualifications')
            .upsert(montagneSkisQualificationData, {
              onConflict: 'pilot_id,qualification_type_id',
              ignoreDuplicates: false
            });

          if (montagneSkisQualificationError) {
            console.error('Erreur lors de la mise à jour de la qualification Montagne Skis:', montagneSkisQualificationError);
          } else {
            console.log('Qualification Montagne Skis mise à jour avec succès');
            console.log('Résultat:', montagneSkisQualificationResult);
          }
        }

        results.push({
          user_id: cred.user_id,
          success: true,
          data: pilotData
        });

      } catch (error) {
        console.error('Erreur pour le pilote', cred.ffa_login, ':', {
          error: error,
          stack: error.stack,
          message: error.message
        });
        results.push({
          user_id: cred.user_id,
          success: false,
          error: error.message
        });
      }
    }
    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Erreur de synchronisation SMILE:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Fonction pour parser une date au format DD/MM/YYYY
function parseSmileDate(dateStr) {
  const [day, month, year] = dateStr.split('/');
  return new Date(year, month - 1, day);
}

// Fonction pour extraire les données SMILE
async function extractPilotData(login, password, user_id) {
  let browser;
  try {
    console.log('Démarrage du navigateur...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--dns-servers=8.8.8.8,8.8.4.4'  // Add Google's DNS servers
      ]
    });

    const page = await browser.newPage();
    
    // Navigation vers la page de connexion SMILE
    console.log('Navigation vers SMILE...');
    await page.goto('https://smile.ff-aero.fr/SMILE_II/', { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });

    // Connexion
    console.log('Remplissage des champs de connexion...');
    await page.type('#A2', login);
    await page.type('#A4', password);

    console.log('Tentative de connexion...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }),
      page.click('#A10')
    ]);

    // Attendre que la page soit chargée
    await page.evaluate(() => new Promise(r => setTimeout(r, 2000)));
    
    // Extraire les données de licence
    console.log('Extraction des données de licence...');
    const data = {
      user_id: user_id,
      informationsPersonnelles: {}
    };

    // Attendre que la page soit complètement chargée
    await page.waitForSelector('input');

    const fields = {
      numeroLicence: '#A515',
      titre: '#A518',
      nom: '#A519',
      prenom: '#A517',
      dateNaissance: '#A520',
      lieuNaissance: '#A519',
      adresse: '#A528',
      codePostal: '#A540',
      ville: '#A539',
      pays: '#A586',
      profession: '#A587',
      email: '#A590',
      telephoneMobile: '#A583',
      telephoneDomicile: '#A584',
      telephoneTravail: '#A585',
    };


    
    for (const [key, selector] of Object.entries(fields)) {
      try {
        const value = await page.$eval(selector, el => {
          if (el.tagName === 'SELECT') {
            return el.options[el.selectedIndex].text;
          }
          return el.value;
        });
        if (value) {
          data.informationsPersonnelles[key] = value;
        }
      } catch (error) {
        console.log(`Impossible de trouver l'élément ${key} avec le sélecteur ${selector}`);
      }
    }

    // Qualifications pilote
    data.qualificationsPilote = {
      ppl: {
        numero: await page.$eval('#A594', el => el.value),
        validiteJusquau: await page.$eval('#A430', el => el.value)
      },
      medical: {
        validiteJusquau: await page.$eval('#A428', el => el.value),
        classe2ValiditeJusquau: await page.$eval('#A533', el => el.value),
        questionnaireRempli: await isChecked(page, 'input[type="checkbox"]', { useContains: true, containsText: 'questionnaire de santé SPORT' })
      }
    };

    // Extraire les données SEP(T)
    const qcSepTElement = await page.$('#A442_1');
    const validiteSepTElement = await page.$('#A430');
    
    const qcSepT = qcSepTElement ? await page.evaluate(el => el.checked, qcSepTElement) : false;
    const validiteSepT = validiteSepTElement ? await page.evaluate(el => el.value, validiteSepTElement) : null;
    
    console.log('Extraction SEP(T) - Case à cocher:', qcSepT);
    console.log('Extraction SEP(T) - Date de validité:', validiteSepT);

    // SEP(H)
    const qcSepHydroElement = await page.$('#A435_1');
    const validiteSepHydroElement = await page.$('#A428');
    const qcSepHydro = qcSepHydroElement ? await page.evaluate(el => el.checked, qcSepHydroElement) : false;
    const validiteSepHydro = validiteSepHydroElement ? await page.evaluate(el => el.value, validiteSepHydroElement) : null;
    console.log('Extraction SEP(H) - Case à cocher:', qcSepHydro);
    console.log('Extraction SEP(H) - Date de validité:', validiteSepHydro);

    // Nuit
    const nuitElement = await page.$('#A549_1');
    const nuit = nuitElement ? await page.evaluate(el => el.checked, nuitElement) : false;
    console.log('Extraction Nuit - Case à cocher:', nuit);

    // Voltige
    const voltigeElement = await page.$('#A546_1');
    const voltige = voltigeElement ? await page.evaluate(el => el.checked, voltigeElement) : false;
    console.log('Extraction Voltige - Case à cocher:', voltige);

    // Montagne roues
    const montagneRouesElement = await page.$('#A541_1');
    const montagneRoues = montagneRouesElement ? await page.evaluate(el => el.checked, montagneRouesElement) : false;
    console.log('Extraction Montagne Roues - Case à cocher:', montagneRoues);

    // Montagne skis
    const montagneSkisElement = await page.$('#A448_1');
    const montagneSkis = montagneSkisElement ? await page.evaluate(el => el.checked, montagneSkisElement) : false;
    console.log('Extraction Montagne Skis - Case à cocher:', montagneSkis);

    // Ajouter les données à l'objet qualificationsPilote
    data.qualificationsPilote.qcSepT = qcSepT;
    data.qualificationsPilote.validiteSepT = validiteSepT;
    data.qualificationsPilote.qcSepHydro = qcSepHydro;
    data.qualificationsPilote.validiteSepHydro = validiteSepHydro;
    data.qualificationsPilote.nuit = nuit;
    data.qualificationsPilote.voltige = voltige;
    data.qualificationsPilote.montagneRoues = montagneRoues;
    data.qualificationsPilote.montagneSkis = montagneSkis;

    // Récupérer l'historique des cotisations
    console.log('Navigation vers l\'onglet historique...');
    await page.click('#A5_3');
    await page.waitForSelector('#A88_TB');

    // Extraction des données du tableau d'historique
    console.log('Extraction des données de cotisations...');
    data.historiqueCotisations = [];
    const rows = await page.$$('#A88_TB tr[id^="A88_"]');

    for (const row of rows) {
      try {
        const annee = await row.$eval('td[id^="c"][id$="-A89"] div div', el => el.textContent.trim());
        const club = await row.$eval('td[id^="c"][id$="-A90"] div div', el => el.textContent.trim());
        const montant = await row.$eval('td[id^="c"][id$="-A81"] div div', el => el.textContent.trim());
        
        if (annee && club && montant) {
          data.historiqueCotisations.push({
            annee,
            club,
            montant
          });
        }
      } catch (error) {
        // Ignorer les lignes vides ou mal formatées
        continue;
      }
    }

    return data;
  } catch (error) {
    console.error('Erreur lors de l\'extraction des données:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Fonction pour vérifier si une case est cochée
async function isChecked(page, selector, options = {}) {
  try {
    return await page.evaluate((sel, opts) => {
      let elements;
      if (opts.useContains) {
        // Recherche par texte contenu
        const allCheckboxes = document.querySelectorAll('input[type="checkbox"]');
        elements = Array.from(allCheckboxes).filter(el => {
          const parentText = el.parentElement?.textContent?.trim() || '';
          return parentText.includes(opts.containsText || '');
        });
      } else {
        elements = document.querySelectorAll(sel);
      }
      for (const el of elements) {
        if (el.checked) return true;
      }
      return false;
    }, selector, options);
  } catch (error) {
    console.log(`Erreur lors de la vérification de la case à cocher ${selector}:`, error.message);
    return false;
  }
}

// Fonction pour générer un token unique pour un instructeur
async function generateInstructorCalendarToken(instructorId) {
  const token = crypto.randomBytes(32).toString('hex');
  
  // Récupérer tous les calendriers de l'instructeur
  const { data: calendars, error: fetchError } = await supabase
    .from('instructor_calendars')
    .select('*')
    .eq('instructor_id', instructorId);

  if (fetchError) throw fetchError;
  
  if (!calendars || calendars.length === 0) {
    throw new Error('Aucun calendrier trouvé pour cet instructeur');
  }

  // Mettre à jour le token pour le premier calendrier
  const { error: updateError } = await supabase
    .from('instructor_calendars')
    .update({ calendar_token: token })
    .eq('id', calendars[0].id);
    
  if (updateError) throw updateError;
  
  return token;
}

// Fonction pour générer le flux iCal des réservations
async function generateInstructorCalendar(instructorId) {
  console.log(`📅 Début de la génération du calendrier ICS pour l'instructeur ${instructorId}`);
  const calendar = icalGenerator.default({
    name: '4fly - Réservations',
    timezone: 'Europe/Paris'
  });
  console.log('✨ Calendrier ICS initialisé avec les paramètres de base');

  try {
    // Récupérer les réservations de l'instructeur
    console.log('🔍 Recherche des réservations pour l\'instructeur...');
    const { data: reservations, error: reservationsError } = await supabase
      .from('reservations')
      .select(`
        *,
        users!reservations_user_id_fkey (
          id,
          first_name,
          last_name
        ),
        aircraft (
          registration
        )
      `)
      .eq('instructor_id', instructorId)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true });

    if (reservationsError) {
      console.error('❌ Erreur lors de la récupération des réservations:', reservationsError);
      throw reservationsError;
    }

    console.log(`📊 ${reservations?.length || 0} réservations trouvées`);

    if (reservations) {
      for (const reservation of reservations) {
        console.log(`➕ Ajout de la réservation ${reservation.id} au calendrier`);
        const studentName = reservation.users ? 
          `${reservation.users.first_name} ${reservation.users.last_name}` : 
          'Étudiant inconnu';
        const aircraft = reservation.aircraft ? 
          `${reservation.aircraft.registration}` : 
          'Avion non spécifié';

        calendar.createEvent({
          start: new Date(reservation.start_time),
          end: new Date(reservation.end_time),
          summary: `Vol avec ${studentName}`,
          description: `Avion: ${aircraft}\nType de vol: ${reservation.flight_type || 'Non spécifié'}`,
          location: reservation.location || '4fly'
        });
      }
    }

    console.log('✅ Génération du calendrier ICS terminée avec succès');
    return calendar;
  } catch (error) {
    console.error('❌ Erreur lors de la génération du calendrier:', error);
    throw error;
  }
}

// Route pour obtenir l'URL du calendrier
app.post("/api/instructor-calendar/get-url", async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).json({ error: 'ID instructeur requis' });
    }

    // Générer ou récupérer le token existant
    let { data: instructor } = await supabase
      .from('instructor_calendars')
      .select('calendar_token')
      .eq('instructor_id', user_id)
      .single();

    let token = instructor?.calendar_token;
    if (!token) {
      token = await generateInstructorCalendarToken(user_id);
    }

    const calendarUrl = `${process.env.BACKEND_URL}/api/instructor-calendar/${token}/reservations.ics`;
    
    return res.json({
      success: true,
      calendar_url: calendarUrl,
      google_calendar_url: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(calendarUrl)}`
    });
  } catch (error) {
    console.error('Erreur lors de la génération de l\'URL du calendrier:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour accéder au flux iCal
app.get("/api/instructor-calendar/:token/reservations.ics", async (req, res) => {
  try {
    const { token } = req.params;

    // Vérifier le token et récupérer l'ID de l'instructeur
    const { data: instructor, error } = await supabase
      .from('instructor_calendars')
      .select('instructor_id')
      .eq('calendar_token', token)
      .single();

    if (error || !instructor) {
      return res.status(404).json({ error: 'Calendrier non trouvé' });
    }

    const calendar = await generateInstructorCalendar(instructor.instructor_id);
    res.type('text/calendar');
    return res.send(calendar.toString());
  } catch (error) {
    console.error('Erreur lors de la génération du calendrier:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour récupérer les données météo
app.get('/api/weather', async (req, res) => {
  try {
    const { bbox, date } = req.query;
    
    // Headers complets comme un navigateur
    const headers = {
      'accept': '*/*',
      'accept-language': 'en-US,en;q=0.9',
      'cache-control': 'no-cache',
      'pragma': 'no-cache',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
    };

    // Construire l'URL exactement comme dans l'exemple
    const url = `https://aviationweather.gov/api/data/metar?format=json&taf=true&bbox=${encodeURIComponent(bbox)}&date=${encodeURIComponent(date)}`;
    
    console.log('Requête météo:', {
      url,
      headers,
      params: { bbox, date }
    });

    const response = await fetch(url, { 
      headers,
      method: 'GET'
    });

    // Récupérer les headers de la réponse
    const responseHeaders = Object.fromEntries(response.headers.entries());
    console.log('Headers de réponse:', responseHeaders);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erreur API météo:', {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        error: errorText
      });
      throw new Error(`Erreur ${response.status}: ${errorText}`);
    }

    // Récupérer et logger le contenu brut avant de le parser
    const rawText = await response.text();
    console.log('Réponse brute:', rawText);

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      console.error('Erreur de parsing JSON:', e);
      throw new Error('La réponse n\'est pas un JSON valide');
    }

    console.log('Données météo reçues:', {
      count: Array.isArray(data) ? data.length : 0,
      sample: Array.isArray(data) && data.length > 0 ? data[0] : null,
      type: typeof data
    });

    // Vérifier si la réponse est un tableau vide ou un objet vide
    if (Array.isArray(data) && data.length === 0) {
      console.warn('Tableau vide reçu de l\'API météo');
    } else if (typeof data === 'object' && Object.keys(data).length === 0) {
      console.warn('Objet vide reçu de l\'API météo');
    }

    res.json(data);
  } catch (error) {
    console.error('Erreur météo complète:', error);
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Route pour créer une session de compte Stripe
app.post("/account_session", async (req, res) => {
  try {
    const { account } = req.body;

    const accountSession = await stripe.accountSessions.create({
      account: account,
      components: {
        account_onboarding: { enabled: true },
      },
    });

    res.json({
      client_secret: accountSession.client_secret,
    });
  } catch (error) {
    console.error(
      "Une erreur s'est produite lors de l'appel à l'API Stripe pour créer une session de compte",
      error
    );
    res.status(500);
    res.send({ error: error.message });
  }
});

// Route pour créer un compte Stripe
app.post("/account", async (req, res) => {
  try {
    const account = await stripe.accounts.create({
      controller: {
        stripe_dashboard: {
          type: "express",
        },
        fees: {
          payer: "application"
        },
        losses: {
          payments: "application"
        },
      },
    });

    res.json({
      account: account.id,
    });
  } catch (error) {
    console.error(
      "Une erreur s'est produite lors de l'appel à l'API Stripe pour créer un compte",
      error
    );
    res.status(500);
    res.send({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  
  // Synchronisation immédiate des calendriers au démarrage
  console.log('🗓️ Lancement de la synchronisation initiale des calendriers...');
  await syncInstructorCalendars();
});
