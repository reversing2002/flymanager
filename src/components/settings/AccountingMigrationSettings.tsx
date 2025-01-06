import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { hasAnyGroup } from '../../lib/permissions';
import { supabase } from '../../lib/supabase';
import {
  Paper,
  Typography,
  Button,
  LinearProgress,
  Grid,
  Box,
  Alert,
  AlertTitle
} from '@mui/material';
import { toast } from 'react-hot-toast';

interface MigrationStats {
  totalEntries: number;
  processedEntries: number;
  createdAccounts: number;
  createdJournalEntries: number;
  errors: string[];
  currentStep: string;
}

const AccountingMigrationSettings = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<MigrationStats>({
    totalEntries: 0,
    processedEntries: 0,
    createdAccounts: 0,
    createdJournalEntries: 0,
    errors: [],
    currentStep: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  // Vérifier les permissions
  if (!hasAnyGroup(user, ['ADMIN'])) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        <AlertTitle>Accès refusé</AlertTitle>
        Vous n'avez pas les permissions nécessaires pour accéder à cette page.
      </Alert>
    );
  }

  // Charger les statistiques initiales
  useEffect(() => {
    const loadStats = async () => {
      setIsLoading(true);
      try {
        const { count } = await supabase
          .from('account_entries')
          .select('*, account_entry_types!inner(*)', { count: 'exact' })
          .eq('is_validated', true)
          .neq('account_entry_types.code', 'BALANCE_RESET');

        setStats(prev => ({
          ...prev,
          totalEntries: count || 0
        }));
      } catch (error) {
        toast.error("Erreur lors du chargement des statistiques");
      }
      setIsLoading(false);
    };

    loadStats();
  }, []);

  // Fonction pour créer ou récupérer un compte
  const getOrCreateAccount = async (
    code: string,
    name: string,
    accountType: string,
    type: string,
    clubId: string
  ) => {
    try {
      // Vérifier si le compte existe déjà
      const { data: existingAccounts } = await supabase
        .from('accounts')
        .select('id')
        .eq('code', code)
        .eq('club_id', clubId)
        .limit(1);

      if (existingAccounts && existingAccounts.length > 0) {
        return existingAccounts[0].id;
      }

      // Créer le compte s'il n'existe pas
      const { data: newAccount, error } = await supabase
        .from('accounts')
        .insert({
          code,
          name,
          account_type: accountType,
          type,
          club_id: clubId,
          created_at: new Date(),
          updated_at: new Date()
        })
        .select('id')
        .single();

      if (error) throw error;
      
      setStats(prev => ({
        ...prev,
        createdAccounts: prev.createdAccounts + 1
      }));

      return newAccount.id;
    } catch (error) {
      throw new Error(`Erreur lors de la création du compte ${code}: ${error.message}`);
    }
  };

  // Fonction pour migrer une entrée
  const migrateEntry = async (entry: any) => {
    try {
      setStats(prev => ({
        ...prev,
        currentStep: `Migration de l'entrée ${entry.id}`
      }));

      // 1. Créer ou récupérer le compte pilote
      const { data: userData } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', entry.user_id)
        .single();

      const pilotName = userData 
        ? `${userData.first_name} ${userData.last_name}`
        : `Utilisateur ${entry.user_id}`;

      const pilotAccountId = await getOrCreateAccount(
        `455-${entry.user_id}`,
        `Compte pilote ${pilotName}`,
        'USER_ACCOUNT',
        'USER',
        entry.club_id
      );

      // 2. Créer ou récupérer le compte opposé
      let oppositeAccountCode: string;
      let oppositeAccountName: string;
      let oppositeAccountType: string;
      let oppositeAccountCategory: string;

      if (entry.amount >= 0) {
        // Montant positif : crédit du compte pilote
        if (entry.account_entry_types.code === 'CREDIT' || entry.account_entry_types.code === 'ACCOUNT_FUNDING') {
          // Cas spécial : crédit du compte par le pilote (via Stripe ou autre)
          oppositeAccountCode = '467PILOT';
          oppositeAccountName = 'Compte bancaire pilotes';
          oppositeAccountType = 'ASSET';
          oppositeAccountCategory = 'THIRD_PARTY';
        } else {
          // Autres cas positifs : compte de trésorerie du club
          oppositeAccountCode = entry.payment_method === 'CASH' ? '530CAISSE' : '512BANQUE';
          oppositeAccountName = entry.payment_method === 'CASH' ? 'Caisse' : 'Banque';
          oppositeAccountType = 'ASSET';
          oppositeAccountCategory = 'CASH';
        }
      } else {
        // Montant négatif : compte de produit
        switch (entry.account_entry_types.code) {
          case 'FLIGHT':
            oppositeAccountCode = '706VOL';
            oppositeAccountName = 'Produits des vols';
            break;
          case 'ASSURANCE':
            oppositeAccountCode = '616ASSUR';
            oppositeAccountName = 'Assurances';
            break;
          case 'MEMBERSHIP':
            oppositeAccountCode = '756COTIS';
            oppositeAccountName = 'Cotisations';
            break;
          case 'INSTRUCTION':
            oppositeAccountCode = '706INSTR';
            oppositeAccountName = 'Produits instruction';
            break;
          default:
            oppositeAccountCode = '758AUTRES';
            oppositeAccountName = 'Autres produits';
        }
        oppositeAccountType = 'INCOME';
        oppositeAccountCategory = 'REVENUE';
      }

      const oppositeAccountId = await getOrCreateAccount(
        oppositeAccountCode,
        oppositeAccountName,
        oppositeAccountType,
        oppositeAccountCategory,
        entry.club_id
      );

      // 3. Créer l'écriture journal
      const { data: journalEntry, error: jeError } = await supabase
        .from('journal_entries')
        .insert({
          transaction_date: entry.date,
          description: entry.description,
          club_id: entry.club_id
        })
        .select('id')
        .single();

      if (jeError) throw jeError;

      // 4. Créer les lignes d'écriture
      const absoluteAmount = Math.abs(entry.amount);
      const lines = entry.amount >= 0 
        ? [
            // Débit banque/caisse, crédit pilote
            {
              journal_entry_id: journalEntry.id,
              account_id: oppositeAccountId,
              debit_amount: absoluteAmount,
              credit_amount: 0
            },
            {
              journal_entry_id: journalEntry.id,
              account_id: pilotAccountId,
              debit_amount: 0,
              credit_amount: absoluteAmount
            }
          ]
        : [
            // Débit pilote, crédit produit
            {
              journal_entry_id: journalEntry.id,
              account_id: pilotAccountId,
              debit_amount: absoluteAmount,
              credit_amount: 0
            },
            {
              journal_entry_id: journalEntry.id,
              account_id: oppositeAccountId,
              debit_amount: 0,
              credit_amount: absoluteAmount
            }
          ];

      const { error: jelError } = await supabase
        .from('journal_entry_lines')
        .insert(lines);

      if (jelError) throw jelError;

      setStats(prev => ({
        ...prev,
        processedEntries: prev.processedEntries + 1,
        createdJournalEntries: prev.createdJournalEntries + 1
      }));

    } catch (error) {
      setStats(prev => ({
        ...prev,
        errors: [...prev.errors, `Erreur sur l'entrée ${entry.id}: ${error.message}`]
      }));
    }
  };

  // Fonction pour migrer par lots
  const migrateBatch = async () => {
    try {
      const { data: entries, error } = await supabase
        .from('account_entries')
        .select('*, account_entry_types!inner(*)')
        .eq('is_validated', true)
        .neq('account_entry_types.code', 'BALANCE_RESET')
        .order('date', { ascending: false })
        .limit(500);

      if (error) throw error;

      // Traiter les entrées dans l'ordre chronologique
      const sortedEntries = entries?.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      ) || [];

      for (const entry of sortedEntries) {
        await migrateEntry(entry);
      }
    } catch (error) {
      toast.error(`Erreur lors de la migration: ${error.message}`);
    }
  };

  // Nettoyer les tables de destination
  const cleanDestinationTables = async () => {
    try {
      setStats(prev => ({
        ...prev,
        currentStep: 'Nettoyage des tables de destination'
      }));

      // Supprimer d'abord les lignes d'écritures (à cause des contraintes de clé étrangère)
      await supabase
        .from('journal_entry_lines')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      // Supprimer les écritures
      await supabase
        .from('journal_entries')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      // Supprimer les comptes (sauf les comptes système)
      await supabase
        .from('accounts')
        .delete()
        .eq('type', 'USER');

      toast.success('Tables nettoyées avec succès');
    } catch (error) {
      toast.error(`Erreur lors du nettoyage des tables: ${error.message}`);
      throw error;
    }
  };

  // Lancer la migration
  const startMigration = async () => {
    setIsMigrating(true);
    try {
      await cleanDestinationTables();
      
      await migrateBatch();

      toast.success('Migration test terminée (100 premières lignes)');
    } catch (error) {
      toast.error(`Erreur lors de la migration: ${error.message}`);
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Migration Comptable
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Migration des écritures comptables vers le nouveau système
      </Typography>

      <Box sx={{ mt: 4 }}>
        {/* Statistiques */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={3}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Total des entrées
              </Typography>
              <Typography variant="h6">
                {stats.totalEntries}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={3}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Entrées traitées
              </Typography>
              <Typography variant="h6">
                {stats.processedEntries}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={3}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Comptes créés
              </Typography>
              <Typography variant="h6">
                {stats.createdAccounts}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={3}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Écritures journal
              </Typography>
              <Typography variant="h6">
                {stats.createdJournalEntries}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Étape courante */}
        {stats.currentStep && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {stats.currentStep}
          </Typography>
        )}

        {/* Barre de progression */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">Progression</Typography>
            <Typography variant="body2">
              {Math.round((stats.processedEntries / stats.totalEntries) * 100)}%
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate"
            value={(stats.processedEntries / stats.totalEntries) * 100} 
          />
        </Box>

        {/* Bouton de migration */}
        <Button
          variant="contained"
          onClick={startMigration}
          disabled={isMigrating || stats.totalEntries === 0}
          fullWidth
        >
          {isMigrating ? 'Migration en cours...' : 'Démarrer la migration'}
        </Button>

        {/* Liste des erreurs */}
        {stats.errors.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Erreurs ({stats.errors.length})
            </Typography>
            <Paper sx={{ maxHeight: 200, overflow: 'auto', p: 2 }}>
              {stats.errors.map((error, index) => (
                <Typography 
                  key={index} 
                  variant="body2" 
                  color="error" 
                  sx={{ py: 0.5 }}
                >
                  {error}
                </Typography>
              ))}
            </Paper>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default AccountingMigrationSettings;
