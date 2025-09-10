// api/supa/[...path].js
export default async function handler(req, res) {
  try {
    // CORS preflight
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers",
        "authorization, apikey, content-type, x-client-info, accept, accept-profile, prefer, range, if-none-match, if-match, content-profile"
      );
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
      res.status(200).end();
      return;
    }

    // Base URL from env
    const base = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "")
      .trim().replace(/[<>]/g, "").replace(/\/+$/, "");
    if (!base) return res.status(500).json({ error: "missing_supabase_url" });

    // Build target from incoming path/query
    const host = req.headers.host || "localhost";
    const url = new URL(req.url, `https://${host}`);
    const pathAfterProxy = url.pathname.replace(/^\/api\/supa\/?/, ""); // e.g. rest/v1/user_profiles
    const targetUrl = `${base}/${pathAfterProxy}${url.search || ""}`;

    // Keys
    const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!anon) return res.status(500).json({ error: "missing_anon_key" });

    // Forward browser headers (whitelist) + apikey
    const fwd = (name) => req.headers[name] ? { [name]: req.headers[name] } : {};
    const headers = {
      apikey: anon,
      ...fwd("authorization"),           // keep user access token if present
      ...fwd("content-type"),
      ...fwd("accept"),
      ...fwd("accept-profile"),          // important for PostgREST schema selection
      ...fwd("content-profile"),
      ...fwd("prefer"),
      ...fwd("range"),
      ...fwd("if-none-match"),
      ...fwd("if-match"),
      "x-client-info": req.headers["x-client-info"] || "vercel-proxy",
    };
    if (!headers.authorization) headers.authorization = `Bearer ${anon}`;

    // Stream body for non-GET/HEAD
    let body;
    if (req.method !== "GET" && req.method !== "HEAD") {
      const chunks = [];
      for await (const c of req) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
      body = Buffer.concat(chunks);
    }

    // Call Supabase
    const upstream = await fetch(targetUrl, { method: req.method, headers, body });

    // Mirror response
    res.status(upstream.status);
    const ct = upstream.headers.get("content-type");
    if (ct) res.setHeader("content-type", ct);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("x-proxy-target", targetUrl);

    const buf = Buffer.from(await upstream.arrayBuffer());
    res.send(buf);
  } catch (e) {
    // Always include target for debugging even on failure
    try {
      const host = req.headers.host || "localhost";
      const url = new URL(req.url, `https://${host}`);
      const base = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "")
        .trim().replace(/[<>]/g, "").replace(/\/+$/, "");
      const pathAfterProxy = url.pathname.replace(/^\/api\/supa\/?/, "");
      const targetUrl = base ? `${base}/${pathAfterProxy}${url.search || ""}` : "(base missing)";
      res.setHeader("x-proxy-target", targetUrl);
    } catch {}

    res.status(502).json({ error: e?.message || "upstream_fetch_failed" });
  }
}






