import { useParams, Link } from "react-router-dom";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { demoReport, ReportAnalysis } from "@/lib/demoReportData";
import { getDisplayAddress, extractPropertySubtitle } from "@/lib/utils";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { transformAnalysisResult } from "@/lib/utils/analysisTransform";
import { PropertyHeader } from "@/components/report/PropertyHeader";
import { PropertyDetails } from "@/components/report/PropertyDetails";
import { AnalysisStatus } from "@/components/report/AnalysisStatus";
import { AnalysisContent } from "@/components/report/AnalysisContent";
import {
  useReport,
  useToggleWatchlist,
  useUpdateReportName,
  useRetryAnalysis,
} from "@/hooks/useReport";
import { useSearchParams } from "react-router-dom";

const ReportDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isDemo = id === "demo";
  const [demoWatchlist, setDemoWatchlist] = useState(false);
  const shareToken = searchParams.get("token");

  const { data: report, isLoading, error } = useReport(id, isDemo, shareToken);
  const currentReport = isDemo ? demoReport : report;
  const toggleWatchlist = useToggleWatchlist(
    id,
    isDemo,
    isDemo ? demoWatchlist : (currentReport?.on_watchlist ?? false),
  );
  const updateReportName = useUpdateReportName(id, isDemo);
  const retryAnalysis = useRetryAnalysis(
    id,
    isDemo,
    user?.id,
    currentReport?.property_url || undefined,
  );

  const extractAddress = (
    currentReport?.scraped_data as unknown as { extract: { address: string } }
  )?.extract?.address;
  const propertyAddress = getDisplayAddress(
    extractAddress || "Document Analysis",
  );
  const fullPropertyAddress =
    currentReport?.property_address || "Document Analysis";
  const propertySubtitle = isDemo
    ? ((currentReport as typeof demoReport)?.property_subtitle ?? "")
    : extractPropertySubtitle(extractAddress);
  const onWatchlist = isDemo ? demoWatchlist : currentReport?.on_watchlist;

  const handleToggleWatchlist = () => {
    if (isDemo) {
      setDemoWatchlist(!demoWatchlist);
    }
    toggleWatchlist.mutate();
  };

  const rawAnalysis = currentReport?.analysis_result || null;
  const analysis: ReportAnalysis | null = rawAnalysis
    ? transformAnalysisResult(rawAnalysis, currentReport)
    : null;
  const isAnalysisComplete =
    isDemo || (analysis && currentReport?.status === "completed");

  if (isLoading && !isDemo) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isDemo && (error || !currentReport)) {
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
          isAnalysisComplete={isAnalysisComplete}
          isPublic={
            !isDemo && report && "is_public" in report
              ? Boolean((report as Record<string, unknown>).is_public)
              : false
          }
          shareToken={
            !isDemo && report && "share_token" in report
              ? ((report as Record<string, unknown>).share_token as
                  | string
                  | null)
              : null
          }
        />

        <PropertyDetails details={analysis?.propertyDetails} />

        <div className="flex items-center gap-2 text-sm text-success bg-success/10 border border-success/20 px-4 py-3 rounded-lg">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium">
            Not legal advice - your smarter due-diligence co-pilot
          </span>
        </div>

        {!isDemo && (!analysis || currentReport?.status !== "completed") ? (
          <AnalysisStatus
            status={
              currentReport?.status === "failed" ? "failed" : "processing"
            }
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
