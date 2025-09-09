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

    // Build base from env, sanitize, strip trailing slash
    const base = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "")
      .trim()
      .replace(/[<>]/g, "")
      .replace(/\/+$/, "");
    if (!base) return res.status(500).json({ error: "missing_supabase_url" });

    // 🔧 Robust path extraction: parse from req.url (ignore dynamic param)
    // req.url is something like: /api/supa/rest/v1/...?... 
    const host = req.headers.host || "localhost";
    const full = new URL(req.url, `https://${host}`);
    const pathAfterProxy = full.pathname.replace(/^\/api\/supa\/?/, ""); // rest/v1/...
    const qs = full.search || "";
    const targetUrl = `${base}/${pathAfterProxy}${qs}`;

    const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!anon) return res.status(500).json({ error: "missing_anon_key" });

    const headers = {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
      "x-client-info": "vercel-proxy",
    };
    if (req.headers["content-type"]) headers["content-type"] = req.headers["content-type"];

    // Stream raw body for POST/PATCH/etc (needed for /auth/v1/signup)
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
    res.setHeader("x-proxy-target", targetUrl);

    const buf = Buffer.from(await r.arrayBuffer());
    res.send(buf);
  } catch (e) {
    res.status(500).json({ error: e?.message || "proxy_error" });
  }
}




