// src/lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON) throw new Error("Supabase env not set.");

const globalForSupabase = globalThis;

// Reuse the one instance across HMR/route changes
export const supabase =
  globalForSupabase.__supabase ??
  createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: {
      fetch: (url, opts) => {
        if (typeof url === "string" && url.startsWith(SUPABASE_URL)) {
          const u = new URL(url);
          const isProd =
            typeof window !== "undefined" &&
            !/^localhost$|^127\.0\.0\.1$/.test(window.location.hostname);

          // Always go DIRECT for Auth + these tables
          const direct = [
            "/auth/v1",
            "/rest/v1/user_profiles",
            "/rest/v1/zones",
            "/rest/v1/time_slots",
            "/rest/v1/settings_laundry",
            "/rest/v1/settings_pricing",
          ];
          if (direct.some((p) => u.pathname.startsWith(p))) return fetch(url, opts);

          // Everything else: proxy only on prod, direct in dev
          if (u.pathname.startsWith("/rest/v1") && isProd) {
            const proxied = "/api/supa" + url.slice(SUPABASE_URL.length);
            return fetch(proxied, opts);
          }
        }
        return fetch(url, opts);
      },
    },
  });

if (!globalForSupabase.__supabase) {
  globalForSupabase.__supabase = supabase;
}

export default supabase;






