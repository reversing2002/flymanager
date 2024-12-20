import { createClient } from "@supabase/supabase-js";
import { format, parse } from "date-fns";

const supabaseUrl = "https://jqrijsrbeksztlgnciah.supabase.co";
const supabaseServiceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impxcmlqc3JiZWtzenRsZ25jaWFoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMTY2MzU0OSwiZXhwIjoyMDQ3MjM5NTQ5fQ.h7UqoqBZrKirqp5B0lHpfe5RdDCAXRepeFhctkBdNBc";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function generatePasswordFromBirthDate(birthDate: string | null): string {
  if (!birthDate) {
    // Si pas de date de naissance, on génère un mot de passe aléatoire
    const charset = "0123456789";
    let password = "";
    for (let i = 0; i < 8; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
    return password;
  }

  try {
    // Parse la date au format ISO et la formate en DDMMYYYY
    const date = parse(birthDate, 'yyyy-MM-dd', new Date());
    return format(date, 'ddMMyyyy');
  } catch (error) {
    console.warn(`Date de naissance invalide: ${birthDate}, génération d'un mot de passe aléatoire`);
    return Math.floor(10000000 + Math.random() * 90000000).toString();
  }
}

const syncAllUsers = async () => {
  try {
    console.log("Récupération des utilisateurs...");
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("*");

    if (usersError) throw usersError;
    if (!users?.length) {
      console.log("Aucun utilisateur à synchroniser");
      return;
    }

    console.log(`${users.length} utilisateurs à traiter`);

    let successCount = 0;
    let errorCount = 0;
    const createdPasswords: { email: string; password: string }[] = [];

    for (const user of users) {
      try {
        console.log(`\nTraitement de ${user.email}...`);
        const login = `${user.first_name?.toLowerCase()}.${user.last_name?.toLowerCase()}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const password = generatePasswordFromBirthDate(user.birth_date);

        // Vérifier si l'utilisateur existe déjà dans auth.users
        const { data: existingAuthUser } = await supabase.rpc("get_auth_user_id", {
          p_email: user.email,
        });

        if (existingAuthUser && existingAuthUser.length > 0) {
          // Mettre à jour l'utilisateur existant
          console.log(`Mise à jour du compte auth pour: ${user.email}`);
          const { error: updateError } = await supabase.rpc("update_auth_user", {
            p_email: user.email,
            p_password: password,
            p_user_metadata: {
              login: login,
              password: password,
              first_name: user.first_name,
              last_name: user.last_name,
              email: user.email,
              full_name: `${user.first_name} ${user.last_name}`,
              app_url: "https://app.linked.fr"
            }
          });

          if (updateError) throw updateError;
        } else {
          // Créer un nouvel utilisateur
          console.log(`Création du compte auth pour: ${user.email}`);
          const { error: createError } = await supabase.rpc("create_auth_user", {
            p_email: user.email,
            p_password: password,
            p_login: login,
            p_role: 'authenticated',
            p_user_id: user.id,
            p_user_metadata: {
              login: login,
              password: password,
              first_name: user.first_name,
              last_name: user.last_name,
              email: user.email,
              full_name: `${user.first_name} ${user.last_name}`,
              app_url: "https://app.linked.fr"
            }
          });

          if (createError) throw createError;
        }

        createdPasswords.push({
          email: user.email,
          password: password,
        });

        console.log(`Compte auth traité pour: ${user.email}`);
        successCount++;

        // Attendre un peu entre chaque opération pour éviter de surcharger l'API
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Erreur pour ${user.email}:`, error);
        errorCount++;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log("\nRésumé de la synchronisation:");
    console.log(`Succès: ${successCount}`);
    console.log(`Échecs: ${errorCount}`);
    console.log("\nMots de passe créés/mis à jour:");
    createdPasswords.forEach(({ email, password }) => {
      console.log(`${email}: ${password}`);
    });

  } catch (error) {
    console.error("Erreur générale:", error);
    throw error;
  }
};

// Exécuter la synchronisation
syncAllUsers().catch(console.error);
