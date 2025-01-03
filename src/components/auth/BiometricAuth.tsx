import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { webAuthnService } from '../../lib/webauthn';
import { Button } from '../../components/ui/button';
import { Fingerprint } from 'lucide-react';

interface BiometricAuthProps {
  onSuccess?: () => void;
}

export const BiometricAuth = ({ onSuccess }: BiometricAuthProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleEnrollBiometric = async () => {
    if (!user) return;

    setLoading(true);
    try {
      await webAuthnService.registerBiometric(
        user.id,
        `${user.firstName} ${user.lastName}`
      );
      toast.success('Authentification biométrique activée avec succès');
      onSuccess?.();
    } catch (error) {
      console.error('Erreur lors de l\'activation de la biométrie:', error);
      toast.error('Erreur lors de l\'activation de la biométrie');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricAuth = async () => {
    if (!user) return;

    setLoading(true);
    try {
      await webAuthnService.authenticateWithBiometric(user.id);
      toast.success('Authentification biométrique réussie');
      onSuccess?.();
    } catch (error) {
      console.error('Erreur lors de l\'authentification biométrique:', error);
      toast.error('Échec de l\'authentification biométrique');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={handleEnrollBiometric}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2"
        variant="outline"
      >
        <Fingerprint className="w-5 h-5" />
        Activer l'authentification biométrique
      </Button>

      <Button
        onClick={handleBiometricAuth}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2"
        variant="outline"
      >
        <Fingerprint className="w-5 h-5" />
        Se connecter avec la biométrie
      </Button>
    </div>
  );
};
