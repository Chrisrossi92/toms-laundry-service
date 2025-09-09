export default function Toast({ show, children }) {
  if (!show) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="rounded-full bg-black text-white px-4 py-2 text-sm shadow">
        {children}
      </div>
    </div>
  );
}
