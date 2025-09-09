// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import { useSession } from "./lib/AuthProvider.jsx";

// Pages
import Home from "./pages/Home.jsx";
import Schedule from "./pages/Schedule.jsx";
import Track from "./pages/Track.jsx";
import Account from "./pages/Account.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Driver from "./pages/Driver.jsx";
import AdminSlots from "./pages/AdminSlots.jsx";
import AdminPricing from "./pages/AdminPricing.jsx";  // keep if you added the page
import AdminUsers from "./pages/AdminUsers.jsx";      // keep if you added the page

// Nav
import RoleNav from "./components/nav/RoleNav.jsx";
import AuthMenu from "./components/nav/AuthMenu.jsx";

function RequireAuth({ children }) {
  const { session, authLoading } = useSession();
  if (authLoading) return <div className="p-6 text-white">Checking your session…</div>;
  if (!session) return <Navigate to="/" replace />;
  return children;
}

function RequireRole({ children, allow }) {
  const { role, profileLoading } = useSession();
  if (profileLoading) return <div className="p-6 text-white">Loading…</div>;
  if (!allow.includes(role)) return <Navigate to="/" replace />;
  return children;
}

/** Role-aware landing after login (link to /me) */
function MyStart() {
  const { role } = useSession();
  if (role === "admin")  return <Navigate to="/dashboard" replace />;
  if (role === "driver") return <Navigate to="/driver" replace />;
  return <Navigate to="/schedule" replace />; // customer
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4">
          <div className="h-14 flex items-center justify-between text-white">
            {/* Brand link: always go Home */}
            <a href="/" className="font-semibold tracking-tight">
              Tom’s Laundry Service
            </a>
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
          <Route path="/me" element={<RequireAuth><MyStart /></RequireAuth>} />

          {/* Customer */}
          <Route
            path="/schedule"
            element={
              <RequireAuth>
                <RequireRole allow={["customer","admin"]}>
                  <Schedule />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/track"
            element={
              <RequireAuth>
                <RequireRole allow={["customer","admin"]}>
                  <Track />
                </RequireRole>
              </RequireAuth>
            }
          />
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

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="text-xs text-white/80 text-center py-8">
        © {new Date().getFullYear()} Tom’s Laundry Service • Cleveland, OH
      </footer>
    </div>
  );
}



