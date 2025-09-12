// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format, addDays } from "date-fns";
import { supabase } from "../lib/supabaseClient";
import { useSession } from "../lib/AuthProvider.jsx";
import AssignDriverModal from "../components/admin/AssignDriverModal.jsx";

/* ---------- small helpers ---------- */
const iso = (d) => format(d, "yyyy-MM-dd");
const money = (cents = 0) => `$${(Number(cents || 0) / 100).toFixed(2)}`;
const timeLabel = (t = "00:00:00") => t.slice(0, 5);

/* ---------- Dashboard ---------- */
export default function Dashboard() {
  const { session, role, authLoading } = useSession(); // expects { session, role }
  const isAdmin = role === "admin";
  const isDriver = role === "driver";

  const [selectedDate, setSelectedDate] = useState(iso(new Date()));
  const [loading, setLoading] = useState(false);

  // slots + orders for selected day
  const [slots, setSlots] = useState([]); // [{id,date,window_start,window_end,capacity,used_count,zone_id}]
  const [orders, setOrders] = useState([]); // [{id,pickup_slot_id,total_cents,est_bags,status,driver_id,created_at}]

  // admin: open quick-assign modal
  const [assignOpen, setAssignOpen] = useState(false);

  // driver view: only orders assigned to this driver
  const driverId = session?.user?.id || null;

  useEffect(() => {
    if (!selectedDate) return;
    (async () => {
      setLoading(true);

      // 1) Load all slots for the selected date
      const { data: s, error: sErr } = await supabase
        .from("time_slots")
        .select("id,date,window_start,window_end,capacity,used_count,zone_id")
        .eq("date", selectedDate)
        .order("window_start", { ascending: true });

      if (sErr) {
        console.error(sErr);
        setSlots([]);
        setOrders([]);
        setLoading(false);
        return;
      }
      setSlots(s || []);

      // 2) Load orders for those slots
      const slotIds = (s || []).map((x) => x.id);
      if (!slotIds.length) {
        setOrders([]);
        setLoading(false);
        return;
      }

      let ordQuery = supabase
        .from("orders")
        .select("id,pickup_slot_id,total_cents,est_bags,status,driver_id,created_at")
        .in("pickup_slot_id", slotIds)
        .order("created_at", { ascending: false });

      // driver view filters to own orders by RLS, but we can also filter client-side
      if (isDriver && driverId) {
        ordQuery = ordQuery.eq("driver_id", driverId);
      }

      const { data: o, error: oErr } = await ordQuery;
      if (oErr) {
        console.error(oErr);
        setOrders([]);
      } else {
        setOrders(o || []);
      }

      setLoading(false);
    })();
  }, [selectedDate, isDriver, driverId]);

  const slotsById = useMemo(() => {
    const m = {};
    for (const s of slots) m[s.id] = s;
    return m;
  }, [slots]);

  // metrics (admin)
  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    const unassigned = orders.filter((o) => !o.driver_id).length;
    const revenue = orders.reduce((sum, o) => sum + (o.total_cents || 0), 0);
    const totalWindows = slots.length;
    const used = orders.length; // proxy for scheduled pickups
    return { totalOrders, unassigned, revenue, totalWindows, used };
  }, [orders, slots]);

  if (authLoading) return null;

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* Header / Date controls */}
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-gray-600">
            {isAdmin ? "Admin overview and tools" : isDriver ? "Driver schedule" : "Order overview"}
          </p>
        </div>

        <div className="ml-auto flex items-end gap-2">
          <button
            onClick={() => setSelectedDate(iso(addDays(new Date(selectedDate + "T00:00:00"), -1)))}
            className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
          >
            ◀ Prev
          </button>
          <input
            type="date"
            className="rounded border px-3 py-2 text-sm"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <button
            onClick={() => setSelectedDate(iso(addDays(new Date(selectedDate + "T00:00:00"), 1)))}
            className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
          >
            Next ▶
          </button>
        </div>
      </div>

      {/* Metrics cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <CardStat label="Orders today" value={metrics.totalOrders} />
        <CardStat label="Windows today" value={metrics.totalWindows} />
        <CardStat label="Unassigned" value={metrics.unassigned} highlight />
        <CardStat label="Revenue (est.)" value={money(metrics.revenue)} />
      </div>

      {/* Actions row */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {isAdmin && (
          <>
            <button
              onClick={() => setAssignOpen(true)}
              className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
            >
              Assign drivers
            </button>
            <Link
              to="/admin/orders"
              className="rounded-md bg-black px-3 py-2 text-sm text-white hover:opacity-90"
            >
              Open Orders table
            </Link>
            <Link
              to="/admin/slots"
              className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
            >
              Manage pickup windows
            </Link>
          </>
        )}
      </div>

      {/* Pickups list / table */}
      <div className="rounded-xl border bg-white/95 shadow">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="font-semibold">
            Pickups — {new Date(selectedDate + "T00:00:00").toLocaleDateString()}
          </div>
          <div className="text-sm text-gray-600">
            {loading ? "Loading…" : `${orders.length} orders`}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-2">Order</th>
                <th className="px-4 py-2">Window</th>
                <th className="px-4 py-2">Bags</th>
                <th className="px-4 py-2">Total</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Driver</th>
              </tr>
            </thead>
            <tbody>
              {!loading && orders.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-gray-600" colSpan={6}>
                    No orders for this date.
                  </td>
                </tr>
              )}
              {orders.map((o) => {
                const s = slotsById[o.pickup_slot_id];
                return (
                  <tr key={o.id} className="border-t">
                    <td className="px-4 py-2 font-mono">{o.id}</td>
                    <td className="px-4 py-2">
                      {s ? `${timeLabel(s.window_start)}–${timeLabel(s.window_end)}` : "—"}
                    </td>
                    <td className="px-4 py-2">{o.est_bags ?? "—"}</td>
                    <td className="px-4 py-2">{money(o.total_cents)}</td>
                    <td className="px-4 py-2">
                      <span className="rounded bg-gray-100 px-2 py-1">{o.status}</span>
                    </td>
                    <td className="px-4 py-2">
                      {o.driver_id ? o.driver_id.slice(0, 8) : <span className="text-gray-500">Unassigned</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin quick-assign modal */}
      {isAdmin && (
        <AssignDriverModal
          open={assignOpen}
          onClose={() => setAssignOpen(false)}
          dateISO={selectedDate}
        />
      )}
    </div>
  );
}

/* ---------- small presentational component ---------- */
function CardStat({ label, value, highlight = false }) {
  return (
    <div
      className={[
        "rounded-xl border bg-white/95 p-4 shadow-sm",
        highlight ? "ring-1 ring-red-300" : "",
      ].join(" ")}
    >
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}








