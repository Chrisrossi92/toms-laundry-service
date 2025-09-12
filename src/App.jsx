// src/App.jsx
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useSession } from "./lib/AuthProvider.jsx";

// Pages
import Home from "./pages/Home.jsx";
import Schedule from "./pages/Schedule.jsx";
import Track from "./pages/Track.jsx";
import Account from "./pages/Account.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Driver from "./pages/Driver.jsx";
import AdminSlots from "./pages/AdminSlots.jsx";
import AdminPricing from "./pages/AdminPricing.jsx";
import AdminUsers from "./pages/AdminUsers.jsx";
import Reset from "./pages/Reset.jsx";

// Nav
import RoleNav from "./components/nav/RoleNav.jsx";
import AuthMenu from "./components/nav/AuthMenu.jsx";
import Success from "./pages/Success.jsx";


/** Require auth wrapper */
function RequireAuth({ children }) {
  const { session, authLoading } = useSession();
  if (authLoading) return <div className="p-6 text-white">Checking your session…</div>;
  if (!session) return <Navigate to="/" replace />;
  return children;
}

/** Require role wrapper */
function RequireRole({ children, allow }) {
  const { role, profileLoading } = useSession();
  if (profileLoading) return <div className="p-6 text-white">Loading…</div>;
  if (!allow.includes(role)) return <Navigate to="/" replace />;
  return children;
}

/** Role-aware landing after login */
function MyStart() {
  const { role } = useSession();
  if (role === "admin")  return <Navigate to="/dashboard" replace />;
  if (role === "driver") return <Navigate to="/driver" replace />;
  return <Navigate to="/schedule" replace />;
}

export default function App() {
  const nav = useNavigate();
  const loc = useLocation();

  // 🔧 Handle Supabase recovery links: redirect homepage#hash → /reset#hash
  useEffect(() => {
    if (window.location.hash.includes("type=recovery") && !loc.pathname.startsWith("/reset")) {
      nav("/reset" + window.location.hash, { replace: true });
    }
  }, [loc, nav]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4">
          <div className="h-14 flex items-center justify-between text-white">
            {/* Use Link to avoid full page reloads */}
            <Link to="/" className="font-semibold tracking-tight">
              Tom’s Laundry Service
            </Link>
            <div className="flex items-center gap-6">
              <RoleNav />
              <AuthMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Routes */}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          {/* reset MUST be before the wildcard */}
          <Route path="/reset" element={<Reset />} />
          <Route path="/me" element={<RequireAuth><MyStart /></RequireAuth>} />

          {/* Customer */}
         <Route path="/schedule" element={<Schedule/>} />
          <Route path="/track"    element={<Track/>} />
          <Route path="/success" element={<Success />} />

          
          <Route path="/account" element={<RequireAuth><Account /></RequireAuth>} />

          {/* Admin */}
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <RequireRole allow={["admin"]}>
                  <Dashboard />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/slots"
            element={
              <RequireAuth>
                <RequireRole allow={["admin"]}>
                  <AdminSlots />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/pricing"
            element={
              <RequireAuth>
                <RequireRole allow={["admin"]}>
                  <AdminPricing />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/users"
            element={
              <RequireAuth>
                <RequireRole allow={["admin"]}>
                  <AdminUsers />
                </RequireRole>
              </RequireAuth>
            }
          />

          {/* Driver (admins can use Driver page too) */}
          <Route
            path="/driver"
            element={
              <RequireAuth>
                <RequireRole allow={["driver","admin"]}>
                  <Driver />
                </RequireRole>
              </RequireAuth>
            }
          />

          {/* Fallback LAST */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="text-xs text-white/80 text-center py-8">
        © {new Date().getFullYear()} Tom’s Laundry Service • Cleveland, OH
      </footer>
    </div>
  );
}




