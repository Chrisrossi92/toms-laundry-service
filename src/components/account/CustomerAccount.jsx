import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useSession } from "../../lib/AuthProvider.jsx";

/**
 * CustomerAccount
 * Edits the current user's profile in `user_profiles`
 * Columns used:
 *  - user_id (uuid, PK/unique)
 *  - phone (text)
 *  - email_opt_in (bool)
 */
export default function CustomerAccount() {
  const { session } = useSession();
  const uid = session?.user?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState("");
  const [msg, setMsg]         = useState("");

  const [phone, setPhone]         = useState("");
  const [emailOptIn, setEmailOptIn] = useState(true);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      setLoading(true); setErr(""); setMsg("");
      // fetch or create the profile row
      const { data, error } = await supabase
        .from("user_profiles")
        .select("user_id, phone, email_opt_in")
        .eq("user_id", uid)
        .maybeSingle();

      if (error) {
        setErr(error.message);
        setLoading(false);
        return;
      }

      if (!data) {
        const { error: insErr } = await supabase
          .from("user_profiles")
          .insert({ user_id: uid, phone: "", email_opt_in: true });

        if (insErr) {
          setErr(insErr.message);
          setLoading(false);
          return;
        }
        setPhone("");
        setEmailOptIn(true);
      } else {
        setPhone(data.phone || "");
        setEmailOptIn(!!data.email_opt_in);
      }
      setLoading(false);
    })();
  }, [uid]);

  async function save() {
    if (!uid) return;
    setSaving(true); setErr(""); setMsg("");
    const { error } = await supabase
      .from("user_profiles")
      .update({ phone: phone.trim(), email_opt_in: emailOptIn })
      .eq("user_id", uid);

    setSaving(false);
    if (error) setErr(error.message);
    else setMsg("Profile saved.");
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold text-white">My Account</h1>

      {err && <div className="mt-4 rounded bg-red-600/15 text-red-200 px-3 py-2 text-sm">{err}</div>}
      {msg && <div className="mt-4 rounded bg-green-600/15 text-green-200 px-3 py-2 text-sm">{msg}</div>}

      <div className="mt-6 rounded-xl bg-white/90 p-4 text-black">
        <h2 className="font-semibold">Contact</h2>
        <div className="mt-3 grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Email</label>
            <input
              className="w-full rounded border px-3 py-2 bg-gray-100"
              value={session?.user?.email || ""}
              disabled
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Phone</label>
            <input
              className="w-full rounded border px-3 py-2"
              placeholder="+1 555 123 4567"
              value={phone}
              onChange={e=>setPhone(e.target.value)}
            />
          </div>
        </div>

        <label className="mt-4 inline-flex items-center gap-2">
          <input type="checkbox" checked={emailOptIn} onChange={e=>setEmailOptIn(e.target.checked)} />
          Email me updates about my orders
        </label>

        <div className="mt-4">
          <button
            onClick={save}
            disabled={loading || saving}
            className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save profile"}
          </button>
          {loading && <span className="ml-3 text-sm text-gray-600">Loading…</span>}
        </div>
      </div>
    </div>
  );
}
