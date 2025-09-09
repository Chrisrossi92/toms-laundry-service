// src/pages/Dashboard.jsx
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { supabase } from "../lib/supabaseClient";

// widgets & UI
import AssignDriverModal from "../components/admin/AssignDriverModal";
import OrderDetailsModal from "../components/orders/OrderDetailsModal.jsx";
import Kpi from "../components/admin/Kpi";
import Card from "../components/ui/Card";
import { Button } from "../components/ui/Button";

// data hooks
import { useOrdersForDate } from "../hooks/useOrdersForDate";
import { useSlotsForDate } from "../hooks/useSlotsForDate";

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

export default function Dashboard() {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const { orders, loading, setOrders } = useOrdersForDate(date);
  const slots = useSlotsForDate(date);

  const [busy, setBusy] = useState(null);
  const [assigning, setAssigning] = useState(null);
  const [expandedCol, setExpandedCol] = useState(null);
  const [detailsId, setDetailsId] = useState(null);

  const totals = useMemo(() => {
    const pickups = orders.filter((o) => o.status !== "completed").length;
    const deliveries = orders.filter((o) =>
      ["out_for_delivery", "delivered", "completed"].includes(o.status)
    ).length;
    const revenue_cents = orders.reduce(
      (s, o) => s + (o.payment_status === "paid" ? o.total_cents : 0),
      0
    );
    const capacity = slots.reduce((s, x) => s + x.capacity, 0);
    const used = slots.reduce((s, x) => s + x.used_count, 0);
    return { pickups, deliveries, revenue_cents, capacity, used };
  }, [orders, slots]);

  async function advance(o) {
    const idx = FLOW.indexOf(o.status);
    if (idx < 0 || idx === FLOW.length - 1) return;
    const next = FLOW[idx + 1];

    setOrders((prev) => prev.map((x) => (x.id === o.id ? { ...x, status: next } : x)));
    setBusy(o.id);

    const me = (await supabase.auth.getUser()).data.user?.id || null;
    const { error } = await supabase.rpc("advance_order_status", {
      p_order_id: o.id,
      p_next: next,
      p_actor: me,
    });

    setBusy(null);
    if (error) {
      setOrders((prev) => prev.map((x) => (x.id === o.id ? { ...x, status: o.status } : x)));
      alert(error.message);
    }
  }

  async function assign(order, email) {
    const { error } = await supabase.rpc("assign_driver_by_email", {
      p_order_id: order.id,
      p_driver_email: email || null,
    });
    if (error) alert(error.message);
  }

  const byStatus = useMemo(() => {
    const m = Object.fromEntries(FLOW.map((s) => [s, []]));
    for (const o of orders) (m[o.status] || (m[o.status] = [])).push(o);
    return m;
  }, [orders]);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-white">Operations</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setDate(format(new Date(), "yyyy-MM-dd"))}>
            Today
          </Button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-white/30 bg-white/85 backdrop-blur px-3 py-2 text-gray-900"
          />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid md:grid-cols-4 gap-3 mt-3">
        <Kpi label="Pickups" value={totals.pickups} />
        <Kpi label="Deliveries" value={totals.deliveries} />
        <Kpi label="Revenue" value={`$${(totals.revenue_cents / 100).toFixed(2)}`} />
        <Kpi label="Capacity used" value={`${totals.used}/${totals.capacity}`} />
      </div>

      {/* Columns */}
      {loading ? (
        <Card className="mt-4">Loading…</Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4 mt-4">
            {["scheduled", "pickup_en_route", "picked_up", "processing"].map((col) => (
              <Column
                key={col}
                keyName={col}
                title={LABEL[col]}
                items={byStatus[col]}
                busyId={busy}
                onAdvance={advance}
                onAssign={(o) => setAssigning(o)}
                onDetails={(id) => setDetailsId(id)}
                expandedCol={expandedCol}
                setExpandedCol={setExpandedCol}
              />
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-4 mt-4">
            {["ready_for_delivery", "out_for_delivery", "delivered", "completed"].map((col) => (
              <Column
                key={col}
                keyName={col}
                title={LABEL[col]}
                items={byStatus[col]}
                busyId={busy}
                onAdvance={advance} // not shown in UI here
                onAssign={(o) => setAssigning(o)}
                onDetails={(id) => setDetailsId(id)}
                expandedCol={expandedCol}
                setExpandedCol={setExpandedCol}
              />
            ))}
          </div>
        </>
      )}

      {/* Modals */}
      {assigning && (
        <AssignDriverModal
          order={assigning}
          onSave={(o, e) => {
            assign(o, e);
            setAssigning(null);
          }}
          onClose={() => setAssigning(null)}
        />
      )}
      {detailsId && <OrderDetailsModal orderId={detailsId} onClose={() => setDetailsId(null)} />}
    </div>
  );
}

/* ---------- Column: counts, expand; scheduled-only assign/reassign; consistent buttons ---------- */
function Column({
  keyName,
  title,
  items,
  busyId,
  onAdvance,
  onAssign,
  onDetails,
  expandedCol,
  setExpandedCol,
}) {
  const count = items.length;
  const expanded = expandedCol === keyName;
  const preview = expanded ? items : items.slice(0, 3);

  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <button
          className="font-semibold text-gray-900 text-left"
          onClick={() => setExpandedCol(expanded ? null : keyName)}
          title={expanded ? "Collapse" : "Expand"}
        >
          {title} {count > 0 && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-white/70 border">{count}</span>}
        </button>
        {count > 3 && (
          <button className="text-xs underline" onClick={() => setExpandedCol(expanded ? null : keyName)}>
            {expanded ? "Collapse" : `View all (${count})`}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {count === 0 && <div className="text-xs text-gray-500">No orders</div>}
        {preview.map((o) => {
          const isScheduled = keyName === "scheduled";
          const assigned = !!o.assigned_driver_id;

          return (
            <Card key={o.id} className="border-white/40 bg-white/85">
              {/* header line with badge near order number */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium text-gray-900">Order #{o.id}</div>
                  {isScheduled && assigned && (
                    <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-green-100 border border-green-200 text-green-700">
                      Assigned
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-600">${(o.total_cents / 100).toFixed(2)}</div>
              </div>

              {o.pickup_slot && (
                <div className="mt-1 text-xs text-gray-600">
                  {o.pickup_slot.date} {o.pickup_slot.window_start?.slice(0, 5)}–{o.pickup_slot.window_end?.slice(0, 5)}
                </div>
              )}
              {o.special_instructions && (
                <div className="mt-1">
                  <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-white/60 border">Notes</span>
                </div>
              )}

              {/* actions: always two buttons, same place */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                {isScheduled ? (
                  <>
                    <Button variant="outline" onClick={() => onAssign(o)}>
                      {assigned ? "Reassign" : "Assign driver"}
                    </Button>
                    <Button variant="outline" onClick={() => onDetails(o.id)}>Details</Button>
                  </>
                ) : (
                  <>
                    {/* left slot kept for symmetry; could add future action here if needed */}
                    <span />
                    <Button variant="outline" onClick={() => onDetails(o.id)}>Details</Button>
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </Card>
  );
}







