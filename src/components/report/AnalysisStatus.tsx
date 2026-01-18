import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AnalysisStatusProps {
  status: "processing" | "failed";
  onRetry?: () => void;
  isRetrying?: boolean;
  requiresAuth?: boolean;
}

export function AnalysisStatus({
  status,
  onRetry,
  isRetrying,
  requiresAuth,
}: AnalysisStatusProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-start gap-3">
        {status === "failed" ? (
          <>
            <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <h2 className="text-base font-semibold text-foreground">Analysis failed</h2>
              <p className="text-sm text-muted-foreground mt-1">
                We couldn't process this legal pack yet. You can retry the analysis.
              </p>
              {onRetry && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={onRetry} disabled={isRetrying || requiresAuth}>
                    {isRetrying ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      "Retry analysis"
                    )}
                  </Button>
                  {requiresAuth && (
                    <span className="text-sm text-muted-foreground self-center">
                      Sign in to retry.
                    </span>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Loader2 className="w-5 h-5 text-primary mt-0.5 animate-spin" />
            <div className="flex-1">
              <h2 className="text-base font-semibold text-foreground">Analysis in progress</h2>
              <p className="text-sm text-muted-foreground mt-1">
                We're extracting text and running the AI. This can take a few minutes.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
