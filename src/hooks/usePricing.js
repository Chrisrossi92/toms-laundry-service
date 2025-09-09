import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function usePricing(){
  const [pricing,setPricing]=useState({
    id:null,
    per_bag_cents:2500,
    pickup_fee_cents:300,
    min_order_cents:0,
    free_pickup_threshold_cents:0
  });

  useEffect(()=>{(async()=>{
    const {data} = await supabase
      .from("settings_pricing")
      .select("id,per_bag_cents,pickup_fee_cents,min_order_cents,free_pickup_threshold_cents")
      .order("updated_at",{ascending:false}).limit(1);
    if(data?.length) setPricing(data[0]);
  })();},[]);

  return pricing;
}

