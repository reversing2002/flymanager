import React, { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tabs,
  Tab,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { useBackups } from '../../hooks/useBackups';
import { BackupType, AuditLog } from '../../types/backup';
import { useAuth } from '../../contexts/AuthContext';
import { hasAnyGroup } from '../../lib/permissions';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const resourceLabels: Record<BackupType, string> = {
  account_entries: 'Paiements',
  users: 'Membres',
  reservations: 'Réservations',
  flights: 'Vols',
  aircraft: 'Avions',
  permission_settings: 'Paramètres',
};

interface AuditLogDetails {
  user?: {
    id: string;
    email: string;
    name?: string;
  };
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}

const getChangesFromAuditLog = (log: any): AuditLogDetails['changes'] => {
  if (!log.old_data && !log.new_data) return [];
  
  const oldData = log.old_data || {};
  const newData = log.new_data || {};
  const allFields = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
  
  return Array.from(allFields)
    .filter(field => !['id', 'created_at', 'updated_at'].includes(field))
    .map(field => ({
      field,
      oldValue: oldData[field],
      newValue: newData[field]
    }))
    .filter(change => change.oldValue !== change.newValue);
};

const formatValue = (value: any): string => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const getActionLabel = (action: string): string => {
  switch (action) {
    case 'create': return 'Création';
    case 'update': return 'Modification';
    case 'delete': return 'Suppression';
    default: return action;
  }
};

const getRestoreData = (resourceType: string, oldData: any) => {
  switch (resourceType) {
    case 'users':
      return {
        id: oldData.id,
        first_name: oldData.first_name,
        last_name: oldData.last_name,
        email: oldData.email,
        phone: oldData.phone,
        login: oldData.login,
        created_at: oldData.created_at,
        updated_at: oldData.updated_at,
        gender: oldData.gender,
        birth_date: oldData.birth_date,
        image_url: oldData.image_url,
        address_1: oldData.address_1,
        city: oldData.city,
        zip_code: oldData.zip_code,
        country: oldData.country,
        auth_id: oldData.auth_id,
        instructor_rate: oldData.instructor_rate || 0,
        instructor_fee: oldData.instructor_fee,
        default_mode: oldData.default_mode || 'default-available'
      };

    case 'account_entries':
      return {
        id: oldData.id,
        user_id: oldData.user_id,
        date: oldData.date,
        amount: oldData.amount,
        payment_method: oldData.payment_method,
        description: oldData.description,
        is_validated: oldData.is_validated || false,
        created_at: oldData.created_at,
        updated_at: oldData.updated_at,
        assigned_to_id: oldData.assigned_to_id,
        flight_id: oldData.flight_id,
        entry_type_id: oldData.entry_type_id,
        is_club_paid: oldData.is_club_paid || false,
        club_id: oldData.club_id
      };

    case 'reservations':
      return {
        id: oldData.id,
        user_id: oldData.user_id,
        aircraft_id: oldData.aircraft_id,
        flight_type_id: oldData.flight_type_id,
        start_time: oldData.start_time,
        end_time: oldData.end_time,
        with_instructor: oldData.with_instructor || false,
        instructor_id: oldData.instructor_id,
        status: oldData.status || 'ACTIVE',
        comments: oldData.comments,
        created_at: oldData.created_at,
        updated_at: oldData.updated_at,
        pilot_id: oldData.pilot_id,
        club_id: oldData.club_id
      };

    case 'flights':
      return {
        id: oldData.id,
        reservation_id: oldData.reservation_id,
        user_id: oldData.user_id,
        aircraft_id: oldData.aircraft_id,
        flight_type_id: oldData.flight_type_id,
        instructor_id: oldData.instructor_id,
        date: oldData.date,
        duration: oldData.duration,
        destination: oldData.destination,
        hourly_rate: oldData.hourly_rate,
        cost: oldData.cost,
        payment_method: oldData.payment_method,
        is_validated: oldData.is_validated || false,
        created_at: oldData.created_at,
        updated_at: oldData.updated_at,
        instructor_fee: oldData.instructor_fee || 0,
        club_id: oldData.club_id,
        start_hour_meter: oldData.start_hour_meter || 0,
        end_hour_meter: oldData.end_hour_meter || 0,
        instructor_cost: oldData.instructor_cost,
        instructor_invoice_id: oldData.instructor_invoice_id
      };

    case 'aircraft':
      return {
        id: oldData.id,
        name: oldData.name,
        type: oldData.type,
        registration: oldData.registration,
        capacity: oldData.capacity || 1,
        hourly_rate: oldData.hourly_rate,
        last_maintenance: oldData.last_maintenance,
        hours_before_maintenance: oldData.hours_before_maintenance || 0,
        status: oldData.status || 'AVAILABLE',
        created_at: oldData.created_at,
        updated_at: oldData.updated_at,
        image_url: oldData.image_url,
        next_maintenance_date: oldData.next_maintenance_date,
        next_maintenance_hours: oldData.next_maintenance_hours,
        total_flight_hours: oldData.total_flight_hours || 0,
        total_cycles: oldData.total_cycles || 0,
        club_id: oldData.club_id,
        last_hour_meter: oldData.last_hour_meter || 0,
        hour_format: oldData.hour_format || 'CLASSIC'
      };

    case 'permission_settings':
      return {
        id: oldData.id,
        club_id: oldData.club_id,
        permission_id: oldData.permission_id,
        allowed_roles: oldData.allowed_roles || [],
        is_custom: oldData.is_custom || false,
        created_at: oldData.created_at,
        updated_at: oldData.updated_at
      };

    default:
      return oldData;
  }
};

const BackupSettings = () => {
  const { user: authUser } = useAuth();
  const [selectedType, setSelectedType] = useState<BackupType>('account_entries');
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('backups');
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const {
    useBackupsList,
    useAuditLogs,
    useCreateBackup,
    useRestoreBackup,
  } = useBackups();

  const { data: backups, isLoading: isLoadingBackups } = useBackupsList(selectedType);
  const { data: auditLogs, isLoading: isLoadingLogs } = useAuditLogs(selectedType);
  const { mutate: createBackup } = useCreateBackup();
  const { mutate: restoreBackup } = useRestoreBackup();

  if (!authUser || !hasAnyGroup(authUser, ['admin'])) {
    return (
      <Box p={4}>
        <Typography>Accès non autorisé</Typography>
      </Box>
    );
  }

  const handleCreateBackup = async () => {
    try {
      // Récupérer les données actuelles
      const { data: currentData, error: fetchError } = await supabase
        .from(selectedType)
        .select('*');

      if (fetchError) {
        throw fetchError;
      }

      // Créer la sauvegarde avec les données
      createBackup({
        type: selectedType,
        description: `Sauvegarde manuelle de ${resourceLabels[selectedType]}`,
        is_auto: false,
        data: currentData || [],
      });
    } catch (error: any) {
      toast.error(`Erreur lors de la création de la sauvegarde: ${error.message}`);
    }
  };

  const handleRestoreBackup = async () => {
    if (selectedBackup) {
      restoreBackup(selectedBackup);
      setRestoreDialogOpen(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };

  const handleTypeChange = (event: React.SyntheticEvent, newValue: BackupType) => {
    setSelectedType(newValue);
  };

  const handleRevertChange = async (log: AuditLog) => {
    try {
      if (!log.old_data) {
        // C'était une création, donc on supprime
        const { error } = await supabase
          .from(log.resource_type)
          .delete()
          .eq('id', log.resource_id);
          
        if (error) throw error;
      } else {
        // Préparer les données à restaurer en fonction du type de ressource
        const dataToRestore = getRestoreData(log.resource_type, log.old_data);

        console.log('Données à restaurer:', dataToRestore);

        // Vérifier si l'enregistrement existe
        const { data: existingRecord } = await supabase
          .from(log.resource_type)
          .select('id')
          .eq('id', log.resource_id)
          .single();

        let error;
        
        if (existingRecord) {
          // Si l'enregistrement existe, utiliser update
          const { error: updateError } = await supabase
            .from(log.resource_type)
            .update(dataToRestore)
            .eq('id', log.resource_id);
          error = updateError;
        } else {
          // Si l'enregistrement n'existe pas, utiliser insert
          const { error: insertError } = await supabase
            .from(log.resource_type)
            .insert(dataToRestore);
          error = insertError;
        }
          
        if (error) {
          console.error('Erreur lors de la restauration:', error);
          throw error;
        }
      }
      
      toast.success('Modification annulée avec succès');
      // Rafraîchir les données
      // queryClient.invalidateQueries(['auditLogs']);
    } catch (error: any) {
      console.error('Erreur lors de la restauration:', error);
      toast.error(`Erreur lors de l'annulation: ${error.message}`);
    }
  };

  const handleShowDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setDetailsDialogOpen(true);
  };

  return (
    <Box p={4}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h5" component="h2">Sauvegardes et Historique</Typography>
        <Button variant="contained" color="primary" onClick={handleCreateBackup}>
          Créer une sauvegarde
        </Button>
      </Box>

      <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 4 }}>
        <Tab label="Sauvegardes" value="backups" />
        <Tab label="Historique des modifications" value="history" />
      </Tabs>

      <Tabs value={selectedType} onChange={handleTypeChange} sx={{ mb: 4 }}>
        {Object.entries(resourceLabels).map(([type, label]) => (
          <Tab key={type} label={label} value={type} />
        ))}
      </Tabs>

      {activeTab === 'backups' && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {backups?.map((backup) => (
                <TableRow key={backup.id}>
                  <TableCell>
                    {format(new Date(backup.created_at), 'Pp', { locale: fr })}
                  </TableCell>
                  <TableCell>{backup.description}</TableCell>
                  <TableCell>{backup.is_auto ? 'Automatique' : 'Manuel'}</TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setSelectedBackup(backup);
                        setRestoreDialogOpen(true);
                      }}
                    >
                      Restaurer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {activeTab === 'history' && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Ressource</TableCell>
                <TableCell>Détails</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {auditLogs?.map((log) => {
                const changes = getChangesFromAuditLog(log);
                return (
                  <TableRow key={log.id}>
                    <TableCell>
                      {format(new Date(log.created_at), 'Pp', { locale: fr })}
                    </TableCell>
                    <TableCell>{getActionLabel(log.action)}</TableCell>
                    <TableCell>{resourceLabels[log.resource_type as BackupType]}</TableCell>
                    <TableCell>
                      {changes?.length > 0 ? (
                        <Tooltip title="Voir les détails">
                          <IconButton
                            size="small"
                            onClick={() => handleShowDetails(log)}
                          >
                            <InfoIcon />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          if (window.confirm('Êtes-vous sûr de vouloir annuler cette modification ?')) {
                            handleRevertChange(log);
                          }
                        }}
                      >
                        Annuler
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog pour les détails */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Détails de la modification
          <Typography variant="subtitle2" color="text.secondary">
            {selectedLog && format(new Date(selectedLog.created_at), 'Pp', { locale: fr })}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {selectedLog && (
            <>
              <Box mb={2}>
                <Typography variant="subtitle1" gutterBottom>
                  {getActionLabel(selectedLog.action)} - {resourceLabels[selectedLog.resource_type as BackupType]}
                </Typography>
              </Box>
              <List dense>
                {getChangesFromAuditLog(selectedLog)?.map((change, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={change.field}
                      secondary={
                        <>
                          {change.oldValue !== undefined && (
                            <span style={{ textDecoration: 'line-through', marginRight: 8 }}>
                              {formatValue(change.oldValue)}
                            </span>
                          )}
                          {change.newValue !== undefined && (
                            <span style={{ color: 'green' }}>
                              {formatValue(change.newValue)}
                            </span>
                          )}
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={restoreDialogOpen}
        onClose={() => setRestoreDialogOpen(false)}
      >
        <DialogTitle>Confirmer la restauration</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Êtes-vous sûr de vouloir restaurer cette sauvegarde ? Cette action remplacera toutes les données actuelles.
            Une sauvegarde automatique sera créée avant la restauration.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialogOpen(false)}>Annuler</Button>
          <Button onClick={handleRestoreBackup} variant="contained" color="primary">
            Confirmer la restauration
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BackupSettings;
