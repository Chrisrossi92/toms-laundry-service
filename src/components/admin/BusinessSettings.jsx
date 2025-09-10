import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

/**
 * BusinessSettings
 * Reads/writes the singleton row in `settings_laundry`
 * Columns used:
 *  - allow_softener (bool)
 *  - allow_fragrance_free (bool)
 *  - allow_notes (bool)
 *  - default_detergent (text)
 *  - default_wash_temp (text)  e.g. "cold" | "warm" | "hot"
 *  - default_dry_level (text)  e.g. "low" | "medium" | "high"
 */
export default function BusinessSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState("");
  const [msg, setMsg]         = useState("");

  const [rowId, setRowId] = useState(null);

  const [allowSoftener, setAllowSoftener] = useState(true);
  const [allowFragranceFree, setAllowFragranceFree] = useState(true);
  const [allowNotes, setAllowNotes] = useState(true);

  const [detergent, setDetergent] = useState("Standard");
  const [washTemp,  setWashTemp]  = useState("warm");
  const [dryLevel,  setDryLevel]  = useState("medium");

  const detergentOptions = ["Standard", "Free & Clear", "Eco"];
  const washOptions      = ["cold", "warm", "hot"];
  const dryOptions       = ["low", "medium", "high"];

  useEffect(() => {
    (async () => {
      setLoading(true); setErr(""); setMsg("");
      // Read the latest (or first) row
      const { data, error } = await supabase
        .from("settings_laundry")
        .select("id, allow_softener, allow_fragrance_free, allow_notes, default_detergent, default_wash_temp, default_dry_level")
        .order("id", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        setErr(error.message);
        setLoading(false);
        return;
      }

      if (!data) {
        // Create a default row if table is empty
        const { data: inserted, error: insErr } = await supabase
          .from("settings_laundry")
          .insert({
            allow_softener: true,
            allow_fragrance_free: true,
            allow_notes: true,
            default_detergent: "Standard",
            default_wash_temp: "warm",
            default_dry_level: "medium",
          })
          .select("id, allow_softener, allow_fragrance_free, allow_notes, default_detergent, default_wash_temp, default_dry_level")
          .single();

        if (insErr) {
          setErr(insErr.message);
          setLoading(false);
          return;
        }
        apply(inserted);
      } else {
        apply(data);
      }

      setLoading(false);
    })();

    function apply(r) {
      setRowId(r.id);
      setAllowSoftener(!!r.allow_softener);
      setAllowFragranceFree(!!r.allow_fragrance_free);
      setAllowNotes(!!r.allow_notes);
      if (r.default_detergent) setDetergent(r.default_detergent);
      if (r.default_wash_temp) setWashTemp(r.default_wash_temp);
      if (r.default_dry_level) setDryLevel(r.default_dry_level);
    }
  }, []);

  async function save() {
    if (!rowId) return;
    setSaving(true); setErr(""); setMsg("");
    const { error } = await supabase
      .from("settings_laundry")
      .update({
        allow_softener: allowSoftener,
        allow_fragrance_free: allowFragranceFree,
        allow_notes: allowNotes,
        default_detergent: detergent,
        default_wash_temp: washTemp,
        default_dry_level: dryLevel,
      })
      .eq("id", rowId);

    setSaving(false);
    if (error) setErr(error.message);
    else setMsg("Settings saved.");
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold text-white">Business Settings</h1>

      {err && <div className="mt-4 rounded bg-red-600/15 text-red-200 px-3 py-2 text-sm">{err}</div>}
      {msg && <div className="mt-4 rounded bg-green-600/15 text-green-200 px-3 py-2 text-sm">{msg}</div>}

      <div className="mt-6 rounded-xl bg-white/90 p-4 text-black">
        <h2 className="font-semibold">Customer options (enable/disable)</h2>
        <div className="mt-3 grid md:grid-cols-3 gap-3">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={allowSoftener} onChange={e=>setAllowSoftener(e.target.checked)} />
            Allow fabric softener
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={allowFragranceFree} onChange={e=>setAllowFragranceFree(e.target.checked)} />
            Allow fragrance-free
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={allowNotes} onChange={e=>setAllowNotes(e.target.checked)} />
            Allow notes field
          </label>
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-white/90 p-4 text-black">
        <h2 className="font-semibold">Default laundry preferences</h2>

        <div className="mt-3 grid md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Detergent</label>
            <select className="w-full rounded border px-3 py-2"
                    value={detergent} onChange={e=>setDetergent(e.target.value)}>
              {detergentOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Wash temperature</label>
            <select className="w-full rounded border px-3 py-2"
                    value={washTemp} onChange={e=>setWashTemp(e.target.value)}>
              {washOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Dry level</label>
            <select className="w-full rounded border px-3 py-2"
                    value={dryLevel} onChange={e=>setDryLevel(e.target.value)}>
              {dryOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        </div>

        <button
          onClick={save}
          disabled={loading || saving || !rowId}
          className="mt-4 rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>

        {loading && <div className="mt-3 text-sm text-gray-600">Loading settings…</div>}
      </div>
    </div>
  );
}
