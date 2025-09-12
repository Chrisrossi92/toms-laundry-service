// Deploy with JWT disabled (Stripe doesn't send your JWT):
//   supabase functions deploy stripe_webhook --no-verify-jwt
//
// Required secrets (either name is accepted):
//   STRIPE_SECRET_KEY or STRIPE_KEY
//   STRIPE_WEBHOOK_SECRET or WEBHOOK_SECRET
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY or SERVICE_ROLE_KEY

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const STRIPE_SECRET_KEY =
  Deno.env.get("STRIPE_SECRET_KEY") ?? Deno.env.get("STRIPE_KEY");
const STRIPE_WEBHOOK_SECRET =
  Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? Deno.env.get("WEBHOOK_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY");

if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing STRIPE/SUPABASE env vars");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors() });
    if (req.method !== "POST")   return json({ error: "Method not allowed" }, 405);

    const sig =
      req.headers.get("stripe-signature") ||
      req.headers.get("Stripe-Signature");
    const rawBody = await req.text();

    const { default: Stripe } = await import("npm:stripe@12.16.0");
    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

    // IMPORTANT: use the ASYNC verifier in Deno/WebCrypto
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        rawBody,
        sig,
        STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      // Signature mismatch or wrong secret
      return json({ error: `Bad signature: ${err.message}` }, 400);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const md = session.metadata || {};

      // idempotency: skip if already recorded
      const { data: existing } = await supabase
        .from("orders")
        .select("id")
        .eq("stripe_session_id", session.id)
        .maybeSingle();
      if (existing) return json({ ok: true, idempotent: true });

      const pickup_slot_id = Number(md.pickup_slot_id || 0);
      if (!pickup_slot_id) return json({ error: "Missing pickup_slot_id" }, 400);

      // fetch slot for zone + usage
      const { data: slot, error: slotErr } = await supabase
        .from("time_slots")
        .select("id, zone_id, capacity, used_count")
        .eq("id", pickup_slot_id)
        .maybeSingle();
      if (slotErr || !slot) return json({ error: "Invalid pickup slot" }, 400);

      // amounts from metadata (strings -> ints)
      const subtotal_cents = parseInt(md.subtotal_cents || "0", 10);
      const fees_cents     = parseInt(md.fees_cents     || "0", 10);
      const total_cents    = parseInt(md.total_cents    || "0", 10);
      const est_bags       = Math.max(1, parseInt(md.est_bags || "1", 10));
      const user_id        = md.user_id || null;
      const currency       = (session.currency || "usd").toLowerCase();

      // insert order
      const { error: insertErr } = await supabase.from("orders").insert([{
        user_id,
        zone_id: slot.zone_id,
        pickup_slot_id,
        est_bags,
        subtotal_cents,
        fees_cents,
        tip_cents: 0,
        total_cents,
        currency,
        pricing_model: "per_bag",
        stripe_session_id: session.id,
      }]);
      if (insertErr) return json({ error: "Failed to insert order" }, 500);

      // bump slot usage (best effort; consider SQL guard later)
      await supabase
        .from("time_slots")
        .update({ used_count: (slot.used_count || 0) + 1 })
        .eq("id", pickup_slot_id);

      return json({ ok: true });
    }

    // acknowledge other events
    return json({ ok: true, ignored: event.type });
  } catch (e) {
    console.error("stripe_webhook fatal:", e);
    return json({ error: e?.message || "Server error" }, 500);
  }
});

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "content-type, stripe-signature",
  };
}
function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...cors() },
  });
}





