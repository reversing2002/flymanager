import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Card, CardContent, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import { Refresh, ExpandMore } from '@mui/icons-material';
import { PERMISSIONS, type PermissionId } from '../../types/permissions';
import type { Role } from '../../types/roles';
import { useAuth } from '../../contexts/AuthContext';
import { getAllAvailableRoles } from '../../lib/utils/roleUtils';

type PermissionSetting = {
  id: string;
  permission_id: PermissionId;
  allowed_roles: Role[];
  is_custom: boolean;
};

type PermissionGroup = {
  id: string;
  name: string;
  permissions: PermissionId[];
};

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'flights',
    name: 'Gestion des vols',
    permissions: [
      PERMISSIONS.FLIGHT_VIEW,
      PERMISSIONS.FLIGHT_CREATE,
      PERMISSIONS.FLIGHT_MODIFY,
      PERMISSIONS.FLIGHT_DELETE,
    ],
  },
  {
    id: 'training',
    name: 'Formation',
    permissions: [
      PERMISSIONS.TRAINING_VIEW,
      PERMISSIONS.TRAINING_CREATE,
      PERMISSIONS.TRAINING_MODIFY,
      PERMISSIONS.TRAINING_DELETE,
    ],
  },
  {
    id: 'maintenance',
    name: 'Maintenance',
    permissions: [
      PERMISSIONS.MAINTENANCE_VIEW,
      PERMISSIONS.MAINTENANCE_CREATE,
      PERMISSIONS.MAINTENANCE_MODIFY,
      PERMISSIONS.MAINTENANCE_DELETE,
    ],
  },
  {
    id: 'users',
    name: 'Utilisateurs',
    permissions: [
      PERMISSIONS.USER_VIEW,
      PERMISSIONS.USER_CREATE,
      PERMISSIONS.USER_MODIFY,
      PERMISSIONS.USER_DELETE,
    ],
  },
  {
    id: 'settings',
    name: 'Paramètres',
    permissions: [
      PERMISSIONS.SETTINGS_VIEW,
      PERMISSIONS.SETTINGS_MODIFY,
    ],
  },
  {
    id: 'chat',
    name: 'Communication',
    permissions: [
      PERMISSIONS.CHAT_VIEW,
      PERMISSIONS.CHAT_SEND,
    ],
  },
  {
    id: 'events',
    name: 'Événements',
    permissions: [
      PERMISSIONS.EVENT_VIEW,
      PERMISSIONS.EVENT_CREATE,
      PERMISSIONS.EVENT_MODIFY,
      PERMISSIONS.EVENT_DELETE,
    ],
  },
  {
    id: 'docs',
    name: 'Documentation',
    permissions: [
      PERMISSIONS.DOC_VIEW,
      PERMISSIONS.DOC_MODIFY,
    ],
  },
  {
    id: 'planning',
    name: 'Planning',
    permissions: [
      PERMISSIONS.PLANNING_VIEW,
      PERMISSIONS.PLANNING_MODIFY,
    ],
  },
  {
    id: 'discovery',
    name: 'Vols découverte',
    permissions: [
      PERMISSIONS.DISCOVERY_FLIGHT_VIEW,
      PERMISSIONS.DISCOVERY_FLIGHT_CREATE,
      PERMISSIONS.DISCOVERY_FLIGHT_MODIFY,
      PERMISSIONS.DISCOVERY_FLIGHT_DELETE,
    ],
  },
];

const getPermissionLabel = (permissionId: PermissionId): string => {
  switch (permissionId) {
    // Vols
    case PERMISSIONS.FLIGHT_VIEW:
      return 'Voir les vols';
    case PERMISSIONS.FLIGHT_CREATE:
      return 'Créer des vols';
    case PERMISSIONS.FLIGHT_MODIFY:
      return 'Modifier les vols';
    case PERMISSIONS.FLIGHT_DELETE:
      return 'Supprimer les vols';

    // Formation
    case PERMISSIONS.TRAINING_VIEW:
      return 'Voir les formations';
    case PERMISSIONS.TRAINING_CREATE:
      return 'Créer des formations';
    case PERMISSIONS.TRAINING_MODIFY:
      return 'Modifier les formations';
    case PERMISSIONS.TRAINING_DELETE:
      return 'Supprimer les formations';

    // Maintenance
    case PERMISSIONS.MAINTENANCE_VIEW:
      return 'Voir la maintenance';
    case PERMISSIONS.MAINTENANCE_CREATE:
      return 'Créer des maintenances';
    case PERMISSIONS.MAINTENANCE_MODIFY:
      return 'Modifier les maintenances';
    case PERMISSIONS.MAINTENANCE_DELETE:
      return 'Supprimer les maintenances';

    // Utilisateurs
    case PERMISSIONS.USER_VIEW:
      return 'Voir les utilisateurs';
    case PERMISSIONS.USER_CREATE:
      return 'Créer des utilisateurs';
    case PERMISSIONS.USER_MODIFY:
      return 'Modifier les utilisateurs';
    case PERMISSIONS.USER_DELETE:
      return 'Supprimer les utilisateurs';

    // Paramètres
    case PERMISSIONS.SETTINGS_VIEW:
      return 'Voir les paramètres';
    case PERMISSIONS.SETTINGS_MODIFY:
      return 'Modifier les paramètres';

    // Communication
    case PERMISSIONS.CHAT_VIEW:
      return 'Voir les messages';
    case PERMISSIONS.CHAT_SEND:
      return 'Envoyer des messages';

    // Événements
    case PERMISSIONS.EVENT_VIEW:
      return 'Voir les événements';
    case PERMISSIONS.EVENT_CREATE:
      return 'Créer des événements';
    case PERMISSIONS.EVENT_MODIFY:
      return 'Modifier les événements';
    case PERMISSIONS.EVENT_DELETE:
      return 'Supprimer les événements';

    // Documentation
    case PERMISSIONS.DOC_VIEW:
      return 'Visualiser la documentation';
    case PERMISSIONS.DOC_MODIFY:
      return 'Modifier la documentation';

    // Planning
    case PERMISSIONS.PLANNING_VIEW:
      return 'Visualiser les plannings';
    case PERMISSIONS.PLANNING_MODIFY:
      return 'Gérer les plannings';

    // Vols découverte
    case PERMISSIONS.DISCOVERY_FLIGHT_VIEW:
      return 'Visualiser les vols découverte';
    case PERMISSIONS.DISCOVERY_FLIGHT_CREATE:
      return 'Créer des vols découverte';
    case PERMISSIONS.DISCOVERY_FLIGHT_MODIFY:
      return 'Modifier les vols découverte';
    case PERMISSIONS.DISCOVERY_FLIGHT_DELETE:
      return 'Supprimer les vols découverte';

    // Progression
    case PERMISSIONS.PROGRESSION_VIEW:
      return 'Voir les progressions';
    case PERMISSIONS.PROGRESSION_MODIFY:
      return 'Modifier les progressions';

    // Statistiques
    case PERMISSIONS.STATS_VIEW:
      return 'Voir les statistiques';

    default:
      return permissionId;
  }
};

