// src/pages/AdminSlots.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AdminSlots() {
  // zones
  const [zones, setZones] = useState([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [zErr, setZErr] = useState("");

  // selected zone & date
  const [zoneId, setZoneId] = useState(null);
  const [dateStr, setDateStr] = useState(() => new Date().toISOString().slice(0, 10));

  // create zone form
  const [zoneName, setZoneName] = useState("");
  const [feeCents, setFeeCents] = useState(300);

  // zip editor
  const selectedZone = useMemo(() => zones.find(z => z.id === zoneId) || null, [zones, zoneId]);
  const [newZip, setNewZip] = useState("");

  // generate windows form
  const [genFrom, setGenFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [genTo, setGenTo] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 13);
    return d.toISOString().slice(0, 10);
  });
  const [winStart, setWinStart] = useState("18:00");
  const [winEnd, setWinEnd] = useState("20:00");
  const [capacity, setCapacity] = useState(8);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // slots for selected date
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [sErr, setSErr] = useState("");

  useEffect(() => { loadZones(); }, []);

  async function loadZones() {
  setZonesLoading(true); setZErr("");
  const { data, error } = await supabase
    .from("zones")
    .select("id,name,zip_codes,pickup_fee_cents")
    .order("id", { ascending: true });

  if (error) {
    console.error("zones load error:", error);
    setZErr(error.message);     // this renders at the top of the page
    setZones([]);               // keep UI stable
  } else {
    setZones(data || []);
    if (!zoneId && data && data.length) setZoneId(data[0].id);
  }
  setZonesLoading(false);
}

  async function createZone() {
    setMsg(""); setZErr("");
    try {
      if (!zoneName.trim()) throw new Error("Enter a zone name.");
      const fee = Number(feeCents);
      if (!Number.isFinite(fee) || fee < 0) throw new Error("Pickup fee must be a non-negative number (cents).");
      const { data, error } = await supabase
        .from("zones")
        .insert({ name: zoneName.trim(), pickup_fee_cents: fee, zip_codes: [] })
        .select("id,name,zip_codes,pickup_fee_cents")
        .single();
      if (error) throw error;
      setZoneName("");
      await loadZones();
      setZoneId(data.id);
      setMsg(`Zone “${data.name}” created.`);
    } catch (e) {
      alert(e?.message || String(e));
    }
  }

  async function addZip() {
    setMsg(""); setZErr("");
    try {
      if (!selectedZone) throw new Error("Select a zone first.");
      const zip = (newZip || "").trim();
      if (!/^\d{5}$/.test(zip)) throw new Error("ZIP must be 5 digits.");
      const next = Array.from(new Set([...(selectedZone.zip_codes || []), zip]));
      const { data, error } = await supabase
        .from("zones")
        .update({ zip_codes: next })
        .eq("id", selectedZone.id)
        .select("id,zip_codes")
        .single();
      if (error) throw error;
      setZones(zones.map(z => z.id === selectedZone.id ? { ...z, zip_codes: data.zip_codes } : z));
      setNewZip("");
      setMsg(`Added ZIP ${zip}.`);
    } catch (e) {
      alert(e?.message || String(e));
    }
  }

  async function removeZip(zip) {
    setMsg(""); setZErr("");
    try {
      if (!selectedZone) return;
      const next = (selectedZone.zip_codes || []).filter(z => z !== zip);
      const { data, error } = await supabase
        .from("zones")
        .update({ zip_codes: next })
        .eq("id", selectedZone.id)
        .select("id,zip_codes")
        .single();
      if (error) throw error;
      setZones(zones.map(z => z.id === selectedZone.id ? { ...z, zip_codes: data.zip_codes } : z));
      setMsg(`Removed ZIP ${zip}.`);
    } catch (e) {
      alert(e?.message || String(e));
    }
  }

  function* dateRange(from, to) {
    const d = new Date(from + "T00:00:00");
    const end = new Date(to + "T00:00:00");
    while (d <= end) {
      yield new Date(d);
      d.setDate(d.getDate() + 1);
    }
  }

  function toUTCDate(date, hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    // construct UTC datetime
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), h, m, 0)).toISOString();
  }

  async function generateWindows() {
    if (!selectedZone) return alert("Select a zone first.");
    if (!genFrom || !genTo) return alert("Pick a date range.");
    if (capacity <= 0) return alert("Capacity must be > 0.");

    setBusy(true); setMsg(""); setSErr("");
    try {
      const rows = [];
      for (const d of dateRange(genFrom, genTo)) {
        const slot_date = d.toISOString().slice(0, 10);
        rows.push({
          zone_id: selectedZone.id,
          slot_date,
          window_start: toUTCDate(d, winStart),
          window_end: toUTCDate(d, winEnd),
          capacity: Number(capacity),
          used_count: 0,
        });
      }
      // bulk insert in chunks (PostgREST prefers <=1000 rows)
      const chunkSize = 200;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const { error } = await supabase.from("time_slots").insert(chunk);
        if (error) throw error;
      }
      setMsg(`Created ${rows.length} pickup window(s) for “${selectedZone.name}”.`);
      // refresh slots list for selected day if it’s inside the generated range
      if (dateStr >= genFrom && dateStr <= genTo) await loadSlotsForDay();
    } catch (e) {
      alert(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function loadSlotsForDay() {
    if (!selectedZone || !dateStr) return setSlots([]);
    setSlotsLoading(true); setSErr("");
    const { data, error } = await supabase
      .from("time_slots")
      .select("id,slot_date,window_start,window_end,capacity,used_count")
      .eq("zone_id", selectedZone.id)
      .eq("slot_date", dateStr)
      .order("window_start", { ascending: true });
    if (error) setSErr(error.message);
    setSlots(data || []);
    setSlotsLoading(false);
  }

  useEffect(() => { loadSlotsForDay(); /* eslint-disable-next-line */ }, [zoneId, dateStr]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-white">Zones &amp; Slots</h1>
      <p className="mt-2 text-sm text-white/80">
        1) Create or select a zone. 2) Add ZIP codes. 3) Generate pickup windows (date range, time window, capacity).
        4) Check slots for a date to confirm.
      </p>

      {msg && <div className="mt-4 rounded bg-green-600/20 text-green-200 p-3">{msg}</div>}
      {(zErr || sErr) && <div className="mt-4 rounded bg-red-600/20 text-red-200 p-3">{zErr || sErr}</div>}

      <div className="mt-6 grid md:grid-cols-2 gap-6">
        {/* Left: Zones & ZIPs */}
        <div className="rounded-xl bg-white/90 p-4 text-black">
          <h2 className="font-semibold">Step 1 • Zones</h2>
          <div className="mt-2">
            {zonesLoading ? (
              <div className="text-sm text-gray-600">Loading zones…</div>
            ) : zones.length === 0 ? (
              <div className="text-sm text-gray-600">No zones yet. Create your first zone below.</div>
            ) : (
              <select
                className="mt-2 w-full rounded border px-3 py-2"
                value={zoneId || ""}
                onChange={e => setZoneId(Number(e.target.value))}
              >
                <option value="" disabled>Select a zone…</option>
                {zones.map(z => (
                  <option key={z.id} value={z.id}>
                    {z.name} • fee ${(z.pickup_fee_cents/100).toFixed(2)}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-gray-600">Zone name</label>
              <input className="w-full rounded border px-3 py-2" value={zoneName}
                     onChange={e => setZoneName(e.target.value)} placeholder="Cleveland West" />
            </div>
            <div>
              <label className="text-xs text-gray-600">Pickup fee (cents)</label>
              <input className="w-full rounded border px-3 py-2" type="number" min={0}
                     value={feeCents} onChange={e => setFeeCents(e.target.value)} />
            </div>
            <div className="col-span-3">
              <button onClick={createZone} className="rounded bg-black text-white px-4 py-2">
                Save / create zone
              </button>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="font-semibold">Step 2 • ZIP codes</h3>
            {!selectedZone ? (
              <div className="text-sm text-gray-600">Select a zone to manage ZIPs.</div>
            ) : (
              <>
                <div className="mt-2 flex gap-2">
                  <input className="w-40 rounded border px-3 py-2"
                         value={newZip} onChange={e => setNewZip(e.target.value)}
                         placeholder="44102" maxLength={5} />
                  <button onClick={addZip} className="rounded bg-black text-white px-4 py-2">Add ZIP</button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(selectedZone.zip_codes || []).length === 0 ? (
                    <div className="text-sm text-gray-600">No ZIPs yet.</div>
                  ) : (
                    (selectedZone.zip_codes || []).map(z => (
                      <span key={z} className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs">
                        {z}
                        <button onClick={() => removeZip(z)} className="text-red-600 hover:underline">remove</button>
                      </span>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: Generate + Day view */}
        <div className="rounded-xl bg-white/90 p-4 text-black">
          <h2 className="font-semibold">Step 3 • Generate pickup windows</h2>
          {!selectedZone ? (
            <div className="mt-2 text-sm text-gray-600">Select a zone first.</div>
          ) : (
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600">From</label>
                <input type="date" className="w-full rounded border px-3 py-2"
                       value={genFrom} onChange={e => setGenFrom(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-600">To</label>
                <input type="date" className="w-full rounded border px-3 py-2"
                       value={genTo} onChange={e => setGenTo(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Window start</label>
                <input type="time" className="w-full rounded border px-3 py-2"
                       value={winStart} onChange={e => setWinStart(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Window end</label>
                <input type="time" className="w-full rounded border px-3 py-2"
                       value={winEnd} onChange={e => setWinEnd(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Capacity per window</label>
                <input type="number" min={1} className="w-full rounded border px-3 py-2"
                       value={capacity} onChange={e => setCapacity(Number(e.target.value))} />
              </div>
              <div className="flex items-end">
                <button disabled={busy} onClick={generateWindows}
                        className="rounded bg-black text-white px-4 py-2 disabled:opacity-50">
                  {busy ? "Creating…" : "Create windows"}
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 border-t pt-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Step 4 • Slots on {dateStr}</h2>
              <div className="flex items-center gap-2">
                <input type="date" className="rounded border px-3 py-1.5"
                       value={dateStr} onChange={e => setDateStr(e.target.value)} />
                <button onClick={loadSlotsForDay} className="text-sm underline">Refresh</button>
              </div>
            </div>

            <div className="mt-2 rounded border bg-white">
              {slotsLoading ? (
                <div className="p-3 text-sm text-gray-600">Loading…</div>
              ) : slots.length === 0 ? (
                <div className="p-3 text-sm text-gray-600">No slots for this date.</div>
              ) : (
                <ul className="divide-y">
                  {slots.map(s => (
                    <li key={s.id} className="p-3 text-sm flex items-center justify-between">
                      <span>
                        {new Date(s.window_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {" – "}
                        {new Date(s.window_end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="text-gray-600">
                        {s.used_count} / {s.capacity}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


