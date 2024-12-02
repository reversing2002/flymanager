import type { User } from "../../types/database";
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
