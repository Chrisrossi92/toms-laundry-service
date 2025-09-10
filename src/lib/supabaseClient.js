// src/lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  throw new Error("Supabase env not set.");
}

const isBrowser = typeof window !== "undefined";

const client = createClient(SUPABASE_URL, SUPABASE_ANON, {
  global: {
    // Proxy REST (except user_profiles); let AUTH go direct
    fetch: (url, opts) => {
      if (isBrowser && typeof url === "string" && url.startsWith(SUPABASE_URL)) {
        const u = new URL(url);
        if (u.pathname.startsWith("/auth/v1")) return fetch(url, opts); // AUTH direct
        if (u.pathname.startsWith("/rest/v1/user_profiles")) return fetch(url, opts); // read role direct
        if (u.pathname.startsWith("/rest/v1")) {
          const proxied = "/api/supa" + url.slice(SUPABASE_URL.length);
          return fetch(proxied, opts);
        }
      }
      return fetch(url, opts);
    },
  },
});

export const supabase = client;   // named export
export default client;            // default export (covers either import style)





