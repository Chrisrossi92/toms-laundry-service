import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
export function useOrdersForDate(date){
  const [orders,setOrders]=useState([]), [loading,setLoading]=useState(true);
  useEffect(()=>{(async()=>{
    setLoading(true);
    const {data:slots}=await supabase.from("time_slots").select("id").eq("date",date);
    const ids=(slots||[]).map(s=>s.id); if(!ids.length){setOrders([]);setLoading(false);return;}
    const {data}=await supabase.from("orders").select(`
      id,status,est_bags,total_cents,special_instructions,assigned_driver_id,payment_status,pickup_slot_id,
      pickup_slot:time_slots!orders_pickup_slot_id_fkey(id,date,window_start,window_end)
    `).in("pickup_slot_id",ids).order("id");
    setOrders(data||[]); setLoading(false);
  })();},[date]); return {orders,loading,setOrders};
}
