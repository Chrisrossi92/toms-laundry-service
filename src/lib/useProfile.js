import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

/** Load user_profile for the current auth user (role, phone, email_opt_in) */
export function useProfile(session) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(!!session);

  useEffect(() => {
    let ignore = false;
    async function run() {
      if (!session) { setProfile(null); setLoading(false); return; }
      setLoading(true);
      // ensure a row exists
      await supabase
        .from("user_profiles")
        .upsert({ user_id: session.user.id }, { onConflict: "user_id" });

      const { data } = await supabase
        .from("user_profiles")
        .select("user_id, role, phone, email_opt_in")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!ignore) { setProfile(data || null); setLoading(false); }
    }
    run();
    return () => { ignore = true; };
  }, [session]);

  return { profile, loading };
}
