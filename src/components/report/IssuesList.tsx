import { ReportIssue } from "@/lib/demoReportData";
import { cn } from "@/lib/utils";

interface IssuesListProps {
  issues: ReportIssue[];
  emptyMessage?: string;
}

export function IssuesList({ issues, emptyMessage = "No issues found" }: IssuesListProps) {
  if (issues.length === 0) {
    return (
      <p className="text-[13px] text-muted-foreground/70 py-1">{emptyMessage}</p>
    );
  }

  return (
    <div className="space-y-4">
      {issues.map((issue, index) => (
        <IssueBadge key={`${issue.severity}-${index}`} issue={issue} />
      ))}
    </div>
  );
}

function IssueBadge({ issue }: { issue: ReportIssue }) {
  const borderColor = {
    critical: "border-l-destructive/80",
    warning: "border-l-warning/70",
    info: "border-l-border",
  }[issue.severity];

  return (
    <div className={cn("border-l-2 pl-4", borderColor)}>
      <p className="text-[13px] text-foreground/80 leading-[1.7]">
        {issue.text}
      </p>
      {issue.recommendation && (
        <p className="text-[12px] text-muted-foreground/65 leading-[1.65] mt-1.5 italic">
          {issue.recommendation}
        </p>
      )}
    </div>
  );
}
