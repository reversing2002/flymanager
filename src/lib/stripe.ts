import { loadStripe } from "@stripe/stripe-js";

// Initialiser Stripe avec la clé publique
export const stripePromise = loadStripe(
  "pk_test_51M4MGHATJFXCdMjoIpPFnd7LkQePPOcSGAOZUlhh70wGFetUVQlvxYB7KqaTABP91s0wIinKe8ZEnv5H0K4UwFI900qELly5kX"
);

// Types pour les sessions Stripe
export interface StripeCheckoutSession {
  id: string;
  user_id: string;
  amount: number;
  account_entry_id: string;
  success_url: string;
  cancel_url: string;
  status: "pending" | "completed" | "canceled";
  created_at: string;
  updated_at: string;
}

// Fonctions utilitaires pour Stripe
export const formatStripeAmount = (amount: number): number => {
  // Convertit le montant en centimes pour Stripe
  return Math.round(amount * 100);
};

export const formatDisplayAmount = (amount: number): string => {
  // Convertit le montant de centimes en euros pour l'affichage
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount / 100);
};
