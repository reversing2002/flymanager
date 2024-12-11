import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://jqrijsrbeksztlgnciah.supabase.co";
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY || "";

// This client bypasses RLS and should only be used for admin operations
export const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
