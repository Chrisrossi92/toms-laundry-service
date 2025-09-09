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

    // Catch-all param can be array OR string; normalize it
    const raw = req.query.path;
    const segments = Array.isArray(raw) ? raw : (raw ? [raw] : []);
    const qsIndex = req.url.indexOf("?");
    const qs = qsIndex !== -1 ? req.url.slice(qsIndex) : "";

    // Build base from env, sanitize
    const base = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "")
      .trim()
      .replace(/[<>]/g, "")
      .replace(/\/+$/, "");
    if (!base) {
      res.status(500).json({ error: "missing_supabase_url" });
      return;
    }

    // ✅ Remove the “allow only rest/auth” guard to avoid false negatives
    const targetUrl = `${base}/${segments.join("/")}${qs}`;

    const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const headers = {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
      "x-client-info": "vercel-proxy",
    };
    if (req.headers["content-type"]) headers["content-type"] = req.headers["content-type"];

    // Stream raw body so /auth/v1/signup receives the JSON correctly
    let body;
    if (req.method !== "GET" && req.method !== "HEAD") {
      const chunks = [];
      for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      body = Buffer.concat(chunks);
    }

    const r = await fetch(targetUrl, { method: req.method, headers, body });

    res.status(r.status);
    const ct = r.headers.get("content-type");
    if (ct) res.setHeader("content-type", ct);
    res.setHeader("Access-Control-Allow-Origin", "*");
    const buf = Buffer.from(await r.arrayBuffer());
    res.send(buf);
  } catch (e) {
    res.status(500).json({ error: e?.message || "proxy_error" });
  }
}



