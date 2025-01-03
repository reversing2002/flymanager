import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://jqrijsrbeksztlgnciah.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impxcmlqc3JiZWtzenRsZ25jaWFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE2NjM1NDksImV4cCI6MjA0NzIzOTU0OX0.9VfmfKU8jvs3dIixUpvzY02h10pgDpNAvKrAQ65XkZs";

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    storageKey: "flymanager_auth",
    storage: window.localStorage,
    autoRefreshToken: true,
    debug: true,
    flowType: "pkce",
    redirectTo: `${window.location.origin}/update-password`,
    detectSessionInUrl: true,
    cookieOptions: {
      name: "flymanager_auth",
      lifetime: 60 * 60 * 24 * 7, // 7 jours
      domain: window.location.hostname,
      sameSite: "lax",
      secure: window.location.protocol === "https:"
    }
  },
});

// Ajouter un listener global pour déboguer
supabase.auth.onAuthStateChange((event, session) => {
  console.log("Événement d'authentification global:", event);
  console.log("État de la session:", session ? "Active" : "Inactive");
});

export const signIn = async (login: string, password: string) => {
  try {
    // 1. Trouver l'utilisateur par login
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("email")
      .eq("login", login)
      .single();

    if (userError || !userData) {
      throw new Error("Identifiants invalides");
    }

    // 2. Utiliser l'authentification Supabase avec l'email
    const { data, error } = await supabase.auth.signInWithPassword({
      email: userData.email,
      password: password,
      options: {
        // Définir une session de 30 jours
        expiresIn: 30 * 24 * 60 * 60, // 30 jours en secondes
      },
    });

    if (error) {
      console.error("Erreur auth:", error);
      throw new Error("Identifiants invalides");
    }

    // 3. Récupérer le profil complet
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("email", userData.email)
      .single();

    if (profileError) {
      throw profileError;
    }

    return {
      session: data.session,
      user: {
        ...data.user,
        role: userProfile.role,
        firstName: userProfile.first_name,
        lastName: userProfile.last_name,
      },
    };
  } catch (error) {
    console.error("Sign in error:", error);
    throw error;
  }
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Sign out error:", error);
    throw error;
  }
  return { error: null };
};

// Fonction utilitaire pour vérifier la session
export const checkSession = async () => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) {
    console.error("Session check error:", error);
    throw error;
  }
  return session;
};

// Fonction pour récupérer le profil utilisateur complet
export const getUserProfile = async () => {
  const {
    data: { user },
    error: sessionError,
  } = await supabase.auth.getUser();

  if (sessionError || !user) {
    throw new Error("Non authentifié");
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select(`
      *,
      club_members!inner (
        club_id
      )
    `)
    .eq("email", user.email)
    .single();

  if (profileError) {
    throw profileError;
  }

  // Add club_id to the profile object
  return {
    ...profile,
    club_id: profile.club_members?.[0]?.club_id
  };
};

export const initializeUser = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true,
  });

  if (error) {
    console.error("Error initializing user:", error);
    throw error;
  }

  return data;
};
