import { useState } from "react";
import { ReportIssue } from "@/lib/demoReportData";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { RecommendationBox } from "./RecommendationBox";

interface IssuesListProps {
  issues: ReportIssue[];
  emptyMessage?: string;
}

const INITIAL_VISIBLE_COUNT = 5;

export function IssuesList({ issues, emptyMessage = "No issues found" }: IssuesListProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (issues.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const shouldShowToggle = issues.length > INITIAL_VISIBLE_COUNT;
  const visibleIssues = isExpanded || !shouldShowToggle 
    ? issues 
    : issues.slice(0, INITIAL_VISIBLE_COUNT);
  const remainingCount = issues.length - INITIAL_VISIBLE_COUNT;

  return (
    <div className="space-y-2">
      {visibleIssues.map((issue, index) => (
        <IssueBadge key={`${issue.severity}-${index}-${issue.text.slice(0, 20)}`} issue={issue} />
      ))}
      {shouldShowToggle && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full h-8 text-xs text-muted-foreground hover:text-foreground"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-3 h-3 mr-1" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3 mr-1" />
              Show {remainingCount} more {remainingCount === 1 ? "issue" : "issues"}
            </>
          )}
        </Button>
      )}
    </div>
  );
}

function IssueBadge({ issue }: { issue: ReportIssue }) {
  const severityStyles = {
    critical: {
      bg: "bg-destructive/10",
      border: "border-destructive/20",
      dot: "bg-destructive",
    },
    warning: {
      bg: "bg-warning/10",
      border: "border-warning/20",
      dot: "bg-warning",
    },
    info: {
      bg: "bg-primary/10",
      border: "border-primary/20",
      dot: "bg-primary",
    },
  } as const;

  const styles = severityStyles[issue.severity];

  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-3.5 rounded-md border",
        styles.bg,
        styles.border
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn("w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0", styles.dot)} />
        <span className="text-sm text-foreground flex-1 leading-normal">{issue.text}</span>
      </div>
      {issue.recommendation && (
        <RecommendationBox recommendation={issue.recommendation} severity={issue.severity} />
      )}
    </div>
  );
}
