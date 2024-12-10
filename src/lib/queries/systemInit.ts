import { supabase } from "../supabase";

export async function initializeSystemAccountTypes(): Promise<void> {
  const systemTypes = [
    {
      code: "FLIGHT",
      name: "Vol",
      description: "Débit pour un vol",
      is_credit: false,
      is_system: true,
    },
    {
      code: "ACCOUNT_FUNDING",
      name: "Crédit compte",
      description: "Crédit du compte (CB, virement, espèces)",
      is_credit: true,
      is_system: true,
    },
  ];

  // Insérer les types système s'ils n'existent pas déjà
  for (const type of systemTypes) {
    const { error } = await supabase
      .from("account_entry_types")
      .upsert(
        {
          ...type,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "code" }
      );

    if (error) {
      console.error(`Error initializing system type ${type.code}:`, error);
      throw error;
    }
  }
}
