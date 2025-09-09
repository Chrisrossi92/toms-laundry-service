import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import Card from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import CustomerProfileModal from "../components/admin/CustomerProfileModal";
import { toCSV, downloadCSV } from "../lib/csv";


export default function AdminUsers(){
  const [tab, setTab] = useState("customers"); // 'customers' | 'staff'
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);    // merged auth.users + user_profiles
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("driver");
  const [profileId, setProfileId] = useState(null);

  async function load(){
    setLoading(true);
    const [{ data: prof }, { data: users }] = await Promise.all([
      supabase.from("user_profiles").select("user_id, role, pay_split_percent, is_active"),
      supabase.from("auth.users").select("id, email, last_sign_in_at")
    ]);
    const byId = Object.fromEntries((prof || []).map(p => [p.user_id, p]));
    const merged = (users || []).map(u => ({ ...u, ...(byId[u.id] || { role:"customer", is_active:true }) }));
    setRows(merged);
    setLoading(false);
  }
  useEffect(()=>{ load(); },[]);

  const customers = useMemo(
    () => rows.filter(r => (r.role ?? "customer") === "customer")
              .filter(r => !search || (r.email?.toLowerCase().includes(search.toLowerCase()))),
    [rows, search]
  );
  const staff = useMemo(
    () => rows.filter(r => (r.role ?? "customer") !== "customer"),
    [rows]
  );

  async function invite(){
    if(!inviteEmail) return;
    const { error } = await supabase.functions.invoke("invite-user", {
      body: { email: inviteEmail.trim(), role: inviteRole }
    });
    if (error) alert(error.message);
    else { setInviteEmail(""); setInviteRole("driver"); load(); }
  }

  async function saveStaff(u){
    const { error } = await supabase.from("user_profiles").update({
      role: u.role, pay_split_percent: u.pay_split_percent ? Number(u.pay_split_percent) : null, is_active: !!u.is_active
    }).eq("user_id", u.id);
    if (error) alert(error.message); else load();
  }

  const [custStats, setCustStats] = useState([]);
const [custLoading, setCustLoading] = useState(true);

async function loadCustomers() {
  setCustLoading(true);
  const { data, error } = await supabase.rpc("get_customer_stats");
  if (!error) setCustStats(data || []);
  setCustLoading(false);
}

// modify load() to call both lists
async function load(){
  setLoading(true);
  const [{ data: prof }, { data: users }] = await Promise.all([
    supabase.from("user_profiles").select("user_id, role, pay_split_percent, is_active"),
    supabase.from("auth.users").select("id, email, last_sign_in_at")
  ]);
  const byId = Object.fromEntries((prof || []).map(p => [p.user_id, p]));
  const merged = (users || []).map(u => ({ ...u, ...(byId[u.id] || { role:"customer", is_active:true }) }));
  setRows(merged);
  setLoading(false);

  // load customers stats
  await loadCustomers();
}

// derive filtered customers stats by search
const filteredStats = useMemo(() => {
  const s = search.trim().toLowerCase();
  const list = custStats || [];
  if (!s) return list;
  return list.filter(x => (x.email || "").toLowerCase().includes(s));
}, [custStats, search]);

