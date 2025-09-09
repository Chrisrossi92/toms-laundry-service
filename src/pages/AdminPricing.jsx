import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import Card from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import Toast from "../components/ui/Toast";
import PricingPreview from "../components/admin/PricingPreview";

export default function AdminPricing(){
  const [row,setRow]=useState(null);
  const [saving,setSaving]=useState(false);
  const [saved,setSaved]=useState(false);

  useEffect(()=>{(async()=>{
    const {data}=await supabase.from("settings_pricing")
      .select("id,per_bag_cents,pickup_fee_cents,min_order_cents,free_pickup_threshold_cents")
      .order("updated_at",{ascending:false}).limit(1);
    setRow(data?.[0]||null);
  })();},[]);

  if(!row) return <div className="max-w-xl mx-auto mt-6"><Card>Loading…</Card></div>;

  const numeric = (v)=> (v==="" ? "" : String(v).replace(/[^\d]/g,""));
  const perOk = !!row.per_bag_cents && Number(row.per_bag_cents) >= 0;
  const feeOk = row.pickup_fee_cents!=="" && Number(row.pickup_fee_cents) >= 0;
  const minOk = row.min_order_cents!=="" && Number(row.min_order_cents) >= 0;
  const freeOk = row.free_pickup_threshold_cents!=="" && Number(row.free_pickup_threshold_cents) >= 0;
  const canSave = perOk && feeOk && minOk && freeOk && !saving;

  async function save(){
    if(!canSave) return;
    setSaving(true);
    const payload = {
      per_bag_cents: Number(row.per_bag_cents),
      pickup_fee_cents: Number(row.pickup_fee_cents),
      min_order_cents: Number(row.min_order_cents||0),
      free_pickup_threshold_cents: Number(row.free_pickup_threshold_cents||0),
    };
    const { error } = await supabase.from("settings_pricing").update(payload).eq("id", row.id);
    setSaving(false);
    if (error) alert(error.message);
    else { setSaved(true); setTimeout(()=>setSaved(false), 1500); }
  }

  return (
    <div className="max-w-3xl mx-auto mt-6 space-y-4">
      <Card>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Pricing</h2>
        <div className="space-y-3">
          <Field label="Per bag (cents)">
            <input className="mt-1 w-full border rounded px-3 py-2"
              inputMode="numeric"
              value={row.per_bag_cents}
              onChange={e=>setRow(r=>({...r, per_bag_cents: numeric(e.target.value)}))}/>
          </Field>
          <Field label="Pickup fee (cents)">
            <input className="mt-1 w-full border rounded px-3 py-2"
              inputMode="numeric"
              value={row.pickup_fee_cents}
              onChange={e=>setRow(r=>({...r, pickup_fee_cents: numeric(e.target.value)}))}/>
          </Field>
          <Field label="Minimum order (cents)">
            <input className="mt-1 w-full border rounded px-3 py-2"
              inputMode="numeric"
              value={row.min_order_cents}
              onChange={e=>setRow(r=>({...r, min_order_cents: numeric(e.target.value)}))}/>
            <Hint>Set 0 for no minimum.</Hint>
          </Field>
          <Field label="Free pickup threshold (cents)">
            <input className="mt-1 w-full border rounded px-3 py-2"
              inputMode="numeric"
              value={row.free_pickup_threshold_cents}
              onChange={e=>setRow(r=>({...r, free_pickup_threshold_cents: numeric(e.target.value)}))}/>
            <Hint>Set 0 to always charge the pickup fee.</Hint>
          </Field>
          <div><Button onClick={save} disabled={!canSave}>{saving ? "Saving…" : "Save"}</Button></div>
        </div>
      </Card>

      {/* Live customer preview */}
      <PricingPreview
        per_bag_cents={Number(row.per_bag_cents||0)}
        pickup_fee_cents={Number(row.pickup_fee_cents||0)}
        min_order_cents={Number(row.min_order_cents||0)}
        free_pickup_threshold_cents={Number(row.free_pickup_threshold_cents||0)}
      />

      <Toast show={saved}>Saved ✓</Toast>
    </div>
  );
}

function Field({ label, children }) {
  return (<label className="block text-sm text-gray-700">{label}{children}</label>);
}
function Hint({ children }) { return <p className="text-xs text-gray-600 mt-1">{children}</p>; }

