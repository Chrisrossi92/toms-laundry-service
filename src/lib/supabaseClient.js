import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON) throw new Error("Supabase env not set.");

const isBrowser = typeof window !== "undefined";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  global: {
    fetch: (url, opts) => {
      if (isBrowser && typeof url === "string" && url.startsWith(SUPABASE_URL)) {
        const u = new URL(url);
        // ✅ Proxy REST (and Storage if you’d like), but NOT Auth
        if (u.pathname.startsWith("/rest/v1")) {
          const proxied = "/api/supa" + url.slice(SUPABASE_URL.length);
          return fetch(proxied, opts);
        }
      }
      // Auth & everything else: go direct to Supabase
      return fetch(url, opts);
    },
  },
});



