// src/pages/Account.jsx
import { Link } from "react-router-dom";
import { useSession } from "../lib/AuthProvider.jsx";
import BusinessSettings from "../components/admin/BusinessSettings.jsx";
import CustomerAccount from "../components/account/CustomerAccount.jsx";

/**
 * Role-aware Account page
 * - Admin  -> Business Settings
 * - Driver -> Driver handoff card (link to Driver dashboard)
 * - Other  -> Customer Account
 */
export default function Account() {
  const { role, profileLoading } = useSession();

  if (profileLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="rounded-xl border border-white/20 bg-white/90 p-4">
          Loading…
        </div>
      </div>
    );
  }

  if (role === "admin")  return <BusinessSettings />;
  if (role === "driver") return <DriverHandoff />;

  return <CustomerAccount />;
}

/* --- Driver view (simple handoff card) --- */
function DriverHandoff() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="rounded-xl border border-white/20 bg-white/90 p-6 shadow">
        <h2 className="text-xl font-semibold text-gray-900">Driver settings</h2>
        <p className="mt-2 text-sm text-gray-700">
          View your assigned pickups and update statuses on the Driver dashboard.
        </p>
        <Link
          to="/driver"
          className="inline-block mt-4 rounded bg-black px-4 py-2 text-white"
        >
          Open Driver Dashboard
        </Link>
      </div>
    </div>
  );
}




