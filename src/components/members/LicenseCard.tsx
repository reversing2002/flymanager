import React, { useEffect, useState } from 'react';
import { Shield, AlertTriangle } from 'lucide-react';
import { format, isFuture, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';

interface License {
  id: string;
  type: string;
  number: string;
  valid_until: string;
}

interface LicenseCardProps {
  userId: string;
}

const LicenseCard: React.FC<LicenseCardProps> = ({ userId }) => {
  const [license, setLicense] = useState<License | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLicense = async () => {
      try {
        const { data, error } = await supabase
          .from('pilot_licenses')
          .select('*')
          .eq('user_id', userId);

        if (error) throw error;
        
        // If we have licenses, use the first one
        if (data && data.length > 0) {
          setLicense(data[0]);
        }
      } catch (error) {
        console.error('Error loading license:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLicense();
  }, [userId]);

  if (loading) {
    return <div className="animate-pulse bg-white rounded-xl h-48"></div>;
  }

  // If no license exists, don't render anything
  if (!license) {
    return null;
  }

  const isLicenseValid = license.valid_until && isFuture(new Date(license.valid_until));
  const isExpiringSoon = license.valid_until && 
    isFuture(new Date(license.valid_until)) && 
    !isFuture(addMonths(new Date(), 3));

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Shield className="h-5 w-5 text-slate-600" />
        Licence
      </h2>

      <div className="space-y-4">
        <div>
          <div className="text-sm text-slate-600">Type de licence</div>
          <div className="font-medium text-slate-900">{license.type}</div>
        </div>

        <div>
          <div className="text-sm text-slate-600">Numéro de licence</div>
          <div className="font-medium text-slate-900">{license.number}</div>
        </div>

        <div>
          <div className="text-sm text-slate-600">Date d'expiration</div>
          <div className="font-medium text-slate-900">
            {format(new Date(license.valid_until), 'dd MMMM yyyy', { locale: fr })}
          </div>
        </div>

        {isExpiringSoon && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-800 rounded-lg text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>Licence expire bientôt</span>
          </div>
        )}

        {!isLicenseValid && (
          <div className="flex items-center gap-2 p-3 bg-red-50 text-red-800 rounded-lg text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>Licence expirée</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LicenseCard;