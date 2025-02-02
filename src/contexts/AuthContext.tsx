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
        availableClubs?: {
          id: string;
          name: string;
          wind_station_id?: string;
          wind_station_name?: string;
        }[];
      })
    | null;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  getAccessToken: () => string | null;
  updateUserData: () => Promise<void>;
  setActiveClub: (clubId: string) => Promise<void>;
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

    // Récupérer le club actif du localStorage
    const savedClubId = localStorage.getItem("activeClubId");

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log(
        " Session récupérée:",
        session ? "Session active" : "Pas de session"
      );
      debugSessionState(session);

      if (session?.user) {
        console.log(" Utilisateur de la session:", session.user.email);
        setSession(session);

        // Si un club actif est sauvegardé, l'utiliser
        if (savedClubId) {
          setActiveClub(savedClubId);
        }

        // Mettre à jour les données utilisateur
        updateUserData();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log(" Changement d'état d'authentification:", _event);
      debugSessionState(session);

      if (session?.user) {
        console.log(" Nouvel utilisateur:", session.user.email);

        // Première requête pour obtenir les clubs disponibles
        const clubsPromise = supabase
          .from("club_members")
          .select(`
            club:clubs(
              id,
              name,
              wind_station_id,
              wind_station_name
            )
          `)
          .eq("user_id", session.user.id)
          .eq("status", "ACTIVE");

        // Deuxième requête pour obtenir les données utilisateur
        const userPromise = supabase
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
          .single();

        // Exécuter les requêtes en parallèle
        Promise.all([clubsPromise, userPromise])
          .then(([{ data: clubsData, error: clubsError }, { data: userData, error: userError }]) => {
            if (userError) {
              console.error(
                " Erreur lors de la récupération des données utilisateur:",
                userError
              );
              return;
            }

            if (clubsError) {
              console.error(
                " Erreur lors de la récupération des clubs disponibles:",
                clubsError
              );
              return;
            }

            if (userData) {
              // Troisième requête pour obtenir les groupes via RPC
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
                  console.log(" Clubs disponibles:", clubsData);
                  
                  const roles = Array.isArray(userGroups) ? userGroups as Role[] : [];
                  const availableClubs = clubsData.map(item => item.club);

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
                    club: clubData,
                    availableClubs
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

  const updateUserData = () => {
    if (!session?.user) return;

    supabase
      .from("club_members")
      .select(`
        club:clubs(
          id,
          name,
          wind_station_id,
          wind_station_name
        )
      `)
      .eq("user_id", session.user.id)
      .eq("status", "ACTIVE")
      .then(({ data: clubsData, error: clubsError }) => {
        if (clubsError) {
          console.error(
            " Erreur lors de la récupération des clubs disponibles:",
            clubsError
          );
          return;
        }

        const availableClubs = clubsData.map(item => item.club);
        console.log("Clubs disponibles:", availableClubs);

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

            // Transformer la structure du club pour correspondre au type attendu
            const clubData = userData.club?.[0]?.club || null;

            // Mettre à jour l'utilisateur avec les clubs disponibles
            setUser(currentUser => {
              if (!currentUser) return null;
              return {
                ...session.user,
                ...userData,
                club: clubData,
                availableClubs
              };
            });
          });
      });
  };

  const setActiveClub = (clubId: string) => {
    if (!session?.user) return;

    supabase
      .from("clubs")
      .select("id, name, wind_station_id, wind_station_name")
      .eq("id", clubId)
      .single()
      .then(({ data: selectedClub, error: clubError }) => {
        if (clubError) {
          console.error(
            " Erreur lors de la récupération du club sélectionné:",
            clubError
          );
          return;
        }

        supabase
          .from("club_members")
          .select(`
            club:clubs(
              id,
              name,
              wind_station_id,
              wind_station_name
            )
          `)
          .eq("user_id", session.user.id)
          .eq("status", "ACTIVE")
          .then(({ data: clubsData, error: clubsError }) => {
            if (clubsError) {
              console.error(
                " Erreur lors de la récupération des clubs disponibles:",
                clubsError
              );
              return;
            }

            const availableClubs = clubsData.map(item => item.club);

            // Mettre à jour l'utilisateur avec le nouveau club actif et la liste des clubs disponibles
            setUser(currentUser => {
              if (!currentUser) return null;
              return {
                ...currentUser,
                club: selectedClub,
                availableClubs: availableClubs
              };
            });

            // Sauvegarder le choix dans localStorage pour le conserver
            localStorage.setItem("activeClubId", clubId);

            // Recharger les permissions de l'utilisateur après le changement de club
            supabase
              .from("users")
              .select("id")
              .eq("auth_id", session.user.id)
              .single()
              .then(({ data: userData }) => {
                if (userData) {
                  supabase
                    .rpc('get_user_groups', { user_id: userData.id })
                    .then(({ data: userGroups }) => {
                      const roles = Array.isArray(userGroups) ? userGroups as Role[] : [];
                      
                      // Mettre à jour la session avec les nouveaux rôles
                      if (session) {
                        const updatedSession = {
                          ...session,
                          user: {
                            ...session.user,
                            user_metadata: {
                              ...session.user.user_metadata,
                              groups: roles
                            }
                          }
                        };
                        setSession(updatedSession);
                      }

                      // Mettre à jour l'état utilisateur
                      setUser(currentUser => {
                        if (!currentUser) return null;
                        return {
                          ...currentUser,
                          roles,
                          club: selectedClub,
                          availableClubs: availableClubs
                        };
                      });

                      console.log("Rôles mis à jour après changement de club:", roles);
                    });
                }
              });
          });
      });
  };

  const signIn = (email: string, password: string, rememberMe: boolean = false) => {
    supabase.auth
      .signInWithPassword({
        email,
        password,
        options: {
          persistSession: rememberMe
        }
      })
      .then(({ data, error }) => {
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
      })
      .catch(error => {
        console.error(" Erreur inattendue:", error);
        setError(AUTH_ERRORS.UNKNOWN_ERROR);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const signOut = () => {
    supabase.auth
      .signOut()
      .then(() => {
        // Nettoyer d'abord l'état local
        setUser(null);
        setSession(null);
        
        // Rediriger vers la page de connexion après la déconnexion réussie
        console.log(" Déconnexion réussie");
        
        // Attendre un court instant pour s'assurer que tout est nettoyé
        setTimeout(() => {
          navigate("/login", { replace: true });
        }, 100);
      })
      .catch(error => {
        console.error(" Erreur de déconnexion:", error);
        setError(AUTH_ERRORS.UNKNOWN_ERROR);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const resetPassword = (email: string) => {
    supabase.auth
      .resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      })
      .then(() => {
        console.log("Email de réinitialisation envoyé avec succès");
      })
      .catch(error => {
        console.error("Erreur de réinitialisation:", error);
        setError("Impossible d'envoyer l'email de réinitialisation");
      })
      .finally(() => {
        setLoading(false);
      });
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
        setActiveClub,
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
