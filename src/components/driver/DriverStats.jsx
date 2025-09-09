import Card from "../ui/Card";

export default function DriverStats({ stats }) {
  const Item = ({ label, value }) => (
    <div className="rounded-lg bg-white/70 border border-white/40 p-3">
      <div className="text-xs text-gray-600">{label}</div>
      <div className="text-lg font-semibold text-gray-900">{value}</div>
    </div>
  );
  return (
    <Card>
      <div className="font-semibold text-gray-900 mb-2">Today</div>
      <div className="grid grid-cols-5 gap-2">
        <Item label="Total" value={stats.total} />
        <Item label="En route" value={stats.enroute} />
        <Item label="Picked" value={stats.picked} />
        <Item label="Out" value={stats.out} />
        <Item label="Delivered" value={stats.delivered} />
      </div>
    </Card>
  );
}
