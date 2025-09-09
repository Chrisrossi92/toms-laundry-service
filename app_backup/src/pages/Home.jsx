import { supabase } from "../lib/supabaseClient";
import { useSession } from "../lib/AuthProvider.jsx";
import { useState } from "react";

export default function Home() {
  const { session } = useSession();
  const [email, setEmail] = useState("");

  async function signIn(e) {
    e.preventDefault();
    if (!email) return;
    const { error } = await supabase.auth.signInWithOtp({ email, options:{ emailRedirectTo: window.location.origin } });
    if (error) alert(error.message);
    else alert("Magic link sent. Check your email!");
  }

  return (
    <div className="grid md:grid-cols-2 gap-8 items-center">
      <div>
        <h1 className="text-3xl font-bold mb-3">Laundry picked up tonight. Back tomorrow.</h1>
        <p className="text-gray-600 mb-6">Flat-rate per bag. Set your preferences once. We handle the rest.</p>
        {!session ? (
          <form onSubmit={signIn} className="flex gap-2">
            <input className="border rounded px-3 py-2 flex-1" placeholder="Email for magic link" value={email} onChange={e=>setEmail(e.target.value)} />
            <button className="bg-black text-white px-4 rounded">Get Started</button>
          </form>
        ) : (
          <a href="/schedule" className="inline-block bg-black text-white px-4 py-2 rounded">Schedule pickup</a>
        )}
        <ul className="mt-6 text-sm list-disc ml-5">
          <li>Evening pickup windows</li>
          <li>Next-day delivery</li>
          <li>Hypoallergenic options</li>
        </ul>
      </div>
      <div className="bg-gray-50 p-6 rounded border">
        <h3 className="font-semibold mb-3">Pricing (MVP)</h3>
        <ul className="space-y-1 text-sm">
          <li>• $25 per 13-gal bag</li>
          <li>• $3 pickup fee (waived with promo)</li>
          <li>• Optional tip at checkout</li>
        </ul>
      </div>
    </div>
  );
}
