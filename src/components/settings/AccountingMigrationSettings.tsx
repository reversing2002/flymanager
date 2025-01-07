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

  // Fonction pour déterminer le type de compte en fonction du code
  const determineAccountType = (code: string): string => {
    // Les comptes bancaires réels sont des actifs (classe 5)
    if (code.startsWith('512') || code.startsWith('467')) {
      return 'ASSET';
    }

    // Passifs : comptes clients, fournisseurs et dettes (classes 4)
    if (
      code.startsWith('411') || // Comptes clients (pilotes)
      code.startsWith('401') || // Comptes fournisseurs
      code.startsWith('419') || // Avances clients
      code.startsWith('421') || // Personnel - rémunérations dues
      code.startsWith('431') || // Sécurité sociale
      code.startsWith('444') || // État - impôts et taxes
      code.startsWith('455') || // Associés - comptes courants
      code.startsWith('164')    // Emprunts auprès des établissements de crédit
    ) {
      return 'LIABILITY';
    }

    // Produits (classe 7 et assurances payées par les pilotes)
    // Note: Le compte 616 est traité comme un produit car il correspond au paiement 
    // des assurances par les pilotes au club. Plus tard, quand le club paiera 
    // les licences FFA, il faudra créer un nouveau compte (ex: 6161 - Licence FFA)
    // qui sera catégorisé comme une charge (EXPENSE).
    if (code.startsWith('7') || code.startsWith('616')) {
      return 'REVENUE';
    }

    // Charges (classe 6, sauf assurances pilotes)
    // Note: Les comptes 616x sont exclus car ils représentent actuellement
    // uniquement les paiements des pilotes (produits). Les futures charges
    // comme le paiement des licences FFA utiliseront des comptes distincts.
    if (code.startsWith('6') && !code.startsWith('616')) {
      return 'EXPENSE';
    }

    // Par défaut, demander une vérification manuelle
    console.warn(`Type de compte non déterminé automatiquement pour le code ${code}`);
    return 'ASSET';
  };

  // Fonction pour transformer le code du compte pilote en format comptable normalisé
  // Format: 411PIL[Initiale Prénom][Nom]
  // Exemple: "Compte pilote Jean Dupont" -> "411PILJDupont"
  const transformPilotAccountCode = (fullName: string, originalCode: string): string => {
    // Ne transformer que si c'est un compte pilote
    if (!fullName.startsWith('Compte pilote')) {
      return originalCode;
    }

    // Extraire et nettoyer le nom complet
    const namePart = fullName.replace('Compte pilote ', '').trim();
    if (!namePart) {
      console.warn('Nom de pilote invalide:', fullName);
      return originalCode;
    }

    const names = namePart.split(' ').filter(n => n.length > 0);
    if (names.length < 2) {
      console.warn('Format de nom invalide (doit contenir prénom et nom):', fullName);
      return originalCode;
    }
  
    // Préfixe comptable pour les comptes clients (pilotes)
    const COMPTE_CLIENT_PREFIX = "411";
  
    // Cas spécial pour les noms composés (avec tiret ou plusieurs noms)
    if (names.length > 2) {
      const firstName = names[0];
      const lastName = names.slice(1).join('');
      return `${COMPTE_CLIENT_PREFIX}PIL${firstName[0].toUpperCase()}${lastName}`;
    }
  
    // Cas standard : prénom + nom
    const [firstName, lastName] = names;
    return `${COMPTE_CLIENT_PREFIX}PIL${firstName[0].toUpperCase()}${lastName}`;
  };

  // Fonction pour créer ou récupérer un compte
  const getOrCreateAccount = async (
    code: string,
    name: string,
    accountType: string,
    type: string,
    clubId: string,
    userId?: string
  ) => {
    try {
      // Transformer le code si c'est un compte pilote
      const transformedCode = transformPilotAccountCode(name, code);
      
      // Déterminer le bon type de compte
      const correctedAccountType = determineAccountType(transformedCode);

      // Vérifier si le compte existe déjà
      const { data: existingAccounts } = await supabase
        .from('accounts')
        .select('id')
        .eq('code', transformedCode)
        .eq('club_id', clubId)
        .limit(1);

      let accountId: string;

      if (existingAccounts && existingAccounts.length > 0) {
        // Mettre à jour le type de compte si nécessaire
        await supabase
          .from('accounts')
          .update({ account_type: correctedAccountType })
          .eq('id', existingAccounts[0].id);
        
        accountId = existingAccounts[0].id;
      } else {
        // Créer le compte s'il n'existe pas
        const { data: newAccount, error } = await supabase
          .from('accounts')
          .insert({
            code: transformedCode,
            name,
            account_type: correctedAccountType,
            type,
            club_id: clubId,
            created_at: new Date(),
            updated_at: new Date()
          })
          .select('id')
          .single();

        if (error) throw error;
        
        accountId = newAccount.id;
        
        setStats(prev => ({
          ...prev,
          createdAccounts: prev.createdAccounts + 1
        }));
      }

      // Si c'est un compte pilote et qu'on a un userId, mettre à jour la table users
      if (name.startsWith('Compte pilote') && userId) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ account_id: accountId })
          .eq('id', userId);

        if (updateError) {
          console.warn(`Erreur lors de la mise à jour du account_id pour l'utilisateur ${userId}:`, updateError);
        }
      }

      return accountId;
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
        entry.club_id,
        entry.user_id
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
            oppositeAccountCode = '706ASSUR';
            oppositeAccountName = 'Produits des assurances';
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
