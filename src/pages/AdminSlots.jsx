import { useEffect, useMemo, useState } from "react";
import { format, addDays } from "date-fns";
import { supabase } from "../lib/supabaseClient";
import { useSession } from "../lib/AuthProvider.jsx";

export default function AdminSlots() {
  const { role, authLoading } = useSession(); // role comes from profile
  const isAdmin = role === "admin";

  const [zones, setZones] = useState([]);
  const [zoneId, setZoneId] = useState(null);

  const [rangeDays, setRangeDays] = useState(14);
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState([]);

  const [newSlot, setNewSlot] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    start: "09:00",
    end: "11:00",
    capacity: 6,
  });

  const [bulkDays, setBulkDays] = useState(7);
  const [bulkWindows, setBulkWindows] = useState([
    { start: "09:00", end: "11:00", capacity: 6 },
    { start: "13:00", end: "15:00", capacity: 6 },
    { start: "17:00", end: "19:00", capacity: 6 },
  ]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("zones").select("id,name,zip_codes").order("id");
      setZones(data || []);
      if (data?.length && !zoneId) setZoneId(data[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!zoneId) return;
    (async () => {
      setLoading(true);
      const today = format(new Date(), "yyyy-MM-dd");
      const end = format(addDays(new Date(), rangeDays), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("time_slots")
        .select("id, zone_id, date, window_start, window_end, capacity, used_count")
        .eq("zone_id", zoneId)
        .gte("date", today)
        .lte("date", end)
        .order("date")
        .order("window_start");
      if (!error) setSlots(data || []);
      setLoading(false);
    })();
  }, [zoneId, rangeDays]);

  const grouped = useMemo(() => {
    const m = {};
    for (const s of slots) (m[s.date] ||= []).push(s);
    return m;
  }, [slots]);

  async function addSingleSlot() {
    if (!zoneId) return alert("Pick a zone first.");
    const { date, start, end, capacity } = newSlot;
    const payload = {
      zone_id: zoneId,
      date,
      window_start: start,
      window_end: end,
      capacity: Math.max(0, Number(capacity || 0)),
      used_count: 0,
    };
    const { error } = await supabase.from("time_slots").insert([payload]);
    if (error) return alert(error.message);
    // reload
    setRangeDays((d) => d); // trigger effect
  }

  async function closeSlot(id) {
    const { error } = await supabase.from("time_slots").update({ capacity: 0 }).eq("id", id);
    if (error) return alert(error.message);
    setRangeDays((d) => d);
  }

  async function bulkGenerate() {
    if (!zoneId) return alert("Pick a zone first.");
    // naive bulk insert on the client (ok for now; later you can move to an RPC)
    const rows = [];
    for (let d = 0; d < bulkDays; d++) {
      const iso = format(addDays(new Date(), d), "yyyy-MM-dd");
      for (const w of bulkWindows) {
        rows.push({
          zone_id: zoneId,
          date: iso,
          window_start: w.start,
          window_end: w.end,
          capacity: Math.max(0, Number(w.capacity || 0)),
          used_count: 0,
        });
      }
    }
    if (!rows.length) return;
    const { error } = await supabase.from("time_slots").insert(rows, { count: "exact" });
    if (error) return alert(error.message);
    setRangeDays((d) => d);
  }

  if (authLoading) return null;
  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-xl font-semibold mb-2">Admin only</h2>
        <p className="text-gray-600">You must be an admin to manage slots.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Pickup Windows (Admin)</h1>

      {/* Zone + range */}
      <div className="mb-6 grid md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-gray-700">Zone</label>
          <select
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2"
            value={zoneId || ""}
            onChange={(e) => setZoneId(Number(e.target.value))}
          >
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name} — {z.zip_codes?.join(", ")}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-700">Show next … days</label>
          <input
            type="number"
            min={1}
            max={30}
            className="mt-1 w-32 rounded-md border border-gray-300 bg-white px-3 py-2"
            value={rangeDays}
            onChange={(e) => setRangeDays(Math.max(1, Number(e.target.value || 1)))}
          />
        </div>
      </div>

      {/* Add single slot */}
      <div className="mb-6 rounded-lg border bg-white p-4">
        <h3 className="font-semibold mb-3">Add single slot</h3>
        <div className="grid sm:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-sm">Date</label>
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              value={newSlot.date}
              onChange={(e) => setNewSlot((s) => ({ ...s, date: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm">Start</label>
            <input
              type="time"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              value={newSlot.start}
              onChange={(e) => setNewSlot((s) => ({ ...s, start: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm">End</label>
            <input
              type="time"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              value={newSlot.end}
              onChange={(e) => setNewSlot((s) => ({ ...s, end: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm">Capacity</label>
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              value={newSlot.capacity}
              onChange={(e) => setNewSlot((s) => ({ ...s, capacity: Number(e.target.value || 0) }))}
            />
          </div>
          <div>
            <button onClick={addSingleSlot} className="mt-6 rounded-md bg-black px-4 py-2 text-white">
              Add slot
            </button>
          </div>
        </div>
      </div>

      {/* Bulk generate */}
      <div className="mb-6 rounded-lg border bg-white p-4">
        <h3 className="font-semibold mb-3">Bulk generate</h3>
        <div className="grid sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-sm">Days forward</label>
            <input
              type="number"
              min={1}
              max={28}
              className="mt-1 w-32 rounded-md border border-gray-300 px-3 py-2"
              value={bulkDays}
              onChange={(e) => setBulkDays(Math.max(1, Number(e.target.value || 1)))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm">Windows (editable JSON)</label>
            <textarea
              rows={3}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm"
              value={JSON.stringify(bulkWindows)}
              onChange={(e) => {
                try {
                  const arr = JSON.parse(e.target.value);
                  if (Array.isArray(arr)) setBulkWindows(arr);
                } catch {}
              }}
            />
          </div>
        </div>
        <button onClick={bulkGenerate} className="mt-3 rounded-md bg-black px-4 py-2 text-white">
          Generate
        </button>
      </div>

      {/* Calendar-ish list */}
      <div className="rounded-lg border bg-white p-4">
        <h3 className="font-semibold mb-3">Upcoming windows</h3>
        {loading && <div className="text-sm text-gray-600">Loading…</div>}
        {!loading && Object.keys(grouped).length === 0 && <div className="text-sm text-gray-600">No windows yet.</div>}
        <div className="space-y-4">
          {Object.entries(grouped).map(([date, rows]) => (
            <div key={date}>
              <div className="text-sm font-medium text-gray-700 mb-2">{format(new Date(date + "T00:00:00"), "EEE, MMM d")}</div>
              <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-2">
                {rows.map((s) => {
                  const full = s.used_count >= s.capacity;
                  return (
                    <div key={s.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <div className="text-sm">
                        {s.window_start.slice(0,5)}–{s.window_end.slice(0,5)} • cap {s.capacity} • used {s.used_count}
                        {full && <span className="ml-1 text-red-600">(full)</span>}
                      </div>
                      <button
                        onClick={() => closeSlot(s.id)}
                        className="text-xs rounded border px-2 py-1 hover:bg-gray-50"
                        title="Set capacity to 0"
                      >
                        Close
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}




