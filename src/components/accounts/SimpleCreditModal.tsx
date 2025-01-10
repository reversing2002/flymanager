import { useState } from "react";
import { X, Plus, Euro, Save, CreditCard, Building2, CheckSquare, Wallet } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createStripeSession, redirectToCheckout } from "../../lib/stripe";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../contexts/AuthContext";

const schema = z.object({
  amount: z.number().min(0, "Le montant doit être positif"),
  paymentMethod: z.enum(["CARD", "TRANSFER", "CHECK", "CASH"], {
    required_error: "Veuillez sélectionner un mode de paiement",
  }),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const quickAmounts = [50, 100, 200, 500, 1000];

interface Props {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
  entry?: {
    id: string;
    amount: number;
    payment_method: string;
    description?: string;
  };
}

export default function SimpleCreditModal({ userId, onClose, onSuccess, entry }: Props) {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const [accountFundingType, setAccountFundingType] = useState<string | null>(null);
  const { user } = useAuth();

  // Récupérer l'ID du type ACCOUNT_FUNDING
  useState(() => {
    const fetchAccountFundingType = async () => {
      const { data, error } = await supabase
        .from('account_entry_types')
        .select('id')
        .eq('code', 'ACCOUNT_FUNDING')
        .single();

      if (error) {
        console.error('Erreur lors de la récupération du type de compte:', error);
        return;
      }

      setAccountFundingType(data.id);
    };

    fetchAccountFundingType();
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: entry ? {
      amount: entry.amount,
      paymentMethod: entry.payment_method as "CARD" | "TRANSFER" | "CHECK" | "CASH",
      description: entry.description?.replace(/Crédit du compte (par carte|par virement|par chèque|en espèces)( - )?/, "") || "",
    } : {
      amount: 0,
      paymentMethod: "CARD",
    },
  });

  const currentAmount = watch("amount");
  const currentMethod = watch("paymentMethod");

  const handleStripePayment = async (amount: number) => {
    try {
      if (!accountFundingType) {
        throw new Error("Type de compte non trouvé");
      }

      if (!user?.club?.id) {
        throw new Error("Club non trouvé");
      }

      setLoading(true);
      
      // Créer une session Stripe
      const sessionId = await createStripeSession({
        amount,
        userId,
        entryTypeId: accountFundingType,
        clubId: user.club.id,
      });

      // Rediriger vers Stripe
      await redirectToCheckout(sessionId);
      
      // Le reste sera géré par le webhook Stripe
    } catch (error) {
      console.error("Erreur de paiement:", error);
      toast.error("Erreur lors de la création du paiement");
      setLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      if (data.paymentMethod === "CARD") {
        await handleStripePayment(data.amount);
        return;
      }

      let description = "Crédit du compte";
      if (data.paymentMethod === "CARD") description += " par carte";
      else if (data.paymentMethod === "TRANSFER") description += " par virement";
      else if (data.paymentMethod === "CHECK") description += " par chèque";
      else if (data.paymentMethod === "CASH") description += " en espèces";
      
      if (data.description) description += ` - ${data.description}`;

      if (entry) {
        // Mode édition
        const { error } = await supabase
          .from("account_entries")
          .update({
            amount: data.amount,
            description,
            payment_method: data.paymentMethod,
          })
          .eq("id", entry.id);

        if (error) throw error;
        toast.success("Demande de crédit modifiée avec succès");
      } else {
        // Mode création
        const { error } = await supabase.from("account_entries").insert({
          amount: data.amount,
          description,
          assigned_to_id: userId,
          user_id: userId,
          payment_method: data.paymentMethod,
          entry_type_id: accountFundingType,
          is_validated: false,
          date: new Date().toISOString(),
        });

        if (error) throw error;
        toast.success("Demande de crédit enregistrée avec succès");
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error creating/updating credit entry:", error);
      toast.error("Erreur lors de la création/modification de l'entrée");
    } finally {
      setLoading(false);
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "CARD":
        return <CreditCard className="h-5 w-5" />;
      case "TRANSFER":
        return <Building2 className="h-5 w-5" />;
      case "CHECK":
        return <CheckSquare className="h-5 w-5" />;
      case "CASH":
        return <Wallet className="h-5 w-5" />;
      default:
        return null;
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
          <h2 className="text-2xl font-bold text-gray-900">
            {entry ? "Modifier la demande de crédit" : "Créditer votre compte"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Montants rapides */}
          {!entry && (
            <div className="grid grid-cols-5 gap-2">
              {quickAmounts.map((amount) => (
                <motion.button
                  key={amount}
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setValue("amount", amount)}
                  className={`py-2 px-3 rounded-xl font-medium transition-colors ${
                    currentAmount === amount
                      ? "bg-blue-100 text-blue-700 border-2 border-blue-500"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {amount}€
                </motion.button>
              ))}
            </div>
          )}

          <div className="space-y-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Montant (€)
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Euro className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="number"
                  step="0.01"
                  {...register("amount", { valueAsNumber: true })}
                  className="block w-full pl-10 pr-3 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-200 focus:border-primary-500 transition-all duration-200"
                  placeholder="0.00"
                />
              </div>
              {errors.amount && (
                <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mode de paiement
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["CARD", "TRANSFER", "CHECK", "CASH"] as const).map((method) => (
                  <motion.button
                    key={method}
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setValue("paymentMethod", method)}
                    className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-xl border-2 transition-all duration-200 ${
                      currentMethod === method
                        ? "bg-blue-50 border-blue-500 text-blue-700"
                        : "border-gray-200 hover:border-gray-300 text-gray-700"
                    }`}
                  >
                    {getPaymentMethodIcon(method)}
                    <span className="font-medium">
                      {method === "CARD" && "Carte bancaire"}
                      {method === "TRANSFER" && "Virement"}
                      {method === "CHECK" && "Chèque"}
                      {method === "CASH" && "Espèces"}
                    </span>
                  </motion.button>
                ))}
              </div>
              {errors.paymentMethod && (
                <p className="mt-1 text-sm text-red-600">{errors.paymentMethod.message}</p>
              )}
            </div>

            {currentMethod !== "CARD" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Commentaire (optionnel)
                </label>
                <input
                  type="text"
                  {...register("description")}
                  className="mt-1 block w-full pl-3 pr-3 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-200 focus:border-primary-500 transition-all duration-200"
                  placeholder="Ex: Virement du 10/01/2025"
                />
              </div>
            )}
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`w-full flex items-center justify-center py-4 px-6 border border-transparent rounded-xl text-white text-xl font-semibold shadow-lg transition-all duration-200 ${
              loading
                ? "bg-gray-300 cursor-not-allowed"
                : currentMethod === "CARD"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl"
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
                {entry ? <Save className="h-6 w-6" /> : getPaymentMethodIcon(currentMethod)}
                <span>
                  {entry 
                    ? "Enregistrer les modifications" 
                    : currentMethod === "CARD"
                    ? "Payer par carte"
                    : "Enregistrer la demande"
                  }
                </span>
              </div>
            )}
          </motion.button>

          <p className="text-sm text-center text-gray-500">
            {currentMethod === "CARD" 
              ? "Le paiement sera traité immédiatement"
              : "Votre demande devra être validée par un administrateur"}
          </p>
        </form>
      </motion.div>
    </motion.div>
  );
}
