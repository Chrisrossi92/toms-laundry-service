export default function Card({ className="", children }) {
  return (
    <div className={`rounded-xl bg-white/80 backdrop-blur p-4 border border-white/30 ${className}`}>
      {children}
    </div>
  );
}
