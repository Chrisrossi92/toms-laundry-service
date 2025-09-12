import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function AssignDriverModal({ open, onClose, dateISO }) {
  const [drivers, setDrivers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [slots, setSlots] = useState({});

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: d } = await supabase
        .from("user_profiles").select("user_id, full_name").eq("role", "driver").order("full_name");
      setDrivers(d || []);

      const { data: s } = await supabase
        .from("time_slots")
        .select("id, date, window_start, window_end")
        .eq("date", dateISO);
      const map = {}; for (const x of (s||[])) map[x.id] = x; setSlots(map);

      const ids = (s||[]).map(x => x.id);
      const { data: o } = ids.length
        ? await supabase.from("orders")
            .select("id, pickup_slot_id, est_bags, total_cents, driver_id, status")
            .in("pickup_slot_id", ids)
            .order("pickup_slot_id")
        : { data: [] };
      setOrders(o || []);
    })();
  }, [open, dateISO]);

  async function assign(orderId, driverId) {
    const { error } = await supabase.from("orders")
      .update({ driver_id: driverId || null, assigned_at: driverId ? new Date().toISOString() : null, status: "scheduled" })
      .eq("id", orderId);
    if (!error) setOrders(prev => prev.map(o => o.id===orderId ? { ...o, driver_id: driverId || null, status: "scheduled" } : o));
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <div className="font-semibold">Assign drivers — {new Date(dateISO + "T00:00:00").toLocaleDateString()}</div>
          <button onClick={onClose} className="text-sm px-2 py-1 rounded border hover:bg-gray-50">Close</button>
        </div>
        <div className="p-5">
          {orders.length === 0 ? (
            <div className="text-sm text-gray-600">No orders for this day.</div>
          ) : (
            <div className="space-y-2">
              {orders.map(o => {
                const s = slots[o.pickup_slot_id];
                return (
                  <div key={o.id} className="flex items-center justify-between rounded border px-3 py-2">
                    <div className="text-sm">
                      <span className="font-mono mr-3">{o.id}</span>
                      <span className="mr-3">{s ? `${s.window_start.slice(0,5)}–${s.window_end.slice(0,5)}` : ""}</span>
                      <span className="mr-3">bags: {o.est_bags ?? "—"}</span>
                      <span>${(o.total_cents/100).toFixed(2)}</span>
                    </div>
                    <select
                      className="rounded border px-2 py-1"
                      value={o.driver_id || ""}
                      onChange={e=>assign(o.id, e.target.value || null)}
                    >
                      <option value="">Unassigned</option>
                      {drivers.map(d => (
                        <option key={d.user_id} value={d.user_id}>{d.full_name || d.user_id.slice(0,8)}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

