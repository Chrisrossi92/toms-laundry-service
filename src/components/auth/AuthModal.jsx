// src/components/auth/AuthModal.jsx
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../lib/supabaseClient";

export default function AuthModal({ open, onClose, mode: initialMode = "login" }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'signup' | 'magic'
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null); // { type: 'error'|'info'|'success', text: string }

  useEffect(() => {
    if (!open) return;
    setMode(initialMode || "login");
    setEmail("");
    setPw("");
    setPw2("");
    setMsg(null);

    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, initialMode, onClose]);

  if (!open) return null;

  async function doLogin(e) {
    e.preventDefault();
    setMsg(null);
    if (!email || !pw) return setMsg({ type: "error", text: "Enter email and password." });
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
      if (error) throw error;
      setMsg({ type: "success", text: "Welcome back!" });
      setTimeout(() => onClose?.(), 500);
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Login failed." });
    } finally {
      setLoading(false);
    }
  }

  async function doSignup(e) {
    e.preventDefault();
    setMsg(null);
    if (!email || !pw) return setMsg({ type: "error", text: "Enter email and password." });
    if (pw.length < 8) return setMsg({ type: "error", text: "Password must be at least 8 characters." });
    if (pw !== pw2) return setMsg({ type: "error", text: "Passwords do not match." });
    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password: pw,
        options: { emailRedirectTo: window.location.origin + "/account" },
      });
      if (error) throw error;
      setMsg({ type: "success", text: "Check your email to confirm or log in now." });
      setTimeout(() => onClose?.(), 900);
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Sign up failed." });
    } finally {
      setLoading(false);
    }
  }

  async function doMagic(e) {
    e.preventDefault();
    setMsg(null);
    if (!email) return setMsg({ type: "error", text: "Enter your email." });
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: window.location.origin + "/account" },
      });
      if (error) throw error;
      setMsg({ type: "success", text: "Magic link sent. Check your inbox." });
      setTimeout(() => onClose?.(), 900);
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Could not send magic link." });
    } finally {
      setLoading(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* card */}
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {mode === "login" ? "Log in" : mode === "signup" ? "Sign up" : "Email me a magic link"}
          </h3>
          <button
            onClick={onClose}
            className="rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* message */}
        {msg && (
          <div
            className={`mt-3 rounded px-3 py-2 text-sm ${
              msg.type === "error"
                ? "bg-red-600/10 text-red-700"
                : msg.type === "success"
                ? "bg-green-600/10 text-green-700"
                : "bg-gray-600/10 text-gray-700"
            }`}
          >
            {msg.text}
          </div>
        )}

        {/* form */}
        <form className="mt-4 space-y-3" onSubmit={mode === "login" ? doLogin : mode === "signup" ? doSignup : doMagic}>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Email</label>
            <input
              type="email"
              className="w-full rounded border border-gray-300 bg-white px-3 py-2"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus
              required
            />
          </div>

          {mode !== "magic" && (
            <>
              <div className="relative">
                <label className="block text-sm text-gray-700 mb-1">Password</label>
                <input
                  type={showPw ? "text" : "password"}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 pr-16"
                  placeholder="••••••••"
                  value={pw}
                  onChange={e => setPw(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-2 top-7 text-xs text-gray-600 hover:underline"
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>

              {mode === "signup" && (
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Confirm password</label>
                  <input
                    type={showPw ? "text" : "password"}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2"
                    placeholder="••••••••"
                    value={pw2}
                    onChange={e => setPw2(e.target.value)}
                    required
                  />
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full rounded bg-black px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {loading ? "Please wait…" : mode === "login" ? "Log in" : mode === "signup" ? "Create account" : "Send magic link"}
          </button>
        </form>

        {/* switches */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          {mode !== "login" ? (
            <button className="hover:underline" onClick={() => setMode("login")}>Use password</button>
          ) : (
            <button className="hover:underline" onClick={() => setMode("magic")}>Email me a magic link</button>
          )}
          {mode === "signup" ? (
            <button className="hover:underline" onClick={() => setMode("login")}>Have an account? Log in</button>
          ) : (
            <button className="hover:underline" onClick={() => setMode("signup")}>New here? Sign up</button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}


