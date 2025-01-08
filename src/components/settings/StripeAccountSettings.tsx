import React, { useState } from "react";
import { useStripeConnect } from "../../hooks/useStripeConnect";
import {
  ConnectAccountOnboarding,
  ConnectComponentsProvider,
} from "@stripe/react-connect-js";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

export default function StripeAccountSettings() {
  const [accountCreatePending, setAccountCreatePending] = useState(false);
  const [onboardingExited, setOnboardingExited] = useState(false);
  const [connectedAccountId, setConnectedAccountId] = useState<string>();
  const stripeConnectInstance = useStripeConnect(connectedAccountId);

  const handleCreateAccount = async () => {
    setAccountCreatePending(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/account`, {
        method: "POST",
      });
      const json = await response.json();

      if (json.account) {
        setConnectedAccountId(json.account);
        toast.success("Compte Stripe créé avec succès");
      } else if (json.error) {
        toast.error("Erreur lors de la création du compte Stripe");
      }
    } catch (error) {
      toast.error("Erreur lors de la création du compte Stripe");
    } finally {
      setAccountCreatePending(false);
    }
  };

  const handleOnboardingExit = () => {
    setOnboardingExited(true);
    toast.success("Configuration du compte terminée");
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Gestion des Cartes Bancaires</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!connectedAccountId && (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Configurez votre compte Stripe pour gérer vos paiements par carte bancaire.
            </p>
            {!accountCreatePending && (
              <Button
                onClick={handleCreateAccount}
                className="w-full sm:w-auto"
              >
                Configurer mon compte Stripe
              </Button>
            )}
            {accountCreatePending && (
              <Button disabled className="w-full sm:w-auto">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Création du compte...
              </Button>
            )}
          </div>
        )}

        {stripeConnectInstance && (
          <ConnectComponentsProvider connectInstance={stripeConnectInstance}>
            <ConnectAccountOnboarding
              onExit={handleOnboardingExit}
            />
          </ConnectComponentsProvider>
        )}

        {(connectedAccountId || onboardingExited) && (
          <div className="rounded-lg bg-muted p-4">
            {connectedAccountId && (
              <p className="text-sm">
                ID de compte : <code className="font-mono">{connectedAccountId}</code>
              </p>
            )}
            {onboardingExited && (
              <p className="text-sm text-muted-foreground">
                Configuration du compte terminée
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
