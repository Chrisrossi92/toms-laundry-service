// supabase/functions/invite-user/index.js
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL   = Deno.env.get("SUPABASE_URL");
const SERVICE_KEY    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SITE_URL       = Deno.env.get("SITE_URL") || "http://localhost:5173";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  try {
    // Require admin caller (simple check: caller must be logged in and role=admin)
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: s } = await supabase.auth.getUser(token);
    const caller = s?.user;
    if (!caller) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    const { data: callerProf } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("user_id", caller.id)
      .maybeSingle();

    if (callerProf?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Only admins can invite users" }), { status: 403 });
    }

    const { email, role } = await req.json(); // role in {'driver','admin','customer'}
    if (!email || !role) {
      return new Response(JSON.stringify({ error: "email and role required" }), { status: 400 });
    }

    // 1) Create an auth user (invite sends email)
    const { data: invited, error: invErr } = await supabase.auth.admin.inviteUserByEmail(email, {
      emailRedirectTo: `${SITE_URL}/me`,
    });
    if (invErr) throw invErr;

    const userId = invited.user?.id;
    if (!userId) throw new Error("No user created");

    // 2) Upsert user_profiles with role
    const { error: upErr } = await supabase
      .from("user_profiles")
      .upsert({ user_id: userId, role }, { onConflict: "user_id" });

    if (upErr) throw upErr;

    return new Response(JSON.stringify({ ok: true, user_id: userId }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (e) {
    console.error("invite-user error:", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500 });
  }
});
