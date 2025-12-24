interface StatCardProps {
  label: string;
  value: string;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="stat-card">
      <p className="text-sm text-muted-foreground mb-2">{label}</p>
      <p className="text-3xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function StatsCards() {
  const stats = [
    { label: "Properties analysed", value: "34" },
    { label: "Document analysed", value: "359" },
    { label: "Total Value of Properties", value: "£11.7M" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </div>
  );
}
