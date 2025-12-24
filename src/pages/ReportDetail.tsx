import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, Download, FileText, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { demoReportAnalysis, ReportAnalysis, ReportIssue } from "@/lib/demoReportData";
import { cn } from "@/lib/utils";
import { useState, useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

function IssueBadge({ issue }: { issue: ReportIssue }) {
  const bgColor = {
    critical: 'bg-destructive/10',
    warning: 'bg-warning/10',
    info: 'bg-primary/10',
  }[issue.severity];

  const dotColor = {
    critical: 'bg-destructive',
    warning: 'bg-warning',
    info: 'bg-primary',
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
  issueCount
}: { 
  title: string; 
  children: React.ReactNode; 
  rightContent?: React.ReactNode;
  dotColor?: 'green' | 'warning' | 'critical';
  issueCount?: number;
}) {
  const dot = dotColor ? (
    <span className={cn(
      "w-2 h-2 rounded-full",
      dotColor === 'green' && "bg-success",
      dotColor === 'warning' && "bg-warning",
      dotColor === 'critical' && "bg-destructive"
    )} />
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
          {issueCount} potential issue{issueCount !== 1 ? 's' : ''} found
        </p>
      )}
      {children}
    </div>
  );
}

const ReportDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isDemo = id === 'demo';
  const [demoWatchlist, setDemoWatchlist] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['report', id],
    queryFn: async () => {
      if (isDemo) return null;
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !isDemo,
  });

  const toggleWatchlist = useMutation({
    mutationFn: async () => {
      if (isDemo) {
        setDemoWatchlist(!demoWatchlist);
        return;
      }
      if (!report) return;
      const { error } = await supabase
        .from('reports')
        .update({ on_watchlist: !report.on_watchlist })
        .eq('id', report.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      if (!isDemo) {
        queryClient.invalidateQueries({ queryKey: ['report', id] });
        queryClient.invalidateQueries({ queryKey: ['reports'] });
        queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      }
      toast({ 
        title: (isDemo ? demoWatchlist : report?.on_watchlist) 
          ? "Removed from watchlist" 
          : "Added to watchlist" 
      });
    },
  });

  // Use demo data for demo report, or report's analysis_result
  const analysis: ReportAnalysis = isDemo 
    ? demoReportAnalysis 
    : (report?.analysis_result as unknown as ReportAnalysis) || demoReportAnalysis;

  const propertyAddress = isDemo 
    ? "22 Carslake Road" 
    : report?.property_address || "Property";

  const propertySubtitle = isDemo 
    ? "Wandsworth, London, SW15 3DP" 
    : "";

  const onWatchlist = isDemo ? demoWatchlist : report?.on_watchlist;

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    
    setIsExporting(true);
    toast({ title: "Generating PDF...", description: "Please wait while we prepare your report." });

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `${propertyAddress.replace(/[^a-zA-Z0-9]/g, '_')}_Report.pdf`;
      pdf.save(fileName);

      toast({ title: "PDF Downloaded", description: "Your report has been saved successfully." });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({ 
        title: "Export Failed", 
        description: "There was an error generating the PDF. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
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
      <div ref={reportRef} className="space-y-6 max-w-5xl bg-background p-1">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{propertyAddress}</h1>
            {propertySubtitle && (
              <p className="text-muted-foreground">{propertySubtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
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
            <Button 
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handleExportPDF}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              {isExporting ? "Exporting..." : "Download PDF"}
            </Button>
          </div>
        </div>

        {/* Price and Date Row */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Guide Price</p>
            <p className="text-3xl font-bold text-foreground">{analysis.propertyDetails.guidePrice}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Auction Date</p>
            <p className="font-semibold text-foreground">{analysis.propertyDetails.auctionDate}</p>
            <p className="text-xs text-muted-foreground">{analysis.propertyDetails.auctionDateNote}</p>
          </div>
        </div>

        {/* Property Details Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 py-4 border-y border-border">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Property Type</p>
            <p className="font-medium text-foreground">{analysis.propertyDetails.propertyType}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Bedrooms</p>
            <p className="font-medium text-foreground">{analysis.propertyDetails.bedrooms}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Bathrooms</p>
            <p className="font-medium text-foreground">{analysis.propertyDetails.bathrooms}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Size</p>
            <p className="font-medium text-foreground">{analysis.propertyDetails.size}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Tenure</p>
            <p className="font-medium text-foreground">{analysis.propertyDetails.tenure}</p>
          </div>
        </div>

        {/* Asta Deal Score */}
        <div className="bg-primary/10 rounded-lg overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4">
            <span className="font-semibold text-primary text-sm uppercase tracking-wide">Asta Deal Score™</span>
            <div className="flex items-center gap-3">
              <span className="text-primary font-bold text-xl">
                {analysis.astaScore.score}/{analysis.astaScore.maxScore}
              </span>
              <span className="text-sm text-success font-medium">{analysis.astaScore.description}</span>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="flex items-center gap-2 text-sm text-success bg-success/10 p-3 rounded-lg">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>Not legal advice – your smarter due-diligence co-pilot</span>
        </div>

        {/* Report Sections Card */}
        <div className="bg-card border border-border rounded-lg p-6">
          {/* Title */}
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

          {/* Ownership */}
          <ReportSection title="Ownership" issueCount={analysis.ownership.issues.length}>
            <div className="space-y-2">
              {analysis.ownership.issues.map((issue, i) => (
                <IssueBadge key={i} issue={issue} />
              ))}
            </div>
          </ReportSection>

          {/* Charges and Money */}
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
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Type</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Name</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Paid Off</th>
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

          {/* Covenants */}
          <ReportSection 
            title="Covenants" 
            dotColor="green" 
            rightContent={<span className="text-foreground">{analysis.covenants || 'Unknown'}</span>}
          >
            <div />
          </ReportSection>

          {/* Tenure */}
          <ReportSection 
            title="Tenure" 
            dotColor="green" 
            rightContent={<span className="text-foreground">{analysis.tenure || 'Unknown'}</span>}
          >
            <div />
          </ReportSection>

          {/* Planning And Development */}
          <ReportSection title="Planning And Development" issueCount={analysis.planningAndDevelopment.issues.length}>
            <div className="space-y-2">
              {analysis.planningAndDevelopment.issues.map((issue, i) => (
                <IssueBadge key={i} issue={issue} />
              ))}
            </div>
          </ReportSection>

          {/* Completion & Penalty Risks */}
          <ReportSection title="Completion & Penalty Risks" issueCount={analysis.completionAndPenaltyRisks.issues.length}>
            <div className="space-y-2">
              {analysis.completionAndPenaltyRisks.issues.map((issue, i) => (
                <IssueBadge key={i} issue={issue} />
              ))}
            </div>
          </ReportSection>

          {/* Physical & Environmental Risks */}
          <ReportSection title="Physical & Environmental Risks" issueCount={analysis.physicalAndEnvironmentalRisks.issues.length}>
            <div className="space-y-2">
              {analysis.physicalAndEnvironmentalRisks.issues.map((issue, i) => (
                <IssueBadge key={i} issue={issue} />
              ))}
            </div>
          </ReportSection>

          {/* Special Conditions & Amendments */}
          <ReportSection title="Special Conditions & Amendments" issueCount={analysis.specialConditionsAndAmenities.issues.length}>
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
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Property Address</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Pages</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Key Findings Detected</th>
                </tr>
              </thead>
              <tbody>
                {analysis.documents.map((doc, i) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="py-3 px-2 text-foreground">{doc.name}</td>
                    <td className="py-3 px-2 text-foreground">{doc.pages}</td>
                    <td className="py-3 px-2 text-muted-foreground">{doc.keyFindings}</td>
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