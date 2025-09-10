export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  global: {
    fetch: (url, opts) => {
      if (typeof window !== "undefined" && typeof url === "string" && url.startsWith(SUPABASE_URL)) {
        const u = new URL(url);
        // ⚠️ Auth stays direct
        if (u.pathname.startsWith("/auth/v1")) return fetch(url, opts);
        // Send user_profiles direct too (avoids any proxy edge cases)
        if (u.pathname.startsWith("/rest/v1/user_profiles")) return fetch(url, opts);
        // Everything else in REST goes through the proxy
        if (u.pathname.startsWith("/rest/v1")) {
          const proxied = "/api/supa" + url.slice(SUPABASE_URL.length);
          return fetch(proxied, opts);
        }
      }
      return fetch(url, opts);
    },
  },
});




