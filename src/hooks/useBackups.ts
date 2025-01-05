import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from './useSupabase';
import { useAuth } from '../contexts/AuthContext';
import { Backup, BackupType, AuditLog } from '../types/backup';
import { toast } from 'react-hot-toast';

export const useBackups = () => {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const getBackups = async (type: BackupType): Promise<Backup[]> => {
    const { data, error } = await supabase
      .from('backups')
      .select('*')
      .eq('type', type)
      .eq('club_id', user?.club?.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  };

  const createBackup = async (backup: Partial<Backup>) => {
    if (!user?.club?.id) throw new Error('Club ID not found');
    
    const backupWithClub = {
      ...backup,
      club_id: user.club.id,
      created_by: user.id
    };

    const { data, error } = await supabase
      .from('backups')
      .insert(backupWithClub)
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const restoreBackup = async (backup: Backup) => {
    if (!user?.club?.id) throw new Error('Club ID not found');

    // Créer une nouvelle sauvegarde avant la restauration
    await createBackup({
      type: backup.type,
      data: (await supabase.from(backup.type).select('*').eq('club_id', user.club.id)).data,
      description: `Sauvegarde automatique avant restauration`,
      is_auto: true,
    });

    // Restaurer les données
    const { error } = await supabase
      .from(backup.type)
      .delete()
      .eq('club_id', user.club.id)
      .then(() => supabase.from(backup.type).insert(backup.data));

    if (error) throw error;
  };

  const getAuditLogs = async (
    type: BackupType,
    limit = 50
  ): Promise<AuditLog[]> => {
    if (!user?.club?.id) throw new Error('Club ID not found');

    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('resource_type', type)
      .eq('club_id', user.club.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  };

  const useBackupsList = (type: BackupType) => {
    return useQuery({
      queryKey: ['backups', type],
      queryFn: () => getBackups(type),
    });
  };

  const useAuditLogs = (type: BackupType) => {
    return useQuery({
      queryKey: ['audit_logs', type],
      queryFn: () => getAuditLogs(type),
    });
  };

  const useCreateBackup = () => {
    return useMutation({
      mutationFn: createBackup,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['backups'] });
        toast.success('Sauvegarde créée avec succès');
      },
      onError: (error: any) => {
        toast.error(`Erreur lors de la création de la sauvegarde: ${error.message}`);
      },
    });
  };

  const useRestoreBackup = () => {
    return useMutation({
      mutationFn: restoreBackup,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['backups'] });
        toast.success('Restauration effectuée avec succès');
      },
      onError: (error: any) => {
        toast.error(`Erreur lors de la restauration: ${error.message}`);
      },
    });
  };

  return {
    useBackupsList,
    useAuditLogs,
    useCreateBackup,
    useRestoreBackup,
  };
};
