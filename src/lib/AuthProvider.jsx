import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { useProfile } from "../hooks/useProfile";
const AuthCtx = createContext(null);
export function AuthProvider({ children }) {
  const [session,setSession]=useState(null), [authLoading,setAuthLoading]=useState(true);
  useEffect(()=>{supabase.auth.getSession().then(({data})=>{setSession(data.session??null);setAuthLoading(false)});
    const {data:sub}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s)); return ()=>sub.subscription.unsubscribe();},[]);
  const {profile,loading:profileLoading}=useProfile(session);
  return <AuthCtx.Provider value={{session,role:profile?.role||"customer",authLoading,profileLoading,profile}}>{children}</AuthCtx.Provider>;
}
export function useSession(){ return useContext(AuthCtx); }


