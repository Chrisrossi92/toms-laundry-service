// supabase/functions/create-checkout/index.js
//
// Env (Functions → Secrets):
//   STRIPE_SECRET_KEY=sk_test_...
//   SUPABASE_URL=https://<project>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY=<service role key>
//   SITE_URL=http://localhost:5173   (or your prod URL)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SITE_URL = Deno.env.get("SITE_URL") || "http://localhost:5173";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function cors(body, status = 200, extra = {}) {
  const headers = new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    ...extra,
  });
  return new Response(body === null ? null : JSON.stringify(body), { status, headers });
}

serve(async (req) => {
  // Preflight
  if (req.method === "OPTIONS") return cors(null, 204);

  try {
    // Lazy-load Stripe (prevents module crash if secret missing)
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) throw new Error("Server misconfigured: STRIPE_SECRET_KEY is missing.");
    const { default: Stripe } = await import("npm:stripe@12.16.0");
    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

    // Parse request body
    const { zip, pickup_slot_id, est_bags, instructions, customer_email } = await req.json();

    // Identify user if logged in (guest allowed)
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userRes } = await supabase.auth.getUser(token);
    const authUser = userRes?.user || null;

    if (!authUser && !customer_email) {
      return cors({ error: "customer_email required for guest checkout" }, 400);
    }

    // Load pricing (fallback if no row)
    const { data: pricingRows } = await supabase
      .from("settings_pricing")
      .select("per_bag_cents,pickup_fee_cents,min_order_cents,free_pickup_threshold_cents")
      .order("updated_at", { ascending: false })
      .limit(1);

    const pricing = pricingRows?.[0] || {
      per_bag_cents: 2500,
      pickup_fee_cents: 300,
      min_order_cents: 0,
      free_pickup_threshold_cents: 0,
    };

    // Compute totals server-side
    const bags = Math.max(1, Number(est_bags || 1));
    const baseSubtotal = bags * pricing.per_bag_cents;
    const subtotal = Math.max(baseSubtotal, pricing.min_order_cents || 0);
    const fee =
      pricing.free_pickup_threshold_cents &&
      subtotal >= pricing.free_pickup_threshold_cents
        ? 0
        : pricing.pickup_fee_cents || 0;
    const total = subtotal + fee; // cents

    // Validate slot capacity
    const { data: slot, error: slotErr } = await supabase
      .from("time_slots")
      .select("id, capacity, used_count, zone_id")
      .eq("id", pickup_slot_id)
      .maybeSingle();

    if (slotErr || !slot) return cors({ error: "Invalid or missing pickup_slot_id" }, 400);
    if (slot.used_count >= slot.capacity) return cors({ error: "Slot is full" }, 409);

    // Build Stripe Checkout Session with FULL metadata used by webhook
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${SITE_URL}/success`,
      cancel_url: `${SITE_URL}/cancel`,
      customer_email: authUser ? undefined : (customer_email || undefined),
      payment_intent_data: { metadata: { purpose: "tls-order" } },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: total, // cents
            product_data: {
              name: `Laundry pickup (${bags} bag${bags > 1 ? "s" : ""})`,
              description: "Flat-rate per-bag + pickup fee",
            },
          },
        },
      ],
      metadata: {
        user_id: authUser?.id || "",
        zip,
        pickup_slot_id: String(pickup_slot_id),
        est_bags: String(bags),
        instructions: instructions || "",
        subtotal_cents: String(subtotal),
        fees_cents: String(fee),
        tip_cents: "0",
        total_cents: String(total),
        customer_email: customer_email || authUser?.email || "",
      },
    });

    return cors({ url: session.url });
  } catch (e) {
    console.error("create-checkout error:", e);
    return cors({ error: e?.message || "Failed to create checkout" }, 500);
  }
});




