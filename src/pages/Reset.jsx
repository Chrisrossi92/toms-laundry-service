// src/pages/Reset.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function Reset() {
  const nav = useNavigate();

  const [ready, setReady]   = useState(false);
  const [loading, setLoad]  = useState(false);
  const [pw1, setPw1]       = useState("");
  const [pw2, setPw2]       = useState("");
  const [show1, setShow1]   = useState(false);
  const [show2, setShow2]   = useState(false);
  const [alert, setAlert]   = useState(null); // {type:'error'|'success'|'info', text:''}

  useEffect(() => {
    (async () => {
      setAlert({ type: "info", text: "Preparing reset form…" });
      const h = new URLSearchParams(window.location.hash.slice(1));
      const type = h.get("type");
      const access_token  = h.get("access_token");
      const refresh_token = h.get("refresh_token");

      if (type === "recovery" && access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) {
          setAlert({ type: "error", text: error.message });
          setReady(false);
        } else {
          setAlert(null);
          setReady(true);
        }
      } else {
        setAlert({ type: "error", text: "This reset link is invalid or expired." });
      }
    })();
  }, []);

  function validate() {
    if (pw1.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(pw1) || !/[a-z]/.test(pw1) || !/\d/.test(pw1)) {
      return "Use upper + lower case letters and a number.";
    }
    if (pw1 !== pw2) return "Passwords do not match.";
    return null;
  }

  async function onSubmit(e) {
    e.preventDefault();
    const v = validate();
    if (v) return setAlert({ type: "error", text: v });

    setLoad(true);
    const { error } = await supabase.auth.updateUser({ password: pw1 });
    setLoad(false);

    if (error) setAlert({ type: "error", text: error.message });
    else {
      setAlert({ type: "success", text: "Password updated. Redirecting…" });
      setTimeout(() => nav("/account"), 900);
    }
  }

  return (
    <div className="px-4 py-16">
      <div className="max-w-md mx-auto">
        <div className="rounded-2xl border border-white/20 bg-white/90 p-6 shadow-xl">
          <h1 className="text-2xl font-semibold text-gray-900">Reset your password</h1>
          <p className="mt-1 text-sm text-gray-600">Enter a new password for your account.</p>

          {alert && (
            <div
              className={`mt-4 rounded-md px-3 py-2 text-sm ${
                alert.type === "error"
                  ? "bg-red-600/15 text-red-700"
                  : alert.type === "success"
                  ? "bg-green-600/15 text-green-700"
                  : "bg-gray-600/10 text-gray-700"
              }`}
            >
              {alert.text}
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">New password</label>
              <div className="relative">
                <input
                  type={show1 ? "text" : "password"}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="••••••••"
                  value={pw1}
                  onChange={(e) => setPw1(e.target.value)}
                  disabled={!ready || loading}
                />
                <button
                  type="button"
                  onClick={() => setShow1((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-600 hover:underline"
                >
                  {show1 ? "Hide" : "Show"}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                At least 8 chars with upper/lowercase & a number (e.g. <code>Test1234!</code>).
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Confirm password</label>
              <div className="relative">
                <input
                  type={show2 ? "text" : "password"}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="••••••••"
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  disabled={!ready || loading}
                />
                <button
                  type="button"
                  onClick={() => setShow2((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-600 hover:underline"
                >
                  {show2 ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={!ready || loading}
              className="w-full rounded-lg bg-black px-4 py-2 font-medium text-white disabled:opacity-50"
            >
              {loading ? "Updating…" : "Update password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

