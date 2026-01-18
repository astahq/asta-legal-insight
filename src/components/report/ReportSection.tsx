interface ReportSectionProps {
  title: string;
  children: React.ReactNode;
  rightContent?: React.ReactNode;
  issueCount?: number;
}

export function ReportSection({
  title,
  children,
  rightContent,
  issueCount,
}: ReportSectionProps) {
  return (
    <div className="py-6 border-b border-border last:border-b-0 last:pb-0">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-slate-900 tracking-wide relative inline-block">
          <span className="relative z-10">{title}</span>
          <span className="absolute bottom-0 left-0 right-0 h-[0.8px] bg-neutral-400/40 -z-0"></span>
        </h3>
        {rightContent}
      </div>
      {issueCount !== undefined && issueCount > 0 && (
        <p className="text-sm font-medium text-muted-foreground mb-4">
          {issueCount} potential issue{issueCount !== 1 ? "s" : ""} found
        </p>
      )}
      <div>{children}</div>
    </div>
  );
}
