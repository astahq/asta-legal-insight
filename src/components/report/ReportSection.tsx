import { cn } from "@/lib/utils";

interface ReportSectionProps {
  title: string;
  children: React.ReactNode;
  rightContent?: React.ReactNode;
  issueCount?: number;
  sectionNumber?: number;
}

export function ReportSection({
  title,
  children,
  rightContent,
  issueCount,
  sectionNumber,
}: ReportSectionProps) {
  return (
    <div className="py-6 border-b border-border/30 last:border-b-0 last:pb-0 first:pt-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          {sectionNumber !== undefined && (
            <span className="text-[10px] font-medium text-muted-foreground/45 tabular-nums">
              {String(sectionNumber).padStart(2, "0")}
            </span>
          )}
          <h3 className="text-[13px] font-semibold text-foreground/90 uppercase tracking-wider">
            {title}
          </h3>
          {issueCount !== undefined && issueCount > 0 && (
            <span className="text-[11px] text-muted-foreground/55 tabular-nums">
              ({issueCount})
            </span>
          )}
        </div>
        {rightContent && (
          <div className="flex items-center">
            {rightContent}
          </div>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}
