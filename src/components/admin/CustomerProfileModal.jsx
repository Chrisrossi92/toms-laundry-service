import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function CustomerProfileModal({ userId, onClose }) {
  const [loading, setLoading]   = useState(true);
  const [email, setEmail]       = useState("");
  const [phone, setPhone]       = useState("");
  const [prefs, setPrefs]       = useState(null);
  const [orders, setOrders]     = useState([]);

  async function load() {
    setLoading(true);

    const [{ data: u }, { data: p }, { data: pr }, { data: o }] = await Promise.all([
      supabase.from("auth.users").select("email").eq("id", userId).maybeSingle(),
      supabase.from("user_profiles").select("phone").eq("user_id", userId).maybeSingle(),
      supabase.from("preferences").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("orders")
        .select("id, status, total_cents, created_at, pickup_slot:time_slots!orders_pickup_slot_id_fkey(date,window_start,window_end)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20)
    ]);

    setEmail(u?.email || "");
    setPhone(p?.phone || "");
    setPrefs(pr || null);
    setOrders(o || []);
    setLoading(false);
  }

  useEffect(() => { load();
    const ch = supabase
      .channel(`cust-${userId}`)
      .on("postgres_changes", { event:"*", schema:"public", table:"orders", filter:`user_id=eq.${userId}` }, load)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [userId]);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-x-0 top-16 mx-auto max-w-4xl rounded-2xl bg-white/95 p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Customer profile</h3>
          <button className="text-sm text-gray-600 hover:underline" onClick={onClose}>Close</button>
        </div>

        {loading ? (
          <div className="mt-4">Loading…</div>
        ) : (
          <>
            {/* Contact */}
            <div className="mt-4 grid md:grid-cols-3 gap-3">
              <Info label="Email"  value={email || "—"} />
              <Info label="Phone"  value={phone || "—"} />
              <Info label="Orders" value={orders.length} />
            </div>

            {/* Preferences */}
            <div className="mt-6 rounded-xl border p-4 bg-white">
              <div className="font-semibold mb-2">Preferences</div>
              {prefs ? (
                <div className="grid md:grid-cols-3 gap-3 text-sm">
                  <Info label="Detergent" value={prefs.detergent || "—"} />
                  <Info label="Wash temp" value={prefs.wash_temp || "—"} />
                  <Info label="Dry level" value={prefs.dry_level || "—"} />
                  <Info label="Fabric softener" value={prefs.softener ? "Yes" : "No"} />
                  <Info label="Fragrance-free" value={prefs.fragrance_free ? "Yes" : "No"} />
                  <div className="md:col-span-3">
                    <div className="text-xs text-gray-600">Notes</div>
                    <div className="text-sm">{prefs.notes || "—"}</div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-600">No saved preferences.</div>
              )}
            </div>

            {/* Recent orders */}
            <div className="mt-6 rounded-xl border p-4 bg-white">
              <div className="font-semibold mb-2">Recent orders</div>
              {orders.length === 0 ? (
                <div className="text-sm text-gray-600">No orders yet.</div>
              ) : (
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="p-2 text-left">#</th>
                        <th className="p-2 text-left">Created</th>
                        <th className="p-2 text-left">Pickup window</th>
                        <th className="p-2 text-left">Status</th>
                        <th className="p-2 text-left">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o.id} className="border-t">
                          <td className="p-2">#{o.id}</td>
                          <td className="p-2">{new Date(o.created_at).toLocaleString()}</td>
                          <td className="p-2">
                            {o.pickup_slot ? `${o.pickup_slot.date} ${o.pickup_slot.window_start?.slice(0,5)}–${o.pickup_slot.window_end?.slice(0,5)}` : "—"}
                          </td>
                          <td className="p-2">{o.status}</td>
                          <td className="p-2">${(o.total_cents/100).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div className="text-xs text-gray-600">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
