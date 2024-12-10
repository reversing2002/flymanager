import type { User } from "../types/database";
import { ROLE_GROUPS } from "../types/roles";

/**
 * Vérifie si l'utilisateur appartient à au moins un des groupes spécifiés
 * @param user L'utilisateur à vérifier
 * @param groups Les groupes à vérifier
 * @returns true si l'utilisateur appartient à au moins un des groupes
 */
export const hasAnyGroup = (user: User | null, groups: string[]): boolean => {
  if (!user || !user.roles || user.roles.length === 0) return false;
  return user.roles.some(role => groups.includes(role));
};