function exportCustomersCSV() {
  const headers = [
    { key: "email", label: "Email" },
    { key: "orders_count", label: "Orders" },
    { key: "lifetime_dollars", label: "Lifetime ($)" },
    { key: "last_order_at", label: "Last order" },
  ];
  const rows = filteredStats.map(x => ({
    email: x.email,
    orders_count: x.orders_count,
    lifetime_dollars: (Number(x.lifetime_cents || 0) / 100).toFixed(2),
    last_order_at: x.last_order_at ? new Date(x.last_order_at).toLocaleString() : ""
  }));
  downloadCSV(toCSV(rows, headers), "customers.csv");
}

  return (
    <div className="max-w-5xl mx-auto space-y-4 mt-6">
      {/* Tabs */}
      <Card>
        <div className="flex items-center gap-2">
          <Tab active={tab==="customers"} onClick={()=>setTab("customers")}>Customers</Tab>
          <Tab active={tab==="staff"} onClick={()=>setTab("staff")}>Staff</Tab>
        </div>
      </Card>


      {tab === "customers" ? (
        <>
          {/* Search + list */}
          {/* Search + export */}
<Card>
  <div className="flex items-center gap-2">
    <input
      className="border rounded px-3 py-2 flex-1"
      placeholder="Search by email…"
      value={search}
      onChange={(e)=>setSearch(e.target.value)}
    />
    <Button variant="outline" onClick={exportCustomersCSV}>Export CSV</Button>
  </div>
</Card>

{/* Customers table with VIP metrics */}
<Card>
  <div className="font-semibold mb-2">Customers</div>
  {custLoading ? "Loading…" : (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="p-2 text-left">Email</th>
            <th className="p-2 text-left">Orders</th>
            <th className="p-2 text-left">Lifetime ($)</th>
            <th className="p-2 text-left">Last order</th>
            <th className="p-2 text-left"></th>
          </tr>
        </thead>
        <tbody>
          {filteredStats.map(u => (
            <tr key={u.user_id} className="border-t">
              <td className="p-2">{u.email}</td>
              <td className="p-2">{u.orders_count}</td>
              <td className="p-2">{(Number(u.lifetime_cents||0)/100).toFixed(2)}</td>
              <td className="p-2">{u.last_order_at ? new Date(u.last_order_at).toLocaleString() : "—"}</td>
              <td className="p-2">
                <Button onClick={()=>setProfileId(u.user_id)}>View profile</Button>
              </td>
            </tr>
          ))}
          {filteredStats.length===0 && (
            <tr><td className="p-2 text-sm text-gray-600" colSpan={5}>No matches.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )}
</Card>

        </>
      ) : (
        <>
          {/* Invite */}
          <Card>
            <div className="font-semibold mb-2">Invite user</div>
            <div className="flex gap-2">
              <input className="border rounded px-3 py-2 flex-1" placeholder="email"
                     value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} />
              <select className="border rounded px-2" value={inviteRole} onChange={e=>setInviteRole(e.target.value)}>
                <option value="driver">driver</option>
                <option value="admin">admin</option>
              </select>
              <Button onClick={invite}>Invite</Button>
            </div>
          </Card>

          {/* Staff list */}
          <Card>
            <div className="font-semibold mb-2">Staff</div>
            {loading ? "Loading…" : (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="p-2 text-left">Email</th>
                      <th className="p-2 text-left">Role</th>
                      <th className="p-2 text-left">Pay %</th>
                      <th className="p-2 text-left">Active</th>
                      <th className="p-2 text-left">Last sign-in</th>
                      <th className="p-2 text-left"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map((u)=>(
                      <tr key={u.id} className="border-t">
                        <td className="p-2">{u.email}</td>
                        <td className="p-2">
                          <select value={u.role||"driver"} onChange={e=>setRows(rs=>rs.map(r=>r.id===u.id?{...r,role:e.target.value}:r))}>
                            <option value="driver">driver</option>
                            <option value="admin">admin</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <input className="w-20 border rounded px-2 py-1" type="number" step="0.01"
                                 value={u.pay_split_percent ?? ""} onChange={e=>setRows(rs=>rs.map(r=>r.id===u.id?{...r,pay_split_percent:e.target.value}:r))}/>
                        </td>
                        <td className="p-2">
                          <input type="checkbox" checked={u.is_active ?? true}
                                 onChange={e=>setRows(rs=>rs.map(r=>r.id===u.id?{...r,is_active:e.target.checked}:r))}/>
                        </td>
                        <td className="p-2">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : "—"}</td>
                        <td className="p-2">
                          <Button onClick={()=>saveStaff(u)}>Save</Button>
                        </td>
                      </tr>
                    ))}
                    {staff.length===0 && (
                      <tr><td className="p-2 text-sm text-gray-600" colSpan={6}>No staff users.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {profileId && <CustomerProfileModal userId={profileId} onClose={()=>setProfileId(null)} />}
    </div>
  );
}

function Tab({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-md text-sm ${active ? "bg-black text-white" : "bg-white/70"}`}
    >
      {children}
    </button>
  );
}

