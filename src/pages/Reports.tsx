import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, Star, AlertCircle, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, getDisplayAddress } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { demoReport } from "@/lib/demoReportData";

interface Report {
  id: string;
  property_address: string;
  property_url: string | null;
  status: string;
  on_watchlist: boolean;
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

const Reports = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Report[];
    },
    enabled: !!user,
  });

  const toggleWatchlist = useMutation({
    mutationFn: async ({ id, on_watchlist }: { id: string; on_watchlist: boolean }) => {
      const { error } = await supabase
        .from('reports')
        .update({ on_watchlist: !on_watchlist })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast({ title: "Watchlist updated" });
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Reports</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Your property analysis reports</p>
          </div>
          <Button asChild size="sm">
            <Link to="/upload">New Analysis</Link>
          </Button>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="table-header text-left px-5 py-3">Property</th>
                    <th className="table-header text-left px-5 py-3">Date</th>
                    <th className="table-header text-left px-5 py-3">Status</th>
                    <th className="table-header text-left px-5 py-3">Watchlist</th>
                    <th className="table-header text-left px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    className="border-b border-border/30 hover:bg-muted/40 cursor-pointer transition-colors"
                    onClick={() => navigate("/reports/demo")}
                  >
                    <td className="px-5 py-3.5 text-sm text-foreground">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate" title={demoReport.property_address}>
                          {getDisplayAddress(demoReport.property_address, 70)}
                        </span>
                        <Badge variant="outline" className="text-[10px] bg-primary/[0.06] text-primary border-primary/15 flex-shrink-0">Demo</Badge>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">
                      {format(new Date(demoReport.created_at), 'dd MMM yyyy')}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={demoReport.status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center w-7 h-7">
                        <Star className="w-4 h-4 text-border" />
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                        asChild
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Link to="/reports/demo">View</Link>
                      </Button>
                    </td>
                  </tr>
                  {reports?.map((report, i) => (
                    <tr
                      key={report.id}
                      className={cn(
                        "hover:bg-muted/40 cursor-pointer transition-colors",
                        i !== (reports?.length ?? 0) - 1 && "border-b border-border/30"
                      )}
                      onClick={() => navigate(`/reports/${report.id}`)}
                    >
                      <td className="px-5 py-3.5 text-sm text-foreground">
                        <span className="truncate block" title={report.property_address}>
                          {getDisplayAddress(report.property_address, 70)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">
                        {format(new Date(report.created_at), 'dd MMM yyyy')}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={report.status} />
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleWatchlist.mutate({ id: report.id, on_watchlist: report.on_watchlist });
                          }}
                          className="flex items-center justify-center w-7 h-7 rounded-md transition-colors hover:bg-muted"
                        >
                          <Star className={cn(
                            "w-4 h-4 transition-colors",
                            report.on_watchlist
                              ? "text-primary fill-primary"
                              : "text-border hover:text-muted-foreground"
                          )} />
                        </button>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                          asChild
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Link to={`/reports/${report.id}`}>View</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
