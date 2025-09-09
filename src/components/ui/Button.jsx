export function Button({ children, onClick, variant="primary", disabled }) {
  const base = "px-3 py-2 rounded-md text-sm";
  const map = {
    primary: "bg-black text-white",
    outline: "border border-gray-300 bg-white",
    ghost: "text-gray-800 hover:underline",
  };
  return (
    <button disabled={disabled} onClick={onClick}
      className={`${base} ${map[variant]} ${disabled ? "opacity-60 pointer-events-none":""}`}>
      {children}
    </button>
  );
}
