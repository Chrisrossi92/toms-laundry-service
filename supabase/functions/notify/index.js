// supabase/functions/notify/index.js
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL   = Deno.env.get("SUPABASE_URL");
const SERVICE_KEY    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const POSTMARK_TOKEN = Deno.env.get("POSTMARK_TOKEN");
const FROM_EMAIL     = Deno.env.get("FROM_EMAIL");

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const LABEL = {
  scheduled: "Scheduled",
  pickup_en_route: "Driver en route for pickup",
  picked_up: "Picked up",
  processing: "Processing",
  ready_for_delivery: "Ready for delivery",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  completed: "Completed",
};

function subjectFor(event, orderId) {
  if (event?.startsWith("status:")) {
    const s = event.split(":")[1];
    return `Order #${orderId}: ${LABEL[s] || s}`;
  }
  return `Order #${orderId}: Update`;
}

function htmlFor(event, order, pickupStr) {
  const pretty = event?.startsWith("status:") ? LABEL[event.split(":")[1]] : "Update";
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.5">
    <h2 style="margin:0 0 8px">Tom’s Laundry Service</h2>
    <p style="margin:0 0 8px"><strong>${pretty}</strong> for your order <strong>#${order.id}</strong>.</p>
    ${pickupStr ? `<p style="margin:0 0 8px">Pickup window: ${pickupStr}</p>` : ""}
    <p style="margin:0 0 8px">Total: $${(order.total_cents/100).toFixed(2)}</p>
    <hr style="border:none;border-top:1px solid #eee;margin:16px 0" />
    <p style="color:#666;margin-top:8px;font-size:12px">
      You’re receiving these updates because you scheduled a pickup with Tom’s Laundry Service.
    </p>
  </div>`;
}

async function sendEmail(to, subject, html) {
  const res = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      "X-Postmark-Server-Token": POSTMARK_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      From: FROM_EMAIL,
      To: to,
      Subject: subject,
      HtmlBody: html,
      MessageStream: "outbound",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Postmark ${res.status}: ${text}`);
  }
}

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
    const { order_id, event } = await req.json(); // e.g. { order_id: 1, event: "status:out_for_delivery" }
    if (!order_id) return new Response(JSON.stringify({ error: "order_id required" }), { status: 400 });

    // Load order + slot (for pickup window in the email)
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(`
        id, user_id, total_cents, status,
        pickup_slot:time_slots!orders_pickup_slot_id_fkey(id, date, window_start, window_end)
      `)
      .eq("id", order_id)
      .maybeSingle();

    if (orderErr || !order) throw new Error("order not found");

    // User’s email (auth.users is accessible with service role)
    const { data: user } = await supabase
      .from("auth.users")
      .select("email")
      .eq("id", order.user_id)
      .maybeSingle();

    const to = user?.email;
    if (!to) return new Response(JSON.stringify({ ok: true, skipped: "no email" }), { status: 200 });

    // Respect email opt-in
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("email_opt_in")
      .eq("user_id", order.user_id)
      .maybeSingle();

    if (profile && profile.email_opt_in === false) {
      return new Response(JSON.stringify({ ok: true, skipped: "email opt-out" }), { status: 200 });
    }

    const pickupStr = order.pickup_slot
      ? `${order.pickup_slot.date} ${order.pickup_slot.window_start?.slice(0,5)}–${order.pickup_slot.window_end?.slice(0,5)}`
      : "";

    const subject = subjectFor(event, order.id);
    const html = htmlFor(event, order, pickupStr);

    await sendEmail(to, subject, html);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (e) {
    console.error("notify(email) error:", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500 });
  }
});

