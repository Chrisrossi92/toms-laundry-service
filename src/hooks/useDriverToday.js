import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { format } from "date-fns";

export function useDriverToday(date, driverId) {
  const [stats, setStats] = useState({ total: 0, enroute: 0, picked: 0, out: 0, delivered: 0 });

  useEffect(() => {
    if (!driverId) return;
    (async () => {
      // slots for the day
      const { data: slots } = await supabase.from("time_slots").select("id").eq("date", date);
      const ids = (slots ?? []).map(s => s.id);
      if (!ids.length) { setStats({ total:0,enroute:0,picked:0,out:0,delivered:0 }); return; }

      // my orders for these slots
      const { data: ords } = await supabase.from("orders")
        .select("id,status").in("pickup_slot_id", ids).eq("assigned_driver_id", driverId);

      const total = (ords||[]).length;
      const enroute = (ords||[]).filter(o=>o.status==="pickup_en_route").length;
      const picked  = (ords||[]).filter(o=>o.status==="picked_up" || o.status==="processing" || o.status==="ready_for_delivery").length;
      const out     = (ords||[]).filter(o=>o.status==="out_for_delivery").length;
      const delivered = (ords||[]).filter(o=>o.status==="delivered" || o.status==="completed").length;
      setStats({ total, enroute, picked, out, delivered });
    })();
  }, [date, driverId]);

  return stats;
}
