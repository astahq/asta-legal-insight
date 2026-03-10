import { useState } from "react";
import { ReportIssue } from "@/lib/demoReportData";
import { cn } from "@/lib/utils";
import { AlertTriangle, ShieldAlert, Info, ChevronDown, Lightbulb } from "lucide-react";



interface IssuesListProps {
  issues: ReportIssue[];
  emptyMessage?: string;
}

export function IssuesList({ issues, emptyMessage = "No issues found" }: IssuesListProps) {
  if (issues.length === 0) {
    return (
      <div className="flex items-center gap-2 py-2">
        <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <Info className="w-3 h-3 text-emerald-500" />
        </div>
        <p className="text-[13px] text-muted-foreground/70">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {issues.map((issue, index) => (
        <IssueBadge key={`${issue.severity}-${index}`} issue={issue} />
      ))}
    </div>
  );
}

function IssueBadge({ issue }: { issue: ReportIssue }) {
  const text = issue.text || issue.description || "";

  const config = {
    critical: {
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      iconColor: "text-destructive",
      bgColor: "bg-destructive/[0.03]",
      borderColor: "border-destructive/12",
      label: "Critical",
      labelColor: "text-destructive",
    },
    warning: {
      icon: <ShieldAlert className="w-3.5 h-3.5" />,
      iconColor: "text-amber-600",
      bgColor: "bg-amber-500/[0.03]",
      borderColor: "border-amber-500/12",
      label: "Warning",
      labelColor: "text-amber-600",
    },
    info: {
      icon: <Info className="w-3.5 h-3.5" />,
      iconColor: "text-blue-500",
      bgColor: "bg-blue-500/[0.03]",
      borderColor: "border-blue-500/10",
      label: "Info",
      labelColor: "text-blue-500",
    },
  }[issue.severity];

  return (
    <div className={cn("rounded-lg border p-3.5", config.bgColor, config.borderColor)}>
      <div className="flex items-start gap-3">
        <div className={cn("flex-shrink-0 mt-0.5 flex items-center justify-center w-6 h-6 rounded-full", config.bgColor, config.iconColor)}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-[10px] font-semibold uppercase tracking-wider", config.labelColor)}>
              {config.label}
            </span>
          </div>
          <p className="text-[13px] text-foreground/80 leading-[1.65]">
            {text}
          </p>
        </div>
      </div>

      {issue.recommendation && (
        <RecommendationRow recommendation={issue.recommendation} />
      )}
    </div>
  );
}

function RecommendationRow({ recommendation }: { recommendation: string }) {
  const [showRec, setShowRec] = useState(true);

  return (
    <div className="mt-2.5 ml-9">
      <button
        type="button"
        onClick={() => setShowRec(!showRec)}
        className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/60 hover:text-muted-foreground/80 font-medium transition-colors cursor-pointer"
      >
        <Lightbulb className="w-3 h-3" />
        Recommendation
        <ChevronDown className={cn("w-3 h-3 transition-transform", showRec && "rotate-180")} />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-200 ease-in-out",
          showRec ? "max-h-[500px] opacity-100 mt-2" : "max-h-0 opacity-0 mt-0"
        )}
      >
        <div className="rounded-md bg-muted/40 border border-border/30 px-3 py-2.5">
          <p className="text-[12px] text-foreground/65 leading-[1.65]">
            {recommendation}
          </p>
        </div>
      </div>
    </div>
  );
}
