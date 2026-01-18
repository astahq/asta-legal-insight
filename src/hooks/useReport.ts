import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { processLegalPack } from "@/lib/api/legalPackProcessor";

export function useReport(id: string | undefined, isDemo: boolean) {
  return useQuery({
    queryKey: ["report", id],
    queryFn: async () => {
      if (isDemo) return null;
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !isDemo && !!id,
    refetchInterval: (query) => {
      const report = query.state.data;
      return report?.status === "processing" ? 3000 : false;
    },
    refetchOnWindowFocus: true,
  });
}

export function useToggleWatchlist(id: string | undefined, isDemo: boolean, currentState: boolean) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      if (isDemo) return { wasOnWatchlist: currentState };
      if (!id) throw new Error("Report ID required");
      const { error } = await supabase
        .from("reports")
        .update({ on_watchlist: !currentState })
        .eq("id", id);
      if (error) throw error;
      return { wasOnWatchlist: currentState };
    },
    onSuccess: (result) => {
      if (!isDemo) {
        queryClient.invalidateQueries({ queryKey: ["report", id] });
        queryClient.invalidateQueries({ queryKey: ["reports"] });
        queryClient.invalidateQueries({ queryKey: ["watchlist"] });
      }
      toast({
        title: result.wasOnWatchlist ? "Removed from watchlist" : "Added to watchlist",
      });
    },
  });
}

export function useUpdateReportName(id: string | undefined, isDemo: boolean) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (newName: string) => {
      if (isDemo || !id) return;
      const { error } = await supabase
        .from("reports")
        .update({ property_address: newName })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report", id] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast({ title: "Report name updated" });
    },
    onError: () => {
      toast({ title: "Failed to update name", variant: "destructive" });
    },
  });
}

export function useRetryAnalysis(id: string | undefined, isDemo: boolean, userId: string | undefined, reportUrl?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      if (isDemo || !id) throw new Error("Report ID required");
      if (!userId) throw new Error("Please sign in to retry analysis");

      await processLegalPack({
        reportId: id,
        userId,
        url: reportUrl,
      });

      await supabase.from("reports").update({ status: "processing" }).eq("id", id);
    },
    onSuccess: () => {
      toast({
        title: "Analysis restarted",
        description: "We're re-processing your documents now.",
      });
      queryClient.invalidateQueries({ queryKey: ["report", id] });
    },
    onError: (e) => {
      toast({
        title: "Failed to restart analysis",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    },
  });
}
