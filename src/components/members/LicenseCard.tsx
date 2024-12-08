import React, { useEffect, useState } from 'react';
import { Shield, AlertTriangle, Calendar, Plus, ExternalLink } from 'lucide-react';
import { format, isFuture, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { hasAnyGroup } from "../../lib/permissions";

interface LicenseCardProps {
  userId: string;
  onAddLicense?: () => void;
  onEditLicense?: (license: License) => void;
}

export interface License {
  id: string;
  type: string;
  number?: string;
  valid_until?: string;
  document_url?: string;
}

const LICENSE_TYPES = {
  STUDENT: 'Élève Pilote',
  PPL: 'PPL',
  CPL: 'CPL',
  ATPL: 'ATPL',
  ULM: 'ULM',
  LAPL: 'LAPL',
};

const LICENSES_WITH_EXPIRY = ['PPL', 'CPL', 'ATPL', 'LAPL'];
const LICENSES_WITH_NUMBER = ['PPL', 'CPL', 'ATPL', 'LAPL', 'ULM'];

const LicenseCard: React.FC<LicenseCardProps> = ({ 
  userId, 
  onAddLicense,
  onEditLicense,
}) => {
  const { user: currentUser } = useAuth();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const channel = supabase
      .channel('pilot_licenses_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pilot_licenses',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadLicenses();
        }
      )
      .subscribe();

    loadLicenses();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadLicenses = async () => {
    try {
      const { data, error } = await supabase
        .from('pilot_licenses')
        .select('*')
        .eq('user_id', userId)
        .order('type');

      if (error) throw error;
      setLicenses(data || []);
    } catch (error) {
      console.error('Error loading licenses:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse bg-white rounded-xl h-48"></div>;
  }

  const canManageLicenses = hasAnyGroup(currentUser, ['ADMIN', 'INSTRUCTOR']);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5 text-slate-600" />
          Licences
        </h2>
        {canManageLicenses && onAddLicense && (
          <button
            onClick={onAddLicense}
            className="flex items-center justify-center w-8 h-8 text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-full transition-colors"
            title="Ajouter une licence"
          >
            <Plus className="h-5 w-5" />
          </button>
        )}
      </div>

      {licenses.length > 0 ? (
        <div className="space-y-4">
          {licenses.map((license) => {
            const requiresExpiry = LICENSES_WITH_EXPIRY.includes(license.type);
            const requiresNumber = LICENSES_WITH_NUMBER.includes(license.type);
            const isValid = !requiresExpiry || !license.valid_until || isFuture(new Date(license.valid_until));
            const isExpiringSoon = requiresExpiry && license.valid_until && 
              isFuture(new Date(license.valid_until)) && 
              !isFuture(addMonths(new Date(), 3));

            return (
              <div 
                key={license.id}
                className="p-4 border rounded-lg hover:bg-slate-50 transition-colors relative group"
              >
                {canManageLicenses && onEditLicense && (
                  <button
                    onClick={() => onEditLicense(license)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-sky-600 hover:text-sky-700"
                  >
                    Modifier
                  </button>
                )}

                <div className="space-y-2">
                  <div>
                    <div className="text-sm text-slate-600">Type de licence</div>
                    <div className="font-medium text-slate-900">
                      {LICENSE_TYPES[license.type as keyof typeof LICENSE_TYPES]}
                    </div>
                  </div>

                  {requiresNumber && license.number && (
                    <div>
                      <div className="text-sm text-slate-600">Numéro</div>
                      <div className="font-medium text-slate-900">{license.number}</div>
                    </div>
                  )}

                  {requiresExpiry && license.valid_until && (
                    <div>
                      <div className="text-sm text-slate-600">Validité</div>
                      <div className="font-medium text-slate-900">
                        {format(new Date(license.valid_until), 'dd MMMM yyyy', { locale: fr })}
                      </div>
                    </div>
                  )}

                  {license.document_url && (
                    <div>
                      <a
                        href={license.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-sky-600 hover:text-sky-700"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Voir le document
                      </a>
                    </div>
                  )}

                  {isExpiringSoon && (
                    <div className="flex items-center gap-2 p-2 bg-amber-50 text-amber-800 rounded text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Expire bientôt</span>
                    </div>
                  )}

                  {!isValid && requiresExpiry && (
                    <div className="flex items-center gap-2 p-2 bg-red-50 text-red-800 rounded text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Expirée</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-800 rounded-lg text-sm">
          <AlertTriangle className="h-4 w-4" />
          <span>Aucune licence enregistrée</span>
        </div>
      )}
    </div>
  );
};

export default LicenseCard;