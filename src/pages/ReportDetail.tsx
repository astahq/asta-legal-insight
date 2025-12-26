import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, FileText, Loader2, AlertCircle, CheckCircle, Pencil, Check, X } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { DocumentChat } from "@/components/report/DocumentChat";
import { useAuth } from "@/contexts/AuthContext";

interface ReportSection {
  id: string;
  section_key: string;
  content: string;
  sources: unknown;
}

function formatSectionTitle(sectionKey: string): string {
  return sectionKey
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function SectionCard({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  const displayContent = content?.trim() || "Unknown";
  
  return (
    <div className="py-5 border-b border-border last:border-b-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
        {displayContent}
      </p>
    </div>
  );
}

const ReportDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isDemo = id === "demo";
  const [demoWatchlist, setDemoWatchlist] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");

  // Fetch report
  const { data: report, isLoading: reportLoading, error: reportError } = useQuery({
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
  });

  // Fetch report sections
  const { data: sections, isLoading: sectionsLoading } = useQuery({
    queryKey: ["report-sections", id],
    queryFn: async () => {
      if (isDemo) return null;
      const { data, error } = await supabase
        .from("report_sections")
        .select("*")
        .eq("report_id", id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as ReportSection[];
    },
    enabled: !isDemo && !!id,
  });

  // Fetch documents for this report
  const { data: documents } = useQuery({
    queryKey: ["report-documents", id],
    queryFn: async () => {
      if (isDemo) return null;
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("report_id", id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !isDemo && !!id,
  });

  // Subscribe to real-time updates for this report
  useEffect(() => {
    if (isDemo || !id) return;

    const channel = supabase
      .channel(`report-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reports',
          filter: `id=eq.${id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['report', id] });
          queryClient.invalidateQueries({ queryKey: ['report-sections', id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, isDemo, queryClient]);

  const toggleWatchlist = useMutation({
    mutationFn: async () => {
      if (isDemo) {
        const wasOnWatchlist = demoWatchlist;
        setDemoWatchlist(!wasOnWatchlist);
        return { wasOnWatchlist };
      }
      if (!report) return { wasOnWatchlist: false };
      const wasOnWatchlist = report.on_watchlist;
      const { error } = await supabase
        .from("reports")
        .update({ on_watchlist: !wasOnWatchlist })
        .eq("id", report.id);

      if (error) throw error;
      return { wasOnWatchlist };
    },
    onSuccess: (result) => {
      if (!isDemo) {
        queryClient.invalidateQueries({ queryKey: ["report", id] });
        queryClient.invalidateQueries({ queryKey: ["reports"] });
        queryClient.invalidateQueries({ queryKey: ["watchlist"] });
      }
      const wasOnWatchlist = result?.wasOnWatchlist ?? false;
      toast({
        title: wasOnWatchlist
          ? "Removed from watchlist"
          : "Added to watchlist",
      });
    },
  });

  const updateReportName = useMutation({
    mutationFn: async (newName: string) => {
      if (isDemo || !report) return;
      const { error } = await supabase
        .from("reports")
        .update({ property_address: newName })
        .eq("id", report.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report", id] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      setIsEditingName(false);
      toast({ title: "Report name updated" });
    },
    onError: () => {
      toast({ title: "Failed to update name", variant: "destructive" });
    },
  });

  const retryAnalysis = useMutation({
    mutationFn: async () => {
      if (isDemo) return;
      if (!report) throw new Error("Report not loaded");
      if (!user) throw new Error("Please sign in to retry analysis");

      const { error } = await supabase.functions.invoke("process-legal-pack", {
        body: { reportId: report.id, userId: user.id },
      });
      if (error) throw error;

      await supabase.from("reports").update({ status: "processing" }).eq("id", report.id);
    },
    onSuccess: () => {
      toast({
        title: "Analysis restarted",
        description: "We're re-processing your documents now.",
      });
      queryClient.invalidateQueries({ queryKey: ["report", id] });
      queryClient.invalidateQueries({ queryKey: ["report-sections", id] });
    },
    onError: (e) => {
      toast({
        title: "Failed to restart analysis",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const isLoading = reportLoading || sectionsLoading;
  const propertyAddress = isDemo ? "22 Carslake Road" : report?.property_address || "Property";
  const propertySubtitle = isDemo ? "Wandsworth, London, SW15 3DP" : "";
  const onWatchlist = isDemo ? demoWatchlist : report?.on_watchlist;

  const handleSaveName = () => {
    if (editedName.trim()) {
      updateReportName.mutate(editedName.trim());
    }
  };

  const handleStartEdit = () => {
    setEditedName(propertyAddress);
    setIsEditingName(true);
  };

  // Loading state
  if (isLoading && !isDemo) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // Error or not found state
  if (!isDemo && (reportError || !report)) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <AlertCircle className="w-12 h-12 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Report Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The report you are looking for does not exist.
          </p>
          <Button asChild>
            <Link to="/reports">Back to Reports</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Demo mode content
  if (isDemo) {
    return (
      <DashboardLayout>
        <div className="space-y-6 max-w-5xl">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{propertyAddress}</h1>
              <p className="text-muted-foreground">{propertySubtitle}</p>
            </div>
            <div className="flex items-center gap-3 print:hidden">
              <Button
                variant="outline"
                onClick={() => toggleWatchlist.mutate()}
                className={cn(
                  "border-primary text-primary hover:bg-primary hover:text-primary-foreground",
                  onWatchlist && "bg-primary text-primary-foreground"
                )}
              >
                <Star className={cn("w-4 h-4 mr-2", onWatchlist && "fill-current")} />
                {onWatchlist ? "On Watchlist" : "Add to Watchlist"}
              </Button>
              <DocumentChat reportId="demo" propertyAddress={propertyAddress} />
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-success bg-success/10 p-3 rounded-lg">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>Demo mode - upload your own legal pack to see real analysis</span>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <SectionCard title="Title" content="Critical: Title is unregistered. First registration required on completion." />
            <SectionCard title="Ownership" content="Sold by LPA receiver. Three beneficial owners." />
            <SectionCard title="Charges and Money" content="Multiple Charges: Suggests financial distress, complex discharge process." />
            <SectionCard title="Covenants" content="None" />
            <SectionCard title="Tenure" content="Freehold" />
            <SectionCard title="Planning and Development" content="PD rights partially removed." />
            <SectionCard title="Completion and Penalty Risks" content="Late penalty: 1% of purchase price + VAT if you miss by even 1 hour." />
            <SectionCard title="Physical and Environmental Risks" content="EPC rating E. Japanese knotweed noted (2022 survey)." />
            <SectionCard title="Special Conditions" content="General Conditions G1.6 and G11 excluded. No misdescription protection." />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Real report content
  const reportStatus = report?.status;
  const hasSections = sections && sections.length > 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="text-xl font-bold h-10 w-80"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") setIsEditingName(false);
                  }}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleSaveName}
                  disabled={updateReportName.isPending}
                >
                  <Check className="w-4 h-4 text-success" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsEditingName(false)}
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h1 className="text-2xl font-bold text-foreground">{propertyAddress}</h1>
                <Button
                  size="icon"
                  variant="ghost"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={handleStartEdit}
                >
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 print:hidden">
            <Button
              variant="outline"
              onClick={() => toggleWatchlist.mutate()}
              className={cn(
                "border-primary text-primary hover:bg-primary hover:text-primary-foreground",
                onWatchlist && "bg-primary text-primary-foreground"
              )}
            >
              <Star className={cn("w-4 h-4 mr-2", onWatchlist && "fill-current")} />
              {onWatchlist ? "On Watchlist" : "Add to Watchlist"}
            </Button>
            <DocumentChat reportId={id || ""} propertyAddress={propertyAddress} />
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-success bg-success/10 p-3 rounded-lg">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>Not legal advice - your smarter due-diligence co-pilot</span>
        </div>

        {/* Processing/Failed Status */}
        {reportStatus !== "completed" && (
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-start gap-3">
              {reportStatus === "failed" ? (
                <>
                  <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                  <div className="flex-1">
                    <h2 className="text-base font-semibold text-foreground">Analysis failed</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      We couldn't process this legal pack. You can retry the analysis.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        onClick={() => retryAnalysis.mutate()}
                        disabled={retryAnalysis.isPending || !user}
                      >
                        {retryAnalysis.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Retrying...
                          </>
                        ) : (
                          "Retry analysis"
                        )}
                      </Button>
                      {!user && (
                        <span className="text-sm text-muted-foreground self-center">
                          Sign in to retry.
                        </span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Loader2 className="w-5 h-5 text-primary mt-0.5 animate-spin" />
                  <div className="flex-1">
                    <h2 className="text-base font-semibold text-foreground">Analysis in progress</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      We're extracting text and running the AI. This can take a few minutes.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          queryClient.invalidateQueries({ queryKey: ["report", id] });
                          queryClient.invalidateQueries({ queryKey: ["report-sections", id] });
                        }}
                      >
                        Refresh
                      </Button>
                      <Button
                        onClick={() => retryAnalysis.mutate()}
                        disabled={retryAnalysis.isPending || !user}
                      >
                        Restart
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Sections from database */}
        {reportStatus === "completed" && (
          <div className="bg-card border border-border rounded-lg p-6">
            {hasSections ? (
              sections.map((section) => (
                <SectionCard
                  key={section.id}
                  title={formatSectionTitle(section.section_key)}
                  content={section.content}
                />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No analysis sections available yet.</p>
              </div>
            )}
          </div>
        )}

        {/* Documents list */}
        {documents && documents.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">Documents</h2>
            </div>
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm min-w-[400px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                      File Name
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                      Size
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr
                      key={doc.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30"
                    >
                      <td className="py-3 px-2 text-foreground">{doc.file_name}</td>
                      <td className="py-3 px-2 text-muted-foreground">
                        {doc.size_bytes ? `${Math.round(doc.size_bytes / 1024)} KB` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ReportDetail;
