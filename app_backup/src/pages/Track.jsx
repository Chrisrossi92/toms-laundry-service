import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useSession } from "../lib/AuthProvider.jsx";

export default function Track() {
  const { session } = useSession();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data } = await supabase
        .from("orders")
        .select("id,status,total_cents,created_at")
        .eq("user_id", session.user.id)
        .order("created_at",{ascending:false})
        .limit(10);
      setOrders(data || []);
    })();
  }, [session]);

  const map = {
    created: "Created",
    scheduled: "Scheduled",
    pickup_en_route: "Driver en route",
    picked_up: "Picked up",
    processing: "Processing",
    ready_for_delivery: "Ready for delivery",
    out_for_delivery: "Out for delivery",
    delivered: "Delivered",
    completed: "Completed"
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Your recent orders</h2>
      {orders.length === 0 && <div>No orders yet.</div>}
      <ul className="space-y-2">
        {orders.map(o=>(
          <li key={o.id} className="border rounded p-3">
            <div className="font-medium">Order #{o.id}</div>
            <div className="text-sm text-gray-600">Status: {map[o.status]||o.status}</div>
            <div className="text-sm">${(o.total_cents/100).toFixed(2)}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
