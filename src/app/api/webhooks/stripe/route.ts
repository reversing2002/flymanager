import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const body = await request.text();
  const signature = headers().get("stripe-signature")!;

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const { userId, accountEntryId } = session.metadata!;

      const supabase = createRouteHandlerClient({ cookies });

      // Valider l'entrée de compte
      await supabase
        .from("account_entries")
        .update({ is_validated: true })
        .eq("id", accountEntryId);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Erreur webhook Stripe:", err);
    return NextResponse.json({ error: "Erreur webhook" }, { status: 400 });
  }
}
