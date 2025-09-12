// src/pages/Schedule.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useSession } from "../lib/AuthProvider.jsx";
import { usePricing } from "../hooks/usePricing";
import { format } from "date-fns";

export default function Schedule() {
  const { session } = useSession();
  const isAuthed = !!session;
  const pricing = usePricing(); // { per_bag_cents, pickup_fee_cents, min_order_cents, free_pickup_threshold_cents }

  // Address + guest email
  const [addr, setAddr] = useState({ line1: "", city: "Cleveland", state: "OH", zip: "" });
  const [guestEmail, setGuestEmail] = useState("");

  // Zone + slots
  const [zoneId, setZoneId] = useState(null);
  const [zoneErr, setZoneErr] = useState("");
  const [slots, setSlots] = useState([]);
  const [pickupSlot, setPickupSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Order inputs
  const [bags, setBags] = useState(1);
  const [instructions, setInstructions] = useState("");

  // ---- 1) Resolve zone when ZIP is 5 digits (no RPC needed) ----
  useEffect(() => {
    const z = (addr.zip || "").trim();
    if (z.length !== 5) {
      setZoneId(null);
      setSlots([]);
      setPickupSlot(null);
      return;
    }
    (async () => {
      setZoneErr("");
      // zones.zip_codes is text[] → use .contains([...])
      const { data, error } = await supabase
        .from("zones")
        .select("id")
        .contains("zip_codes", [z])
        .maybeSingle();

      if (error) {
        console.error(error);
        setZoneErr(error.message);
        setZoneId(null);
        setSlots([]);
        setPickupSlot(null);
      } else if (!data) {
        setZoneId(null);
        setSlots([]);
        setPickupSlot(null);
      } else {
        setZoneId(data.id);
      }
    })();
  }, [addr.zip]);

  // ---- 2) Load next 7 days of slots for the zone (schema: date + time) ----
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
      else {
        console.error(error);
        setSlots([]);
      }
      setPickupSlot(null);
      setLoadingSlots(false);
    })();
  }, [zoneId]);

  // ---- 3) (optional) Save address for logged-in users ----
  async function saveAddressIfAuthed() {
    if (!isAuthed) return null;
    const { error } = await supabase.from("addresses").insert([{
      user_id: session.user.id,
      line1: addr.line1,
      city: addr.city,
      state: addr.state,
      zip: addr.zip,
      is_default: true
    }]);
    if (error) alert(error.message);
  }

  // ---- 4) Start checkout via Edge Function (works for guests & users) ----
  async function createCheckout() {
    if (!pickupSlot) return alert("Pick a pickup window.");
    if (!addr.line1 || !(addr.zip || "").trim()) return alert("Enter address & ZIP.");
    if (!isAuthed && !guestEmail) return alert("Enter email for receipt/updates.");

    await saveAddressIfAuthed();

    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: {
        zip: addr.zip.trim(),
        pickup_slot_id: pickupSlot.id,
        est_bags: bags,
        instructions,
        customer_email: isAuthed ? session.user.email : guestEmail.trim()
      }
    });

    if (error || !data?.url) {
      const serverMsg = error?.message || data?.error || "Could not start checkout.";
      alert(serverMsg);
      return;
    }
    window.location.href = data.url; // off to Stripe
  }

  // ---- helpers / UI state ----
  const grouped = useMemo(() => {
    const m = {};
    for (const s of slots) (m[s.date] ||= []).push(s);
    return m;
  }, [slots]);

  // helper: nice label for YYYY-MM-DD
  const dateLabel = (iso) => format(new Date(iso + "T00:00:00"), "EEE M/d");

  // all dates that have slots (sorted)
  const dates = useMemo(() => Object.keys(grouped).sort(), [grouped]);

  // which date is currently selected in the scroller
  const [selectedDate, setSelectedDate] = useState(null);

  // keep selectedDate valid as slots load/change
  useEffect(() => {
    if (dates.length) {
      setSelectedDate(prev => (prev && dates.includes(prev) ? prev : dates[0]));
    } else {
      setSelectedDate(null);
    }
  }, [dates]);

  // times for the selected day
  const timesForSelected = useMemo(() => (selectedDate ? grouped[selectedDate] || [] : []), [grouped, selectedDate]);

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

        {zoneErr && (
          <div className="mb-4 rounded bg-red-600/20 text-red-100 px-3 py-2 text-sm">{zoneErr}</div>
        )}

        {/* Address */}
        <div className="mb-6 grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-700">Address line</label>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 bg-white/90 px-3 py-2"
              value={addr.line1}
              onChange={e => setAddr(a => ({ ...a, line1: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm text-gray-700">City</label>
              <input
                className="mt-1 w-full rounded-md border border-gray-300 bg-white/90 px-3 py-2"
                value={addr.city}
                onChange={e => setAddr(a => ({ ...a, city: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm text-gray-700">State</label>
              <input
                className="mt-1 w-full rounded-md border border-gray-300 bg-white/90 px-3 py-2"
                value={addr.state}
                onChange={e => setAddr(a => ({ ...a, state: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm text-gray-700">ZIP</label>
              <input
                className="mt-1 w-full rounded-md border border-gray-300 bg-white/90 px-3 py-2"
                inputMode="numeric"
                maxLength={5}
                value={addr.zip}
                onChange={e => setAddr(a => ({ ...a, zip: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Guest email (only if not logged in) */}
        {!isAuthed && (
          <div className="mb-6">
            <label className="block text-sm text-gray-700">Email for receipt/updates</label>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2"
              type="email"
              value={guestEmail}
              onChange={e => setGuestEmail(e.target.value)}
            />
          </div>
        )}

        {/* Slots */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-700">Pickup window (next 7 days)</label>
            <span className="text-xs text-gray-500">
              {loadingSlots ? "Loading windows…" : zoneId ? "Select a date & time" : "Enter ZIP to view windows"}
            </span>
          </div>

          {/* Date scroller */}
          <div className="mt-3 overflow-x-auto pb-2">
            <div className="flex gap-2 min-w-max">
              {dates.length === 0 && zoneId && !loadingSlots && (
                <div className="text-sm text-gray-500">No windows available for this ZIP yet.</div>
              )}
              {dates.map(d => {
                const active = d === selectedDate;
                return (
                  <button
                    key={d}
                    onClick={() => { setSelectedDate(d); setPickupSlot(null); }}
                    className={[
                      "px-3 py-2 rounded-md border whitespace-nowrap",
                      active ? "bg-black text-white border-black" : "bg-white/90 hover:bg-white border-gray-300"
                    ].join(" ")}
                  >
                    {dateLabel(d)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Times grid for selected date */}
          {selectedDate && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {timesForSelected.map(s => {
                const full = s.used_count >= s.capacity;
                const selected = pickupSlot?.id === s.id;
                const label = `${s.window_start.slice(0,5)}–${s.window_end.slice(0,5)}`;
                return (
                  <button
                    key={s.id}
                    disabled={full}
                    onClick={() => setPickupSlot(s)}
                    className={[
                      "px-3 py-2 rounded-md border text-sm",
                      selected ? "bg-black text-white border-black" : "bg-white/90 hover:bg-white border-gray-300",
                      full ? "opacity-40 cursor-not-allowed" : ""
                    ].join(" ")}
                    title={full ? "Full" : ""}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Bags + notes */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-700">How many bags?</label>
            <input
              type="number"
              min={1}
              max={6}
              className="mt-1 w-32 rounded-md border border-gray-300 bg-white/90 px-3 py-2"
              value={bags}
              onChange={e => setBags(Math.max(1, parseInt(e.target.value || "1", 10)))}
            />
          </div>
          <div>
            <label className="text-sm text-gray-700">Special instructions</label>
            <textarea
              rows={3}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white/90 px-3 py-2"
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              placeholder="Hypoallergenic detergent, low heat, leave on porch, etc."
            />
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







