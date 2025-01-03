import { supabase } from './supabase';

interface PublicKeyCredentialCreationOptionsJSON {
  challenge: string;
  rp: {
    name: string;
    id: string;
  };
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  pubKeyCredParams: {
    type: 'public-key';
    alg: number;
  }[];
  timeout: number;
  attestation: AttestationConveyancePreference;
  authenticatorSelection: AuthenticatorSelectionCriteria;
}

interface AuthenticatorSelectionCriteria {
  authenticatorAttachment?: AuthenticatorAttachment;
  requireResidentKey?: boolean;
  residentKey?: ResidentKeyRequirement;
  userVerification?: UserVerificationRequirement;
}

const generateRegistrationOptions = (userId: string, userName: string) => {
  console.log('Génération des options d\'enregistrement pour:', { userId, userName });
  
  // Générer un challenge aléatoire
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  
  const options = {
    challenge: Array.from(challenge),
    rp: {
      name: 'FlyManager',
      id: window.location.hostname
    },
    user: {
      id: userId,
      name: userName,
      displayName: userName
    },
    pubKeyCredParams: [
      {
        type: 'public-key' as const,
        alg: -7 // ES256
      },
      {
        type: 'public-key' as const,
        alg: -257 // RS256
      }
    ],
    timeout: 60000,
    attestation: 'direct' as const,
    authenticatorSelection: {
      authenticatorAttachment: 'platform' as const,
      requireResidentKey: false,
      userVerification: 'preferred' as const
    }
  };

  console.log('Options d\'enregistrement générées:', options);
  return options;
};

export const webAuthnService = {
  async registerBiometric(userId: string, userName: string) {
    console.log('Début de l\'enregistrement biométrique pour:', { userId, userName });
    try {
      // 1. Générer les options d'enregistrement
      const options = generateRegistrationOptions(userId, userName);
      console.log('Options générées:', options);

      // 2. Créer les credentials avec l'API WebAuthn
      console.log('Demande de création des credentials...');
      const publicKeyCredential = await navigator.credentials.create({
        publicKey: {
          ...options,
          challenge: new Uint8Array(options.challenge),
          user: {
            ...options.user,
            id: Uint8Array.from(options.user.id, c => c.charCodeAt(0))
          }
        }
      });

      console.log('Credentials créés:', publicKeyCredential);

      if (!publicKeyCredential) {
        console.error('Échec de la création des credentials: aucun credential retourné');
        throw new Error('Échec de la création des credentials');
      }

      // 3. Envoyer la réponse au serveur
      console.log('Envoi des credentials à Supabase...');
      const credentialData = {
        user_id: userId,
        credential_id: btoa(String.fromCharCode(...new Uint8Array(publicKeyCredential.rawId))),
        public_key: JSON.stringify(publicKeyCredential),
        created_at: new Date().toISOString()
      };
      console.log('Données à envoyer:', credentialData);

      const { error: credentialsError } = await supabase
        .from('webauthn_credentials')
        .insert(credentialData);

      if (credentialsError) {
        console.error('Erreur Supabase lors de l\'enregistrement:', credentialsError);
        throw new Error('Erreur lors de l\'enregistrement des credentials');
      }

      console.log('Enregistrement biométrique réussi');
      return true;
    } catch (error) {
      console.error('Erreur détaillée lors de l\'enregistrement biométrique:', error);
      if (error instanceof Error) {
        console.error('Message d\'erreur:', error.message);
        console.error('Stack trace:', error.stack);
      }
      throw error;
    }
  },

  async authenticateWithBiometric(userId: string) {
    console.log('Début de l\'authentification biométrique pour userId:', userId);
    try {
      // 1. Obtenir les credentials existants
      console.log('Récupération des credentials depuis Supabase...');
      const { data: credentialsData, error: credentialsError } = await supabase
        .from('webauthn_credentials')
        .select('credential_id')
        .eq('user_id', userId);

      console.log('Résultat de la requête credentials:', { credentialsData, credentialsError });

      if (credentialsError) {
        console.error('Erreur Supabase lors de la récupération des credentials:', credentialsError);
        throw new Error('Erreur lors de la récupération des credentials');
      }

      if (!credentialsData?.length) {
        console.error('Aucun credential trouvé pour l\'utilisateur');
        throw new Error('Aucun credential biométrique trouvé');
      }

      // 2. Préparer les options pour l'authentification
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const options: PublicKeyCredentialRequestOptions = {
        challenge,
        allowCredentials: credentialsData.map(cred => {
          console.log('Préparation du credential:', cred);
          return {
            type: 'public-key',
            id: Uint8Array.from(atob(cred.credential_id), c => c.charCodeAt(0)),
            transports: ['internal', 'hybrid'] as AuthenticatorTransport[]
          };
        }),
        timeout: 60000,
        userVerification: 'preferred'
      };

      console.log('Options d\'authentification préparées:', options);

      // 3. Demander l'authentification biométrique
      console.log('Demande d\'authentification biométrique...');
      const assertion = await navigator.credentials.get({
        publicKey: options
      });

      console.log('Résultat de l\'authentification:', assertion);

      if (!assertion) {
        console.error('Échec de l\'authentification: aucune assertion retournée');
        throw new Error('Échec de l\'authentification biométrique');
      }

      // 4. Mettre à jour la date de dernière utilisation
      console.log('Mise à jour de la date de dernière utilisation...');
      const { error: updateError } = await supabase
        .from('webauthn_credentials')
        .update({ last_used_at: new Date().toISOString() })
        .eq('credential_id', btoa(String.fromCharCode(...new Uint8Array(assertion.rawId))));

      if (updateError) {
        console.error('Erreur lors de la mise à jour de la date d\'utilisation:', updateError);
      }

      console.log('Authentification biométrique réussie');
      return true;
    } catch (error) {
      console.error('Erreur détaillée lors de l\'authentification biométrique:', error);
      if (error instanceof Error) {
        console.error('Message d\'erreur:', error.message);
        console.error('Stack trace:', error.stack);
      }
      throw error;
    }
  }
};
