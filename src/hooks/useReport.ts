import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { processLegalPack } from "@/lib/api/legalPackProcessor";

export function useReport(id: string | undefined, isDemo: boolean, shareToken?: string | null) {
  return useQuery({
    queryKey: ["report", id, shareToken],
    queryFn: async () => {
      if (isDemo) return null;
      if (!id) return null;
      
      if (shareToken) {
        const { data, error } = await (supabase.rpc as unknown as (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: Error | null }>)("get_shared_report", {
          p_report_id: id,
          p_share_token: shareToken,
        });
        if (error) throw error;
        return (data ?? null) as Tables<"reports"> | null;
      }

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

      const { error } = await supabase.from("reports").update({ status: "processing" }).eq("id", id);
      if (error) throw error;

      await processLegalPack({
        reportId: id,
        userId,
        url: reportUrl,
      });
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

export function useToggleShare(id: string | undefined, isDemo: boolean, currentIsPublic: boolean) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      if (isDemo || !id) return { is_public: false, share_token: null };
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in to share reports");
      
      const { data, error } = await (supabase.rpc as unknown as (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: Error | null }>)('toggle_report_sharing', {
        p_report_id: id
      });

      if (error) throw error;
      return data as { is_public: boolean; share_token: string | null };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["report", id] });
      if (result.is_public && result.share_token) {
        const shareUrl = `${window.location.origin}/reports/${id}?token=${result.share_token}`;
        navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Report shared publicly",
          description: "Share link copied to clipboard",
        });
      } else {
        toast({
          title: "Sharing disabled",
          description: "Report is now private",
        });
      }
    },
    onError: (e) => {
      toast({
        title: "Failed to toggle sharing",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    },
  });
}
