import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useSession } from "../lib/AuthProvider.jsx";
import { format } from "date-fns";

export default function Schedule() {
  const { session } = useSession();
  const [addr, setAddr] = useState({ line1:"", city:"Cleveland", state:"OH", zip:"" });
  const [slots, setSlots] = useState([]);
  const [pickupSlot, setPickupSlot] = useState(null);
  const [bags, setBags] = useState(1);
  const [instructions, setInstructions] = useState("");

  const isAuthed = !!session;

  useEffect(() => {
    // fetch next 7 days of slots (simple public read)
    (async () => {
      const today = new Date();
      const end = new Date(); end.setDate(today.getDate()+7);
      const { data, error } = await supabase
        .from("time_slots")
        .select("id, date, window_start, window_end, capacity, used_count")
        .gte("date", format(today, "yyyy-MM-dd"))
        .lte("date", format(end, "yyyy-MM-dd"))
        .order("date",{ascending:true});
      if (!error) setSlots(data ?? []);
    })();
  }, []);

  async function saveAddress() {
    const { data, error } = await supabase.from("addresses").insert([{
      user_id: session.user.id,
      line1: addr.line1, city: addr.city, state: addr.state, zip: addr.zip, is_default: true
    }]).select().single();
    if (error) alert(error.message);
    return data;
  }

  async function createOrder() {
    if (!isAuthed) return alert("Sign in first (Home → magic link).");
    if (!pickupSlot) return alert("Pick a pickup window.");
    const address = await saveAddress();

    // very simple serverless-free MVP: compute total client-side (we'll harden later)
    const PRICE_PER_BAG = 2500; // cents
    const PICKUP_FEE = 300;
    const subtotal = bags * PRICE_PER_BAG;
    const total = subtotal + PICKUP_FEE;

    const { data, error } = await supabase.from("orders").insert([{
      user_id: session.user.id,
      est_bags: bags,
      subtotal_cents: subtotal,
      fees_cents: PICKUP_FEE,
      tip_cents: 0,
      total_cents: total,
      pickup_slot_id: pickupSlot.id,
      status: "scheduled",
      special_instructions: instructions
    }]).select().single();

    if (error) return alert(error.message);
    alert("Pickup scheduled! (Payment step wires in next.)");
    window.location.href = "/track";
  }

  const grouped = useMemo(() => {
    const m = {};
    for (const s of slots) {
      (m[s.date] ||= []).push(s);
    }
    return m;
  }, [slots]);

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-semibold mb-4">Schedule your pickup</h2>

      <div className="mb-6 space-y-2">
        <label className="block text-sm">Address line</label>
        <input className="border rounded px-3 py-2 w-full" value={addr.line1} onChange={e=>setAddr(a=>({...a,line1:e.target.value}))}/>
        <div className="grid grid-cols-3 gap-2">
          <input className="border rounded px-3 py-2" placeholder="City" value={addr.city} onChange={e=>setAddr(a=>({...a,city:e.target.value}))}/>
          <input className="border rounded px-3 py-2" placeholder="State" value={addr.state} onChange={e=>setAddr(a=>({...a,state:e.target.value}))}/>
          <input className="border rounded px-3 py-2" placeholder="ZIP" value={addr.zip} onChange={e=>setAddr(a=>({...a,zip:e.target.value}))}/>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm mb-2">Pickup window (next 7 days)</label>
        <div className="space-y-4">
          {Object.entries(grouped).map(([d, arr]) => (
            <div key={d}>
              <div className="text-xs text-gray-600 mb-1">{d}</div>
              <div className="flex gap-2 flex-wrap">
                {arr.map(s => {
                  const full = s.used_count >= s.capacity;
                  const label = `${s.window_start.slice(0,5)}–${s.window_end.slice(0,5)}`;
                  return (
                    <button
                      key={s.id}
                      disabled={full}
                      onClick={()=>setPickupSlot(s)}
                      className={`px-3 py-2 rounded border ${pickupSlot?.id===s.id?'bg-black text-white':'bg-white'}`}
                      title={full?'Full':''}
                    >{label}</button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm">How many bags?</label>
        <input type="number" min={1} max={6} className="border rounded px-3 py-2 w-32" value={bags} onChange={e=>setBags(parseInt(e.target.value||1))}/>
      </div>

      <div className="mb-6">
        <label className="block text-sm">Special instructions</label>
        <textarea className="border rounded px-3 py-2 w-full" rows={3} value={instructions} onChange={e=>setInstructions(e.target.value)} placeholder="Hypoallergenic detergent, low heat, leave on porch, etc."/>
      </div>

      <button onClick={createOrder} className="bg-black text-white px-4 py-2 rounded">
        Confirm pickup
      </button>
    </div>
  );
}
