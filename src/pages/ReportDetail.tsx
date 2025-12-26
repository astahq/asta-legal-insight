import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, FileText, Loader2, AlertCircle, CheckCircle, Pencil, Check, X } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { demoReportAnalysis, ReportAnalysis, ReportIssue } from "@/lib/demoReportData";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { DocumentChat } from "@/components/report/DocumentChat";
import { useAuth } from "@/contexts/AuthContext";

function IssueBadge({ issue }: { issue: ReportIssue }) {
  const bgColor = {
    critical: "bg-destructive/10",
    warning: "bg-warning/10",
    info: "bg-primary/10",
  }[issue.severity];

  const dotColor = {
    critical: "bg-destructive",
    warning: "bg-warning",
    info: "bg-primary",
  }[issue.severity];

  return (
    <div className={cn("flex items-start gap-3 p-3 rounded-md", bgColor)}>
      <span className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", dotColor)} />
      <span className="text-sm text-foreground">{issue.text}</span>
    </div>
  );
}

function ReportSection({
  title,
  children,
  rightContent,
  dotColor,
  issueCount,
}: {
  title: string;
  children: React.ReactNode;
  rightContent?: React.ReactNode;
  dotColor?: "green" | "warning" | "critical";
  issueCount?: number;
}) {
  const dot = dotColor ? (
    <span
      className={cn(
        "w-2 h-2 rounded-full",
        dotColor === "green" && "bg-success",
        dotColor === "warning" && "bg-warning",
        dotColor === "critical" && "bg-destructive"
      )}
    />
  ) : null;

  return (
    <div className="py-5 border-b border-border last:border-b-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {dot}
          <h3 className="font-semibold text-foreground">{title}</h3>
        </div>
        {rightContent}
      </div>
      {issueCount !== undefined && issueCount > 0 && (
        <p className="text-sm text-muted-foreground mb-3">
          {issueCount} potential issue{issueCount !== 1 ? "s" : ""} found
        </p>
      )}
      {children}
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

  const { data: report, isLoading, error } = useQuery({
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
    enabled: !isDemo,
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
        (payload) => {
          console.log('Report updated:', payload);
          queryClient.invalidateQueries({ queryKey: ['report', id] });
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
        // For demo, we toggle AFTER showing toast, so we need to check CURRENT state
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

      // best-effort: ensure UI shows "processing" immediately
      await supabase.from("reports").update({ status: "processing" }).eq("id", report.id);
    },
    onSuccess: () => {
      toast({
        title: "Analysis restarted",
        description: "We’re re-processing your documents now.",
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

  const propertyAddress = isDemo
    ? "22 Carslake Road"
    : report?.property_address || "Property";

  const propertySubtitle = isDemo ? "Wandsworth, London, SW15 3DP" : "";

  const onWatchlist = isDemo ? demoWatchlist : report?.on_watchlist;

  const analysis: ReportAnalysis | null = isDemo
    ? demoReportAnalysis
    : (report?.analysis_result as unknown as ReportAnalysis) || null;

  const handleSaveName = () => {
    if (editedName.trim()) {
      updateReportName.mutate(editedName.trim());
    }
  };

  const handleStartEdit = () => {
    setEditedName(propertyAddress);
    setIsEditingName(true);
  };

  if (isLoading && !isDemo) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isDemo && (error || !report)) {
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

  return (
    <DashboardLayout>
        <div className="space-y-6 max-w-5xl">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            {isEditingName && !isDemo ? (
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
                {!isDemo && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={handleStartEdit}
                  >
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            )}
            {propertySubtitle && (
              <p className="text-muted-foreground">{propertySubtitle}</p>
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
            <DocumentChat
              reportId={id || "demo"}
              propertyAddress={propertyAddress}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Guide Price</p>
            <p className="text-3xl font-bold text-foreground">
              {analysis?.propertyDetails?.guidePrice || "—"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Auction Date</p>
            <p className="font-semibold text-foreground">
              {analysis?.propertyDetails?.auctionDate || "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {(analysis as any)?.propertyDetails?.auctionDateNote || ""}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 py-4 border-y border-border">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Property Type
            </p>
            <p className="font-medium text-foreground">
              {analysis?.propertyDetails?.propertyType || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Bedrooms
            </p>
            <p className="font-medium text-foreground">
              {analysis?.propertyDetails?.bedrooms || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Bathrooms
            </p>
            <p className="font-medium text-foreground">
              {analysis?.propertyDetails?.bathrooms || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Size</p>
            <p className="font-medium text-foreground">
              {analysis?.propertyDetails?.size || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Tenure
            </p>
            <p className="font-medium text-foreground">
              {analysis?.propertyDetails?.tenure || "—"}
            </p>
          </div>
        </div>

        <div className="bg-primary/10 rounded-lg overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4">
            <span className="font-semibold text-primary text-sm uppercase tracking-wide">
              Asta Deal Score™
            </span>
            <div className="flex items-center gap-3">
              <span className="text-primary font-bold text-xl">
                {analysis?.astaScore
                  ? `${analysis.astaScore.score}/${analysis.astaScore.maxScore}`
                  : "—"}
              </span>
              <span className="text-sm text-success font-medium">
                {analysis?.astaScore?.description || ""}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-success bg-success/10 p-3 rounded-lg">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>Not legal advice - your smarter due-diligence co-pilot</span>
        </div>

        {!isDemo && (!analysis || report?.status !== "completed") ? (
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-start gap-3">
              {report?.status === "failed" ? (
                <>
                  <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                  <div className="flex-1">
                    <h2 className="text-base font-semibold text-foreground">Analysis failed</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      We couldn’t process this legal pack yet. You can retry the analysis.
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
                      We’re extracting text and running the AI. This can take a few minutes.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => queryClient.invalidateQueries({ queryKey: ["report", id] })}
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
        ) : (
          <>
            <div className="bg-card border border-border rounded-lg p-6">
              <ReportSection title="Title" issueCount={analysis.title.issues.length}>
                <div className="space-y-2">
                  {analysis.title.issues.map((issue, i) => (
                    <IssueBadge key={i} issue={issue} />
                  ))}
                </div>
                {analysis.title.description && (
                  <p className="text-sm text-muted-foreground mt-3 bg-muted/50 p-3 rounded-md">
                    {analysis.title.description}
                  </p>
                )}
              </ReportSection>

              <ReportSection title="Ownership" issueCount={analysis.ownership.issues.length}>
                <div className="space-y-2">
                  {analysis.ownership.issues.map((issue, i) => (
                    <IssueBadge key={i} issue={issue} />
                  ))}
                </div>
              </ReportSection>

              <ReportSection
                title="Charges & Money"
                issueCount={analysis.chargesAndMoney.issues.length}
                rightContent={
                  <span className="text-sm text-muted-foreground">
                    {analysis.chargesAndMoney.charges.length} Charges Found
                  </span>
                }
              >
                <div className="overflow-x-auto mb-4 -mx-2">
                  <table className="w-full text-sm min-w-[500px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-2 font-medium text-muted-foreground">
                          Type
                        </th>
                        <th className="text-left py-2 px-2 font-medium text-muted-foreground">
                          Name
                        </th>
                        <th className="text-left py-2 px-2 font-medium text-muted-foreground">
                          Amount
                        </th>
                        <th className="text-left py-2 px-2 font-medium text-muted-foreground">
                          Date
                        </th>
                        <th className="text-left py-2 px-2 font-medium text-muted-foreground">
                          Paid Off
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.chargesAndMoney.charges.map((charge, i) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          <td className="py-2 px-2 text-foreground">{charge.type}</td>
                          <td className="py-2 px-2 text-foreground">{charge.name}</td>
                          <td className="py-2 px-2 text-foreground">{charge.amount}</td>
                          <td className="py-2 px-2 text-foreground">{charge.date}</td>
                          <td className="py-2 px-2 text-foreground">{charge.paidOff}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="space-y-2">
                  {analysis.chargesAndMoney.issues.map((issue, i) => (
                    <IssueBadge key={i} issue={issue} />
                  ))}
                </div>
              </ReportSection>

              <ReportSection
                title="Covenants"
                dotColor="green"
                rightContent={
                  <span className="text-foreground">{analysis.covenants || "Unknown"}</span>
                }
              >
                <div />
              </ReportSection>

              <ReportSection
                title="Tenure"
                dotColor="green"
                rightContent={
                  <span className="text-foreground">{analysis.tenure || "Unknown"}</span>
                }
              >
                <div />
              </ReportSection>

              <ReportSection
                title="Planning And Development"
                issueCount={analysis.planningAndDevelopment.issues.length}
              >
                <div className="space-y-2">
                  {analysis.planningAndDevelopment.issues.map((issue, i) => (
                    <IssueBadge key={i} issue={issue} />
                  ))}
                </div>
              </ReportSection>

              <ReportSection
                title="Completion & Penalty Risks"
                issueCount={analysis.completionAndPenaltyRisks.issues.length}
              >
                <div className="space-y-2">
                  {analysis.completionAndPenaltyRisks.issues.map((issue, i) => (
                    <IssueBadge key={i} issue={issue} />
                  ))}
                </div>
              </ReportSection>

              <ReportSection
                title="Physical & Environmental Risks"
                issueCount={analysis.physicalAndEnvironmentalRisks.issues.length}
              >
                <div className="space-y-2">
                  {analysis.physicalAndEnvironmentalRisks.issues.map((issue, i) => (
                    <IssueBadge key={i} issue={issue} />
                  ))}
                </div>
              </ReportSection>

              <ReportSection
                title="Special Conditions & Amendments"
                issueCount={analysis.specialConditionsAndAmenities.issues.length}
              >
                <div className="space-y-2">
                  {analysis.specialConditionsAndAmenities.issues.map((issue, i) => (
                    <IssueBadge key={i} issue={issue} />
                  ))}
                </div>
              </ReportSection>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground">Documents</h2>
              </div>
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                        Property Address
                      </th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                        Pages
                      </th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                        Key Findings Detected
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.documents.map((doc, i) => (
                      <tr
                        key={i}
                        className="border-b border-border last:border-0 hover:bg-muted/30"
                      >
                        <td className="py-3 px-2 text-foreground">{doc.name}</td>
                        <td className="py-3 px-2 text-foreground">{doc.pages}</td>
                        <td className="py-3 px-2 text-muted-foreground">{doc.keyFindings}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ReportDetail;
