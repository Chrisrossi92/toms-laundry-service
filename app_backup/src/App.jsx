import { Routes, Route, Navigate, Link } from "react-router-dom";
import { useSession } from "./lib/AuthProvider.jsx";
import Home from "./pages/Home.jsx";
import Schedule from "./pages/Schedule.jsx";
import Track from "./pages/Track.jsx";
import Account from "./pages/Account.jsx";
import Dashboard from "./pages/Dashboard.jsx";

function RequireAuth({ children }) {
  const { session, loading } = useSession();
  if (loading) return <div className="p-6">Checking your session…</div>;
  if (!session) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="max-w-5xl mx-auto p-4 flex items-center gap-4">
          <Link to="/" className="font-bold">Tom’s Laundry Service</Link>
          <nav className="ml-auto flex gap-4 text-sm">
            <Link to="/schedule">Schedule</Link>
            <Link to="/track">Track</Link>
            <Link to="/account">Account</Link>
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto p-4">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/track" element={<RequireAuth><Track /></RequireAuth>} />
          <Route path="/account" element={<RequireAuth><Account /></RequireAuth>} />
          <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <footer className="border-t text-xs text-center py-4">© {new Date().getFullYear()} Tom’s Laundry Service</footer>
    </div>
  );
}
