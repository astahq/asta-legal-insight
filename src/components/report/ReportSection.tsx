import { useState, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, AlertTriangle, ShieldAlert, Info } from "lucide-react";

interface ReportSectionProps {
  title: string;
  children: React.ReactNode;
  rightContent?: React.ReactNode;
  issueCount?: number;
  sectionNumber?: number;
  icon?: ReactNode;
  defaultOpen?: boolean;
}

function SeverityPills({ issueCount }: { issueCount: number }) {
  if (issueCount === 0) return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 border border-border/40 px-2 py-0.5">
      <span className="text-[11px] font-medium text-foreground/70 tabular-nums">{issueCount}</span>
      <span className="text-[10px] text-muted-foreground/60">
        {issueCount === 1 ? "issue" : "issues"}
      </span>
    </span>
  );
}

export function ReportSection({
  title,
  children,
  rightContent,
  issueCount,
  sectionNumber,
  icon,
  defaultOpen = true,
}: ReportSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="py-5 border-b border-border/30 last:border-b-0 last:pb-0 first:pt-2">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left group cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          {icon && (
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-foreground/5 text-foreground/60 group-hover:bg-foreground/8 transition-colors">
              {icon}
            </div>
          )}
          <div className="flex items-center gap-2">
            {sectionNumber !== undefined && (
              <span className="text-[10px] font-medium text-muted-foreground/45 tabular-nums">
                {String(sectionNumber).padStart(2, "0")}
              </span>
            )}
            <h3 className="text-[13px] font-semibold text-foreground/90 uppercase tracking-wider">
              {title}
            </h3>
          </div>
          {issueCount !== undefined && <SeverityPills issueCount={issueCount} />}
        </div>
        <div className="flex items-center gap-2">
          {rightContent}
          <ChevronDown
            className={cn(
              "w-4 h-4 text-muted-foreground/40 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </div>
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isOpen ? "max-h-[5000px] opacity-100 mt-4" : "max-h-0 opacity-0 mt-0"
        )}
      >
        {children}
      </div>
    </div>
  );
}
