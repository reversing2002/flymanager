const express = require("express");
const Stripe = require("stripe");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require('path');
const twilio = require('twilio');
const Mailjet = require('node-mailjet');
const { createClient } = require('@supabase/supabase-js');

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

              // Create account entry for the discovery flight
              /*
              const { error: entryError } = await supabase
                .from('account_entries')
                .insert([{
                  user_id: session.customer_details.email,  // Using email as temporary user_id
                  entry_type_id: session.metadata.flightId, // Using flightId as entry_type_id
                  payment_method: 'CARD',
                  is_validated: true,
                  is_club_paid: false,
                  amount: session.amount_total / 100, // Convert from cents to euros
                  date: new Date().toISOString(),
                  description: 'Paiement vol découverte via Stripe'
                }])
                .select()
                .single();

              if (entryError) {
                console.error('Error creating account entry for discovery flight:', entryError);
              }
              */

              // Créer la conversation et envoyer le message de confirmation
              await getOrCreateConversation(session.metadata.flightId, session.metadata.customerPhone);
              await sendConfirmationMessage(session.metadata.flightId, flightData);
              
              console.log('Message de confirmation envoyé avec succès');
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

// Fonction utilitaire pour créer ou récupérer une conversation
async function getOrCreateConversation(flightId, customerPhone) {
  try {
    // Créer un identifiant unique pour la conversation
    const conversationUniqueName = `flight_${flightId}`;
    
    let conversation;
    try {
      // Essayer de récupérer une conversation existante
      conversation = await twilioClient.conversations.v1.conversations(conversationUniqueName).fetch();
    } catch (error) {
      // Si la conversation n'existe pas, en créer une nouvelle
      conversation = await twilioClient.conversations.v1.conversations.create({
        uniqueName: conversationUniqueName,
        friendlyName: `Vol Découverte #${flightId}`
      });

      // Ajouter le numéro du client à la conversation
      await conversation.participants.create({
        identity: customerPhone,
        messagingBinding: {
          address: customerPhone,
          proxyAddress: process.env.TWILIO_PHONE_NUMBER
        }
      });

      // Ajouter le numéro de service comme participant
      await conversation.participants.create({
        identity: 'service',
        messagingBinding: {
          address: process.env.TWILIO_PHONE_NUMBER,
          proxyAddress: customerPhone
        }
      });
    }
    
    return conversation;
  } catch (error) {
    console.error('Erreur lors de la création/récupération de la conversation:', error);
    throw error;
  }
}

// Fonction pour envoyer le message de confirmation
async function sendConfirmationMessage(flightId, flightDetails) {
  try {
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

    const conversation = await twilioClient.conversations.v1
      .conversations(`flight_${flightId}`)
      .fetch();

    await twilioClient.conversations.v1
      .conversations(`flight_${flightId}`)
      .messages
      .create({
        author: 'service',
        body: message
      });

    // Mettre à jour le statut du vol dans Supabase
    const { error } = await supabase
      .from('discovery_flights')
      .update({ status: 'CONFIRMED' })
      .eq('id', flightId);

    if (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
    }

  } catch (error) {
    console.error('Erreur lors de l\'envoi du message de confirmation:', error);
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
          identity: `customer_${customerPhone}`,
          messagingBinding: {
            address: customerPhone,
            proxyAddress: process.env.TWILIO_PHONE_NUMBER
          }
        });

      // Ajouter le numéro de service comme participant
      await twilioClient.conversations.v1
        .conversations(conversation.sid)
        .participants
        .create({
          identity: 'service',
          messagingBinding: {
            address: process.env.TWILIO_PHONE_NUMBER,
            proxyAddress: customerPhone
          }
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

// Configuration Mailjet
const mailjet = process.env.MAILJET_API_KEY && process.env.MAILJET_API_SECRET
  ? new Mailjet({
      apiKey: process.env.MAILJET_API_KEY,
      apiSecret: process.env.MAILJET_API_SECRET
    })
  : null;

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

    if (!mailjet) {
      return res.status(500).json({ 
        success: false, 
        error: 'Configuration Mailjet manquante' 
      });
    }

    const result = await mailjet
      .post('send', { version: 'v3.1' })
      .request({
        Messages: [
          {
            From: {
              Email: process.env.MAILJET_FROM_EMAIL,
              Name: process.env.MAILJET_FROM_NAME || "Vol Découverte"
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
