import { cn } from "@/lib/utils";
import { Lightbulb } from "lucide-react";

interface RecommendationBoxProps {
  recommendation: string;
  severity: "critical" | "warning" | "info";
  className?: string;
}

export function RecommendationBox({ recommendation, className }: RecommendationBoxProps) {
  return (
    <div className={cn("mt-2 ml-12 flex items-start gap-2", className)}>
      <Lightbulb className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
      <p className="text-xs text-muted-foreground leading-relaxed">{recommendation}</p>
    </div>
  );
}
