// src/pages/Track.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useSession } from "../lib/AuthProvider.jsx";
import { format } from "date-fns";

const LABEL = {
  created: "Created",
  scheduled: "Scheduled",
  pickup_en_route: "Driver en route (pickup)",
  picked_up: "Picked up",
  processing: "Processing",
  ready_for_delivery: "Ready for delivery",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  completed: "Completed",
};

const FLOW = [
  "scheduled",
  "pickup_en_route",
  "picked_up",
  "processing",
  "ready_for_delivery",
  "out_for_delivery",
  "delivered",
  "completed",
];

export default function Track() {
  const { session } = useSession();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Deep-link focus (e.g., /track?order=123)
  const [focusId, setFocusId] = useState(null);
  const cardRefs = useRef({}); // orderId -> DOM element

  useEffect(() => {
    const u = new URL(window.location.href);
    const idParam = u.searchParams.get("order");
    if (idParam) setFocusId(Number(idParam));
  }, []);

  async function fetchOrders() {
    if (!session) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id, status, total_cents, payment_status, created_at, special_instructions,
        pickup_slot:time_slots!orders_pickup_slot_id_fkey(id, date, window_start, window_end)
      `)
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error) setOrders(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line
  }, [session]);

  // Realtime refresh when my orders change
  useEffect(() => {
    if (!session) return;
    const ch = supabase
      .channel("orders-track")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${session.user.id}` },
        fetchOrders
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [session]);

  // Scroll to focused order after load
  useEffect(() => {
    if (focusId && cardRefs.current[focusId]) {
      cardRefs.current[focusId].scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [orders, focusId]);

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl font-semibold text-white mb-3">Your recent orders</h2>

      {loading ? (
        <div className="rounded-xl bg-white/75 backdrop-blur p-6 border border-white/30">Loading…</div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl bg-white/75 backdrop-blur p-6 border border-white/30 text-gray-700">
          No orders yet.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              cardRef={(el) => {
                cardRefs.current[o.id] = el;
              }}
              focused={focusId === o.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Order Card ---------- */

function OrderCard({ order, cardRef, focused }) {
  const [open, setOpen] = useState(false);

  const stepIndex = useMemo(() => {
    const i = FLOW.indexOf(order.status);
    return i === -1 ? 0 : i;
  }, [order.status]);

  const pickup = order.pickup_slot
    ? `${order.pickup_slot.date} ${order.pickup_slot.window_start?.slice(0, 5)}–${order.pickup_slot.window_end?.slice(0, 5)}`
    : "—";

  return (
    <>
      <div
        ref={cardRef}
        className={
          "rounded-xl bg-white/80 backdrop-blur border p-4 shadow-sm " +
          (focused ? "border-black ring-2 ring-black" : "border-white/40")
        }
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm text-gray-500">Order #{order.id}</div>
            <div className="text-xs text-gray-500">
              Placed {format(new Date(order.created_at), "MMM d, yyyy p")}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Total</div>
            <div className="text-lg font-semibold text-gray-900">
              ${(order.total_cents / 100).toFixed(2)}
            </div>
            {order.payment_status === "paid" && (
              <div className="mt-1 text-xs text-green-600">Paid ✓</div>
            )}
          </div>
        </div>

        <div className="mt-3 grid md:grid-cols-2 gap-3">
          <InfoRow label="Status" value={LABEL[order.status] || order.status} />
          <InfoRow label="Pickup window" value={pickup} />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <Progress flow={FLOW} labelMap={LABEL} current={stepIndex} />
          <button
            className="rounded-md bg-black px-3 py-1.5 text-white text-xs"
            onClick={() => setOpen(true)}
          >
            View details
          </button>
        </div>
      </div>

      {open && <DetailsModal orderId={order.id} onClose={() => setOpen(false)} />}
    </>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-lg bg-white/70 border border-white/50 p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-sm text-gray-900">{value}</div>
    </div>
  );
}

function Progress({ flow, labelMap, current }) {
  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {flow.map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className={"h-2 w-2 rounded-full " + (i <= current ? "bg-black" : "bg-gray-300")} />
            {i < flow.length - 1 && (
              <span className={"h-[2px] w-16 md:w-28 " + (i < current ? "bg-black" : "bg-gray-300")} />
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between text-[10px] md:text-xs text-gray-600">
        <span className="truncate">{labelMap[flow[0]]}</span>
        <span className="truncate">{labelMap[flow[Math.min(current, flow.length - 1)]]}</span>
        <span className="truncate">{labelMap[flow[flow.length - 1]]}</span>
      </div>
    </div>
  );
}

/* ---------- Details Modal ---------- */

function DetailsModal({ orderId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [bags, setBags] = useState([]);
  const [events, setEvents] = useState([]);

  async function load() {
    setLoading(true);
    // order + slot
    const { data: o } = await supabase
      .from("orders")
      .select(`
        id, status, est_bags, actual_bags, total_cents, special_instructions,
        pickup_slot:time_slots!orders_pickup_slot_id_fkey(id, date, window_start, window_end),
        created_at, payment_status
      `)
      .eq("id", orderId)
      .maybeSingle();

    const { data: b } = await supabase
      .from("order_bags")
      .select("id, bag_code, weight_lbs, notes")
      .eq("order_id", orderId)
      .order("id", { ascending: true });

    const { data: ev } = await supabase
      .from("order_events")
      .select("id, event_type, created_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    setOrder(o || null);
    setBags(b || []);
    setEvents(ev || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`order-${orderId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `id=eq.${orderId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_bags", filter: `order_id=eq.${orderId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_events", filter: `order_id=eq.${orderId}` }, load)
      .subscribe();
    return () => supabase.removeChannel(ch);
    // eslint-disable-next-line
  }, [orderId]);

  return (
    <div className="fixed inset-0 z-50">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-x-0 top-16 mx-auto max-w-3xl rounded-2xl bg-white/90 backdrop-blur border border-white/50 shadow-xl p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Order #{orderId} details</h3>
          <button className="text-sm text-gray-600 hover:underline" onClick={onClose}>
            Close
          </button>
        </div>

        {loading || !order ? (
          <div className="mt-4 text-sm text-gray-700">Loading…</div>
        ) : (
          <>
            <div className="mt-4 grid md:grid-cols-2 gap-4">
              <InfoBox label="Status" value={LABEL[order.status] || order.status} />
              <InfoBox
                label="Pickup window"
                value={
                  order.pickup_slot
                    ? `${order.pickup_slot.date} ${order.pickup_slot.window_start?.slice(0, 5)}–${order.pickup_slot.window_end?.slice(0, 5)}`
                    : "—"
                }
              />
              <InfoBox label="Estimated bags" value={order.est_bags ?? "—"} />
              <InfoBox label="Actual bags" value={order.actual_bags ?? "—"} />
              <InfoBox label="Total" value={`$${(order.total_cents / 100).toFixed(2)}`} />
              <InfoBox label="Payment" value={order.payment_status === "paid" ? "Paid ✓" : order.payment_status || "—"} />
            </div>

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

            <div className="mt-6 rounded-xl border border-white/60 bg-white/80 p-4">
              <div className="font-semibold text-gray-900 mb-2">Events</div>
              {events.length === 0 ? (
                <div className="text-sm text-gray-600">No events yet.</div>
              ) : (
                <ul className="text-sm text-gray-800 space-y-1">
                  {events.map((ev) => (
                    <li key={ev.id} className="flex items-center justify-between">
                      <span>{prettyEvent(ev.event_type)}</span>
                      <span className="text-xs text-gray-600">
                        {format(new Date(ev.created_at), "MMM d, yyyy p")}
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

function prettyEvent(event_type) {
  if (event_type?.startsWith("status:")) {
    const s = event_type.split(":")[1];
    return `Status → ${LABEL[s] || s}`;
  }
  return event_type || "event";
}



