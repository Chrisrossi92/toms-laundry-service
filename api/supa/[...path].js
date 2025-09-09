// api/supa/[...path].js
export default async function handler(req, res) {
  try {
    const segments = Array.isArray(req.query.path) ? req.query.path : [];
    const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";

    // OPTIONAL: allow only /rest/v1/* and /auth/v1/*
    const first = segments[0];
    if (first !== "rest" && first !== "auth") {
      res.status(400).json({ error: "invalid_path" });
      return;
    }

    // Handle OPTIONS quickly (nice to have)
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "authorization, apikey, content-type, x-client-info");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
      res.status(200).end();
      return;
    }

    const targetBase = "https://<YOUR-PROJECT-REF>.supabase.co"; // <-- keep your real ref here
    const targetUrl = `${targetBase}/${segments.join("/")}${qs}`;

    // Build headers
    const anon = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    const headers = {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
      "x-client-info": "vercel-proxy",
    };
    if (req.headers["content-type"]) headers["content-type"] = req.headers["content-type"];

    const method = req.method || "GET";
    const body =
      method === "GET" || method === "HEAD"
        ? undefined
        : typeof req.body === "string"
        ? req.body
        : JSON.stringify(req.body ?? {});

    const r = await fetch(targetUrl, { method, headers, body });

    // Mirror response
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

