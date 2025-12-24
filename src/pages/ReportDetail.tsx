import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Star, Download, FileText, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { demoReportAnalysis, ReportAnalysis, ReportIssue } from "@/lib/demoReportData";
import { cn } from "@/lib/utils";

function IssueBadge({ issue }: { issue: ReportIssue }) {
  const colorClass = {
    critical: 'bg-destructive/10 text-destructive',
    warning: 'bg-warning/10 text-warning',
    info: 'bg-primary/10 text-primary',
  }[issue.severity];

  const dotColor = {
    critical: 'bg-destructive',
    warning: 'bg-warning',
    info: 'bg-primary',
  }[issue.severity];

  return (
    <div className={cn("flex items-start gap-2 p-3 rounded-lg", colorClass)}>
      <span className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", dotColor)} />
      <span className="text-sm">{issue.text}</span>
    </div>
  );
}

function ReportSection({ 
  title, 
  children, 
  rightContent,
  dotColor 
}: { 
  title: string; 
  children: React.ReactNode; 
  rightContent?: React.ReactNode;
  dotColor?: 'green' | 'warning' | 'critical';
}) {
  const dot = dotColor ? (
    <span className={cn(
      "w-2 h-2 rounded-full",
      dotColor === 'green' && "bg-green-500",
      dotColor === 'warning' && "bg-warning",
      dotColor === 'critical' && "bg-destructive"
    )} />
  ) : null;

  return (
    <div className="border-b border-border py-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {dot}
          <h3 className="font-semibold text-foreground">{title}</h3>
        </div>
        {rightContent}
      </div>
      {children}
    </div>
  );
}

const ReportDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['report', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  const toggleWatchlist = useMutation({
    mutationFn: async () => {
      if (!report) return;
      const { error } = await supabase
        .from('reports')
        .update({ on_watchlist: !report.on_watchlist })
        .eq('id', report.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report', id] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      toast({ 
        title: report?.on_watchlist ? "Removed from watchlist" : "Added to watchlist" 
      });
    },
  });

  // Use demo data for analysis - in production this would come from the report's analysis_result
  const analysis: ReportAnalysis = (report?.analysis_result as unknown as ReportAnalysis) || demoReportAnalysis;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !report) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <AlertCircle className="w-12 h-12 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Report Not Found</h2>
          <p className="text-muted-foreground mb-4">The report you're looking for doesn't exist.</p>
          <Button asChild>
            <Link to="/reports">Back to Reports</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Back button */}
        <Link to="/reports" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Reports
        </Link>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{report.property_address}</h1>
            <p className="text-muted-foreground">Wandsworth, London, SW15 3DP</p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant={report.on_watchlist ? "default" : "outline"}
              onClick={() => toggleWatchlist.mutate()}
              className={cn(
                report.on_watchlist && "bg-primary text-primary-foreground"
              )}
            >
              <Star className={cn("w-4 h-4 mr-2", report.on_watchlist && "fill-current")} />
              {report.on_watchlist ? "On Watchlist" : "Add to Watchlist"}
            </Button>
            <Button className="bg-primary hover:bg-primary/90">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>

        {/* Property Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-muted-foreground">Guide Price</p>
            <p className="text-xl font-bold text-foreground">{analysis.propertyDetails.guidePrice}</p>
          </div>
          <div className="text-right md:text-left">
            <p className="text-sm text-muted-foreground">Auction Date</p>
            <p className="font-semibold text-foreground">{analysis.propertyDetails.auctionDate}</p>
            <p className="text-xs text-muted-foreground">{analysis.propertyDetails.auctionDateNote}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 py-4 border-y border-border">
          <div>
            <p className="text-sm text-muted-foreground">Property Type</p>
            <p className="font-medium text-foreground">{analysis.propertyDetails.propertyType}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Bedrooms</p>
            <p className="font-medium text-foreground">{analysis.propertyDetails.bedrooms}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Bathrooms</p>
            <p className="font-medium text-foreground">{analysis.propertyDetails.bathrooms}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Size</p>
            <p className="font-medium text-foreground">{analysis.propertyDetails.size}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Tenure</p>
            <p className="font-medium text-foreground">{analysis.propertyDetails.tenure}</p>
          </div>
        </div>

        {/* Asta Deal Score */}
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <span className="font-semibold text-primary">Asta Deal Score™</span>
          <div className="flex items-center gap-3">
            <span className="text-primary font-bold text-lg">
              {analysis.astaScore.score}/{analysis.astaScore.maxScore}
            </span>
            <span className="text-sm text-primary/80">{analysis.astaScore.description}</span>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
          <CheckCircle className="w-4 h-4" />
          <span>Not legal advice – your smarter due-diligence co-pilot</span>
        </div>

        {/* Report Sections */}
        <div className="bg-card border border-border rounded-lg p-6">
          {/* Title */}
          <ReportSection title="Title">
            <p className="text-sm text-muted-foreground mb-2">
              {analysis.title.issues.length} potential issue{analysis.title.issues.length !== 1 ? 's' : ''} found
            </p>
            <div className="space-y-2">
              {analysis.title.issues.map((issue, i) => (
                <IssueBadge key={i} issue={issue} />
              ))}
            </div>
            {analysis.title.description && (
              <p className="text-sm text-muted-foreground mt-3 bg-muted/50 p-3 rounded-lg">
                {analysis.title.description}
              </p>
            )}
          </ReportSection>

          {/* Ownership */}
          <ReportSection title="Ownership">
            <p className="text-sm text-muted-foreground mb-2">
              {analysis.ownership.issues.length} potential issue{analysis.ownership.issues.length !== 1 ? 's' : ''} found
            </p>
            <div className="space-y-2">
              {analysis.ownership.issues.map((issue, i) => (
                <IssueBadge key={i} issue={issue} />
              ))}
            </div>
          </ReportSection>

          {/* Charges and Money */}
          <ReportSection 
            title="Charges & Money" 
            rightContent={
              <span className="text-sm text-muted-foreground">
                {analysis.chargesAndMoney.charges.length} Charges Found
              </span>
            }
          >
            <div className="overflow-x-auto mb-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 font-medium text-muted-foreground">Type</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Name</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Paid Off</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.chargesAndMoney.charges.map((charge, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="py-2 text-foreground">{charge.type}</td>
                      <td className="py-2 text-foreground">{charge.name}</td>
                      <td className="py-2 text-foreground">{charge.amount}</td>
                      <td className="py-2 text-foreground">{charge.date}</td>
                      <td className="py-2 text-foreground">{charge.paidOff}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              {analysis.chargesAndMoney.issues.length} potential issue{analysis.chargesAndMoney.issues.length !== 1 ? 's' : ''} found
            </p>
            <div className="space-y-2">
              {analysis.chargesAndMoney.issues.map((issue, i) => (
                <IssueBadge key={i} issue={issue} />
              ))}
            </div>
          </ReportSection>

          {/* Covenants */}
          <ReportSection title="Covenants" dotColor="green" rightContent={
            <span className="text-foreground">{analysis.covenants || 'Unknown'}</span>
          }>
            <div />
          </ReportSection>

          {/* Tenure */}
          <ReportSection title="Tenure" dotColor="green" rightContent={
            <span className="text-foreground">{analysis.tenure || 'Unknown'}</span>
          }>
            <div />
          </ReportSection>

          {/* Planning And Development */}
          <ReportSection title="Planning And Development">
            <p className="text-sm text-muted-foreground mb-2">
              {analysis.planningAndDevelopment.issues.length} potential issue{analysis.planningAndDevelopment.issues.length !== 1 ? 's' : ''} found
            </p>
            <div className="space-y-2">
              {analysis.planningAndDevelopment.issues.map((issue, i) => (
                <IssueBadge key={i} issue={issue} />
              ))}
            </div>
          </ReportSection>

          {/* Completion & Penalty Risks */}
          <ReportSection title="Completion & Penalty Risks">
            <p className="text-sm text-muted-foreground mb-2">
              {analysis.completionAndPenaltyRisks.issues.length} potential issue{analysis.completionAndPenaltyRisks.issues.length !== 1 ? 's' : ''} found
            </p>
            <div className="space-y-2">
              {analysis.completionAndPenaltyRisks.issues.map((issue, i) => (
                <IssueBadge key={i} issue={issue} />
              ))}
            </div>
          </ReportSection>

          {/* Physical & Environmental Risks */}
          <ReportSection title="Physical & Environmental Risks">
            <p className="text-sm text-muted-foreground mb-2">
              {analysis.physicalAndEnvironmentalRisks.issues.length} potential issue{analysis.physicalAndEnvironmentalRisks.issues.length !== 1 ? 's' : ''} found
            </p>
            <div className="space-y-2">
              {analysis.physicalAndEnvironmentalRisks.issues.map((issue, i) => (
                <IssueBadge key={i} issue={issue} />
              ))}
            </div>
          </ReportSection>

          {/* Special Conditions & Amendments */}
          <ReportSection title="Special Conditions & Amendments">
            <p className="text-sm text-muted-foreground mb-2">
              {analysis.specialConditionsAndAmenities.issues.length} potential issue{analysis.specialConditionsAndAmenities.issues.length !== 1 ? 's' : ''} found
            </p>
            <div className="space-y-2">
              {analysis.specialConditionsAndAmenities.issues.map((issue, i) => (
                <IssueBadge key={i} issue={issue} />
              ))}
            </div>
          </ReportSection>
        </div>

        {/* Documents */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Documents</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 font-medium text-muted-foreground">Property Address</th>
                  <th className="text-left py-3 font-medium text-muted-foreground">Pages</th>
                  <th className="text-left py-3 font-medium text-muted-foreground">Key Findings Detected</th>
                </tr>
              </thead>
              <tbody>
                {analysis.documents.map((doc, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="py-3 text-foreground">{doc.name}</td>
                    <td className="py-3 text-foreground">{doc.pages}</td>
                    <td className="py-3 text-muted-foreground">{doc.keyFindings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ReportDetail;
