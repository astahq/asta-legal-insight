import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, CheckCircle2, Clock, AlertCircle, Loader2, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { cn, getDisplayAddress } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
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

const Watchlist = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: reports, isLoading } = useQuery({
    queryKey: ['watchlist', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', user!.id)
        .eq('on_watchlist', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Report[];
    },
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('watchlist-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reports',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['watchlist'] });
          queryClient.invalidateQueries({ queryKey: ['reports'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user]);

  const removeFromWatchlist = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('reports')
        .update({ on_watchlist: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast({ title: "Removed from watchlist" });
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Watchlist</h1>
          <p className="text-muted-foreground">Properties you're keeping an eye on</p>
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
                    <th className="table-header text-left p-4">Date Added</th>
                    <th className="table-header text-left p-4">Status</th>
                    <th className="table-header text-left p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr 
                      key={report.id} 
                      className="border-b border-border last:border-0 hover:bg-muted/50 cursor-pointer"
                      onClick={() => navigate(`/reports/${report.id}`)}
                    >
                      <td className="p-4 text-sm text-foreground">
                        <span className="truncate block" title={report.property_address}>
                          {getDisplayAddress(report.property_address, 80)}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {format(new Date(report.created_at), 'dd/MM/yyyy')}
                      </td>
                      <td className="p-4">
                        <StatusBadge status={report.status} />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={(e) => e.stopPropagation()}
                            asChild
                          >
                            <Link to={`/reports/${report.id}`}>View Report</Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromWatchlist.mutate(report.id);
                            }}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Star className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Your watchlist is empty</h3>
              <p className="text-muted-foreground mb-4">Add reports to your watchlist to track them here</p>
              <Button asChild>
                <Link to="/reports">View All Reports</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Watchlist;
