import { useState, useEffect } from "react";
import { loadConnectAndInitialize } from "@stripe/connect-js";

export const useStripeConnect = (stripe_account_id: string) => {
  const [stripeConnectInstance, setStripeConnectInstance] = useState<any>();

  useEffect(() => {
    if (stripe_account_id) {
      const fetchClientSecret = async () => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/account_session`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            account: stripe_account_id,
          }),
        });

        if (!response.ok) {
          const { error } = await response.json();
          throw new Error(`Une erreur s'est produite: ${error}`);
        }
        
        const { client_secret: clientSecret } = await response.json();
        return clientSecret;
      };

      setStripeConnectInstance(
        loadConnectAndInitialize({
          publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
          fetchClientSecret,
          appearance: {
            overlays: "dialog",
            variables: {
              colorPrimary: "#635BFF",
            },
          },
        })
      );
    }
  }, [stripe_account_id]);

  return stripeConnectInstance;
};

export default useStripeConnect;
