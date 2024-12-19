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
  code: string | null;
}

/**
 * Les différents rôles système disponibles dans l'application
 */
export type Role = 
  | "admin" 
  | "instructor" 
  | "pilot" 
  | "mechanic" 
  | "student" 
  | "discovery" 
  | "modelist"
  | "superadmin"
  | "ulm_pilot";

/**
 * Les groupes de rôles système pour les permissions par défaut
 */
export const SYSTEM_ROLE_GROUPS = {
  ADMIN: ["admin"],
  INSTRUCTOR: ["instructor"],
  PILOT: ["pilot"],
  MECHANIC: ["mechanic"],
  STUDENT: ["student"],
  DISCOVERY: ["discovery"],
  MODELIST: ["modelist"],
  SUPERADMIN: ["superadmin"],
  ULM_PILOT: ["ulm_pilot"],
  STAFF: ["admin", "instructor"],
  ALL: ["admin", "instructor", "pilot", "mechanic", "student", "discovery", "modelist", "superadmin", "ulm_pilot"],
} as const;
