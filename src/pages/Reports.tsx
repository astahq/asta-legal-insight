import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, CheckCircle2, Clock, Star, AlertCircle, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

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
  const queryClient = useQueryClient();

  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Report[];
    },
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
            <h1 className="text-2xl font-bold text-foreground">Reports</h1>
            <p className="text-muted-foreground">View all your property analysis reports</p>
          </div>
          <Button asChild>
            <Link to="/upload">New Analysis</Link>
          </Button>
        </div>

        <div className="bg-card border border-border rounded-lg">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : reports && reports.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="table-header text-left p-4">Property Address</th>
                    <th className="table-header text-left p-4">Date Submitted</th>
                    <th className="table-header text-left p-4">Status</th>
                    <th className="table-header text-left p-4">Watchlist</th>
                    <th className="table-header text-left p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                      <td className="p-4 text-sm text-foreground">{report.property_address}</td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {format(new Date(report.created_at), 'dd/MM/yyyy')}
                      </td>
                      <td className="p-4">
                        <StatusBadge status={report.status} />
                      </td>
                      <td className="p-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleWatchlist.mutate({ id: report.id, on_watchlist: report.on_watchlist })}
                          className={cn(
                            report.on_watchlist ? "text-warning" : "text-muted-foreground"
                          )}
                        >
                          <Star className={cn("w-4 h-4", report.on_watchlist && "fill-current")} />
                        </Button>
                      </td>
                      <td className="p-4">
                        <Button variant="outline" size="sm">
                          View Report
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No reports yet</h3>
              <p className="text-muted-foreground mb-4">Upload your first legal pack to get started</p>
              <Button asChild>
                <Link to="/upload">Create Your First Report</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
