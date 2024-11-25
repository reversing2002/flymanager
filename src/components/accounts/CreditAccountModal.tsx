import React, { useState } from "react";
import { X, AlertTriangle, CreditCard } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { supabase } from "../../lib/supabase";
import { toast } from "react-hot-toast";

const stripePromise = loadStripe(
  "pk_test_51M4MGHATJFXCdMjoIpPFnd7LkQePPOcSGAOZUlhh70wGFetUVQlvxYB7KqaTABP91s0wIinKe8ZEnv5H0K4UwFI900qELly5kX"
);

interface CreditAccountModalProps {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const AMOUNTS = [50, 100, 200, 500];

const CreditAccountModal: React.FC<CreditAccountModalProps> = ({
  userId,
  onClose,
  onSuccess,
}) => {
  const [amount, setAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAmountClick = (value: number) => {
    setAmount(value);
    setCustomAmount("");
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || /^\d+$/.test(value)) {
      setCustomAmount(value);
      if (value) {
        setAmount(parseInt(value, 10));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount < 1) return;

    setLoading(true);
    setError(null);

    try {
      console.log("Début de la création du paiement...");

      // Créer une entrée de compte temporaire
      const { data: accountEntry, error: accountError } = await supabase
        .from("account_entries")
        .insert({
          user_id: userId,
          assigned_to_id: userId,
          date: new Date().toISOString(),
          type: "ACCOUNT_FUNDING",
          amount: amount,
          payment_method: "CARD",
          description: `Crédit du compte par carte bancaire`,
          is_validated: false,
        })
        .select()
        .single();

      if (accountError) {
        console.error("Erreur création account_entry:", accountError);
        throw accountError;
      }
      console.log("Account entry créée:", accountEntry);

      // Créer une session de paiement Stripe via l'API Route
      const response = await fetch("/api/create-stripe-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          userId,
          accountEntryId: accountEntry.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la création de la session de paiement");
      }

      const { sessionId } = await response.json();
      console.log("Session Stripe créée:", sessionId);

      // Rediriger vers Stripe Checkout
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error("Stripe non initialisé");
      }

      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId,
      });

      if (stripeError) {
        throw stripeError;
      }
    } catch (err) {
      console.error("Erreur détaillée du paiement:", err);
      setError(
        "Une erreur est survenue lors de la création du paiement. Veuillez réessayer."
      );
      toast.error("Erreur lors de la création du paiement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Créditer mon compte</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-800 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Montant à créditer
            </label>
            <div className="grid grid-cols-2 gap-2">
              {AMOUNTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleAmountClick(value)}
                  className={`p-4 text-center rounded-lg border transition-colors ${
                    amount === value && !customAmount
                      ? "border-sky-500 bg-sky-50 text-sky-700"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {value} €
                </button>
              ))}
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Autre montant
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                  placeholder="Montant personnalisé"
                  className="w-full pl-4 pr-12 py-2 rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                  €
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors disabled:opacity-50"
              disabled={loading || amount < 1}
            >
              <CreditCard className="h-4 w-4" />
              {loading ? "Chargement..." : `Payer ${amount} €`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreditAccountModal;
