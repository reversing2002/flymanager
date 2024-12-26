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

const stripe = new Stripe(stripeKey, {
  apiVersion: "2024-11-20.acacia",
});

// Configuration CORS
const allowedOrigins = [
  process.env.FRONTEND_URL,  // URL de production
  'http://localhost:5173',   // URL de développement
];

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
  try {
    console.log('Requête reçue:', req.body);
    const { flightId, customerPhone } = req.body;

    if (!flightId || !customerPhone) {
      console.error('Données manquantes:', { flightId, customerPhone });
      return res.status(400).json({ 
        error: 'flightId et customerPhone sont requis',
        receivedData: req.body 
      });
    }

    const conversationUniqueName = `flight_${flightId}`;
    
    try {
      let conversation = await twilioClient.conversations.v1
        .conversations(conversationUniqueName)
        .fetch();
      
      console.log('Conversation existante trouvée:', conversation.sid);
      return res.json({
        success: true,
        conversationSid: conversation.sid,
        message: 'Conversation existante récupérée'
      });
    } catch (error) {
      console.log('Création d\'une nouvelle conversation...');
      const conversation = await twilioClient.conversations.v1.conversations.create({
        uniqueName: conversationUniqueName,
        friendlyName: `Vol Découverte #${flightId}`
      });

      // Ajouter le numéro du client à la conversation
      await twilioClient.conversations.v1
        .conversations(conversation.sid)
        .participants
        .create({
          'messagingBinding.address': customerPhone,
          'messagingBinding.proxyAddress': process.env.TWILIO_PHONE_NUMBER
        });

      // Ajouter le numéro de service comme participant
      await twilioClient.conversations.v1
        .conversations(conversation.sid)
        .participants
        .create({
          'messagingBinding.address': process.env.TWILIO_PHONE_NUMBER,
          'messagingBinding.proxyAddress': customerPhone
        });

      console.log('Nouvelle conversation créée:', conversation.sid);
      res.json({
        success: true,
        conversationSid: conversation.sid,
        message: 'Nouvelle conversation créée'
      });
    }
  } catch (error) {
    console.error('Erreur lors de la création de la conversation:', error);
    res.status(500).json({ 
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

    // Récupérer la conversation
    const conversation = await twilioClient.conversations.v1
      .conversations(conversationUniqueName)
      .fetch();

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
  console.log('🔄 Démarrage du traitement des notifications...');
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
            user:user_id (
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
            if (!notification.user?.email) {
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

            console.log(`📝 Préparation de l'email pour ${notification.user.email}...`);
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
                      Email: process.env.NODE_ENV === 'production' ? notification.user.email : 'eddy@yopmail.com',
                      Name: `${notification.user.first_name} ${notification.user.last_name}`
                    }
                  ],
                  Subject: template.subject,
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

// Cron job pour traiter les notifications en attente
console.log('📧 Configuration du cron job pour les notifications...');
cron.schedule('*/5 * * * *', processNotifications);

// Traiter les notifications au démarrage du serveur
console.log('📧 Traitement initial des notifications au démarrage...');
processNotifications();

app.use((req, res, next) => {
  if (req.originalUrl === '/api/webhooks/stripe') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// Route de test
app.get("/api/hello", (req, res) => {
  console.log("👋 Route /api/hello appelée");
  res.json({ message: "Hello World!" });
});

app.post("/api/create-stripe-session", async (req, res) => {
  console.log("⭐ Début de la requête create-stripe-session");
  try {
    const { amount, userId, entryTypeId } = req.body;
    console.log("📦 Données reçues:", { amount, userId, entryTypeId });
    console.log(
      "🔑 STRIPE_SECRET_KEY présente:",
      !!process.env.STRIPE_SECRET_KEY
    );

    if (!amount || !userId || !entryTypeId) {
      console.log("❌ Paramètres manquants");
      res.status(400).json({
        error: "Paramètres manquants",
        received: { amount, userId, entryTypeId },
      });
      return;
    }

    console.log("✨ Tentative de création session Stripe...");
    const successUrl = process.env.FRONTEND_URL 
      ? `${process.env.FRONTEND_URL}/accounts?success=true`
      : 'http://localhost:5173/accounts?success=true';

    const cancelUrl = process.env.FRONTEND_URL 
      ? `${process.env.FRONTEND_URL}/accounts?canceled=true`
      : 'http://localhost:5173/accounts?canceled=true';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Crédit de compte",
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        entryTypeId,
        amount,
      },
    });

    console.log("✅ Session créée avec succès:", session.id);
    res.json({ sessionId: session.id });
  } catch (err) {
    console.error("🚨 Erreur détaillée:", err);
    console.error(
      "🚨 Type d'erreur:",
      err instanceof Error ? err.constructor.name : typeof err
    );
    console.error(
      "🚨 Message d'erreur:",
      err instanceof Error ? err.message : String(err)
    );
    res.status(500).json({
      error: "Erreur lors de la création de la session",
      details: err instanceof Error ? err.message : String(err),
    });
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
      ? `${process.env.FRONTEND_URL}/discovery/cancel`
      : 'http://localhost:5173/discovery/cancel';

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
      cancel_url: `${process.env.FRONTEND_URL}/discovery-flight/cancel`,
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});
