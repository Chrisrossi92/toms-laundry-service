export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  try {
    const { id, password, confirm = true, email } = await readJson(req);
    if (!id && !email) return res.status(400).json({ error: "missing_id_or_email" });
    if (!password) return res.status(400).json({ error: "missing_password" });

    const base = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
    const srk  = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!base || !srk) return res.status(500).json({ error: "missing_server_env" });

    // If email provided, look up the user to get id
    let userId = id;
    if (!userId && email) {
      const r = await fetch(`${base}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
        headers: { apikey: srk, Authorization: `Bearer ${srk}` }
      });
      if (!r.ok) return res.status(r.status).json(await r.json());
      const list = await r.json();
      userId = list?.users?.[0]?.id || list?.[0]?.id || null;
      if (!userId) return res.status(404).json({ error: "user_not_found" });
    }

    // Patch the user: set password and confirm email
    const payload = { password, ...(confirm ? { email_confirm: true } : {}) };
    const r2 = await fetch(`${base}/auth/v1/admin/users/${userId}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        apikey: srk,
        Authorization: `Bearer ${srk}`,
      },
      body: JSON.stringify(payload),
    });
    const body = await r2.json().catch(() => ({}));
    return res.status(r2.status).json(body);
  } catch (e) {
    return res.status(500).json({ error: e?.message || "server_error" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  const raw = Buffer.concat(chunks).toString("utf8") || "{}";
  return JSON.parse(raw);
}
