import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
export function useSlotsForDate(date){
  const [slots,setSlots]=useState([]);
  useEffect(()=>{(async()=>{
    const {data}=await supabase.from("time_slots").select("id,zone_id,date,window_start,window_end,capacity,used_count").eq("date",date);
    setSlots(data||[]);
  })();},[date]); return slots;
}
