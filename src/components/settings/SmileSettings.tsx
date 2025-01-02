import React, { useState } from 'react';
import { Card, Typography, Button, CircularProgress, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { toast } from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

const SmileSettings = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();

  // Récupérer la liste des pilotes avec des identifiants SMILE
  const { data: pilotsWithSmile, isLoading } = useQuery({
    queryKey: ['pilotsWithSmile'],
    queryFn: async () => {
      const { data: credentials, error: credentialsError } = await supabase
        .from('ffa_credentials')
        .select(`
          user_id,
          ffa_login,
          last_sync_at,
          users:user_id (
            first_name,
            last_name,
            pilot_licenses (
              license_type:license_type_id (
                name,
                description
              ),
              number,
              expiry_date
            ),
            pilot_qualifications (
              qualification_type:qualification_type_id (
                name,
                description
              ),
              expiry_date
            )
          )
        `)
        .not('ffa_login', 'is', null);
      
      if (credentialsError) throw credentialsError;
      return credentials;
    }
  });

  // Mutation pour lancer la synchronisation
  const syncMutation = useMutation({
    mutationFn: async () => {
      // l'adresse du serveur Node.js est dans .env
      const urlserveur = import.meta.env.VITE_API_URL;
      const response = await fetch(urlserveur + '/api/smile/sync', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Erreur lors de la synchronisation');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success('Synchronisation SMILE terminée avec succès');
      queryClient.invalidateQueries(['pilotsWithSmile']);
    },
    onError: (error) => {
      toast.error(`Erreur de synchronisation: ${error.message}`);
    }
  });

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncMutation.mutateAsync();
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return <CircularProgress />;
  }

  return (
    <Card className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <Typography variant="h5" component="h2">
          Synchronisation SMILE
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSync}
          disabled={isSyncing}
          startIcon={isSyncing ? <CircularProgress size={20} /> : null}
        >
          {isSyncing ? 'Synchronisation en cours...' : 'Synchroniser maintenant'}
        </Button>
      </div>

      <Typography variant="body1" className="text-gray-600">
        {pilotsWithSmile?.length || 0} pilote(s) configuré(s) avec des identifiants SMILE
      </Typography>

      <div className="space-y-4">
        {pilotsWithSmile?.map((pilot) => (
          <Accordion key={pilot.user_id}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <div className="flex justify-between items-center w-full">
                <Typography>
                  {pilot.users.first_name} {pilot.users.last_name}
                </Typography>
                <Typography className="text-sm text-gray-500">
                  Dernière synchro : {pilot.last_sync_at ? new Date(pilot.last_sync_at).toLocaleString() : 'Jamais'}
                </Typography>
              </div>
            </AccordionSummary>
            <AccordionDetails>
              <div className="space-y-4">
                {/* Licences */}
                <div>
                  <Typography variant="subtitle1" className="font-semibold">
                    Licences
                  </Typography>
                  <div className="space-y-2">
                    {pilot.users.pilot_licenses?.map((license) => (
                      <div key={license.number} className="flex justify-between items-center">
                        <div>
                          <Typography variant="body2">
                            {license.license_type.name} - {license.number}
                          </Typography>
                          {license.license_type.description && (
                            <Typography variant="caption" className="text-gray-500">
                              {license.license_type.description}
                            </Typography>
                          )}
                        </div>
                        {license.expiry_date && (
                          <Typography variant="caption" className={`
                            ${new Date(license.expiry_date) < new Date() ? 'text-red-500' : 'text-gray-500'}
                          `}>
                            Expire le {new Date(license.expiry_date).toLocaleDateString()}
                          </Typography>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Qualifications */}
                <div>
                  <Typography variant="subtitle1" className="font-semibold">
                    Qualifications
                  </Typography>
                  <div className="space-y-2">
                    {pilot.users.pilot_qualifications?.map((qual, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <div>
                          <Typography variant="body2">
                            {qual.qualification_type.name}
                          </Typography>
                          {qual.qualification_type.description && (
                            <Typography variant="caption" className="text-gray-500">
                              {qual.qualification_type.description}
                            </Typography>
                          )}
                        </div>
                        {qual.expiry_date && (
                          <Typography variant="caption" className={`
                            ${new Date(qual.expiry_date) < new Date() ? 'text-red-500' : 'text-gray-500'}
                          `}>
                            Expire le {new Date(qual.expiry_date).toLocaleDateString()}
                          </Typography>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </AccordionDetails>
          </Accordion>
        ))}
      </div>
    </Card>
  );
};

export default SmileSettings;
