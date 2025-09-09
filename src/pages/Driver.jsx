// src/pages/Driver.jsx
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { supabase } from "../lib/supabaseClient";
import OrderDetailsModal from "../components/orders/OrderDetailsModal.jsx";
import Card from "../components/ui/Card";
import { Button } from "../components/ui/Button";

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

const LABEL = {
  scheduled: "Scheduled",
  pickup_en_route: "En route (pickup)",
  picked_up: "Picked up",
  processing: "Processing",
  ready_for_delivery: "Ready",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  completed: "Completed",
};

export default function Driver() {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [orders, setOrders] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailsId, setDetailsId] = useState(null);

  async function fetchDay() {
    setLoading(true);

    // slots for selected date
    const { data: slots } = await supabase.from("time_slots").select("id").eq("date", date);
    const slotIds = (slots ?? []).map((s) => s.id);
    if (!slotIds.length) {
      setOrders([]);
      setLoading(false);
      return;
    }

    // orders the current user is allowed to see (RLS handles driver/admin scope)
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id, status, est_bags, total_cents, special_instructions,
        pickup_slot_id,
        pickup_slot:time_slots!orders_pickup_slot_id_fkey(id, date, window_start, window_end)
      `)
      .in("pickup_slot_id", slotIds)
      .order("status", { ascending: true })
      .order("id", { ascending: true });

    if (!error) setOrders(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchDay();
  }, [date]);

  // realtime refresh for this date’s slots
  useEffect(() => {
    let ch = supabase.channel(`drv-${date}`);
    (async () => {
      const { data: slots } = await supabase.from("time_slots").select("id").eq("date", date);
      const ids = (slots ?? []).map((s) => s.id);
      if (ids.length) {
        ch = supabase
          .channel(`drv-${date}-${ids.join("-")}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "orders", filter: `pickup_slot_id=in.(${ids.join(",")})` },
            fetchDay
          )
          .subscribe();
      }
    })();
    return () => supabase.removeChannel(ch);
  }, [date]);

  async function advance(o) {
    const i = FLOW.indexOf(o.status);
    if (i < 0 || i >= FLOW.length - 1) return;
    const next = FLOW[i + 1];

    // Optimistic UI
    setOrders((prev) => prev.map((x) => (x.id === o.id ? { ...x, status: next } : x)));
    setBusyId(o.id);

    const me = (await supabase.auth.getUser()).data.user?.id || null;
    const { error } = await supabase.rpc("advance_order_status", {
      p_order_id: o.id,
      p_next: next,
      p_actor: me,
    });

    setBusyId(null);
    if (error) {
      setOrders((prev) => prev.map((x) => (x.id === o.id ? { ...x, status: o.status } : x)));
      alert(error.message);
    } else {
      fetchDay();
    }
  }

  const grouped = useMemo(() => {
    const m = Object.fromEntries(FLOW.map((k) => [k, []]));
    for (const o of orders) (m[o.status] ||= []).push(o);
    return m;
  }, [orders]);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header controls */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-white">My route</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setDate(format(new Date(), "yyyy-MM-dd"))}>
            Today
          </Button>
          <Button variant="outline" onClick={() => {
            const d = new Date(); d.setDate(d.getDate() + 1); setDate(format(d, "yyyy-MM-dd"));
          }}>
            Tomorrow
          </Button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-white/30 bg-white/85 backdrop-blur px-3 py-2 text-gray-900"
          />
        </div>
      </div>

      {/* Columns by status */}
      {loading ? (
        <Card>Loading…</Card>
      ) : (
        <>
          {["scheduled", "pickup_en_route", "picked_up", "processing", "ready_for_delivery", "out_for_delivery", "delivered", "completed"]
            .filter((key) => (grouped[key] || []).length > 0)
            .map((key) => (
              <Section key={key} title={LABEL[key]}>
                {(grouped[key] || []).map((o) => (
                  <OrderCard
                    key={o.id}
                    o={o}
                    busy={busyId === o.id}
                    onAdvance={() => advance(o)}
                    onDetails={() => setDetailsId(o.id)}
                  />
                ))}
              </Section>
            ))}
          {/* If no orders at all */}
          {orders.length === 0 && <Card>No assignments for {date}.</Card>}
        </>
      )}

      {detailsId && (
        <OrderDetailsModal orderId={detailsId} onClose={() => setDetailsId(null)} />
      )}
    </div>
  );
}

/* ========= small view components ========= */

function Section({ title, children }) {
  return (
    <div className="mt-4">
      <div className="font-semibold text-white/90 mb-2">{title}</div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function OrderCard({ o, busy, onAdvance, onDetails }) {
  const slot = o.pickup_slot;
  const when = slot ? `${slot.date} ${slot.window_start?.slice(0, 5)}–${slot.window_end?.slice(0, 5)}` : "—";

  return (
    <Card className="bg-white/90">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-900">Order #{o.id}</div>
        <div className="text-xs text-gray-600">${(o.total_cents / 100).toFixed(2)}</div>
      </div>
      <div className="mt-1 text-xs text-gray-600">{when}</div>
      {o.special_instructions && (
        <div className="mt-1">
          <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-white/60 border">
            Notes
          </span>
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button onClick={onAdvance} disabled={busy}>{busy ? "Updating…" : "Advance"}</Button>
        <Button variant="outline" onClick={onDetails}>View details</Button>
      </div>
    </Card>
  );
}

