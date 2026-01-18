import { cn } from "@/lib/utils";

interface RecommendationBoxProps {
  recommendation: string;
  severity: "critical" | "warning" | "info";
  className?: string;
}

export function RecommendationBox({ recommendation, severity, className }: RecommendationBoxProps) {
  const severityStyles = {
    critical: "bg-red-50/50 border-l-[2px] border-l-red-400 text-red-800 rounded-none",
    warning: "bg-amber-50/40 border-l-[2px] border-l-amber-400 text-amber-800 rounded-none",
    info: "bg-orange-50/40 border-l-[2px] border-l-orange-400 text-orange-800 rounded-none",
  } as const;

  return (
    <div
      className={cn(
        "ml-6 mt-1 p-3 rounded-md",
        severityStyles[severity],
        className
      )}
    >
      <p className="text-xs font-semibold uppercase mb-2 opacity-60 tracking-wide">RECOMMENDATION</p>
      <p className="text-sm leading-normal">{recommendation}</p>
    </div>
  );
}
