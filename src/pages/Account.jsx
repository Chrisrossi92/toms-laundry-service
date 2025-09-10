// src/pages/Account.jsx
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "../lib/supabaseClient";
import { useSession } from "../lib/AuthProvider.jsx";
import { useLaundrySettings } from "../hooks/useLaundrySettings";
import { useDriverToday } from "../hooks/useDriverToday";
import BusinessSettings from "../components/admin/BusinessSettings.jsx";
import CustomerAccount from "../components/account/CustomerAccount.jsx";
import { Link } from "react-router-dom";


/* =========================================================
   Role-aware Account page
   - Admin  -> Business Settings (global defaults & toggles)
   - Driver -> Driver settings (availability, service area, today stats)
   - Customer -> Profile (phone, email updates)
   ========================================================= */

export default function Account() {
  const { role, profileLoading } = useSession();

  if (profileLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="rounded-xl border border-white/20 bg-white/90 p-4">Loading…</div>
      </div>
    );
  }

  // Role-aware routing
  if (role === "admin")  return <BusinessSettings />;   // Business settings for admins
  if (role === "driver") return <DriverAccount />;      // Small driver card (below)
  return <CustomerAccount />;                           // Default: customer account
}

/* ---- Driver account view (simple handoff to the Driver page) ---- */
function DriverAccount() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="rounded-xl border border-white/20 bg-white/90 p-4">
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

/* -------------------- Customer view -------------------- */
function CustomerAccount() {
  const { session } = useSession();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [emailOptIn, setEmailOptIn] = useState(true);

  useEffect(() => {
    if (!session) return;
    (async () => {
      setEmail(session.user.email || "");
      await supabase.from("user_profiles").upsert({ user_id: session.user.id }, { onConflict: "user_id" });
      const { data: prof } = await supabase
        .from("user_profiles")
        .select("phone, email_opt_in")
        .eq("user_id", session.user.id)
        .maybeSingle();
      setPhone(prof?.phone || "");
      setEmailOptIn(prof?.email_opt_in ?? true);
      setLoading(false);
    })();
  }, [session]);

  async function saveProfile() {
    const updates = { phone: phone?.trim() || null, email_opt_in: !!emailOptIn };
    const { error } = await supabase.from("user_profiles").update(updates).eq("user_id", session.user.id);
    if (error) alert(error.message);
  }
  async function signOut() { await supabase.auth.signOut(); window.location.href = "/"; }

  if (loading) return <Shell title="Account"><Muted>Loading…</Muted></Shell>;

  return (
    <Shell title="Account">
      <Card>
        <Grid two>
          <Field label="Email">
            <Input disabled value={email} />
          </Field>
          <Field label="Mobile (for calls)">
            <Input value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="+14195551234" />
            <Hint>Optional. Kept on file in case the driver needs to reach you.</Hint>
          </Field>
        </Grid>

        <Row>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={emailOptIn} onChange={e=>setEmailOptIn(e.target.checked)} />
            Email me order status updates
          </label>
        </Row>

        <Row className="gap-3">
          <Primary onClick={saveProfile}>Save profile</Primary>
          <LinkBtn onClick={signOut}>Sign out</LinkBtn>
        </Row>
      </Card>
    </Shell>
  );
}

/* -------------------- Admin view -------------------- */
function AdminSettings() {
  const { row, loading, save, setRow } = useLaundrySettings();
  const [saving, setSaving] = useState(false);

  if (loading || !row) return <Shell title="Business Settings"><Muted>Loading…</Muted></Shell>;

  async function onSave() {
    setSaving(true);
    const { error } = await save({
      default_detergent: row.default_detergent,
      default_wash_temp: row.default_wash_temp,
      default_dry_level: row.default_dry_level,
      allow_softener: row.allow_softener,
      allow_fragrance_free: row.allow_fragrance_free,
      allow_notes: row.allow_notes,
    });
    setSaving(false);
    if (error) alert(error.message);
  }

  return (
    <Shell title="Business Settings">
      <Card>
        <Section>Customer options (enable/disable)</Section>
        <Grid three>
          <Toggle label="Allow fabric softener" checked={row.allow_softener} onChange={v=>setRow(r=>({...r,allow_softener:v}))}/>
          <Toggle label="Allow fragrance-free" checked={row.allow_fragrance_free} onChange={v=>setRow(r=>({...r,allow_fragrance_free:v}))}/>
          <Toggle label="Allow notes field" checked={row.allow_notes} onChange={v=>setRow(r=>({...r,allow_notes:v}))}/>
        </Grid>
      </Card>

      <Card>
        <Section>Default laundry preferences</Section>
        <Grid three>
          <SelectField label="Detergent" value={row.default_detergent}
            onChange={v=>setRow(r=>({...r,default_detergent:v}))}
            options={[["standard","Standard"],["hypoallergenic","Hypoallergenic"]]} />
          <SelectField label="Wash temperature" value={row.default_wash_temp}
            onChange={v=>setRow(r=>({...r,default_wash_temp:v}))}
            options={[["cold","cold"],["warm","warm"],["hot","hot"]]} />
          <SelectField label="Dry level" value={row.default_dry_level}
            onChange={v=>setRow(r=>({...r,default_dry_level:v}))}
            options={[["low","low"],["medium","medium"],["high","high"]]} />
        </Grid>
        <Row className="mt-3"><Primary onClick={onSave} disabled={saving}>{saving?"Saving…":"Save settings"}</Primary></Row>
        <Hint className="mt-2">These values will be used as defaults and to control what customers can select in future iterations.</Hint>
      </Card>
    </Shell>
  );
}

