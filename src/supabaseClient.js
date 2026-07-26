import { createClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────────
// PASTE YOUR SUPABASE PROJECT DETAILS HERE
// Find these in your Supabase project: Settings → API
// Use the same project as nzsteel-pm if you want everything
// in one place.
// ─────────────────────────────────────────────────────────────
const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL"; // e.g. https://abcdefgh.supabase.co
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY"; // the public "anon" key, not the service_role key

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
