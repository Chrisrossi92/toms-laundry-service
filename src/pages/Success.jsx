// src/pages/Success.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

function fmtUSD(cents = 0) {
  return (cents / 100).toFixed(2);
}
function fmtDateISO(iso) {
  try { return new Date(iso + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }); }
  catch { return iso; }
}
function fmtTime(t = "00:00:00") {
  const [h, m] = t.split(":").map(Number);
  const hour = ((h + 11) % 12) + 1;
  const ampm = h < 12 ? "AM" : "PM";
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

export default function Success() {
  const [order, setOrder] = useState(null);
  const [slot, setSlot] = useState(null);
  const [msg, setMsg] = useState("Finalizing your order…");

  useEffect(() => {
    const url = new URL(window.location.href);
    const sessionId = url.searchParams.get("session_id");

    if (!sessionId) {
      setMsg("Payment confirmed. Check your email for a receipt.");
      return;
    }

    let cancelled = false;
    (async () => {
      // Poll briefly until the webhook inserts the order
      for (let i = 0; i < 10; i++) {
        const { data, error } = await supabase
          .from("orders")
          .select("id,total_cents,subtotal_cents,fees_cents,pickup_slot_id,created_at")
          .eq("stripe_session_id", sessionId)
          .maybeSingle();

        if (error) break;
        if (data) {
          if (!cancelled) {
            setOrder(data);
            setMsg("Order confirmed! We’ll pick up at your selected time.");
          }
          // fetch the pickup slot for date/time display (best effort)
          if (data?.pickup_slot_id) {
            const { data: s } = await supabase
              .from("time_slots")
              .select("date,window_start,window_end")
              .eq("id", data.pickup_slot_id)
              .maybeSingle();
            if (!cancelled) setSlot(s || null);
          }
          return;
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      if (!cancelled) setMsg("Payment received. We’re processing your order now.");
    })();

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="rounded-2xl border border-white/40 bg-white/95 text-gray-900 shadow-xl">
        <div className="px-6 py-5 border-b">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-white">
              {/* check icon */}
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414l2.293 2.293 6.543-6.543a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </span>
            <div>
              <h1 className="text-xl font-semibold">Thanks for your order!</h1>
              <p className="text-sm text-gray-600" aria-live="polite">{msg}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          {order ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-lg border bg-white p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-500">Order</div>
                  <div className="mt-1 text-sm">ID: <span className="font-mono">{order.id}</span></div>
                  <div className="text-sm">Placed: {new Date(order.created_at).toLocaleString()}</div>
                </div>
                <div className="rounded-lg border bg-white p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-500">Total</div>
                  <div className="mt-1 text-lg font-semibold">${fmtUSD(order.total_cents)}</div>
                  <div className="text-sm text-gray-600">
                    Subtotal ${fmtUSD(order.subtotal_cents)} + Fees ${fmtUSD(order.fees_cents)}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-white p-4">
                <div className="text-xs uppercase tracking-wide text-gray-500">Pickup window</div>
                {slot ? (
                  <div className="mt-1 text-sm">
                    {fmtDateISO(slot.date)} • {fmtTime(slot.window_start)}–{fmtTime(slot.window_end)}
                  </div>
                ) : (
                  <div className="mt-1 text-sm text-gray-600">
                    We’ll email your confirmed pickup time shortly.
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  to="/track"
                  className="rounded-lg bg-black px-4 py-2 text-white hover:opacity-90"
                >
                  Track my order
                </Link>
                <Link
                  to="/schedule"
                  className="rounded-lg border px-4 py-2 hover:bg-gray-50"
                >
                  Schedule another pickup
                </Link>
              </div>

              <p className="text-xs text-gray-500">
                A receipt has been sent to your email. If anything looks off, reply to the receipt or contact support.
              </p>
            </div>
          ) : (
            <div className="text-sm text-gray-700">
              We’re finalizing your order details. This may take a few seconds.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


