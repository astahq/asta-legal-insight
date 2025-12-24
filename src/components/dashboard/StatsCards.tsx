import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  label: string;
  value: string;
  loading?: boolean;
}

function StatCard({ label, value, loading }: StatCardProps) {
  return (
    <div className="stat-card">
      <p className="text-sm text-muted-foreground mb-2">{label}</p>
      {loading ? (
        <Skeleton className="h-9 w-24" />
      ) : (
        <p className="text-3xl font-semibold text-foreground">{value}</p>
      )}
    </div>
  );
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `£${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `£${(value / 1000).toFixed(0)}K`;
  }
  return `£${value.toLocaleString()}`;
}

export function StatsCards() {
  const [stats, setStats] = useState({
    propertiesAnalysed: 0,
    documentsAnalysed: 0,
    totalValue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const { data, error } = await supabase
          .from("reports")
          .select("id, documents_count, property_value");

        if (error) throw error;

        const propertiesAnalysed = data?.length || 0;
        const documentsAnalysed = data?.reduce((sum, report) => sum + (report.documents_count || 0), 0) || 0;
        const totalValue = data?.reduce((sum, report) => sum + (Number(report.property_value) || 0), 0) || 0;

        setStats({
          propertiesAnalysed,
          documentsAnalysed,
          totalValue,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const statsData = [
    { label: "Properties analysed", value: stats.propertiesAnalysed.toString() },
    { label: "Document analysed", value: stats.documentsAnalysed.toString() },
    { label: "Total Value of Properties", value: formatCurrency(stats.totalValue) },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {statsData.map((stat) => (
        <StatCard key={stat.label} label={stat.label} value={stat.value} loading={loading} />
      ))}
    </div>
  );
}
