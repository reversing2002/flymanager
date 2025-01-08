import { useState, useEffect } from "react";
import { X, AlertTriangle, CreditCard, Euro } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { supabase } from "../../lib/supabase";
import { toast } from "react-hot-toast";
import type { AccountEntryType } from "../../types/accounts";
import { useAuth } from "../../contexts/AuthContext";
import { motion } from "framer-motion";

// Charger Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface Props {
  onClose: () => void;
  onSuccess?: () => void;
}

const AMOUNTS = [200, 500, 1000];

export default function CreditAccountModal({ onClose, onSuccess }: Props) {
  const [selectedAmount, setSelectedAmount] = useState<number>(500);  // Présélection de 500€
  const [customAmount, setCustomAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [accountFundingType, setAccountFundingType] = useState<AccountEntryType | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchAccountFundingType = async () => {
      const { data, error } = await supabase
        .from('account_entry_types')
        .select('*')
        .eq('code', 'ACCOUNT_FUNDING')
        .single();

      if (error) {
        console.error('Erreur lors de la récupération du type de compte:', error);
        toast.error('Erreur lors de la récupération du type de compte');
        return;
      }

      setAccountFundingType(data);
    };

    fetchAccountFundingType();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('User:', user);
    console.log('AccountFundingType:', accountFundingType);
    console.log('Amount:', selectedAmount || customAmount);

    const amount = selectedAmount || parseFloat(customAmount);

    if (!user?.id) {
      toast.error("Utilisateur non connecté");
      return;
    }
    if (!user?.club?.id) {
      toast.error("Club non trouvé");
      return;
    }
    if (!accountFundingType?.id) {
      toast.error("Type de compte non défini");
      return;
    }
    if (!amount || amount <= 0) {
      toast.error("Montant invalide");
      return;
    }

    setLoading(true);

    try {
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe non initialisé');
      }

      console.log('Envoi de la requête avec:', {
        amount: amount,
        userId: user.id,
        entryTypeId: accountFundingType.id,
        clubId: user.club.id,
      });

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/create-stripe-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amount,
          userId: user.id,
          entryTypeId: accountFundingType.id,
          clubId: user.club.id,
        }),
      });

      console.log('Réponse du serveur:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Erreur de réponse:', errorData);
        throw new Error(errorData.error || 'Erreur lors de la création de la session');
      }

      const { sessionId } = await response.json();
      console.log('Session ID reçu:', sessionId);

      const { error: redirectError } = await stripe.redirectToCheckout({ sessionId });

      if (redirectError) {
        console.error('Erreur de redirection:', redirectError);
        throw redirectError;
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error détaillée:", error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Une erreur s'est produite lors de la création de la session de paiement");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Créditer votre compte</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <p className="text-gray-600 mb-4">Choisissez un montant ou entrez un montant personnalisé</p>
            <div className="grid grid-cols-3 gap-3">
              {AMOUNTS.map((amount) => (
                <motion.button
                  key={amount}
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSelectedAmount(amount);
                    setCustomAmount("");
                  }}
                  className={`relative p-4 text-center rounded-xl border-2 transition-all duration-200 ${
                    selectedAmount === amount
                      ? "border-primary-500 bg-primary-50 text-primary-700 shadow-md"
                      : "border-gray-200 hover:border-primary-300 hover:bg-gray-50"
                  }`}
                >
                  <span className="text-xl font-semibold">{amount}€</span>
                </motion.button>
              ))}
            </div>

            <div className="relative mt-6">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Euro className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="number"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setSelectedAmount(null);
                }}
                placeholder="Montant personnalisé"
                className={`block w-full rounded-xl border-2 pl-10 py-3 focus:ring-2 focus:ring-offset-2 transition-all duration-200 ${
                  customAmount
                    ? "border-primary-500 ring-primary-200"
                    : "border-gray-200 focus:border-primary-500 focus:ring-primary-200"
                }`}
                min="1"
                step="1"
              />
            </div>
          </div>

          <div className="mt-8 mb-4">
            <motion.button
              type="submit"
              disabled={loading || (!selectedAmount && !customAmount)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full flex items-center justify-center py-4 px-6 border border-transparent rounded-xl text-white text-xl font-semibold shadow-lg transition-all duration-200 ${
                loading || (!selectedAmount && !customAmount)
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 hover:shadow-xl"
              }`}
            >
              {loading ? (
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 border-t-2 border-b-2 border-white rounded-full animate-spin" />
                  <span>Chargement...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <CreditCard className="h-6 w-6" />
                  <span>Ajouter {selectedAmount || customAmount}€</span>
                </div>
              )}
            </motion.button>
          </div>

          <p className="text-sm text-center text-gray-500">
            Paiement sécurisé par Stripe
          </p>
        </form>
      </motion.div>
    </motion.div>
  );
}
