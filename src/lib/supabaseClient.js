import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;   // keep your real URL in env
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  throw new Error("Supabase env not set.");
}

// In the browser, route requests through /api/supa to avoid CORS
const shouldProxy = typeof window !== "undefined";

const client = createClient(SUPABASE_URL, SUPABASE_ANON, {
  global: {
    fetch: (url, opts) => {
      if (shouldProxy && url.startsWith(SUPABASE_URL)) {
        const proxied = "/api/supa" + url.slice(SUPABASE_URL.length);
        return fetch(proxied, opts);
      }
      return fetch(url, opts);
    },
  },
});

export const supabase = client;



