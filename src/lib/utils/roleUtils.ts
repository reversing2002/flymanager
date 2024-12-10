import type { Role } from "../../types/roles";

/**
 * Convertit un rôle en libellé lisible
 * @param role Le rôle à convertir
 * @returns Le libellé du rôle en français
 */
export const getRoleLabel = (role: Role): string => {
  switch (role) {
    case "PILOT":
      return "Pilote";
    case "INSTRUCTOR":
      return "Instructeur";
    case "ADMIN":
      return "Administrateur";
    case "MECHANIC":
      return "Mécanicien";
    case "STUDENT":
      return "Élève";
    case "DISCOVERY_PILOT":
      return "Pilote découverte";
    default:
      return role;
  }
};

/**
 * Obtient les classes CSS pour le badge d'un rôle
 * @param role Le rôle pour lequel obtenir les classes
 * @returns Les classes CSS pour le badge
 */
export const getRoleBadgeColor = (role: Role): string => {
  switch (role) {
    case "PILOT":
      return "bg-sky-900/50 text-sky-300 ring-1 ring-sky-500/50";
    case "INSTRUCTOR":
      return "bg-emerald-900/50 text-emerald-300 ring-1 ring-emerald-500/50";
    case "ADMIN":
      return "bg-purple-900/50 text-purple-300 ring-1 ring-purple-500/50";
    case "MECHANIC":
      return "bg-orange-900/50 text-orange-300 ring-1 ring-orange-500/50";
    case "STUDENT":
      return "bg-blue-900/50 text-blue-300 ring-1 ring-blue-500/50";
    case "DISCOVERY_PILOT":
      return "bg-yellow-900/50 text-yellow-300 ring-1 ring-yellow-500/50";
    default:
      return "bg-gray-900/50 text-gray-300 ring-1 ring-gray-500/50";
  }
};