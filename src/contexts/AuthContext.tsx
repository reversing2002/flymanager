import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  session: Session | null;
  user:
    | (User & {
        role?: string;
        firstName?: string;
        lastName?: string;
        login?: string;
      })
    | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const getAccessToken = () => {
    const token = session?.access_token;
    console.log(
      "🔑 getAccessToken appelé:",
      token ? "Token présent" : "Pas de token"
    );
    return token || null;
  };

  const debugSessionState = (session: Session | null) => {
    console.group("🔍 Debug Session");
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
    console.log("🔄 Initialisation de l'AuthProvider");

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log(
        "📥 Session récupérée:",
        session ? "Session active" : "Pas de session"
      );
      debugSessionState(session);

      if (session?.user) {
        console.log("👤 Utilisateur de la session:", session.user.email);

        // Enrichir l'utilisateur avec les données de public.users
        supabase
          .from("users")
          .select(
            `
            *,
            club:club_members!inner(
              club:clubs(
                id,
                name
              )
            )
          `
          )
          .eq("auth_id", session.user.id)
          .single()
          .then(({ data: userData, error: userError }) => {
            if (userError) {
              console.error(
                "❌ Erreur lors de la récupération des données utilisateur:",
                userError
              );
              setError("Erreur de chargement des données utilisateur");
              setLoading(false);
              return;
            }

            if (userData) {
              const clubData = userData.club?.[0]?.club;
              const enrichedUser = {
                ...session.user,
                role: userData.role?.toUpperCase(),
                firstName: userData.first_name,
                lastName: userData.last_name,
                login: userData.login,
                id: userData.id,
                auth_id: session.user.id,
                club: clubData
                  ? {
                      id: clubData.id,
                      name: clubData.name,
                    }
                  : null,
              };

              console.log("✅ Utilisateur enrichi:", enrichedUser);
              setUser(enrichedUser);
              setSession(session);
            }
          });
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("🔄 Changement d'état d'authentification:", _event);
      debugSessionState(session);

      if (session?.user) {
        // Même logique d'enrichissement que ci-dessus
        supabase
          .from("users")
          .select(
            `
            *,
            club:club_members!inner(
              club:clubs(
                id,
                name
              )
            )
          `
          )
          .eq("auth_id", session.user.id)
          .single()
          .then(({ data: userData, error: userError }) => {
            if (userError) {
              console.error(
                "❌ Erreur lors de la récupération des données utilisateur:",
                userError
              );
              setError("Erreur de chargement des données utilisateur");
              return;
            }

            if (userData) {
              const clubData = userData.club?.[0]?.club;
              const enrichedUser = {
                ...session.user,
                role: userData.role?.toUpperCase(),
                firstName: userData.first_name,
                lastName: userData.last_name,
                login: userData.login,
                id: userData.id,
                auth_id: session.user.id,
                club: clubData
                  ? {
                      id: clubData.id,
                      name: clubData.name,
                    }
                  : null,
              };

              console.log(
                "✅ Utilisateur enrichi après changement d'état:",
                enrichedUser
              );
              setUser(enrichedUser);
              setSession(session);
            }
          });
      } else {
        setUser(null);
        setSession(null);
      }
    });

    // Rafraîchir le token périodiquement (par exemple toutes les 45 minutes)
    const refreshToken = setInterval(async () => {
      try {
        const { data, error } = await supabase.auth.refreshSession();
        if (error) throw error;
        if (data.session) {
          setSession(data.session);
        }
      } catch (error) {
        console.error("Erreur lors du rafraîchissement du token:", error);
      }
    }, 45 * 60 * 1000);

    return () => {
      console.log("🧹 Nettoyage de l'AuthProvider");
      subscription.unsubscribe();
      clearInterval(refreshToken);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.group("🔐 Procédure de connexion");
      setLoading(true);
      setError(null);

      // Ajout de logs pour débugger
      console.log("Tentative de connexion avec:", { email });
      console.log("URL Supabase:", supabase.supabaseUrl);

      // 1. Authentification simplifiée
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password: password,
        });

      if (authError) {
        console.error("❌ Erreur auth détaillée:", {
          message: authError.message,
          status: authError.status,
          name: authError.name,
        });
        throw authError;
      }

      if (!authData?.user) {
        throw new Error("Pas de données utilisateur après authentification");
      }

      // 2. Récupération des données utilisateur avec le club
      console.log(
        "🔍 Recherche des données utilisateur pour auth_id:",
        authData.user.id
      );

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select(
          `
          *,
          club:club_members!inner(
            club:clubs(
              id,
              name
            )
          )
        `
        )
        .eq("auth_id", authData.user.id)
        .single();

      console.log("📊 Données utilisateur brutes:", userData);
      console.log("❌ Erreur éventuelle:", userError);

      if (userError) {
        console.error("❌ Erreur données utilisateur:", userError);
        throw userError;
      }

      // Extraction des données du club
      const clubData = userData.club?.[0]?.club;
      console.log("🏢 Données du club:", clubData);

      const enrichedUser = {
        ...authData.user,
        role: userData.role?.toUpperCase(),
        firstName: userData.first_name,
        lastName: userData.last_name,
        id: userData.id,
        auth_id: authData.user.id,
        club: clubData
          ? {
              id: clubData.id,
              name: clubData.name,
            }
          : null,
      };

      console.log("✨ Utilisateur enrichi final:", enrichedUser);
      setUser(enrichedUser);
      setSession(authData.session);
      navigate("/");
    } catch (error) {
      console.error("❌ Erreur complète:", error);
      setError(error instanceof Error ? error.message : "Erreur de connexion");
    } finally {
      setLoading(false);
      console.groupEnd();
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      navigate("/login");
    } catch (error) {
      console.error("Erreur de déconnexion:", error);
      setError("Une erreur est survenue lors de la déconnexion");
    } finally {
      setLoading(false);
    }
  };

  const updateUserData = async () => {
    if (!user?.auth_id) return;

    const { data: userData, error } = await supabase
      .from("users")
      .select("*")
      .eq("auth_id", user.auth_id)
      .single();

    if (error) {
      console.error(
        "Erreur lors de la mise à jour des données utilisateur:",
        error
      );
      return;
    }

    if (userData) {
      setUser((current) => ({
        ...current!,
        role: userData.role?.toUpperCase(),
        firstName: userData.first_name,
        lastName: userData.last_name,
        login: userData.login,
      }));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        signIn,
        signOut,
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
