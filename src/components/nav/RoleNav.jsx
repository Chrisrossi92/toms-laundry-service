import { Link, useLocation } from "react-router-dom";
import { useSession } from "../../lib/AuthProvider";
function NavLink({to,children}){ const {pathname}=useLocation(); const active=pathname===to;
  return <Link to={to} className={`px-3 py-2 rounded-md text-sm ${active?"bg-black text-white":"text-white/90 hover:bg-white/10"}`}>{children}</Link>; }
export default function RoleNav(){
  const { session, role } = useSession();
  if(!session) return (<nav className="flex gap-1"><NavLink to="/schedule">Schedule</NavLink><NavLink to="/track">Track</NavLink><NavLink to="/account">Account</NavLink></nav>);
  if(role==="admin")  return (<nav className="flex gap-1"><NavLink to="/dashboard">Dashboard</NavLink><NavLink to="/admin/slots">Zones</NavLink><NavLink to="/admin/users">Users</NavLink><NavLink to="/admin/pricing">Pricing</NavLink><NavLink to="/driver">Driver</NavLink><NavLink to="/account">Account</NavLink></nav>);
  if(role==="driver") return (<nav className="flex gap-1"><NavLink to="/driver">Driver</NavLink><NavLink to="/account">Account</NavLink></nav>);
  return (<nav className="flex gap-1"><NavLink to="/schedule">Schedule</NavLink><NavLink to="/track">Track</NavLink><NavLink to="/account">Account</NavLink></nav>);
}
