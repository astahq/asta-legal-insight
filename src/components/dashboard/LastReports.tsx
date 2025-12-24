import { FileText, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Report {
  id: string;
  propertyAddress: string;
  dateSubmitted: string;
  status: "processing" | "completed";
}

const reports: Report[] = [
  {
    id: "1",
    propertyAddress: "Eight Acre Main Street, Leicestershire, LE16 8DT",
    dateSubmitted: "02/12/2025",
    status: "processing",
  },
  {
    id: "2",
    propertyAddress: "9 Fallowfield Close, Hove, BN3 7NP",
    dateSubmitted: "12/10/2025",
    status: "completed",
  },
  {
    id: "3",
    propertyAddress: "42B Luton Road, Chatham, Kent, ME4 5AA",
    dateSubmitted: "12/10/2025",
    status: "completed",
  },
  {
    id: "4",
    propertyAddress: "23 Penallt Road, Llanelli, Dyfed, SA15 1HF",
    dateSubmitted: "12/10/2025",
    status: "completed",
  },
];

function StatusBadge({ status }: { status: Report["status"] }) {
  return (
    <span
      className={cn(
        "status-badge",
        status === "processing" && "status-processing",
        status === "completed" && "status-completed"
      )}
    >
      {status === "processing" ? (
        <>
          <Clock className="w-3 h-3" />
          Processing
        </>
      ) : (
        <>
          <CheckCircle2 className="w-3 h-3" />
          Completed
        </>
      )}
    </span>
  );
}

export function LastReports() {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-muted-foreground" />
        <h3 className="font-semibold text-foreground">Last Reports</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="table-header text-left pb-3">Property Address</th>
              <th className="table-header text-left pb-3">Date Submitted</th>
              <th className="table-header text-left pb-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id} className="border-b border-border last:border-0">
                <td className="py-4 text-sm text-foreground">{report.propertyAddress}</td>
                <td className="py-4 text-sm text-muted-foreground">{report.dateSubmitted}</td>
                <td className="py-4">
                  <StatusBadge status={report.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
