import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
export function useProfile(session) {
  const [profile, setProfile] = useState(null), [loading,setLoading]=useState(!!session);
  useEffect(()=>{ let off=false;(async()=>{
    if(!session){setProfile(null);setLoading(false);return;}
    await supabase.from("user_profiles").upsert({user_id:session.user.id},{onConflict:"user_id"});
    const {data}=await supabase.from("user_profiles").select("user_id,role,phone,email_opt_in").eq("user_id",session.user.id).maybeSingle();
    if(!off){setProfile(data||null);setLoading(false);}
  })(); return ()=>{off=true};},[session]);
  return { profile, loading };
}
