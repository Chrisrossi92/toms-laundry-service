import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useLaundrySettings() {
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{(async()=>{
    const { data } = await supabase
      .from("settings_laundry")
      .select("id, default_detergent, default_wash_temp, default_dry_level, allow_softener, allow_fragrance_free, allow_notes")
      .order("updated_at",{ascending:false}).limit(1);
    setRow(data?.[0] || null);
    setLoading(false);
  })();},[]);

  async function save(next) {
    if (!row?.id) return;
    return supabase.from("settings_laundry").update(next).eq("id", row.id);
  }

  return { row, loading, save, setRow };
}
