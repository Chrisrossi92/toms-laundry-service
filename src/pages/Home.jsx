import { useSession } from "../lib/AuthProvider.jsx";
import { usePricing } from "../hooks/usePricing";  // per_bag_cents, pickup_fee_cents, min_order_cents, free_pickup_threshold_cents

export default function Home() {
  const { session } = useSession();
  const pricing = usePricing();

  const perBag = (pricing.per_bag_cents / 100).toFixed(2);
  const fee = (pricing.pickup_fee_cents / 100).toFixed(2);
  const min =
    pricing.min_order_cents > 0 ? (pricing.min_order_cents / 100).toFixed(2) : null;
  const freeOver =
    pricing.free_pickup_threshold_cents > 0
      ? (pricing.free_pickup_threshold_cents / 100).toFixed(2)
      : null;

  return (
    <>
      {/* HERO over global gradient */}
      <section className="border-b">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur px-3 py-1 text-xs text-white">
                <span className="h-2 w-2 rounded-full bg-green-400" />
                Cleveland pickups tonight • Next-day delivery
              </div>

              <h1 className="mt-4 text-4xl md:text-5xl font-extrabold tracking-tight text-white">
                Laundry picked up tonight. <br className="hidden md:block" />
                Back tomorrow.
              </h1>

              <p className="mt-3 text-gray-100 max-w-prose">
                Flat-rate per bag. Set your preferences once. We handle the rest.
              </p>

              <div className="mt-6 flex gap-2">
                <a
                  href={session ? "/me" : "/schedule"}
                  className="inline-flex items-center rounded-md bg-white px-4 py-2 text-black font-medium hover:bg-gray-100"
                >
                  Schedule a pickup
                </a>
                <a
                  href="/track"
                  className="inline-flex items-center rounded-md border border-white/30 bg-white/10 px-4 py-2 text-white hover:bg-white/20"
                >
                  Track an order
                </a>
              </div>

              <ul className="mt-6 space-y-1 text-sm text-gray-100">
                <li>• Evening pickup windows</li>
                <li>• Next-day delivery</li>
                <li>• Hypoallergenic options</li>
              </ul>
            </div>

            {/* Pricing card (reads live settings) */}
            <aside className="w-full md:w-[380px]">
              <div className="rounded-xl bg-white/90 text-black p-5 shadow-lg">
                <div className="font-semibold">Pricing</div>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• ${perBag} per 13-gal bag</li>
                  <li>
                    • ${fee} pickup fee
                    {freeOver && <> (waived over ${freeOver})</>}
                  </li>
                  {min && <li>• Minimum order ${min}</li>}
                  <li>• Optional tip at checkout</li>
                </ul>
                <div className="mt-4 rounded-lg bg-gray-100 p-3 text-xs text-gray-600">
                  Transparent flat-rate. One bag ≈ a standard 13-gal kitchen bag, filled comfortably.
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-b">
        <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
          <h2 className="text-xl font-semibold text-white">How it works</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Step title="1) Schedule" body="Pick a pickup window, add any special instructions (cold wash, low heat, fragrance-free)." />
            <Step title="2) We wash & fold" body="Your laundry is handled separately with your saved preferences and neatly folded." />
            <Step title="3) Next-day delivery" body="We email you for major updates. Check live status anytime." />
          </div>
        </div>
      </section>
    </>
  );
}

function Step({ title, body }) {
  return (
    <div className="rounded-xl border border-white/30 bg-white/80 backdrop-blur p-5">
      <div className="font-semibold">{title}</div>
      <p className="mt-2 text-sm text-gray-700">{body}</p>
    </div>
  );
}





