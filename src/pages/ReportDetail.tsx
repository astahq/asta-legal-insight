import { useParams, Link } from "react-router-dom";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { demoReportAnalysis, ReportAnalysis } from "@/lib/demoReportData";
import { getDisplayAddress } from "@/lib/utils";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { transformAnalysisResult } from "@/lib/utils/analysisTransform";
import { PropertyHeader } from "@/components/report/PropertyHeader";
import { PropertyDetails } from "@/components/report/PropertyDetails";
import { AnalysisStatus } from "@/components/report/AnalysisStatus";
import { AnalysisContent } from "@/components/report/AnalysisContent";
import { useReport, useToggleWatchlist, useUpdateReportName, useRetryAnalysis } from "@/hooks/useReport";

const ReportDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isDemo = id === "demo";
  const [demoWatchlist, setDemoWatchlist] = useState(false);

  const { data: report, isLoading, error } = useReport(id, isDemo);
  const toggleWatchlist = useToggleWatchlist(id, isDemo, isDemo ? demoWatchlist : report?.on_watchlist ?? false);
  const updateReportName = useUpdateReportName(id, isDemo);
  const retryAnalysis = useRetryAnalysis(id, isDemo, user?.id, report?.property_url);

  const propertyAddress = isDemo
    ? "22 Carslake Road"
    : getDisplayAddress(report?.property_address) || "Property";

  const fullPropertyAddress = isDemo
    ? "22 Carslake Road"
    : report?.property_address || "Property";

  const propertySubtitle = isDemo ? "Wandsworth, London, SW15 3DP" : "";
  const onWatchlist = isDemo ? demoWatchlist : report?.on_watchlist;

  const handleToggleWatchlist = () => {
    if (isDemo) {
      setDemoWatchlist(!demoWatchlist);
    }
    toggleWatchlist.mutate();
  };

  const rawAnalysis = isDemo ? demoReportAnalysis : report?.analysis_result || null;
  const analysis: ReportAnalysis | null = rawAnalysis ? transformAnalysisResult(rawAnalysis) : null;

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
      <div className="space-y-8 w-full">
        <PropertyHeader
          propertyAddress={propertyAddress}
          fullPropertyAddress={fullPropertyAddress}
          propertySubtitle={propertySubtitle}
          onWatchlist={onWatchlist ?? false}
          onToggleWatchlist={handleToggleWatchlist}
          onUpdateName={updateReportName.mutate}
              reportId={id || "demo"}
          isDemo={isDemo}
        />

        {analysis?.propertyDetails && (
          <PropertyDetails details={analysis.propertyDetails} />
        )}

        <div className="flex items-center gap-2 text-sm text-success bg-success/10 border border-success/20 px-4 py-3 rounded-lg">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium">Not legal advice - your smarter due-diligence co-pilot</span>
        </div>

        {!isDemo && (!analysis || report?.status !== "completed") ? (
          <AnalysisStatus
            status={report?.status === "failed" ? "failed" : "processing"}
            onRetry={() => retryAnalysis.mutate()}
            isRetrying={retryAnalysis.isPending}
            requiresAuth={!user}
          />
        ) : analysis ? (
          <AnalysisContent analysis={analysis} />
        ) : null}
      </div>
    </DashboardLayout>
  );
};

export default ReportDetail;
