import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const [mode, setMode] = useState("signin"); // 'signin' | 'signup'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) return alert("Enter email & password");

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert("Account created. Now sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = "/schedule";
      }
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="max-w-md mx-auto rounded-xl bg-white/85 backdrop-blur p-6 border border-white/40 mt-12">
      <h2 className="text-2xl font-semibold text-gray-900 mb-2">
        {mode === "signup" ? "Create account" : "Sign in"}
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        {mode === "signup"
          ? "Create a password so you can log in during development."
          : "Use your email & password to sign in."}
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          placeholder="you@example.com"
          className="w-full rounded-md border border-gray-300 bg-white/90 px-3 py-2"
          value={email} onChange={e=>setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full rounded-md border border-gray-300 bg-white/90 px-3 py-2"
          value={password} onChange={e=>setPassword(e.target.value)}
        />
        <button className="w-full rounded-md bg-black text-white px-4 py-2">
          {mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </form>
      <div className="mt-4 text-xs text-gray-600">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <button className="underline" onClick={()=>setMode("signin")}>Sign in</button>
          </>
        ) : (
          <>
            New here?{" "}
            <button className="underline" onClick={()=>setMode("signup")}>Create account</button>
          </>
        )}
      </div>
    </div>
  );
}
