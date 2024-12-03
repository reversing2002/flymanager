const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

router.post('/create-discovery-session', async (req, res) => {
  try {
    const { flightId } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Vol découverte',
              description: 'Réservation d\'un vol découverte',
            },
            unit_amount: 9900, // 99€ en centimes
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/discovery/success?session_id={CHECKOUT_SESSION_ID}&flight_id=${flightId}`,
      cancel_url: `${process.env.FRONTEND_URL}/discovery/cancel`,
      metadata: {
        flightId,
        type: 'discovery_flight'
      }
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating Stripe session:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook Error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    if (session.metadata.type === 'discovery_flight') {
      try {
        // Mettre à jour le statut du vol découverte
        const { data, error } = await supabase
          .from('discovery_flights')
          .update({ 
            status: 'PAID',
            stripe_session_id: session.id,
            payment_status: 'completed',
            payment_amount: session.amount_total
          })
          .eq('id', session.metadata.flightId);

        if (error) throw error;
      } catch (error) {
        console.error('Error updating discovery flight:', error);
        return res.status(500).json({ error: error.message });
      }
    }
  }

  res.json({ received: true });
});

module.exports = router;
