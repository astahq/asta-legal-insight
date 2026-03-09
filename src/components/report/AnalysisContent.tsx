import { useMemo } from "react";
import { ReportAnalysis } from "@/lib/demoReportData";
import { ReportSection } from "./ReportSection";
import { IssuesList } from "./IssuesList";
import { ChargesTable } from "./ChargesTable";
import { DocumentsTable } from "./DocumentsTable";
import { Card, CardContent } from "@/components/ui/card";

interface AnalysisContentProps {
  analysis: ReportAnalysis;
}

function RiskSummary({ analysis }: { analysis: ReportAnalysis }) {
  const counts = useMemo(() => {
    const allIssues = [
      ...analysis.title.issues,
      ...analysis.ownership.issues,
      ...analysis.chargesAndMoney.issues,
      ...analysis.planningAndDevelopment.issues,
      ...analysis.completionAndPenaltyRisks.issues,
      ...analysis.physicalAndEnvironmentalRisks.issues,
      ...analysis.specialConditionsAndAmenities.issues,
    ];
    return {
      critical: allIssues.filter(i => i.severity === "critical").length,
      warning: allIssues.filter(i => i.severity === "warning").length,
      info: allIssues.filter(i => i.severity === "info").length,
      total: allIssues.length,
    };
  }, [analysis]);

  return (
    <div className="flex items-baseline gap-6 px-1 py-1">
      <span className="text-[11px] text-muted-foreground/60 uppercase tracking-wider">Summary</span>
      <div className="flex items-baseline gap-4">
        <span className="text-[13px] text-foreground/80">
          <span className="font-semibold text-destructive tabular-nums">{counts.critical}</span>
          <span className="text-muted-foreground/60 ml-1">critical</span>
        </span>
        <span className="text-muted-foreground/35">/</span>
        <span className="text-[13px] text-foreground/80">
          <span className="font-semibold text-warning tabular-nums">{counts.warning}</span>
          <span className="text-muted-foreground/60 ml-1">warnings</span>
        </span>
        <span className="text-muted-foreground/35">/</span>
        <span className="text-[13px] text-foreground/80">
          <span className="font-semibold text-foreground/65 tabular-nums">{counts.info}</span>
          <span className="text-muted-foreground/60 ml-1">info</span>
        </span>
      </div>
    </div>
  );
}

export function AnalysisContent({ analysis }: AnalysisContentProps) {
  return (
    <>
      <RiskSummary analysis={analysis} />

      <Card>
        <CardContent className="px-5 py-2 md:px-7">
          <ReportSection title="Title" issueCount={analysis.title.issues.length} sectionNumber={1}>
            {analysis.title.description && analysis.title.description !== "Unknown" && (
              <p className="text-[13px] text-muted-foreground/60 mb-4 leading-[1.7]">
                {analysis.title.description}
              </p>
            )}
            <IssuesList issues={analysis.title.issues} emptyMessage="No title issues identified" />
          </ReportSection>

          <ReportSection title="Ownership" issueCount={analysis.ownership.issues.length} sectionNumber={2}>
            <IssuesList issues={analysis.ownership.issues} emptyMessage="No ownership issues identified" />
          </ReportSection>

          <ReportSection
            title="Charges & Money"
            issueCount={analysis.chargesAndMoney.issues.length}
            sectionNumber={3}
            rightContent={
              <span className="text-[11px] text-muted-foreground/55">
                {analysis.chargesAndMoney.charges.length} charges
              </span>
            }
          >
            {analysis.chargesAndMoney.charges.length > 0 && (
              <div className="overflow-x-auto mb-4 -mx-5 md:-mx-7">
                <div className="px-5 md:px-7">
                  <table className="w-full text-[13px] min-w-[500px]">
                    <thead>
                      <tr className="border-b border-border/30">
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground/60 text-[10px] uppercase tracking-wider">Type</th>
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground/60 text-[10px] uppercase tracking-wider">Name</th>
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground/60 text-[10px] uppercase tracking-wider">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <ChargesTable charges={analysis.chargesAndMoney.charges} />
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <IssuesList
              issues={analysis.chargesAndMoney.issues}
              emptyMessage="No financial issues identified"
            />
          </ReportSection>

          {/* Covenants & Tenure */}
          <div className="py-6 border-b border-border/30">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="text-[10px] font-medium text-muted-foreground/45 tabular-nums">04</span>
                  <h3 className="text-[13px] font-semibold text-foreground/90 uppercase tracking-wider">Covenants</h3>
                </div>
                <p className="text-[13px] text-foreground/80 leading-[1.7]">{analysis.covenants || "Unknown"}</p>
              </div>
              <div>
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="text-[10px] font-medium text-muted-foreground/45 tabular-nums">05</span>
                  <h3 className="text-[13px] font-semibold text-foreground/90 uppercase tracking-wider">Tenure</h3>
                </div>
                <p className="text-[13px] text-foreground/80 leading-[1.7]">{analysis.tenure || "Unknown"}</p>
              </div>
            </div>
          </div>

          <ReportSection
            title="Planning & Development"
            issueCount={analysis.planningAndDevelopment.issues.length}
            sectionNumber={6}
          >
            <IssuesList issues={analysis.planningAndDevelopment.issues} emptyMessage="No planning issues identified" />
          </ReportSection>

          <ReportSection
            title="Completion & Penalty Risks"
            issueCount={analysis.completionAndPenaltyRisks.issues.length}
            sectionNumber={7}
          >
            <IssuesList issues={analysis.completionAndPenaltyRisks.issues} emptyMessage="No completion risks identified" />
          </ReportSection>

          <ReportSection
            title="Environmental Risks"
            issueCount={analysis.physicalAndEnvironmentalRisks.issues.length}
            sectionNumber={8}
          >
            <IssuesList issues={analysis.physicalAndEnvironmentalRisks.issues} emptyMessage="No environmental risks identified" />
          </ReportSection>

          <ReportSection
            title="Special Conditions"
            issueCount={analysis.specialConditionsAndAmenities.issues.length}
            sectionNumber={9}
          >
            <IssuesList issues={analysis.specialConditionsAndAmenities.issues} emptyMessage="No special conditions identified" />
          </ReportSection>

          {/* Documents */}
          <div className="py-6 last:pb-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-medium text-muted-foreground/45 tabular-nums">10</span>
                <h3 className="text-[13px] font-semibold text-foreground/90 uppercase tracking-wider">Documents</h3>
                <span className="text-[11px] text-muted-foreground/55 tabular-nums">
                  ({analysis.documents.length})
                </span>
              </div>
            </div>
            <div className="overflow-x-auto -mx-5 md:-mx-7">
              <div className="px-5 md:px-7">
                <table className="w-full text-[13px] min-w-[600px]">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground/60 text-[10px] uppercase tracking-wider">Document Name</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground/60 text-[10px] uppercase tracking-wider">Pages</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground/60 text-[10px] uppercase tracking-wider">Key Findings</th>
                    </tr>
                  </thead>
                  <tbody>
                    <DocumentsTable documents={analysis.documents} />
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
