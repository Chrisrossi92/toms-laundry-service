import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useSession } from "../lib/AuthProvider.jsx";
import { usePricing } from "../hooks/usePricing";
import { format } from "date-fns";

export default function Schedule() {
  const { session } = useSession();
  const isAuthed = !!session;
  const pricing = usePricing(); // { per_bag_cents, pickup_fee_cents, min_order_cents, free_pickup_threshold_cents }

  const [addr, setAddr] = useState({ line1: "", city: "Cleveland", state: "OH", zip: "" });
  const [guestEmail, setGuestEmail] = useState("");
  const [zoneId, setZoneId] = useState(null);
  const [slots, setSlots] = useState([]);
  const [pickupSlot, setPickupSlot] = useState(null);
  const [bags, setBags] = useState(1);
  const [instructions, setInstructions] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Resolve zone when ZIP is 5 digits
  useEffect(() => {
    const z = addr.zip?.trim();
    if (!z || z.length < 5) { setZoneId(null); setSlots([]); return; }
    (async () => {
      const { data, error } = await supabase.rpc("zone_for_zip", { zip: z });
      if (error) { console.error(error); setZoneId(null); setSlots([]); return; }
      setZoneId(data);
    })();
  }, [addr.zip]);

  // Load next 7 days of slots for the zone
  useEffect(() => {
    if (!zoneId) return;
    (async () => {
      setLoadingSlots(true);
      const today = new Date();
      const end = new Date(); end.setDate(today.getDate() + 7);
      const { data, error } = await supabase
        .from("time_slots")
        .select("id, zone_id, date, window_start, window_end, capacity, used_count")
        .eq("zone_id", zoneId)
        .gte("date", format(today, "yyyy-MM-dd"))
        .lte("date", format(end, "yyyy-MM-dd"))
        .order("date", { ascending: true })
        .order("window_start", { ascending: true });
      if (!error) setSlots(data ?? []);
      setLoadingSlots(false);
    })();
  }, [zoneId]);

  async function saveAddress() {
    if (!isAuthed) return null;
    const { data, error } = await supabase.from("addresses").insert([{
      user_id: session.user.id,
      line1: addr.line1, city: addr.city, state: addr.state, zip: addr.zip, is_default: true
    }]).select().single();
    if (error) alert(error.message);
    return data;
  }

  async function createCheckout() {
    if (!pickupSlot) return alert("Pick a pickup window.");
    if (!addr.line1 || !addr.zip) return alert("Enter address & ZIP.");
    if (!isAuthed && !guestEmail) return alert("Enter email for receipt/updates.");

    await saveAddress();

    // Call Edge Function to create Stripe Checkout session
    const { data, error } = await supabase.functions.invoke("create-checkout", {
  body: {
    zip: addr.zip,
    pickup_slot_id: pickupSlot.id,
    est_bags: bags,
    instructions,
    customer_email: isAuthed ? session.user.email : guestEmail.trim()
  },
});

if (error) {
  // supabase-js bundles { message } but we also return { error } in JSON
  const serverMsg = error?.message || (data && data.error) || "Could not start checkout.";
  alert(serverMsg);
  return;
}

window.location.href = data.url;
 // Redirect to Stripe
  }

  const grouped = useMemo(() => {
    const m = {};
    for (const s of slots) (m[s.date] ||= []).push(s);
    return m;
  }, [slots]);

  // ---- Pricing math with min order + free pickup threshold ----
  const perBag = (pricing.per_bag_cents || 0) / 100;
  const baseSubtotal = bags * perBag;
  const minOrder = (pricing.min_order_cents || 0) / 100;
  const subtotal = Math.max(baseSubtotal, minOrder);

  const pickupFeeBase = (pricing.pickup_fee_cents || 0) / 100;
  const freeThreshold = (pricing.free_pickup_threshold_cents || 0) / 100;
  const pickupFee = freeThreshold > 0 && subtotal >= freeThreshold ? 0 : pickupFeeBase;

  const total = subtotal + pickupFee;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="rounded-xl bg-white/85 backdrop-blur border border-white/40 p-6 shadow">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Schedule your pickup</h2>

        {/* Address */}
        <div className="mb-6 grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-700">Address line</label>
            <input className="mt-1 w-full rounded-md border border-gray-300 bg-white/90 px-3 py-2"
              value={addr.line1} onChange={e=>setAddr(a=>({...a,line1:e.target.value}))}/>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm text-gray-700">City</label>
              <input className="mt-1 w-full rounded-md border border-gray-300 bg-white/90 px-3 py-2"
                value={addr.city} onChange={e=>setAddr(a=>({...a,city:e.target.value}))}/>
            </div>
            <div>
              <label className="text-sm text-gray-700">State</label>
              <input className="mt-1 w-full rounded-md border border-gray-300 bg-white/90 px-3 py-2"
                value={addr.state} onChange={e=>setAddr(a=>({...a,state:e.target.value}))}/>
            </div>
            <div>
              <label className="text-sm text-gray-700">ZIP</label>
              <input className="mt-1 w-full rounded-md border border-gray-300 bg-white/90 px-3 py-2"
                value={addr.zip} onChange={e=>setAddr(a=>({...a,zip:e.target.value}))}/>
            </div>
          </div>
        </div>

        {/* Guest email (only if not logged in) */}
        {!isAuthed && (
          <div className="mb-6">
            <label className="block text-sm text-gray-700">Email for receipt/updates</label>
            <input className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2"
              type="email" value={guestEmail} onChange={e=>setGuestEmail(e.target.value)} />
          </div>
        )}

        {/* Slots */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-700">Pickup window (next 7 days)</label>
            <span className="text-xs text-gray-500">
              {loadingSlots ? "Loading windows…" : zoneId ? "Select a window" : "Enter ZIP to view windows"}
            </span>
          </div>

          <div className="mt-3 space-y-4">
            {Object.keys(grouped).length === 0 && zoneId && !loadingSlots && (
              <div className="text-sm text-gray-500">No windows available for this ZIP yet.</div>
            )}
            {Object.entries(grouped).map(([d, arr]) => (
              <div key={d}>
                <div className="text-xs text-gray-600 mb-1">{d}</div>
                <div className="flex gap-2 flex-wrap">
                  {arr.map(s => {
                    const full = s.used_count >= s.capacity;
                    const selected = pickupSlot?.id === s.id;
                    const label = `${s.window_start.slice(0,5)}–${s.window_end.slice(0,5)}`;
                    return (
                      <button
                        key={s.id}
                        disabled={full}
                        onClick={()=>setPickupSlot(s)}
                        className={[
                          "px-3 py-2 rounded-md border",
                          selected ? "bg-black text-white border-black" : "bg-white/90 hover:bg-white border-gray-300",
                          full ? "opacity-40 cursor-not-allowed" : ""
                        ].join(" ")}
                        title={full?'Full':''}
                      >{label}</button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bags + notes */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-700">How many bags?</label>
            <input type="number" min={1} max={6}
              className="mt-1 w-32 rounded-md border border-gray-300 bg-white/90 px-3 py-2"
              value={bags} onChange={e=>setBags(parseInt(e.target.value||1))}/>
          </div>
          <div>
            <label className="text-sm text-gray-700">Special instructions</label>
            <textarea rows={3}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white/90 px-3 py-2"
              value={instructions} onChange={e=>setInstructions(e.target.value)}
              placeholder="Hypoallergenic detergent, low heat, leave on porch, etc."/>
          </div>
        </div>

        {/* Totals + confirm */}
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Subtotal ${subtotal.toFixed(2)} + Fee ${pickupFee.toFixed(2)} ={" "}
            <span className="font-semibold text-gray-900">${total.toFixed(2)}</span>
          </div>
          <button onClick={createCheckout} className="rounded-md bg-black px-5 py-2 text-white">
            Confirm pickup
          </button>
        </div>
      </div>
    </div>
  );
}




