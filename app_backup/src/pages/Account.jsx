import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useSession } from "../lib/AuthProvider.jsx";

export default function Account() {
  const { session } = useSession();
  const [prefs, setPrefs] = useState(null);

  useEffect(()=>{
    if (!session) return;
    (async ()=>{
      const { data } = await supabase.from("preferences").select("*").eq("user_id", session.user.id).maybeSingle();
      if (data) setPrefs(data);
      else setPrefs({ detergent:"standard", wash_temp:"warm", dry_level:"medium", softener:true, fragrance_free:false, notes:"" });
    })();
  },[session]);

  async function save() {
    const up = { ...prefs, user_id: session.user.id };
    const { error } = await supabase.from("preferences").upsert(up);
    if (error) alert(error.message); else alert("Saved!");
  }

  if (!prefs) return null;

  return (
    <div className="max-w-xl space-y-3">
      <h2 className="text-2xl font-semibold">Laundry preferences</h2>
      <div className="grid grid-cols-2 gap-3">
        <label>Detergent
          <select className="border rounded w-full px-2 py-1" value={prefs.detergent} onChange={e=>setPrefs(p=>({...p,detergent:e.target.value}))}>
            <option value="standard">Standard</option>
            <option value="hypoallergenic">Hypoallergenic</option>
          </select>
        </label>
        <label>Wash temp
          <select className="border rounded w-full px-2 py-1" value={prefs.wash_temp} onChange={e=>setPrefs(p=>({...p,wash_temp:e.target.value}))}>
            <option>cold</option><option>warm</option><option>hot</option>
          </select>
        </label>
        <label>Dry level
          <select className="border rounded w-full px-2 py-1" value={prefs.dry_level} onChange={e=>setPrefs(p=>({...p,dry_level:e.target.value}))}>
            <option>low</option><option>medium</option><option>high</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={prefs.softener} onChange={e=>setPrefs(p=>({...p,softener:e.target.checked}))}/>
          Fabric softener
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={prefs.fragrance_free} onChange={e=>setPrefs(p=>({...p,fragrance_free:e.target.checked}))}/>
          Fragrance-free
        </label>
      </div>
      <label className="block">
        Notes
        <textarea className="border rounded w-full px-2 py-1" rows={3} value={prefs.notes||""} onChange={e=>setPrefs(p=>({...p,notes:e.target.value}))}/>
      </label>
      <button onClick={save} className="bg-black text-white px-4 py-2 rounded">Save</button>
    </div>
  );
}
