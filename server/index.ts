import express, { Request, Response } from "express";
import Stripe from "stripe";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-10-28.acacia",
});

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

// Route de test
app.get("/api/hello", (req: Request, res: Response) => {
  console.log("👋 Route /api/hello appelée");
  res.json({ message: "Hello World!" });
});

app.post("/api/create-stripe-session", async (req: Request, res: Response) => {
  console.log("⭐ Début de la requête create-stripe-session");
  try {
    const { amount, userId, accountEntryId } = req.body;
    console.log("📦 Données reçues:", { amount, userId, accountEntryId });
    console.log(
      "🔑 STRIPE_SECRET_KEY présente:",
      !!process.env.STRIPE_SECRET_KEY
    );

    if (!amount || !userId || !accountEntryId) {
      console.log("❌ Paramètres manquants");
      res.status(400).json({
        error: "Paramètres manquants",
        received: { amount, userId, accountEntryId },
      });
      return;
    }

    console.log("✨ Tentative de création session Stripe...");
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
      success_url: `http://localhost:5173/accounts?success=true`,
      cancel_url: `http://localhost:5173/accounts?canceled=true`,
      metadata: {
        userId,
        accountEntryId,
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});
