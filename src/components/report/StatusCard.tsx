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
        "border border-border/60 bg-muted/30 p-3.5 rounded-lg",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 text-muted-foreground [&>svg]:w-4 [&>svg]:h-4">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="text-sm text-foreground font-medium mt-0.5">{value}</p>
        </div>
        <CheckCircle className="w-4 h-4 flex-shrink-0 text-success/60" />
      </div>
    </div>
  );
}
