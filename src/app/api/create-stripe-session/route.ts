import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, userId, accountEntryId } = body;

    // Créer un produit unique pour cette transaction
    const product = await stripe.products.create({
      name: "Crédit de compte",
      type: "service",
    });

    // Créer un prix pour ce produit
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: amount * 100, // Convertir en centimes
      currency: "eur",
    });

    // Créer la session de paiement
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${request.headers.get("origin")}/accounts?success=true`,
      cancel_url: `${request.headers.get("origin")}/accounts?canceled=true`,
      metadata: {
        userId,
        accountEntryId,
      },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (err) {
    console.error("Erreur création session Stripe:", err);
    return NextResponse.json(
      { error: "Erreur lors de la création de la session" },
      { status: 500 }
    );
  }
}
