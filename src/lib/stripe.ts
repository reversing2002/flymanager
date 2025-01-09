import { loadStripe } from "@stripe/stripe-js";

// Initialize Stripe with public key
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 
  "pk_test_51M4MGHATJFXCdMjoIpPFnd7LkQePPOcSGAOZUlhh70wGFetUVQlvxYB7KqaTABP91s0wIinKe8ZEnv5H0K4UwFI900qELly5kX"
);

// Types for Stripe sessions
interface AccountCreditData {
  amount: number;
  userId: string;
  entryTypeId: string;
  clubId: string;
  partnerId?: string;
  commissionRate?: number;
}

interface DiscoveryFlightData {
  flightId: string;
  customerEmail: string;
  customerPhone: string;
}

// Utility functions for Stripe
export const formatStripeAmount = (amount: number): number => {
  // Convert amount to cents for Stripe
  return Math.round(amount * 100);
};

export const formatDisplayAmount = (amount: number): string => {
  // Convert amount from cents to euros for display
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount / 100);
};

// Function to create a Stripe session
export const createStripeSession = async (
  data: AccountCreditData | DiscoveryFlightData
): Promise<string> => {
  try {
    // Determine which endpoint to use based on the data structure
    const isDiscoveryFlight = 'flightId' in data;
    const endpoint = isDiscoveryFlight
      ? `${import.meta.env.VITE_API_URL}/api/stripe/create-discovery-flight-session`
      : `${import.meta.env.VITE_API_URL}/api/create-stripe-session`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Erreur lors de la création de la session de paiement");
    }

    const responseData = await response.json();
    
    // Handle different response formats
    const sessionId = responseData.sessionId || responseData.id;
    if (!sessionId) {
      throw new Error("Session ID manquant dans la réponse du serveur");
    }

    return sessionId;
  } catch (error) {
    console.error("Erreur lors de la création de la session:", error);
    throw error;
  }
};

// Function to redirect to Stripe Checkout
export const redirectToCheckout = async (sessionId: string): Promise<void> => {
  const stripe = await stripePromise;
  if (!stripe) {
    throw new Error('Stripe non initialisé');
  }
  
  const { error } = await stripe.redirectToCheckout({ sessionId });
  if (error) {
    console.error('Erreur lors de la redirection vers Stripe:', error);
    throw error;
  }
};

export { stripePromise };