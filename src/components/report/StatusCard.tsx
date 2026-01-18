import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle } from "lucide-react";

interface StatusCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  variant?: "success" | "primary" | "muted";
  className?: string;
}

export function StatusCard({
  label,
  value,
  icon,
  variant = "muted",
  className,
}: StatusCardProps) {
  return (
    <div
      className={cn(
        "border border-slate-200 bg-slate-50 p-4 rounded-lg shadow-sm",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-slate-400 [&>svg]:w-5 [&>svg]:h-5">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
            {label}
          </p>
          <p className="text-sm text-slate-900 font-medium leading-relaxed">{value}</p>
        </div>
        <CheckCircle className="w-5 h-5 flex-shrink-0 text-slate-400" />
      </div>
    </div>
  );
}