export default function PagePermissionsSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [expandedGroup, setExpandedGroup] = useState<string | false>(false);

  // Récupérer tous les rôles disponibles
  const { data: roles, isLoading: isLoadingRoles } = useQuery({
    queryKey: ['availableRoles', user?.club?.id],
    queryFn: async () => {
      if (!user?.club?.id) throw new Error('No club selected');
      const allRoles = await getAllAvailableRoles(user.club.id);
      // Filtrer le rôle superadmin
      return allRoles.filter(role => role.toLowerCase() !== 'SYSTEM_ADMIN');
    },
    enabled: !!user?.club?.id,
  });

  // Récupérer les permissions
  const { data: permissions, isLoading: isLoadingPermissions } = useQuery<PermissionSetting[]>({
    queryKey: ['permissionSettings', user?.club?.id],
    queryFn: async () => {
      if (!user?.club?.id) throw new Error('No club selected');
      
      const { data, error } = await supabase
        .from('permission_settings')
        .select('*')
        .eq('club_id', user.club.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.club?.id,
  });

  const updatePermission = useMutation({
    mutationFn: async (permission: PermissionSetting) => {
      if (!user?.club?.id) throw new Error('No club selected');
      
      const { error } = await supabase
        .from('permission_settings')
        .update({
          allowed_roles: permission.allowed_roles,
        })
        .eq('id', permission.id)
        .eq('club_id', user.club.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissionSettings', user?.club?.id] });
      toast.success('Permissions mises à jour avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour des permissions');
      console.error('Error updating permissions:', error);
    },
  });

  const handleRoleToggle = (role: Role, permission: PermissionSetting) => {
    const newRoles = permission.allowed_roles.includes(role)
      ? permission.allowed_roles.filter(r => r !== role)
      : [...permission.allowed_roles, role];

    updatePermission.mutate({
      ...permission,
      allowed_roles: newRoles,
    });
  };

  const handleAccordionChange = (groupId: string) => (
    event: React.SyntheticEvent,
    isExpanded: boolean
  ) => {
    setExpandedGroup(isExpanded ? groupId : false);
  };

  if (!user?.club?.id) {
    return (
      <Box p={4}>
        <Typography>Aucun club sélectionné</Typography>
      </Box>
    );
  }

  if (isLoadingRoles || isLoadingPermissions) {
    return (
      <Box p={4}>
        <Typography>Chargement...</Typography>
      </Box>
    );
  }

  return (
    <Box p={4} sx={{ maxWidth: 1200, margin: '0 auto' }}>
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          Gestion des permissions
        </Typography>
        <Typography color="text.secondary">
          Configurez les permissions pour chaque rôle de l'application.
        </Typography>
      </Box>

      <Box display="flex" flexDirection="column" gap={2}>
        {roles?.map((role) => (
          <Accordion
            key={role}
            expanded={expandedGroup === role}
            onChange={handleAccordionChange(role)}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">{role}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box display="flex" flexDirection="column" gap={2}>
                {PERMISSION_GROUPS.map((group) => (
                  <Paper key={group.id} elevation={1}>
                    <Box p={2}>
                      <Typography variant="subtitle1" gutterBottom>
                        {group.name}
                      </Typography>
                      <Box 
                        display="grid" 
                        gridTemplateColumns={{
                          xs: 'repeat(1, 1fr)',
                          sm: 'repeat(2, 1fr)',
                          md: 'repeat(3, 1fr)',
                          lg: 'repeat(4, 1fr)'
                        }}
                        gap={2}
                      >
                        {group.permissions.map((permissionId) => {
                          const permission = permissions?.find(p => p.permission_id === permissionId);
                          if (!permission) return null;

                          return (
                            <FormControlLabel
                              key={permission.id}
                              control={
                                <Checkbox
                                  checked={permission.allowed_roles.includes(role)}
                                  onChange={() => handleRoleToggle(role, permission)}
                                  color="primary"
                                />
                              }
                              label={getPermissionLabel(permissionId)}
                            />
                          );
                        })}
                      </Box>
                    </Box>
                  </Paper>
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </Box>
  );
}