/* -------------------- Driver view -------------------- */
function DriverAccount() {
  const { session, profile } = useSession();
  const date = format(new Date(), "yyyy-MM-dd");
  const stats = useDriverToday(date, session?.user?.id);

  const [available, setAvailable] = useState(profile?.driver_available ?? true);
  const [zips, setZips] = useState((profile?.service_zip_codes || []).join(","));
  const [vehicle, setVehicle] = useState(profile?.vehicle_notes || "");
  const [saving, setSaving] = useState(false);

  useEffect(()=>{ // sync if profile changes
    setAvailable(profile?.driver_available ?? true);
    setZips((profile?.service_zip_codes || []).join(","));
    setVehicle(profile?.vehicle_notes || "");
  }, [profile]);

  async function saveDriver() {
    setSaving(true);
    const service_zip_codes = zips.split(",").map(s=>s.trim()).filter(Boolean);
    const { error } = await supabase.from("user_profiles").update({
      driver_available: available, service_zip_codes, vehicle_notes: vehicle
    }).eq("user_id", session.user.id);
    setSaving(false);
    if (error) alert(error.message);
  }

  return (
    <Shell title="Driver settings">
      <Card>
        <Section>Today</Section>
        <Grid five>
          <KPI label="Total" value={stats.total}/>
          <KPI label="En route" value={stats.enroute}/>
          <KPI label="Picked" value={stats.picked}/>
          <KPI label="Out" value={stats.out}/>
          <KPI label="Delivered" value={stats.delivered}/>
        </Grid>
      </Card>

      <Card>
        <Section>Availability & service area</Section>
        <Row>
          <Toggle label="I’m available / on duty" checked={available} onChange={setAvailable}/>
        </Row>
        <Grid two className="mt-3">
          <Field label="ZIP codes (comma-separated)">
            <Input value={zips} onChange={e=>setZips(e.target.value)} placeholder="44102, 44107, 44111"/>
          </Field>
          <Field label="Vehicle / notes">
            <Input value={vehicle} onChange={e=>setVehicle(e.target.value)} placeholder="SUV, can carry 8 bags"/>
          </Field>
        </Grid>
        <Row className="mt-3"><Primary onClick={saveDriver} disabled={saving}>{saving?"Saving…":"Save"}</Primary></Row>
      </Card>

      <Card>
        <Section>Shortcuts</Section>
        <Row className="gap-2">
          <LinkBtn asLink href="/driver">Go to my route</LinkBtn>
          <LinkBtn asLink href="/account">Profile & notifications</LinkBtn>
        </Row>
      </Card>
    </Shell>
  );
}

/* ===================== Small UI helpers ===================== */
function Shell({ title, children }) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      {children}
    </div>
  );
}
function Card({ children }) { return <div className="rounded-xl bg-white/85 backdrop-blur p-5 border border-white/40">{children}</div>; }
function Section({ children }) { return <div className="font-semibold text-gray-900 mb-3">{children}</div>; }
function Row({ children, className="" }) { return <div className={`flex items-center ${className}`}>{children}</div>; }
function Grid({ children, two, three, five, className="" }) {
  const cols = two ? "md:grid-cols-2" : three ? "md:grid-cols-3" : five ? "md:grid-cols-5" : "md:grid-cols-2";
  return <div className={`grid gap-3 ${cols} ${className}`}>{children}</div>;
}
function Field({ label, children }) { return (<label className="block text-sm text-gray-700">{label}{children}</label>); }
function Input(props){ return <input {...props} className={`mt-1 w-full rounded-md border px-3 py-2 ${props.className||""}`} />; }
function Primary({ children, onClick, disabled }) {
  return <button onClick={onClick} disabled={disabled} className={`rounded-md bg-black text-white px-4 py-2 ${disabled?"opacity-60 pointer-events-none":""}`}>{children}</button>;
}
function LinkBtn({ children, onClick, href, asLink }) {
  const cls = "text-sm underline text-gray-700";
  return asLink ? <a href={href} className={cls}>{children}</a> : <button onClick={onClick} className={cls}>{children}</button>;
}
function Hint({ children, className="" }) { return <p className={`text-xs text-gray-600 ${className}`}>{children}</p>; }
function Muted({ children }) { return <div className="rounded-xl bg-white/85 backdrop-blur p-5 border border-white/40 text-gray-700">{children}</div>; }
function Toggle({ label, checked, onChange }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
      <input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)} /> {label}
    </label>
  );
}
function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block text-sm text-gray-700">
      {label}
      <select className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2"
              value={value} onChange={e=>onChange(e.target.value)}>
        {options.map(([val,txt])=> <option key={val} value={val}>{txt}</option>)}
      </select>
    </label>
  );
}
function KPI({ label, value }) {
  return (
    <div className="rounded-lg bg-white/70 border border-white/40 p-3">
      <div className="text-xs text-gray-600">{label}</div>
      <div className="text-lg font-semibold text-gray-900">{value}</div>
    </div>
  );
}



