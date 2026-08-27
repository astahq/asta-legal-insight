import { useEffect, useState } from "react";
import { Building2, FileText, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  loading?: boolean;
  icon: React.ReactNode;
  accent?: string;
  accentBg?: string;
}

function StatCard({ label, value, loading, icon, accent = "text-foreground", accentBg = "bg-muted/50" }: StatCardProps) {
  return (
    <div className="bg-card border border-border/50 rounded-xl shadow-sm p-4 flex flex-col justify-between min-h-[88px]">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", accentBg)}>
          {icon}
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-7 w-14" />
      ) : (
        <p className={cn("text-2xl font-bold tracking-tight leading-none", accent)}>{value}</p>
      )}
    </div>
  );
}

export function StatsCards() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    propertiesAnalysed: 0,
    documentsAnalysed: 0,
    completed: 0,
    processing: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchStats() {
      try {
        const { data, error } = await supabase
          .from("reports")
          .select("id, documents_count, status")
          .eq("user_id", user!.id);

        if (error) throw error;

        const propertiesAnalysed = data?.length || 0;
        const documentsAnalysed = data?.reduce((sum, report) => sum + (report.documents_count || 0), 0) || 0;
        const completed = data?.filter(r => r.status === "completed").length || 0;
        const processing = data?.filter(r => r.status === "processing").length || 0;

        setStats({ propertiesAnalysed, documentsAnalysed, completed, processing });
      } catch {
        console.error('Error fetching stats');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [user]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        label="Properties"
        value={stats.propertiesAnalysed.toString()}
        loading={loading}
        icon={<Building2 className="w-3.5 h-3.5 text-foreground/40" />}
      />
      <StatCard
        label="Documents"
        value={stats.documentsAnalysed.toString()}
        loading={loading}
        icon={<FileText className="w-3.5 h-3.5 text-foreground/40" />}
      />
      <StatCard
        label="Completed"
        value={stats.completed.toString()}
        loading={loading}
        icon={<CheckCircle2 className="w-3.5 h-3.5 text-success" />}
        accent="text-success"
        accentBg="bg-success/10"
      />
      <StatCard
        label="Processing"
        value={stats.processing.toString()}
        loading={loading}
        icon={<Clock className="w-3.5 h-3.5 text-primary" />}
        accent="text-primary"
        accentBg="bg-primary/10"
      />
    </div>
  );
}
