/**
 * Interface pour un groupe d'utilisateurs
 */
export interface UserGroup {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  club_id: string | null;
  is_system: boolean;
  code: string;
}

/**
 * Les différents rôles système disponibles dans l'application
 * Cette liste est maintenant générée dynamiquement à partir de la table user_groups
 */
export type Role = string;

/**
 * Les groupes de rôles système pour les permissions par défaut
 * Ces groupes sont maintenant construits dynamiquement à partir des rôles disponibles
 */
export type SystemRoleGroups = {
  [key: string]: string[];
};

export let SYSTEM_ROLE_GROUPS: SystemRoleGroups = {
  STAFF: [],
  ALL: [],
};

/**
 * Met à jour les groupes de rôles système avec les données de la base
 * @param groups Liste des groupes d'utilisateurs depuis la base de données
 */
export const updateSystemRoleGroups = (groups: UserGroup[]) => {
  console.log('[updateSystemRoleGroups] Début de la mise à jour avec:', groups);
  
  const newGroups: SystemRoleGroups = {
    STAFF: [],
    ALL: [],
  };
  
  groups.forEach(group => {
    if (group.code) {
      const code = group.code.toLowerCase();
      console.log('[updateSystemRoleGroups] Traitement du groupe:', { code, group });
      newGroups[code] = [code];
      newGroups.ALL.push(code);
      
      // Ajoute les rôles admin et instructor au groupe STAFF
      if (code === 'admin' || code === 'instructor') {
        newGroups.STAFF.push(code);
      }
    }
  });
  
  console.log('[updateSystemRoleGroups] Nouveaux groupes générés:', newGroups);
  SYSTEM_ROLE_GROUPS = newGroups;
};
