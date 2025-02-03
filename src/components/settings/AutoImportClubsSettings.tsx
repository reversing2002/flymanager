import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { importAeroClubs, removeAutoImportedClubs } from '../../scripts/importAeroClubs';
import {
  Button,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Alert,
  Link,
  Box,
  Input,
} from '@mui/material';
import { Upload, Trash2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

interface AutoImportedClub {
  id: string;
  name: string;
  import_date: string;
  website: string;
  user_id: string;
}

const AutoImportClubsSettings = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [autoImportedClubs, setAutoImportedClubs] = useState<AutoImportedClub[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAutoImportedClubs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clubs')
        .select('id, name, import_date, website, user_id')
        .eq('auto_imported', true)
        .order('import_date', { ascending: false });

      if (error) throw error;
      setAutoImportedClubs(data || []);
    } catch (error) {
      console.error('Erreur lors de la récupération des clubs:', error);
      toast.error(t('Erreur lors de la récupération des clubs'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAutoImportedClubs();
  }, []);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      setImportError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Non autorisé : veuillez vous reconnecter');
      }

      const result = await importAeroClubs(file, session.access_token);
      
      if (result.limitReached) {
        toast.success(`Import terminé ! ${result.importedCount} clubs importés (limite atteinte)`);
      } else {
        toast.success(`Import terminé ! ${result.importedCount} clubs importés`);
      }

      if (result.errorCount > 0) {
        setImportError(`${result.errorCount} erreurs lors de l'import. Consultez la console pour plus de détails.`);
        console.log('Détails des erreurs:', result.details?.errors);
      }

      // Afficher les informations de connexion
      if (result.details?.success.length > 0) {
        console.log('Informations de connexion des clubs importés:');
        result.details.success.forEach(({ clubName, email, password }) => {
          console.log(`\nClub: ${clubName}`);
          console.log(`Email: ${email}`);
          console.log(`Mot de passe: ${password}`);
        });
      }

    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
      setImportError(error instanceof Error ? error.message : 'Erreur lors de l\'import');
      toast.error('Erreur lors de l\'import des clubs');
    } finally {
      setImporting(false);
      // Réinitialiser l'input file
      event.target.value = '';
    }
  };

  const handleRemoveAll = async () => {
    if (!window.confirm(t('Êtes-vous sûr de vouloir supprimer tous les clubs auto-importés ?'))) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Non autorisé : veuillez vous reconnecter');
      }

      const result = await removeAutoImportedClubs(session.access_token);
      toast.success(`${result.deletedCount} clubs supprimés avec succès`);
      setAutoImportedClubs([]);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression des clubs');
    }
  };

  const getPublicUrl = (userId: string) => {
    return `${window.location.origin}/club/${userId}`;
  };

  return (
    <div>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">{t('Gestion des clubs auto-importés')}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Input
            type="file"
            inputRef={fileInputRef}
            onChange={handleFileSelect}
            inputProps={{ accept: '.csv' }}
            sx={{ display: 'none' }}
            id="csv-upload"
          />
          <label htmlFor="csv-upload">
            <Button
              variant="contained"
              color="primary"
              component="span"
              startIcon={<Upload />}
              disabled={importing || loading}
            >
              {importing ? t('Importation...') : t('Importer les clubs')}
            </Button>
          </label>
          <Button
            variant="outlined"
            color="error"
            startIcon={<Trash2 />}
            onClick={handleRemoveAll}
            disabled={importing || loading || autoImportedClubs.length === 0}
          >
            {t('Supprimer tous les clubs importés')}
          </Button>
        </Box>
      </Box>

      {(importing || loading) && <LinearProgress sx={{ mb: 2 }} />}

      {autoImportedClubs.length === 0 ? (
        <Alert severity="info">{t('Aucun club auto-importé')}</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('Nom du club')}</TableCell>
                <TableCell>{t('Date d\'import')}</TableCell>
                <TableCell>{t('Site web d\'origine')}</TableCell>
                <TableCell>{t('Site public généré')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {autoImportedClubs.map((club) => (
                <TableRow key={club.id}>
                  <TableCell>{club.name}</TableCell>
                  <TableCell>
                    {new Date(club.import_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {club.website ? (
                      <Link href={club.website} target="_blank" rel="noopener noreferrer">
                        {club.website} <ExternalLink size={16} />
                      </Link>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Link href={getPublicUrl(club.user_id)} target="_blank" rel="noopener noreferrer">
                      {getPublicUrl(club.user_id)} <ExternalLink size={16} />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {importError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {importError}
        </Alert>
      )}
    </div>
  );
};

export default AutoImportClubsSettings;
