// supabase/functions/stripe-webhook/index.js
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// Env
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY");

// --- Debug logging (safe) ---
function checkSecrets() {
  const required = {
    SUPABASE_URL,
    SERVICE_ROLE_KEY,
    WEBHOOK_SECRET,
    STRIPE_KEY,
  };

  for (const [name, value] of Object.entries(required)) {
    if (!value) {
      console.error(`❌ Missing secret: ${name}`);
    } else {
      console.log(`✅ Loaded secret: ${name}`);
    }
  }
}
checkSecrets();

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  // Stripe sends signed JSON, must verify the raw body
  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  try {
    if (!STRIPE_KEY) throw new Error("STRIPE_SECRET_KEY missing");
    if (!WEBHOOK_SECRET) throw new Error("STRIPE_WEBHOOK_SECRET missing");

    // Lazy import Stripe so build doesn’t fail if key missing
    const { default: Stripe } = await import("npm:stripe@12.16.0");
    const stripe = new Stripe(STRIPE_KEY, { apiVersion: "2023-10-16" });

    let event;
    try {
      event = stripe.webhooks.constructEvent(raw, sig, WEBHOOK_SECRET);
    } catch (err) {
      console.error("❌ Signature verification failed:", err.message);
      return json({ error: "Bad signature" }, 400);
    }

    console.log("✅ Stripe event received:", event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      // Insert order into Supabase
      const { error } = await supabase.from("orders").insert({
        user_id: session.metadata?.user_id || null,
        status: "scheduled",
        pricing_model: "per_bag",
        amount_paid: session.amount_total,
      });

      if (error) {
        console.error("❌ Failed to insert order:", error.message);
        return json({ error: "DB insert failed" }, 500);
      }

      console.log("✅ Order created for session", session.id);
    }

    return json({ ok: true });
  } catch (err) {
    console.error("❌ Stripe webhook error:", err.message);
    return json({ error: err.message }, 400);
  }
});


