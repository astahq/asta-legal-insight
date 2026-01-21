import { Loader2, AlertCircle, Mail, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  if (status === "failed") {
    return (
      <Card className="border-destructive/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
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
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Alert className="border-primary/50 bg-primary/5">
        <Loader2 className="h-5 w-5 text-primary animate-spin" />
        <AlertTitle className="text-base font-semibold">Analysis in Progress</AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <p className="text-sm">
            We're extracting text from your documents and running AI analysis. This process typically takes <strong>5-10 minutes</strong> depending on the size and complexity of your legal pack.
          </p>
          <div className="flex items-start gap-2 mt-3 pt-3 border-t border-primary/20">
            <Mail className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">We'll notify you by email</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Once your analysis is complete, we'll send you an email with a direct link to view your report. You can safely close this page.
              </p>
            </div>
          </div>
        </AlertDescription>
      </Alert>
      
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground mb-1">What happens next?</h3>
              <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
                <li>AI extracts and analyzes all documents in your legal pack</li>
                <li>Identifies red flags, restrictive covenants, and key clauses</li>
                <li>Generates a comprehensive risk report</li>
                <li>You'll receive an email notification when it's ready</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
