import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { cn, getDisplayAddress } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

interface Report {
  id: string;
  property_address: string;
  status: string;
  created_at: string;
}

function StatusDot({ status }: { status: string }) {
  const config = {
    processing: { class: "bg-muted-foreground", label: "Processing" },
    completed: { class: "bg-success", label: "Completed" },
    failed: { class: "bg-destructive", label: "Failed" },
  };

  const { class: dotClass, label } = config[status as keyof typeof config] || config.processing;

  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("w-1.5 h-1.5 rounded-full", dotClass)} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </span>
  );
}

export function LastReports() {
  const navigate = useNavigate();
  const { data: reports, isLoading } = useQuery({
    queryKey: ['last-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reports')
        .select('id, property_address, status, created_at')
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;
      return data as Report[];
    },
  });

  return (
    <div className="bg-card border border-border/50 rounded-2xl shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Reports</h3>
        <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground hover:text-foreground -mr-2 h-7">
          <Link to="/reports">
            All
            <ArrowRight className="w-3 h-3 ml-1" />
          </Link>
        </Button>
      </div>

      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : reports && reports.length > 0 ? (
          <div className="divide-y divide-border/30">
            {reports.map((report) => (
              <button
                key={report.id}
                className="w-full text-left px-4 py-2.5 hover:bg-muted/40 transition-colors"
                onClick={() => navigate(`/reports/${report.id}`)}
              >
                <p className="text-sm text-foreground truncate" title={report.property_address}>
                  {getDisplayAddress(report.property_address, 40)}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[11px] text-muted-foreground">
                    {format(new Date(report.created_at), 'dd MMM yyyy')}
                  </span>
                  <StatusDot status={report.status} />
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <p className="text-sm text-muted-foreground">No reports yet</p>
            <Button variant="link" size="sm" asChild className="mt-1 text-xs">
              <Link to="/upload">Create your first report</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
