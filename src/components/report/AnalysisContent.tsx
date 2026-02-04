import { ReportAnalysis } from "@/lib/demoReportData";
import { ReportSection } from "./ReportSection";
import { IssuesList } from "./IssuesList";
import { ChargesTable } from "./ChargesTable";
import { DocumentsTable } from "./DocumentsTable";
import { StatusCard } from "./StatusCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Home, FileText } from "lucide-react";

interface AnalysisContentProps {
  analysis: ReportAnalysis;
}

export function AnalysisContent({ analysis }: AnalysisContentProps) {
  return (
    <>
      <Card>
        <CardContent className="p-6">
        <ReportSection title="Title" issueCount={analysis.title.issues.length}>
          <IssuesList issues={analysis.title.issues} emptyMessage="No title issues identified" />
          {analysis.title.description && analysis.title.description !== "Unknown" && (
            <p className="text-sm text-muted-foreground mt-3 bg-card border border-border p-3 rounded-md">
              {analysis.title.description}
            </p>
          )}
        </ReportSection>

        <ReportSection title="Ownership" issueCount={analysis.ownership.issues.length}>
          <IssuesList issues={analysis.ownership.issues} emptyMessage="No ownership issues identified" />
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
          <div className="overflow-x-auto mb-4 -mx-6">
            <div className="px-6">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-3 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                      Type
                    </th>
                    <th className="text-left py-3 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                      Name
                    </th>
                    <th className="text-left py-3 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <ChargesTable charges={analysis.chargesAndMoney.charges} />
                </tbody>
              </table>
            </div>
          </div>
          <IssuesList
            issues={analysis.chargesAndMoney.issues}
            emptyMessage="No financial issues identified"
          />
        </ReportSection>

        <ReportSection title="Covenants">
          <div className="mt-3">
            <StatusCard
              label="Covenants Status"
              value={analysis.covenants || "Unknown"}
              icon={<Shield className="w-5 h-5" />}
              variant="success"
            />
          </div>
        </ReportSection>

        <ReportSection title="Tenure">
          <div className="mt-3">
            <StatusCard
              label="Tenure Type"
              value={analysis.tenure || "Unknown"}
              icon={<Home className="w-5 h-5" />}
              variant="muted"
            />
          </div>
        </ReportSection>

        <ReportSection
          title="Planning And Development"
          issueCount={analysis.planningAndDevelopment.issues.length}
        >
          <IssuesList
            issues={analysis.planningAndDevelopment.issues}
            emptyMessage="No planning issues identified"
          />
        </ReportSection>

        <ReportSection
          title="Completion & Penalty Risks"
          issueCount={analysis.completionAndPenaltyRisks.issues.length}
        >
          <IssuesList
            issues={analysis.completionAndPenaltyRisks.issues}
            emptyMessage="No completion risks identified"
          />
        </ReportSection>

        <ReportSection
          title="Physical & Environmental Risks"
          issueCount={analysis.physicalAndEnvironmentalRisks.issues.length}
        >
          <IssuesList
            issues={analysis.physicalAndEnvironmentalRisks.issues}
            emptyMessage="No environmental risks identified"
          />
        </ReportSection>

        <ReportSection
          title="Special Conditions & Amendments"
          issueCount={analysis.specialConditionsAndAmenities.issues.length}
        >
          <IssuesList
            issues={analysis.specialConditionsAndAmenities.issues}
            emptyMessage="No special conditions identified"
          />
        </ReportSection>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-muted-foreground" />
            Documents ({analysis.documents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-6">
            <div className="px-6">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-3 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                      Document Name
                    </th>
                    <th className="text-left py-3 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                      Pages
                    </th>
                    <th className="text-left py-3 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                      Key Findings
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <DocumentsTable documents={analysis.documents} />
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
