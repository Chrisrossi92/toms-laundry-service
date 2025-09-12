import { useEffect, useMemo, useState } from "react";
import { format, addDays } from "date-fns";
import { supabase } from "../lib/supabaseClient";
import { useSession } from "../lib/AuthProvider.jsx";

function money(cents=0){ return `$${(cents/100).toFixed(2)}`; }
function timeLabel(t="00:00:00"){ return `${t.slice(0,5)}`; }

export default function AdminOrders() {
  const { role, authLoading } = useSession();
  const isAdmin = role === "admin";

  const [dateFrom, setDateFrom] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(addDays(new Date(), 7), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [slotsById, setSlotsById] = useState({});
  const [drivers, setDrivers] = useState([]);
  const [bulkDriver, setBulkDriver] = useState("");

  // load drivers (from user_profiles where role='driver')
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("user_profiles")
        .select("user_id, full_name, role")
        .eq("role", "driver")
        .order("full_name", { ascending: true });
      setDrivers(data || []);
    })();
  }, []);

  // load slots in range, then orders referencing those slots
  async function loadData() {
    setLoading(true);
    // 1) slots in range
    const { data: slots, error: sErr } = await supabase
      .from("time_slots")
      .select("id, date, window_start, window_end, zone_id")
      .gte("date", dateFrom)
      .lte("date", dateTo);

    if (sErr) { setLoading(false); return; }
    const ids = (slots || []).map(s => s.id);
    const map = {};
    for (const s of (slots||[])) map[s.id] = s;
    setSlotsById(map);

    // 2) orders for those slots
    const { data: ords, error: oErr } = ids.length
      ? await supabase
          .from("orders")
          .select("id, user_id, pickup_slot_id, status, est_bags, total_cents, driver_id, created_at")
          .in("pickup_slot_id", ids)
          .order("created_at", { ascending: false })
      : { data: [], error: null };

    if (!oErr) setOrders(ords || []);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [dateFrom, dateTo]);

  async function assignDriver(orderId, driverId) {
    const row = orders.find(o => o.id === orderId);
    const newStatus = row?.status === "created" ? "scheduled" : row?.status;
    const { error } = await supabase
      .from("orders")
      .update({
        driver_id: driverId || null,
        assigned_at: driverId ? new Date().toISOString() : null,
        status: newStatus
      })
      .eq("id", orderId);
    if (error) return alert(error.message);
    setOrders(prev => prev.map(o => o.id===orderId ? { ...o, driver_id: driverId || null, status: newStatus } : o));
  }

  async function bulkAssign() {
    if (!bulkDriver) return alert("Pick a driver to bulk-assign.");
    const ids = orders.filter(o => !o.driver_id).map(o => o.id);
    if (!ids.length) return alert("No unassigned orders in view.");
    const { error } = await supabase
      .from("orders")
      .update({
        driver_id: bulkDriver,
        assigned_at: new Date().toISOString(),
        status: "scheduled"
      })
      .in("id", ids);
    if (error) return alert(error.message);
    setOrders(prev => prev.map(o => !o.driver_id ? { ...o, driver_id: bulkDriver, status: "scheduled" } : o));
  }

  const grouped = useMemo(() => {
    const m = {};
    for (const o of orders) {
      const s = slotsById[o.pickup_slot_id];
      const key = s?.date || "No date";
      (m[key] ||= []).push(o);
    }
    return m;
  }, [orders, slotsById]);

  if (authLoading) return null;
  if (!isAdmin) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <h2 className="text-xl font-semibold">Admin only</h2>
        <p className="text-gray-600">You need admin access to manage orders.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="block text-sm text-gray-700">From</label>
          <input type="date" className="mt-1 rounded border px-3 py-2"
            value={dateFrom} onChange={e=>setDateFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-gray-700">To</label>
          <input type="date" className="mt-1 rounded border px-3 py-2"
            value={dateTo} onChange={e=>setDateTo(e.target.value)} />
        </div>
        <button onClick={loadData} className="rounded bg-black text-white px-4 py-2">
          Refresh
        </button>
        <div className="ml-auto flex items-end gap-2">
          <select className="rounded border px-3 py-2" value={bulkDriver}
            onChange={e=>setBulkDriver(e.target.value)}>
            <option value="">Bulk assign driver…</option>
            {drivers.map(d=>(
              <option key={d.user_id} value={d.user_id}>
                {d.full_name || d.user_id.slice(0,8)}
              </option>
            ))}
          </select>
          <button onClick={bulkAssign} className="rounded border px-4 py-2 hover:bg-gray-50">
            Assign all unassigned
          </button>
        </div>
      </div>

      {loading && <div className="text-sm text-gray-600">Loading…</div>}

      {!loading && Object.keys(grouped).length === 0 && (
        <div className="text-sm text-gray-600">No orders in this range.</div>
      )}

      <div className="space-y-6">
        {Object.entries(grouped).map(([date, rows]) => (
          <div key={date} className="rounded-xl border bg-white/95 shadow">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="font-semibold">{new Date(date + "T00:00:00").toLocaleDateString()}</div>
              <div className="text-sm text-gray-600">{rows.length} orders</div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left bg-gray-50">
                    <th className="px-4 py-2">Order</th>
                    <th className="px-4 py-2">Pickup window</th>
                    <th className="px-4 py-2">Bags</th>
                    <th className="px-4 py-2">Total</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Driver</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(o=>{
                    const s = slotsById[o.pickup_slot_id];
                    const driverName = drivers.find(d=>d.user_id===o.driver_id)?.full_name;
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
                          <select
                            className="rounded border px-2 py-1"
                            value={o.driver_id || ""}
                            onChange={e=>assignDriver(o.id, e.target.value || null)}
                          >
                            <option value="">Unassigned</option>
                            {drivers.map(d=>(
                              <option key={d.user_id} value={d.user_id}>
                                {d.full_name || d.user_id.slice(0,8)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2 text-right">
                          {/* future: status actions, print ticket, etc. */}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
