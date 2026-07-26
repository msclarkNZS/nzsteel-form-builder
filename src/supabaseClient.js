import { createClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────────
// PASTE YOUR SUPABASE PROJECT DETAILS HERE
// Find these in your Supabase project: Settings → API
// Use the same project as nzsteel-pm if you want everything
// in one place.
// ─────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://mztuehozsueasraygyew.supabase.co"; // e.g. https://abcdefgh.supabase.co
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16dHVlaG96c3VlYXNyYXlneWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMzg4NDYsImV4cCI6MjA5NjYxNDg0Nn0.14X0hLPFauElYha0gR2z9mgz_uFMNtQ0PpXHE8KUKUI"; // the public "anon" key, not the service_role key

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
