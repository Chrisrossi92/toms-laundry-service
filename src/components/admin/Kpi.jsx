import Card from "../ui/Card";
export default function Kpi({ label, value }) {
  return (
    <Card><div className="text-xs text-gray-600">{label}</div>
      <div className="text-lg font-semibold text-gray-900">{value}</div>
    </Card>
  );
}
