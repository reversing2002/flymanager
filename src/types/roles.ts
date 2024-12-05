/**
 * Les différents rôles disponibles dans l'application
 */
export type Role = "ADMIN" | "INSTRUCTOR" | "PILOT" | "MECHANIC" | "STUDENT" | "DISCOVERY_PILOT";

/**
 * Les groupes de rôles pour les permissions
 */
export const ROLE_GROUPS = {
  ADMIN: ["ADMIN"],
  INSTRUCTOR: ["INSTRUCTOR"],
  PILOT: ["PILOT"],
  MECHANIC: ["MECHANIC"],
  STUDENT: ["STUDENT"],
  DISCOVERY_PILOT: ["DISCOVERY_PILOT"],
  STAFF: ["ADMIN", "INSTRUCTOR"],
  ALL: ["ADMIN", "INSTRUCTOR", "PILOT", "MECHANIC", "STUDENT", "DISCOVERY_PILOT"],
} as const;
