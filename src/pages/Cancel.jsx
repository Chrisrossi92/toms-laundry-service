export default function Cancel() {
  return (
    <div className="max-w-3xl mx-auto rounded-xl bg-white/85 backdrop-blur p-6 border border-white/40 mt-10">
      <h2 className="text-2xl font-semibold text-gray-900">Payment canceled</h2>
      <p className="mt-2 text-gray-700">
        Your payment was canceled and the order wasn’t created. You can try again anytime.
      </p>
      <div className="mt-6">
        <a href="/schedule" className="rounded-md bg-black text-white px-4 py-2">Back to scheduling</a>
      </div>
    </div>
  );
}
