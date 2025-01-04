import { createAuthUsers } from "./auth";
import { migrateData } from "./migrations";
import { initializeDefaultChatRooms } from "./chat";
import { supabase } from "../supabase";

export async function setupSupabase() {
  try {
    console.log("Starting Supabase setup...");

    // First check if tables exist and have data
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('get_schema_info');

    if (tableError) {
      console.error("Error checking tables:", tableError);
      return false;
    }

    // If we already have data, skip setup
    if (tableInfo && tableInfo.length > 0) {
      console.log("Database already initialized");
      return true;
    }

    // 1. Create auth users first
    console.log("Creating auth users...");
    const authSuccess = await createAuthUsers();
    if (!authSuccess) {
      console.error("Failed to create auth users");
      return false;
    }

    // 2. Migrate data
    console.log("Migrating data...");
    const migrationSuccess = await migrateData();
    if (!migrationSuccess) {
      console.error("Failed to migrate data");
      return false;
    }

    // 3. Initialize default chat rooms
    console.log("Initializing default chat rooms...");
    const chatSuccess = await initializeDefaultChatRooms();
    if (!chatSuccess) {
      console.error("Failed to initialize chat rooms");
      return false;
    }

    console.log("Supabase setup completed successfully");
    return true;
  } catch (error) {
    console.error("Setup error:", error);
    return false;
  }
}