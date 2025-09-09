export default function Success() {
  const params = new URLSearchParams(window.location.search);
  const order = params.get("order"); // we'll pass this from webhook later (or fallback to /track)
  return (
    <div className="max-w-3xl mx-auto rounded-xl bg-white/85 backdrop-blur p-6 border border-white/40 mt-10">
      <h2 className="text-2xl font-semibold text-gray-900">Order confirmed 🎉</h2>
      <p className="mt-2 text-gray-700">
        Thanks! Your pickup is scheduled. We’ll email you major updates.
      </p>
      <div className="mt-6 flex gap-3">
        <a
          href={order ? `/track?order=${order}` : "/track"}
          className="rounded-md bg-black text-white px-4 py-2"
        >
          Track my order
        </a>
        <a href="/schedule" className="rounded-md border px-4 py-2">Schedule another</a>
      </div>
    </div>
  );
}
