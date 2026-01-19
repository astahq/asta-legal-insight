import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GitCompare, Home, FileText, Loader2 } from "lucide-react";
import { getDisplayAddress } from "@/lib/utils";

const SECTION_LABELS: Record<string, string> = {
  title: "Title",
  ownership: "Ownership",
  charges_and_money: "Charges and Money",
  covenants: "Covenants",
  tenure: "Tenure",
  planning_and_development: "Planning and Development",
  completion_penalty_risks: "Completion & Penalty Risks",
  physical_environmental_risks: "Physical & Environmental Risks",
  special_conditions_amenities: "Special Conditions & Amenities",
};

const SECTION_ORDER = [
  "title",
  "ownership",
  "charges_and_money",
  "covenants",
  "tenure",
  "planning_and_development",
  "completion_penalty_risks",
  "physical_environmental_risks",
  "special_conditions_amenities",
];

interface Report {
  id: string;
  property_address: string;
  property_value: number | null;
  status: string;
  created_at: string;
}

interface ReportSection {
  id: string;
  report_id: string;
  section_key: string;
  content: string;
}

export default function CompareProperties() {
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [isComparing, setIsComparing] = useState(false);

  // Fetch all completed reports
  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ["reports-for-compare"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id, property_address, property_value, status, created_at")
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Report[];
    },
  });

  // Fetch sections for selected reports
  const { data: sections, isLoading: sectionsLoading } = useQuery({
    queryKey: ["report-sections-compare", selectedReports],
    queryFn: async () => {
      if (selectedReports.length === 0) return [];

      const { data, error } = await supabase
        .from("report_sections")
        .select("id, report_id, section_key, content")
        .in("report_id", selectedReports);

      if (error) throw error;
      return data as ReportSection[];
    },
    enabled: isComparing && selectedReports.length > 0,
  });

  const toggleReport = (reportId: string) => {
    setSelectedReports((prev) =>
      prev.includes(reportId)
        ? prev.filter((id) => id !== reportId)
        : [...prev, reportId]
    );
  };

  const handleCompare = () => {
    if (selectedReports.length >= 2) {
      setIsComparing(true);
    }
  };

  const handleBack = () => {
    setIsComparing(false);
  };

  const getSectionContent = (reportId: string, sectionKey: string) => {
    const section = sections?.find(
      (s) => s.report_id === reportId && s.section_key === sectionKey
    );
    return section?.content || "No data available";
  };

  const selectedReportData = reports?.filter((r) =>
    selectedReports.includes(r.id)
  );

  if (reportsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <GitCompare className="w-6 h-6" />
              Compare Properties
            </h1>
            <p className="text-muted-foreground mt-1">
              {isComparing
                ? "Side-by-side comparison of selected properties"
                : "Select properties to compare their analysis reports"}
            </p>
          </div>
          {isComparing && (
            <Button variant="outline" onClick={handleBack}>
              Back to Selection
            </Button>
          )}
        </div>

        {!isComparing ? (
          // Selection View
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Home className="w-5 h-5" />
                  Select Properties to Compare
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reports && reports.length > 0 ? (
                  <div className="space-y-3">
                    {reports.map((report) => (
                      <div
                        key={report.id}
                        className={`flex items-center gap-3 p-4 rounded-lg border transition-colors cursor-pointer ${
                          selectedReports.includes(report.id)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/50"
                        }`}
                        onClick={() => toggleReport(report.id)}
                      >
                        <Checkbox
                          checked={selectedReports.includes(report.id)}
                          onCheckedChange={() => toggleReport(report.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate" title={report.property_address}>
                            {getDisplayAddress(report.property_address, 80)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {report.property_value
                              ? `£${report.property_value.toLocaleString()}`
                              : "Value not set"}{" "}
                            • Created{" "}
                            {new Date(report.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="secondary">{report.status}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No completed reports available for comparison.</p>
                    <p className="text-sm">
                      Upload and analyse properties first.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedReports.length > 0 && (
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {selectedReports.length}
                  </span>{" "}
                  properties selected
                </p>
                <Button
                  onClick={handleCompare}
                  disabled={selectedReports.length < 2}
                >
                  <GitCompare className="w-4 h-4 mr-2" />
                  Compare {selectedReports.length} Properties
                </Button>
              </div>
            )}
          </div>
        ) : (
          // Comparison View
          <div className="space-y-4">
            {sectionsLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Property Headers */}
                <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${selectedReportData?.length || 0}, 1fr)` }}>
                  <div className="font-medium text-muted-foreground">Section</div>
                  {selectedReportData?.map((report) => (
                    <Card key={report.id} className="p-3 min-w-0">
                      <p className="font-semibold text-foreground truncate" title={report.property_address}>
                        {getDisplayAddress(report.property_address, 80)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {report.property_value
                          ? `£${report.property_value.toLocaleString()}`
                          : "Value not set"}
                      </p>
                    </Card>
                  ))}
                </div>

                {/* Section Comparisons */}
                <ScrollArea className="h-[calc(100vh-300px)]">
                  <div className="space-y-4">
                    {SECTION_ORDER.map((sectionKey) => (
                      <div
                        key={sectionKey}
                        className="grid gap-4"
                        style={{ gridTemplateColumns: `200px repeat(${selectedReportData?.length || 0}, 1fr)` }}
                      >
                        <div className="font-medium text-foreground py-2">
                          {SECTION_LABELS[sectionKey]}
                        </div>
                        {selectedReportData?.map((report) => (
                          <Card key={`${report.id}-${sectionKey}`} className="p-4">
                            <p className="text-sm text-foreground whitespace-pre-wrap">
                              {getSectionContent(report.id, sectionKey)}
                            </p>
                          </Card>
                        ))}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
