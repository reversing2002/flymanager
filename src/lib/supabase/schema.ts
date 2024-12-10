import { supabase } from "../supabase";

interface DatabaseSchema {
  tables: TableDefinition[];
  policies: PolicyDefinition[];
  functions: FunctionDefinition[];
}

interface TableDefinition {
  name: string;
  columns: ColumnDefinition[];
  constraints: string[];
}

interface ColumnDefinition {
  name: string;
  type: string;
  nullable: boolean;
  default_value?: string;
}

interface PolicyDefinition {
  table: string;
  name: string;
  definition: string;
  command: string;
  roles: string[];
  permissive: string;
}

interface FunctionDefinition {
  name: string;
  arguments: string;
  return_type: string;
  definition: string;
}

export async function fetchDatabaseSchema(): Promise<void> {
  try {
    // Récupérer la structure des tables
    const { data: tables, error: tablesError } = await supabase.rpc(
      "get_schema_info"
    );

    if (tablesError) throw tablesError;

    // Récupérer les policies
    const { data: policies, error: policiesError } = await supabase.rpc(
      "get_policies_info"
    );

    if (policiesError) throw policiesError;

    // Récupérer les fonctions
    const { data: functions, error: functionsError } = await supabase.rpc(
      "get_functions_info"
    );

    if (functionsError) throw functionsError;

    const schema: DatabaseSchema = {
      tables,
      policies,
      functions,
    };

    // Stocker le schéma dans le localStorage
    localStorage.setItem("db_schema", JSON.stringify(schema, null, 2));

    console.log("Schéma de base de données sauvegardé avec succès");

    // Option : afficher le schéma dans la console pour le développement
    console.log("Schema:", schema);
  } catch (error) {
    console.error("Erreur lors de la récupération du schéma:", error);
    throw error;
  }
}

// Fonction utilitaire pour récupérer le schéma
export function getDatabaseSchema(): DatabaseSchema | null {
  const schema = localStorage.getItem("db_schema");
  return schema ? JSON.parse(schema) : null;
}
