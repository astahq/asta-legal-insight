import { useQuery } from "@tanstack/react-query";
import { FileText, CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
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

function StatusBadge({ status }: { status: string }) {
  const config = {
    processing: { icon: Clock, class: "status-processing", label: "Processing" },
    completed: { icon: CheckCircle2, class: "status-completed", label: "Completed" },
    failed: { icon: AlertCircle, class: "bg-destructive/10 text-destructive", label: "Failed" },
  };
  
  const { icon: Icon, class: className, label } = config[status as keyof typeof config] || config.processing;

  return (
    <span className={cn("status-badge", className)}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

export function LastReports() {
  const { data: reports, isLoading } = useQuery({
    queryKey: ['last-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reports')
        .select('id, property_address, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data as Report[];
    },
  });

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Last Reports</h3>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/reports">View All</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : reports && reports.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="table-header text-left pb-3">Property Address</th>
                <th className="table-header text-left pb-3">Date Submitted</th>
                <th className="table-header text-left pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="border-b border-border last:border-0">
                  <td className="py-4 text-sm text-foreground">
                    <span className="truncate block" title={report.property_address}>
                      {getDisplayAddress(report.property_address, 80)}
                    </span>
                  </td>
                  <td className="py-4 text-sm text-muted-foreground">
                    {format(new Date(report.created_at), 'dd/MM/yyyy')}
                  </td>
                  <td className="py-4">
                    <StatusBadge status={report.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No reports yet</p>
          <Button variant="link" size="sm" asChild className="mt-2">
            <Link to="/upload">Create your first report</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
