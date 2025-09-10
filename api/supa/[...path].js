// api/supa/[...path].js
export default async function handler(req, res) {
  try {
    // CORS preflight
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "authorization, apikey, content-type, x-client-info");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
      res.status(200).end();
      return;
    }

    // Base URL from env (prefer server var), sanitize and strip trailing slash
    const base = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "")
      .trim()
      .replace(/[<>]/g, "")
      .replace(/\/+$/, "");
    if (!base) return res.status(500).json({ error: "missing_supabase_url" });

    // Build target URL from the incoming request (preserve path/query after /api/supa/)
    const host = req.headers.host || "localhost";
    const full = new URL(req.url, `https://${host}`);
    const pathAfterProxy = full.pathname.replace(/^\/api\/supa\/?/, ""); // e.g. rest/v1/... or auth/v1/...
    const targetUrl = `${base}/${pathAfterProxy}${full.search || ""}`;

    // Keys
    const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!anon) return res.status(500).json({ error: "missing_anon_key" });

    // Forward headers: keep user's Authorization if present (critical for recovery/current user)
    const headers = {
      apikey: anon,
      "x-client-info": req.headers["x-client-info"] || "vercel-proxy",
      ...(req.headers["content-type"] ? { "content-type": req.headers["content-type"] } : {}),
      Authorization: req.headers.authorization ? req.headers.authorization : `Bearer ${anon}`,
    };

    // Stream body for non-GET/HEAD
    let body;
    if (req.method !== "GET" && req.method !== "HEAD") {
      const chunks = [];
      for await (const c of req) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
      body = Buffer.concat(chunks);
    }

    // Forward to Supabase
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
    res.status(500).json({ error: e?.message || "proxy_error" });
  }
}





