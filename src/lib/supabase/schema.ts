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

// Fonction utilitaire pour récupérer le schéma
export function getDatabaseSchema(): DatabaseSchema | null {
  const schema = localStorage.getItem("db_schema");
  return schema ? JSON.parse(schema) : null;
}
