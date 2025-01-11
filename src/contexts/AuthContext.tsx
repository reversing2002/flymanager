import { createContext, useContext, useEffect, useState } from "react";
import { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import { Role } from "../types/roles";

interface AuthContextType {
  session: Session | null;
  user:
    | (SupabaseUser & {
        roles: Role[];
        firstName?: string;
        lastName?: string;
        login?: string;
        id: string;
        auth_id: string;
        club?: {
          id: string;
          name: string;
          wind_station_id?: string;
          wind_station_name?: string;
        } | null;
      })
    | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  getAccessToken: () => string | null;
  updateUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_ERRORS = {
  INVALID_CREDENTIALS: "Identifiants incorrects",
  USER_NOT_FOUND: "Utilisateur non trouvé",
  NETWORK_ERROR: "Erreur de connexion au serveur",
  UNKNOWN_ERROR: "Une erreur inattendue est survenue",
} as const;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const getAccessToken = () => {
    const token = session?.access_token;
    console.log(
      " getAccessToken appelé:",
      token ? "Token présent" : "Pas de token"
    );
    return token || null;
  };

  const debugSessionState = (session: Session | null) => {
    console.group(" Debug Session");
    console.log("Session présente:", !!session);
    if (session) {
      console.log(
        "Access Token:",
        session.access_token?.substring(0, 20) + "..."
      );
      console.log("Expiration:", new Date(session.expires_at! * 1000));
      console.log("User ID:", session.user?.id);
    }
    console.groupEnd();
  };

  useEffect(() => {
    console.log(" Initialisation de l'AuthProvider");

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log(
        " Session récupérée:",
        session ? "Session active" : "Pas de session"
      );
      debugSessionState(session);

      if (session?.user) {
        console.log(" Utilisateur de la session:", session.user.email);

        // Première requête pour obtenir les données utilisateur
        supabase
          .from("users")
          .select(`
            *,
            club:club_members!inner(
              club:clubs(
                id,
                name,
                wind_station_id,
                wind_station_name
              )
            )
          `)
          .eq("auth_id", session.user.id)
          .single()
          .then(({ data: userData, error: userError }) => {
            if (userError) {
              console.error(
                " Erreur lors de la récupération des données utilisateur:",
                userError
              );
              return;
            }

            if (userData) {
              // Deuxième requête pour obtenir les groupes via RPC
              supabase
                .rpc('get_user_groups', { user_id: userData.id })
                .then(({ data: userGroups, error: groupsError }) => {
                  if (groupsError) {
                    console.error(
                      " Erreur lors de la récupération des groupes:",
                      groupsError
                    );
                    return;
                  }

                  console.log(" Données utilisateur récupérées:", userData);
                  console.log(" Groupes utilisateur:", userGroups);
                  const roles = Array.isArray(userGroups) ? userGroups as Role[] : [];

                  // Transformer la structure du club pour correspondre au type attendu
                  const clubData = userData.club?.[0]?.club ? {
                    id: userData.club[0].club.id,
                    name: userData.club[0].club.name,
                    wind_station_id: userData.club[0].club.wind_station_id,
                    wind_station_name: userData.club[0].club.wind_station_name
                  } : null;

                  setUser({
                    ...session.user,
                    ...userData,
                    roles,
                    club: clubData
                  });
                });
            }
          });
      }

      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log(" Changement d'état d'authentification:", _event);
      debugSessionState(session);

      if (session?.user) {
        console.log(" Nouvel utilisateur:", session.user.email);

        // Première requête pour obtenir les données utilisateur
        supabase
          .from("users")
          .select(`
            *,
            club:club_members!inner(
              club:clubs(
                id,
                name,
                wind_station_id,
                wind_station_name
              )
            )
          `)
          .eq("auth_id", session.user.id)
          .single()
          .then(({ data: userData, error: userError }) => {
            if (userError) {
              console.error(
                " Erreur lors de la récupération des données utilisateur:",
                userError
              );
              return;
            }

            if (userData) {
              // Deuxième requête pour obtenir les groupes via RPC
              supabase
                .rpc('get_user_groups', { user_id: userData.id })
                .then(({ data: userGroups, error: groupsError }) => {
                  if (groupsError) {
                    console.error(
                      " Erreur lors de la récupération des groupes:",
                      groupsError
                    );
                    return;
                  }

                  console.log(" Données utilisateur mises à jour:", userData);
                  console.log(" Groupes utilisateur:", userGroups);
                  const roles = Array.isArray(userGroups) ? userGroups as Role[] : [];

                  // Transformer la structure du club pour correspondre au type attendu
                  const clubData = userData.club?.[0]?.club ? {
                    id: userData.club[0].club.id,
                    name: userData.club[0].club.name,
                    wind_station_id: userData.club[0].club.wind_station_id,
                    wind_station_name: userData.club[0].club.wind_station_name
                  } : null;

                  setUser({
                    ...session.user,
                    ...userData,
                    roles,
                    club: clubData
                  });
                });
            }
          });
      } else {
        setUser(null);
      }

      setSession(session);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const updateUserData = async () => {
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          *,
          club:clubs (
            id,
            name,
            wind_station_id,
            wind_station_name
          )
        `)
        .eq('auth_id', user?.id)
        .single();

      if (userError) throw userError;

      // Récupérer les rôles de l'utilisateur
      const roles = await getUserRoles(userData.id);

      setUser(prev => {
        if (!prev) return null;
        return {
          ...prev,
          ...userData,
          roles: roles, // Utiliser les rôles récupérés
          firstName: userData.first_name,
          lastName: userData.last_name,
          club: userData.club,
        };
      });
    } catch (error) {
      console.error('Error updating user data:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log(" Tentative de connexion pour:", email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error(" Erreur de connexion détaillée:", {
          message: error.message,
          name: error.name,
          status: error.status,
          stack: error.stack
        });
        if (error.message.includes("Invalid login credentials")) {
          setError(AUTH_ERRORS.INVALID_CREDENTIALS);
        } else if (error.message.includes("User not found")) {
          setError(AUTH_ERRORS.USER_NOT_FOUND);
        } else if (error.message.includes("NetworkError")) {
          setError(AUTH_ERRORS.NETWORK_ERROR);
        } else {
          setError(`${AUTH_ERRORS.UNKNOWN_ERROR}: ${error.message}`);
        }
        return;
      }

      console.log(" Connexion réussie, données:", data);
      if (data.user) {
        console.log(" Connexion réussie:", data.user.email);
      }
    } catch (error) {
      console.error(" Erreur inattendue:", error);
      setError(AUTH_ERRORS.UNKNOWN_ERROR);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error(" Erreur de déconnexion:", error);
        setError(AUTH_ERRORS.UNKNOWN_ERROR);
        return;
      }

      console.log(" Déconnexion réussie");
      navigate("/login");
    } catch (error) {
      console.error(" Erreur inattendue:", error);
      setError(AUTH_ERRORS.UNKNOWN_ERROR);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) {
        console.error("Erreur de réinitialisation:", error);
        setError("Impossible d'envoyer l'email de réinitialisation");
        return;
      }

      console.log("Email de réinitialisation envoyé avec succès");
    } catch (error) {
      console.error("Erreur inattendue:", error);
      setError(AUTH_ERRORS.UNKNOWN_ERROR);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        signIn,
        signOut,
        resetPassword,
        loading,
        error,
        getAccessToken,
        updateUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
