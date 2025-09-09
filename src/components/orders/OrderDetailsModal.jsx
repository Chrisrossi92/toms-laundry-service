import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function OrderDetailsModal({ orderId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [order, setOrder]   = useState(null);
  const [bags, setBags]     = useState([]);
  const [events, setEvents] = useState([]);
  const [contact, setContact] = useState(null); // { email, phone }

  async function load() {
    setLoading(true);

    // core order + slot
    const { data: o } = await supabase
      .from("orders")
      .select(`
        id, status, est_bags, actual_bags, total_cents, special_instructions, user_id,
        pickup_slot:time_slots!orders_pickup_slot_id_fkey(id, date, window_start, window_end),
        created_at, payment_status
      `)
      .eq("id", orderId)
      .maybeSingle();

    // bags
    const { data: b } = await supabase
      .from("order_bags")
      .select("id, bag_code, weight_lbs, notes")
      .eq("order_id", orderId)
      .order("id");

    // events
    const { data: ev } = await supabase
      .from("order_events")
      .select("id, event_type, created_at")
      .eq("order_id", orderId)
      .order("created_at");

    // contact (best-effort; service role not needed when reading via RLS-enabled views)
    let email = null, phone = null;
    if (o?.user_id) {
      const { data: u } = await supabase.from("auth.users").select("email").eq("id", o.user_id).maybeSingle();
      email = u?.email || null;
      const { data: p } = await supabase.from("user_profiles").select("phone").eq("user_id", o.user_id).maybeSingle();
      phone = p?.phone || null;
    }

    setOrder(o || null);
    setBags(b || []);
    setEvents(ev || []);
    setContact({ email, phone });
    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`order-${orderId}-driver`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `id=eq.${orderId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_bags", filter: `order_id=eq.${orderId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_events", filter: `order_id=eq.${orderId}` }, load)
      .subscribe();
    return () => supabase.removeChannel(ch);
    // eslint-disable-next-line
  }, [orderId]);

  const LABEL = {
    scheduled: "Scheduled",
    pickup_en_route: "Driver en route (pickup)",
    picked_up: "Picked up",
    processing: "Processing",
    ready_for_delivery: "Ready for delivery",
    out_for_delivery: "Out for delivery",
    delivered: "Delivered",
    completed: "Completed",
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-x-0 top-16 mx-auto max-w-3xl rounded-2xl bg-white/90 backdrop-blur border border-white/50 shadow-xl p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Order #{orderId} details</h3>
          <button className="text-sm text-gray-600 hover:underline" onClick={onClose}>Close</button>
        </div>

        {loading || !order ? (
          <div className="mt-4 text-sm text-gray-700">Loading…</div>
        ) : (
          <>
            {/* Top summary */}
            <div className="mt-4 grid md:grid-cols-2 gap-4">
              <InfoBox label="Status" value={LABEL[order.status] || order.status} />
              <InfoBox
                label="Pickup window"
                value={
                  order.pickup_slot
                    ? `${order.pickup_slot.date} ${order.pickup_slot.window_start?.slice(0,5)}–${order.pickup_slot.window_end?.slice(0,5)}`
                    : "—"
                }
              />
              <InfoBox label="Estimated bags" value={order.est_bags ?? "—"} />
              <InfoBox label="Actual bags" value={order.actual_bags ?? "—"} />
              <InfoBox label="Total" value={`$${(order.total_cents/100).toFixed(2)}`} />
              <InfoBox label="Payment" value={order.payment_status === "paid" ? "Paid ✓" : order.payment_status || "—"} />
            </div>

            {/* Contact block (helpful for drivers/admins) */}
            <div className="mt-6 rounded-xl border border-white/60 bg-white/80 p-4">
              <div className="font-semibold text-gray-900 mb-2">Customer contact</div>
              <div className="text-sm text-gray-800 space-y-1">
                <div>Email: {contact?.email || "—"}</div>
                <div>Phone: {contact?.phone || "—"}</div>
              </div>
            </div>

            {/* Instructions + Bags */}
            <div className="mt-6 grid md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/60 bg-white/80 p-4">
                <div className="font-semibold text-gray-900 mb-2">Special instructions</div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {order.special_instructions || "—"}
                </p>
              </div>

              <div className="rounded-xl border border-white/60 bg-white/80 p-4">
                <div className="font-semibold text-gray-900 mb-2">Bag codes</div>
                {bags.length === 0 ? (
                  <div className="text-sm text-gray-600">No bags recorded yet.</div>
                ) : (
                  <ul className="text-sm text-gray-800 space-y-1">
                    {bags.map((b) => (
                      <li key={b.id} className="flex items-center justify-between">
                        <span className="font-mono">{b.bag_code}</span>
                        <span className="text-xs text-gray-600">
                          {b.weight_lbs ? `${b.weight_lbs} lbs` : ""} {b.notes ? `• ${b.notes}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Events */}
            <div className="mt-6 rounded-xl border border-white/60 bg-white/80 p-4">
              <div className="font-semibold text-gray-900 mb-2">Events</div>
              {events.length === 0 ? (
                <div className="text-sm text-gray-600">No events yet.</div>
              ) : (
                <ul className="text-sm text-gray-800 space-y-1">
                  {events.map((ev) => (
                    <li key={ev.id} className="flex items-center justify-between">
                      <span>{ev.event_type}</span>
                      <span className="text-xs text-gray-600">
                        {new Date(ev.created_at).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-xl border border-white/60 bg-white/80 p-4">
      <div className="text-xs text-gray-600">{label}</div>
      <div className="text-sm text-gray-900">{value}</div>
    </div>
  );
}
