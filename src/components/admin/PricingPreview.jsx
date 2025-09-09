export default function PricingPreview({ per_bag_cents, pickup_fee_cents, min_order_cents=0, free_pickup_threshold_cents=0 }) {
  const perBag = (per_bag_cents/100).toFixed(2);
  const fee = (pickup_fee_cents/100).toFixed(2);
  const min = min_order_cents ? (min_order_cents/100).toFixed(2) : null;
  const free = free_pickup_threshold_cents ? (free_pickup_threshold_cents/100).toFixed(2) : null;

  return (
    <div className="rounded-xl bg-white/90 text-black p-5 shadow-lg">
      <div className="font-semibold">Customer preview</div>
      <ul className="mt-2 space-y-1 text-sm">
        <li>• ${perBag} per 13-gal bag</li>
        <li>• ${fee} pickup fee{free && <> (waived over ${free})</>}</li>
        {min && <li>• Minimum order ${min}</li>}
        <li>• Optional tip at checkout</li>
      </ul>
      <div className="mt-3 rounded-lg bg-gray-100 p-3 text-xs text-gray-600">
        Transparent flat-rate. One bag ≈ a standard 13-gal kitchen bag, filled comfortably.
      </div>
    </div>
  );
}
