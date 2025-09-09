import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { format } from "date-fns";

/* Zones & Slots — guided, dead simple.
   Step 1: Select or create Zone
   Step 2: Add ZIPs to that Zone
   Step 3: Generate pickup windows
   Step 4: Check slots for a date
*/

export default function AdminSlots() {
  const [zones, setZones] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  // create/update inputs
  const [zoneName, setZoneName] = useState("");
  const [feeCents, setFeeCents] = useState(300);
  const [zipToAdd, setZipToAdd] = useState("");

  // generate inputs
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [days, setDays] = useState(14);
  const [start, setStart] = useState("18:00");
  const [end, setEnd] = useState("20:00");
  const [capacity, setCapacity] = useState(12);

  // right pane slots list
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // ui
  const [toast, setToast] = useState("");

  useEffect(() => { loadZones(); }, []);

  async function loadZones() {
    const { data, error } = await supabase
      .from("zones")
      .select("id, name, zip_codes, pickup_fee_cents")
      .order("id");
    if (!error) {
      setZones(data || []);
      if (!selectedId && data?.length) setSelectedId(data[0].id);
    }
  }

  const selectedZone = useMemo(
    () => zones.find(z => z.id === selectedId) || null,
    [zones, selectedId]
  );

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 1500);
  }

  /* ---------- Step 1: Select / Create Zone ---------- */
  async function saveOrCreateZone() {
    const name = zoneName.trim();
    const fee = Number(feeCents || 0);
    if (!name) { alert("Enter a zone name."); return; }

    const { data, error } = await supabase.rpc("add_zip_to_zone", {
      p_zone_name: name,
      p_zip: zipToAdd.trim() || "",     // allow blank when creating
      p_pickup_fee_cents: fee
    });
    if (error) return alert(error.message);
    setZoneName("");
    setZipToAdd("");
    setFeeCents(fee);
    await loadZones();
    setSelectedId(data.id);
    showToast("Zone saved");
  }

  /* ---------- Step 2: Append ZIP to selected Zone ---------- */
  async function appendZip() {
    if (!selectedZone) return alert("Select a zone first.");
    const zip = zipToAdd.trim();
    if (!zip) return alert("Enter a ZIP.");
    const { data, error } = await supabase.rpc("add_zip_to_zone", {
      p_zone_name: selectedZone.name,
      p_zip: zip,
      p_pickup_fee_cents: selectedZone.pickup_fee_cents || 0
    });
    if (error) return alert(error.message);
    setZipToAdd("");
    await loadZones();
    setSelectedId(data.id);
    showToast("ZIP added");
  }

  async function removeZip(zip) {
    if (!selectedZone) return;
    const newZips = (selectedZone.zip_codes || []).filter(z => z !== zip);
    const { error } = await supabase
      .from("zones")
      .update({ zip_codes: newZips })
      .eq("id", selectedZone.id);
    if (error) return alert(error.message);
    await loadZones();
    showToast("ZIP removed");
  }

  /* ---------- Step 3: Generate pickup windows ---------- */
  async function generateSlots() {
    if (!selectedZone) return alert("Select a zone first.");
    const d = date;
    const n = Number(days || 0);
    const cap = Number(capacity || 0);
    if (n <= 0) return alert("Days must be > 0");
    if (cap <= 0) return alert("Capacity must be > 0");

    const { error } = await supabase.rpc("generate_time_slots", {
      p_zone_id: selectedZone.id,
      p_start: d,
      p_days: n,
      p_window_start: start + ":00",
      p_window_end: end + ":00",
      p_capacity: cap
    });
    if (error) return alert(error.message);
    showToast("Slots generated");
    loadSlotsForDate(); // refresh right pane
  }

  /* ---------- Step 4: Check slots ---------- */
  async function loadSlotsForDate() {
    if (!selectedZone) return;
    setLoadingSlots(true);
    const { data, error } = await supabase
      .from("time_slots")
      .select("id, date, window_start, window_end, capacity, used_count")
      .eq("zone_id", selectedZone.id)
      .eq("date", date)
      .order("window_start");
    if (!error) setSlots(data || []);
    setLoadingSlots(false);
  }

  useEffect(() => { loadSlotsForDate(); /* eager refresh when switching zone */ }, [selectedZone, date]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <h2 className="text-2xl font-semibold text-white">Zones & Slots</h2>

      {/* Help box */}
      <Help>
        <ol className="list-decimal ml-5 space-y-1">
          <li><b>Create or select a zone.</b> A zone is just a named area (e.g., “Cleveland West”).</li>
          <li><b>Add ZIP codes</b> covered by that zone.</li>
          <li><b>Generate pickup windows</b> (date range, time window, capacity).</li>
          <li><b>Check slots for a date</b> to confirm everything looks right.</li>
        </ol>
      </Help>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Left side: zones list + editor */}
        <Card>
          <Section>Step 1 • Zones</Section>

          {/* Existing zones */}
          <div className="space-y-2">
            {zones.length === 0 ? (
              <Muted>No zones yet. Create your first zone below.</Muted>
            ) : (
              zones.map(z => (
                <button
                  key={z.id}
                  onClick={() => setSelectedId(z.id)}
                  className={`w-full text-left rounded-md border px-3 py-2 ${
                    selectedId === z.id ? "bg-black text-white border-black" : "bg-white border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{z.name}</div>
                    <div className="text-xs">{`$${(z.pickup_fee_cents/100).toFixed(2)} fee`}</div>
                  </div>
                  <div className="text-xs text-gray-600">
                    ZIPs: {z.zip_codes?.length ? z.zip_codes.join(", ") : "—"}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Create/update zone */}
          <div className="mt-4 space-y-2">
            <InputRow
              label="Zone name"
              value={zoneName}
              onChange={setZoneName}
              placeholder="e.g., Cleveland West"
            />
            <InputRow
              label="Pickup fee (cents)"
              value={feeCents}
              onChange={v => setFeeCents(v.replace(/[^\d]/g, ""))}
              placeholder="300"
            />
            <div className="flex gap-2">
              <Button onClick={saveOrCreateZone}>Save / create zone</Button>
            </div>
          </div>

          {/* ZIP management */}
          <div className="mt-6">
            <Section>Step 2 • ZIP codes</Section>
            {!selectedZone ? (
              <Muted>Select a zone to manage ZIPs.</Muted>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    className="border rounded px-3 py-2 flex-1"
                    placeholder="Add ZIP (e.g., 44102)"
                    value={zipToAdd}
                    onChange={e => setZipToAdd(e.target.value)}
                  />
                  <Button onClick={appendZip}>Append ZIP</Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(selectedZone.zip_codes || []).map(zip => (
                    <span key={zip} className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded-full bg-white/90 border">
                      {zip}
                      <button className="text-gray-500 hover:text-black" onClick={() => removeZip(zip)}>×</button>
                    </span>
                  ))}
                  {(!selectedZone.zip_codes || selectedZone.zip_codes.length===0) && (
                    <Muted>No ZIPs yet.</Muted>
                  )}
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Right side: generator + slots for date */}
        <Card>
          <Section>Step 3 • Generate pickup windows</Section>
          {!selectedZone ? (
            <Muted>Select a zone first.</Muted>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Start date">
                <input type="date" className="border rounded px-3 py-2 w-full" value={date} onChange={e=>setDate(e.target.value)} />
              </Field>
              <Field label="Days">
                <input type="number" className="border rounded px-3 py-2 w-full" min={1} value={days} onChange={e=>setDays(e.target.value)} />
              </Field>
              <Field label="Window start (HH:MM)">
                <input className="border rounded px-3 py-2 w-full" value={start} onChange={e=>setStart(e.target.value)} />
              </Field>
              <Field label="Window end (HH:MM)">
                <input className="border rounded px-3 py-2 w-full" value={end} onChange={e=>setEnd(e.target.value)} />
              </Field>
              <Field label="Capacity">
                <input type="number" className="border rounded px-3 py-2 w-full" min={1} value={capacity} onChange={e=>setCapacity(e.target.value)} />
              </Field>
              <div className="flex items-end">
                <Button onClick={generateSlots}>Generate</Button>
              </div>
            </div>
          )}

          <div className="mt-6">
            <Section>Step 4 • Slots on {date}</Section>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">{selectedZone ? selectedZone.name : ""}</span>
              <button className="text-xs underline" onClick={loadSlotsForDate}>Refresh</button>
            </div>
            <div className="rounded-md border bg-white p-2 min-h-[52px]">
              {loadingSlots ? (
                <div className="text-sm text-gray-600">Loading…</div>
              ) : slots.length === 0 ? (
                <div className="text-sm text-gray-600">No slots for this date.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="p-2 text-left">Window</th>
                      <th className="p-2 text-left">Cap</th>
                      <th className="p-2 text-left">Used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slots.map(s => (
                      <tr key={s.id} className="border-t">
                        <td className="p-2">{s.window_start.slice(0,5)}–{s.window_end.slice(0,5)}</td>
                        <td className="p-2">{s.capacity}</td>
                        <td className="p-2">{s.used_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </Card>
      </div>

      <Toast show={!!toast}>{toast}</Toast>
    </div>
  );
}

/* ---------- tiny UI helpers ---------- */
function Card({ children }) { return <div className="rounded-xl bg-white/85 backdrop-blur p-5 border border-white/40">{children}</div>; }
function Help({ children }) { return <div className="rounded-xl bg-white/75 backdrop-blur p-4 border border-white/30 text-sm text-gray-800">{children}</div>; }
function Section({ children }) { return <div className="font-semibold text-gray-900 mb-3">{children}</div>; }
function Field({ label, children }) { return (<label className="block text-sm text-gray-700">{label}{children}</label>); }
function InputRow({ label, value, onChange, placeholder }) {
  return (
    <label className="block text-sm text-gray-700">
      {label}
      <input className="mt-1 w-full border rounded px-3 py-2" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/>
    </label>
  );
}
function Button({ children, onClick }) {
  return <button onClick={onClick} className="rounded-md bg-black text-white px-4 py-2 text-sm">{children}</button>;
}
function Muted({ children }) { return <div className="text-sm text-gray-600">{children}</div>; }
function Toast({ show, children }) {
  if (!show) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="rounded-full bg-black text-white px-4 py-2 text-sm shadow">{children}</div>
    </div>
  );
}


