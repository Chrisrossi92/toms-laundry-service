import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useSession } from "../../lib/AuthProvider";
import AuthModal from "../auth/AuthModal";

export default function AuthMenu() {
  const { session, role } = useSession();
  const [open, setOpen] = useState(false);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (!session) {
    return (
      <div className="flex items-center gap-2">
        <button className="text-white/90 hover:underline" onClick={() => setOpen(true)}>Log in / Sign up</button>
        {open && <AuthModal onClose={() => setOpen(false)} />}
      </div>
    );
  }

  const name = session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "there";
  return (
    <div className="flex items-center gap-3 text-white/90">
      <span>Hello, <span className="font-semibold">{name}</span> <span className="text-white/60">({role})</span></span>
      <button className="hover:underline" onClick={logout}>Log out</button>
    </div>
  );
}
