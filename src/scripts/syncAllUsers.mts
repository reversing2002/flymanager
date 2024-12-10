import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://jqrijsrbeksztlgnciah.supabase.co";
const supabaseServiceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impxcmlqc3JiZWtzenRsZ25jaWFoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMTY2MzU0OSwiZXhwIjoyMDQ3MjM5NTQ5fQ.h7UqoqBZrKirqp5B0lHpfe5RdDCAXRepeFhctkBdNBc";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const syncAllUsers = async () => {
  try {
    console.log(
      "🔧 Suppression temporaire de la contrainte de clé étrangère..."
    );
    await supabase.rpc("drop_auth_constraint");

    console.log("🔍 Récupération des utilisateurs...");
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("*");

    if (usersError) throw usersError;
    if (!users?.length) {
      console.log("✅ Aucun utilisateur à synchroniser");
      return;
    }

    console.log(`📋 ${users.length} utilisateurs à traiter`);

    let successCount = 0;
    let errorCount = 0;
    let createdCount = 0;

    for (const user of users) {
      try {
        console.log(`\n🔄 Traitement de ${user.email}...`);

        // Vérifier si l'utilisateur existe dans auth.users
        const { data: authUser } = await supabase.rpc("get_auth_user_id", {
          p_email: user.email,
        });

        if (!authUser || authUser.length === 0) {
          console.log(
            `➕ Création de l'utilisateur dans auth.users: ${user.email}`
          );
          // Créer l'utilisateur dans auth.users avec un mot de passe temporaire
          const { error: createError } = await supabase.rpc(
            "create_auth_user",
            {
              p_email: user.email,
              p_password: "TemporaryPassword123!", // Le mot de passe temporaire
              p_role: user.role,
              p_login: user.login,
            }
          );

          if (createError) throw createError;
          createdCount++;
          console.log(`✅ Utilisateur créé dans auth.users: ${user.email}`);
        }

        // Mise à jour de auth_id dans public.users
        const { error: updateError } = await supabase
          .from("users")
          .update({ auth_id: user.id })
          .eq("id", user.id);

        if (updateError) throw updateError;

        // Mise à jour directe dans auth.users
        const { error: rpcError } = await supabase.rpc("update_auth_user_id", {
          user_email: user.email,
          new_id: user.id,
        });

        if (rpcError) throw rpcError;

        console.log(`✅ IDs synchronisés pour: ${user.email}`);
        successCount++;

        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`❌ Erreur pour ${user.email}:`, error);
        errorCount++;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log("\n📊 Résumé de la synchronisation:");
    console.log(`✅ Succès: ${successCount}`);
    console.log(`❌ Échecs: ${errorCount}`);
    console.log(`➕ Utilisateurs créés: ${createdCount}`);

    console.log("\n🔧 Recréation de la contrainte de clé étrangère...");
    await supabase.rpc("recreate_auth_constraint");
  } catch (error) {
    console.error("❌ Erreur générale:", error);
    throw error;
  }
};

syncAllUsers()
  .then(() => {
    console.log("\n✅ Processus terminé");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Échec du processus:", error);
    process.exit(1);
  });
