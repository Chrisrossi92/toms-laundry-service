import React, { useEffect, useMemo, useState } from "react";

// simple localStorage helpers so repeat users skip steps
const LS_KEY = "tomsLaundry.orderPrefs.v1";
const loadPrefs = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; }
};
const savePrefs = (data) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
};

export default function OrderFlow() {
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState(() => ({
    // step 1
    pickupAddress: "",
    deliveryAddress: "",
    timeSlot: "",
    zip: "",
    // step 2
    detergent: "Basic",
    folding: "Standard",
    notes: "",
    bags: 1,
    // step 3
    paymentMethod: "",
  }));

  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});

  // restore saved prefs (detergent, folding, notes)
  useEffect(() => {
    const saved = loadPrefs();
    if (saved.detergent || saved.folding || saved.notes) {
      setFormData((f) => ({
        ...f,
        detergent: saved.detergent ?? f.detergent,
        folding: saved.folding ?? f.folding,
        notes: saved.notes ?? f.notes,
      }));
    }
  }, []);

  // persist preferences when they change
  useEffect(() => {
    savePrefs({
      detergent: formData.detergent,
      folding: formData.folding,
      notes: formData.notes,
    });
  }, [formData.detergent, formData.folding, formData.notes]);

  const setField = (key, value) => {
    setFormData((f) => ({ ...f, [key]: value }));
  };

  // --- validation per step ---
  const validators = useMemo(
    () => ({
      1: () => {
        const e = {};
        if (!formData.pickupAddress.trim()) e.pickupAddress = "Pickup address is required";
        if (!formData.deliveryAddress.trim()) e.deliveryAddress = "Delivery address is required";
        if (!/^\d{5}$/.test(formData.zip || "")) e.zip = "Enter 5-digit ZIP";
        if (!formData.timeSlot.trim()) e.timeSlot = "Choose a time window";
        return e;
      },
      2: () => {
        const e = {};
        if (!formData.detergent) e.detergent = "Choose a detergent";
        if (!formData.folding) e.folding = "Choose a folding style";
        if (!(Number(formData.bags) >= 1)) e.bags = "At least 1 bag";
        return e;
      },
      3: () => {
        const e = {};
        if (!formData.paymentMethod) e.paymentMethod = "Select a payment method";
        return e;
      },
    }),
    [formData]
  );

  const runValidate = (s = step) => {
    const e = validators[s]();
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const nextStep = () => {
    if (!runValidate(step)) {
      // mark all fields in current step as touched so errors show
      setTouched((t) => {
        const newTouched = { ...t };
        Object.keys(validators[step]()).forEach((k) => {
          newTouched[k] = true;
        });
        return newTouched;
      });
      return;
    }
    setStep((prev) => Math.min(prev + 1, 3));
  };

  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  const buttonLabel = step === 3 ? "Place Order" : "Next";

  // super-lightweight “estimator” placeholder (UI only right now)
  const perBag = 2.5 * 4; // pretend $10/bag just for UI demo (replace later)
  const minOrder = 20;    // pretend $20 minimum
  const base = Math.max(Number(formData.bags || 1) * perBag, minOrder);
  const pickupFee = base >= 50 ? 0 : 4.99; // pretend free pickup ≥ $50
  const total = base + pickupFee;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Content */}
      <div className="flex-1 p-4 pb-28">
        {/* Stepper header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-2 text-sm">
            <StepPip active={step >= 1} label="Details" />
            <StepBar />
            <StepPip active={step >= 2} label="Preferences" />
            <StepBar />
            <StepPip active={step >= 3} label="Payment" />
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <h2 className="text-xl font-bold mb-2">Pickup & Delivery</h2>

            <Field
              label="Pickup Address"
              value={formData.pickupAddress}
              onChange={(v) => setField("pickupAddress", v)}
              error={touched.pickupAddress && errors.pickupAddress}
              onBlur={() => setTouched((t) => ({ ...t, pickupAddress: true }))}
              placeholder="123 Main St, Apt 2"
            />

            <Field
              label="Delivery Address"
              value={formData.deliveryAddress}
              onChange={(v) => setField("deliveryAddress", v)}
              error={touched.deliveryAddress && errors.deliveryAddress}
              onBlur={() => setTouched((t) => ({ ...t, deliveryAddress: true }))}
              placeholder="Same as pickup (or different)"
            />

            <div className="grid grid-cols-3 gap-3">
              <Field
                label="ZIP"
                value={formData.zip}
                onChange={(v) => setField("zip", v.replace(/\D/g, "").slice(0, 5))}
                error={touched.zip && errors.zip}
                onBlur={() => setTouched((t) => ({ ...t, zip: true }))}
                inputMode="numeric"
                maxLength={5}
              />
              <Field
                label="Pickup Window"
                value={formData.timeSlot}
                onChange={(v) => setField("timeSlot", v)}
                error={touched.timeSlot && errors.timeSlot}
                onBlur={() => setTouched((t) => ({ ...t, timeSlot: true }))}
                placeholder="2–4pm"
              />
              <div className="text-xs text-gray-500 self-end">
                (We’ll add a real slot picker next)
              </div>
            </div>

            <div className="pt-2 text-sm text-gray-600">
              We’ll verify service availability for your ZIP and show exact pickup windows in the next update.
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Preferences</h2>

            <LabeledSelect
              label="Detergent"
              value={formData.detergent}
              onChange={(v) => setField("detergent", v)}
              error={touched.detergent && errors.detergent}
              onBlur={() => setTouched((t) => ({ ...t, detergent: true }))}
              options={["Basic", "Hypoallergenic", "Eco-Friendly"]}
            />

            <LabeledSelect
              label="Folding Style"
              value={formData.folding}
              onChange={(v) => setField("folding", v)}
              error={touched.folding && errors.folding}
              onBlur={() => setTouched((t) => ({ ...t, folding: true }))}
              options={["Standard", "KonMari", "On Hangers"]}
            />

            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Bags"
                type="number"
                value={formData.bags}
                onChange={(v) => setField("bags", Math.max(1, Number(v || 1)))}
                error={touched.bags && errors.bags}
                onBlur={() => setTouched((t) => ({ ...t, bags: true }))}
                min={1}
                max={8}
                className="w-24"
              />
              <Field
                label="Notes"
                value={formData.notes}
                onChange={(v) => setField("notes", v)}
                placeholder="Delicates hang-dry, leave on porch, etc."
              />
            </div>

            {/* UI-only estimate for now */}
            <div className="mt-2 rounded-lg border bg-white p-3 text-sm">
              <div className="flex items-center justify-between">
                <span>Estimated subtotal</span>
                <span>${base.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Pickup fee</span>
                <span>${pickupFee.toFixed(2)}</span>
              </div>
              <div className="mt-1 border-t pt-2 flex items-center justify-between font-medium">
                <span>Estimated total</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                Final total shown at checkout. (We’ll replace this with real pricing from your backend.)
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Payment</h2>

            <LabeledSelect
              label="Payment Method"
              value={formData.paymentMethod}
              onChange={(v) => setField("paymentMethod", v)}
              error={touched.paymentMethod && errors.paymentMethod}
              onBlur={() => setTouched((t) => ({ ...t, paymentMethod: true }))}
              options={["Credit Card", "Apple Pay", "Google Pay"]}
              placeholder="Select payment method"
            />

            <div className="rounded-lg border bg-white p-3 text-sm">
              <div className="flex items-center justify-between">
                <span>Order total (est.)</span>
                <span className="font-semibold">${total.toFixed(2)}</span>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                Placing the order will take you to secure checkout. You’ll receive status updates by email/SMS.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Footer */}
      <div className="p-4 bg-white border-t shadow-md sticky bottom-0">
        <div className="flex items-center gap-2">
          {step > 1 && (
            <button
              onClick={prevStep}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-gray-100 hover:bg-gray-200"
            >
              Back
            </button>
          )}
          <button
            onClick={nextStep}
            className="ml-auto px-6 py-2 rounded-lg bg-black text-white hover:opacity-90"
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* --- small UI helpers --- */

function Field({
  label,
  value,
  onChange,
  onBlur,
  placeholder = "",
  type = "text",
  error,
  inputMode,
  maxLength,
  min,
  max,
  className = "",
}) {
  return (
    <div>
      {label && <label className="block text-sm text-gray-700">{label}</label>}
      <input
        type={type}
        className={`mt-1 w-full rounded-md border px-3 py-2 bg-white ${error ? "border-red-400" : "border-gray-300"} ${className}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        min={min}
        max={max}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function LabeledSelect({
  label,
  value,
  onChange,
  onBlur,
  options,
  placeholder,
  error,
}) {
  return (
    <div>
      {label && <label className="block text-sm text-gray-700">{label}</label>}
      <select
        className={`mt-1 w-full rounded-md border px-3 py-2 bg-white ${error ? "border-red-400" : "border-gray-300"}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function StepPip({ active, label }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`h-2.5 w-2.5 rounded-full ${active ? "bg-black" : "bg-gray-300"}`} />
      <span className={`hidden sm:block ${active ? "text-gray-900" : "text-gray-400"}`}>{label}</span>
    </div>
  );
}
function StepBar() {
  return <div className="h-px w-6 bg-gray-300 sm:w-10" />;
}
