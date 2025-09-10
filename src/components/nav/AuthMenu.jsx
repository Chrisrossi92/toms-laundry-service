import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";           // <-- path from /components/nav
import { useSession } from "../../lib/AuthProvider.jsx";
import AuthModal from "../auth/AuthModal.jsx";                 // <-- modal default export

export default function AuthMenu() {
  const { session, role } = useSession();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("login"); // 'login' | 'signup' | 'magic'

  const displayName = useMemo(() => {
    const email = session?.user?.email || "";
    return email ? email.split("@")[0] : "guest";
  }, [session?.user?.email]);

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
    } finally {
      // clear any stale client-side cache and refresh
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    }
  }

  // Logged-in view
  if (session) {
    return (
      <div className="flex items-center gap-2 text-white">
        <span className="hidden md:inline">
          Hello, <span className="font-semibold">{displayName}</span>{" "}
          <span className="text-white/70">({role || "customer"})</span>
        </span>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded px-2 py-1 text-sm hover:bg-white/10 underline md:no-underline"
        >
          Log out
        </button>
      </div>
    );
  }

  // Logged-out view
  return (
    <>
      <button
        type="button"
        onClick={() => { setMode("login"); setOpen(true); }}
        className="rounded px-2 py-1 text-sm text-white hover:bg-white/10"
      >
        Log in / Sign up
      </button>

      {/* Mount the modal */}
      <AuthModal open={open} onClose={() => setOpen(false)} mode={mode} />
    </>
  );
}

