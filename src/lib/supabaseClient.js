import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

// temporary debug
console.log("VITE_SUPABASE_URL:", url?.slice(0, 30) + "...", "ANON?", !!anon);

if (!url || !anon) {
  throw new Error(
    "Supabase env not set. Check app/.env.local (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) and restart dev server."
  );
}

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true },
});

