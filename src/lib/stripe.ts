import { loadStripe } from "@stripe/stripe-js";

// Initialize Stripe with public key
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLIC_KEY || 
  "pk_test_51M4MGHATJFXCdMjoIpPFnd7LkQePPOcSGAOZUlhh70wGFetUVQlvxYB7KqaTABP91s0wIinKe8ZEnv5H0K4UwFI900qELly5kX"
);

// Types for Stripe sessions
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

export { stripePromise };