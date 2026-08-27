import { useState, useMemo, useCallback, useRef, useEffect, memo } from "react";
import {
  Upload,
  Info,
  ChevronRight,
  Pencil,
  Loader2,
  Star,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { firecrawlApi } from "@/lib/api/firecrawl";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useBilling } from "@/contexts/BillingContext";
import {
  processLegalPack,
  uploadPdfsToStorage,
} from "@/lib/api/legalPackProcessor";
import { usePostHog } from "posthog-js/react";
import { z } from "zod";
import { PaymentRequiredModal } from "@/components/billing/PaymentRequiredModal";

interface ScrapedProperty {
  title?: string;
  markdown?: string;
  metadata?: {
    title?: string;
    description?: string;
    sourceURL?: string;
  };
}

const FILE_ACCEPT_TYPES = ".pdf,.docx,.txt";
const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const PROPERTY_URL_PLACEHOLDER =
  "https://online.auctionhouse.co.uk/lot/details/...";
const DEFAULT_PROPERTY_NAME = "Property Analysis";
const DESCRIPTION_MAX_LENGTH = 100;

const validFileExtensions = [".pdf", ".docx", ".txt"];

const fileSchema = z
  .file()
  .max(MAX_FILE_SIZE_BYTES, `File size must be under ${MAX_FILE_SIZE_MB}MB`)
  .refine(
    (file) => {
      const fileName = file.name.toLowerCase();
      return validFileExtensions.some((ext) => fileName.endsWith(ext));
    },
    {
      message: `File must be PDF, DOCX, or TXT`,
    },
  );

const uploadFormSchema = z.object({
  files: z
    .array(fileSchema)
    .min(1, "At least one PDF, DOCX, or TXT file is required"),
  propertyUrl: z.url("Please enter a valid property URL").optional(),
});

type UploadFormData = z.infer<typeof uploadFormSchema>;

interface FileItemProps {
  fileName: string;
  index: number;
  onRemove: (index: number) => void;
}

const FileItem = memo(({ fileName, index, onRemove }: FileItemProps) => {
  const handleRemoveClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemove(index);
    },
    [onRemove, index],
  );

  return (
    <div className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2">
      <span className="text-sm text-foreground truncate">{fileName}</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRemoveClick}
        className="text-muted-foreground hover:text-destructive"
      >
        Remove
      </Button>
    </div>
  );
});

function extractPropertyAddress(
  scrapedData: ScrapedProperty | null,
  uploadedFiles: File[],
): string {
  if (scrapedData?.metadata?.title) {
    return scrapedData.metadata.title;
  }

  if (scrapedData?.metadata?.description) {
    return scrapedData.metadata.description.slice(0, DESCRIPTION_MAX_LENGTH);
  }

  if (uploadedFiles.length > 0) {
    return uploadedFiles[0].name.replace(/\.[^/.]+$/, "");
  }

  return DEFAULT_PROPERTY_NAME;
}

export function UploadSection() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    canProcessReport,
    isTrialActive,
    isTrialExpired,
    isPaidPlan,
    isAtLimit,
    hasUsageLimits,
    trial,
    usage,
    access,
    refreshBillingStatus,
    initializeTrial,
  } = useBilling();
  const posthog = usePostHog();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [propertyUrl, setPropertyUrl] = useState("");
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [addToWatchlist, setAddToWatchlist] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    files?: string;
    propertyUrl?: string;
  }>({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateFiles = useCallback(
    (files: File[]): { valid: File[]; errors: string[] } => {
      const valid: File[] = [];
      const errors: string[] = [];

      for (const file of files) {
        const fileName = file.name.toLowerCase();
        const isValidExtension = validFileExtensions.some((ext) =>
          fileName.endsWith(ext),
        );

        if (!isValidExtension) {
          errors.push(`${file.name}: File must be PDF, DOCX, or TXT`);
          continue;
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
          errors.push(
            `${file.name}: File size must be under ${MAX_FILE_SIZE_MB}MB`,
          );
          continue;
        }

        valid.push(file);
      }

      return { valid, errors };
    },
    [],
  );

  const processValidFiles = useCallback(
    (files: File[]) => {
      const { valid, errors } = validateFiles(files);

      if (valid.length > 0) {
        setUploadedFiles((prev) => [...prev, ...valid]);
        setValidationErrors((prev) => ({ ...prev, files: undefined }));
      }

      if (errors.length > 0) {
        toast({
          title: "Invalid files",
          description: errors.join(", "),
          variant: "destructive",
        });
      }
    },
    [validateFiles, toast],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      processValidFiles(files);
    },
    [processValidFiles],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      processValidFiles(files);

      if (e.target) {
        e.target.value = "";
      }
    },
    [processValidFiles],
  );

  const removeFile = useCallback((index: number) => {
    setUploadedFiles((prev) => {
      const newFiles = prev.filter((_, i) => i !== index);
      if (newFiles.length === 0) {
        setValidationErrors((prevErrors) => ({
          ...prevErrors,
          files: undefined,
        }));
      }
      return newFiles;
    });
  }, []);

  const handleUploadZoneClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const urlValidationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setPropertyUrl(value);

      if (urlValidationTimeoutRef.current) {
        clearTimeout(urlValidationTimeoutRef.current);
      }

      if (!value.trim()) {
        setValidationErrors((prev) => ({ ...prev, propertyUrl: undefined }));
        return;
      }

      urlValidationTimeoutRef.current = setTimeout(() => {
        try {
          new URL(value);
          setValidationErrors((prev) => ({ ...prev, propertyUrl: undefined }));
        } catch {
          setValidationErrors((prev) => ({
            ...prev,
            propertyUrl: "Please enter a valid URL",
          }));
        }
      }, 300);
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (urlValidationTimeoutRef.current) {
        clearTimeout(urlValidationTimeoutRef.current);
      }
    };
  }, []);

  const handleUrlBlur = useCallback(() => {
    setIsEditingUrl(false);
  }, []);

  const handleUrlKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        setIsEditingUrl(false);
      }
    },
    [],
  );

  const handleUrlDisplayClick = useCallback(() => {
    if (!isSubmitting) {
      setIsEditingUrl(true);
    }
  }, [isSubmitting]);

  const handleWatchlistChange = useCallback((checked: boolean) => {
    setAddToWatchlist(checked);
  }, []);

  const isFormValid = () => {
    if (uploadedFiles.length === 0) return false;
    if (!propertyUrl.trim()) return true;

    try {
      new URL(propertyUrl.trim());
      return true;
    } catch {
      return false;
    }
  };

  const isButtonDisabled = isSubmitting || !isFormValid();

  const buttonContent = useMemo(
    () =>
      isSubmitting ? (
        <>
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          Creating report...
        </>
      ) : (
        <>
          Analysis Documents
          <ChevronRight className="w-5 h-5 ml-2" />
        </>
      ),
    [isSubmitting],
  );

  const scrapePropertyUrl = async (
    url: string,
  ): Promise<ScrapedProperty | null> => {
    try {
      const response = await firecrawlApi.scrape(url, {
        formats: ["markdown"],
        onlyMainContent: true,
      });

      if (response.success) {
        const data = response.data || response;
        return {
          markdown: data.markdown || data.data?.markdown,
          metadata: data.metadata || data.data?.metadata,
        };
      }
      return null;
    } catch {
      return null;
    }
  };

  const processInBackground = async (
    reportId: string,
    userId: string,
    files: File[],
    url: string,
  ) => {
    try {
      const [filePaths, scrapedData] = await Promise.all([
        files.length > 0
          ? uploadPdfsToStorage(files, userId)
          : Promise.resolve([]),
        url.trim()
          ? scrapePropertyUrl(url).catch(() => null)
          : Promise.resolve(null),
      ]);

      if (filePaths.length > 0 || scrapedData) {
        const updateData: Record<string, unknown> = {};
        if (filePaths.length > 0) {
          updateData.file_paths = filePaths;
        }
        if (scrapedData) {
          updateData.scraped_data = scrapedData;
        }
        await supabase.from("reports").update(updateData).eq("id", reportId);
      }

      await processLegalPack({
        reportId,
        userId,
        url: url || undefined,
      });
    } catch (error) {
      await supabase
        .from("reports")
        .update({ status: "failed" })
        .eq("id", reportId);

      posthog.capture("upload_section_background_processing_failed", {
        report_id: reportId,
        error_message:
          error instanceof Error
            ? error.message
            : "Background processing failed",
      });
    }
  };

  const handleAnalyse = async () => {
    posthog.capture("upload_section_new_property_analysis_button_clicked", {
      button_name: "New Property Analysis",
    });

    const formData: UploadFormData = {
      files: uploadedFiles,
      propertyUrl: propertyUrl.trim() || undefined,
    };

    try {
      uploadFormSchema.parse(formData);
      setValidationErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: { files?: string; propertyUrl?: string } = {};

        error.issues.forEach((err) => {
          if (err.path[0] === "files") {
            errors.files = err.message;
          } else if (err.path[0] === "propertyUrl") {
            errors.propertyUrl = err.message;
          }
        });

        setValidationErrors(errors);

        toast({
          title: "Validation Error",
          description: error.issues[0]?.message || "Please check your inputs",
          variant: "destructive",
        });
      }
      return;
    }

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to analyse documents.",
        variant: "destructive",
      });
      return;
    }

    if (!access) {
      try {
        await initializeTrial();
        await refreshBillingStatus();
      } catch (error) {
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to initialize trial. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }

    if (!canProcessReport || isAtLimit) {
      setShowPaymentModal(true);

      posthog.capture("upload_section_payment_required", {
        is_trial: isTrialActive,
        is_trial_expired: isTrialExpired,
        is_paid_plan: isPaidPlan,
        is_at_limit: isAtLimit,
        trial_usage_remaining: trial?.usageRemaining ?? 0,
        usage_remaining: usage?.remaining ?? 0,
        plan_id: access?.planId ?? "none",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const reportId = crypto.randomUUID();
      const propertyAddress = extractPropertyAddress(null, uploadedFiles);

      const insertData = {
        id: reportId,
        property_address: propertyAddress,
        property_url: propertyUrl || null,
        status: "processing" as const,
        scraped_data: null,
        on_watchlist: addToWatchlist,
        user_id: user.id,
        documents_count: uploadedFiles.length,
        file_paths: [],
        payment_status: "unpaid" as const,
      };

      const { error: insertError } = await supabase.from("reports").insert(
        insertData as import("@/integrations/supabase/types").Database["public"]["Tables"]["reports"]["Insert"] & {
          file_paths: string[];
        },
      );

      if (insertError) {
        throw new Error(`Failed to create report: ${insertError.message}`);
      }

      posthog.capture("upload_section_new_property_analysis_created", {
        button_name: "New Property Analysis",
      });

      toast({
        title: addToWatchlist
          ? "Report created and added to watchlist"
          : "Analysis started",
        description:
          "Your analysis is processing (5-10 minutes). We'll email you when it's ready.",
        duration: 6000,
      });

      navigate(`/reports/${reportId}`);

      // Process in background and refresh billing when usage is consumed
      processInBackground(reportId, user.id, uploadedFiles, propertyUrl)
        .then(() => {
          // Refresh billing status after processing starts (usage consumed)
          refreshBillingStatus();
        })
        .catch(() => {
          // Still refresh on error to get accurate state
          refreshBillingStatus();
        });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to create report. Please try again.",
        variant: "destructive",
      });

      posthog.capture("upload_section_new_property_analysis_failed", {
        button_name: "New Property Analysis",
        error_message:
          error instanceof Error
            ? error.message
            : "Failed to create report. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {(isPaidPlan || isTrialActive) &&
        hasUsageLimits &&
        usage &&
        (() => {
          const radius = 28;
          const circumference = 2 * Math.PI * radius;
          const remainingPercent = 100 - usage.percentUsed;
          const strokeDashoffset =
            circumference - (remainingPercent / 100) * circumference;
          const progressColor = isAtLimit
            ? "stroke-destructive"
            : usage.percentUsed >= 80
              ? "stroke-warning"
              : "stroke-primary";
          const accentColor = isAtLimit
            ? "text-destructive"
            : usage.percentUsed >= 80
              ? "text-warning"
              : "text-primary";

          return (
            <div className={cn(
              "rounded-2xl border shadow-sm overflow-hidden",
              isAtLimit ? "border-destructive/30 bg-destructive/[0.03]" : "border-border/50 bg-card"
            )}>
              <div className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative flex-shrink-0">
                      <svg
                        width="64"
                        height="64"
                        viewBox="0 0 72 72"
                        className="-rotate-90"
                      >
                        <circle
                          cx="36"
                          cy="36"
                          r={radius}
                          fill="none"
                          strokeWidth="6"
                          className="stroke-muted/60"
                        />
                        <circle
                          cx="36"
                          cy="36"
                          r={radius}
                          fill="none"
                          strokeWidth="6"
                          strokeLinecap="round"
                          className={cn(
                            progressColor,
                            "transition-all duration-700 ease-out",
                          )}
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={cn("text-lg font-bold leading-none", accentColor)}>
                          {usage.remaining}
                        </span>
                        <span className="text-[8px] text-muted-foreground mt-0.5">
                          left
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        {isTrialActive ? "Free Trial" : "Monthly Usage"}
                        {isTrialActive && trial && (
                          <span
                            className={cn(
                              "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                              trial.daysRemaining <= 3
                                ? "bg-warning/10 text-warning"
                                : "bg-primary/10 text-primary",
                            )}
                          >
                            {trial.daysRemaining}d left
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {usage.used} of {usage.limit} reports used
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-5">
                    <div className="hidden sm:flex items-center gap-5">
                      <div className="text-center">
                        <div className="text-xl font-bold text-foreground leading-none">
                          {usage.used}
                        </div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-1">
                          Used
                        </div>
                      </div>
                      <div className="w-px h-8 bg-border/60" />
                      <div className="text-center">
                        <div className="text-xl font-bold text-foreground leading-none">
                          {usage.limit}
                        </div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-1">
                          Limit
                        </div>
                      </div>
                    </div>

                    {isAtLimit ? (
                      <Button asChild size="sm" variant="primary">
                        <Link to="/pricing">
                          Upgrade
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Link>
                      </Button>
                    ) : usage.percentUsed >= 80 ? (
                      <Button asChild size="sm" variant="outline">
                        <Link to="/pricing">View Plans</Link>
                      </Button>
                    ) : isTrialActive && trial && trial.daysRemaining <= 7 ? (
                      <Button asChild size="sm" variant="outline">
                        <Link to="/pricing">View Plans</Link>
                      </Button>
                    ) : (
                      <Button
                        asChild
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground"
                      >
                        <Link to="/pricing">View Plans</Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <div className="h-1 bg-muted/40">
                <div
                  className={cn(
                    "h-full transition-all duration-700 ease-out rounded-r-full",
                    isAtLimit ? "bg-destructive" : usage.percentUsed >= 80 ? "bg-warning" : "bg-primary"
                  )}
                  style={{ width: `${Math.min(usage.percentUsed, 100)}%` }}
                />
              </div>
            </div>
          );
        })()}

      <div className="bg-card border border-border/50 rounded-2xl p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Upload Legal Pack
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            AI-powered analysis of property auction documents.
          </p>
        </div>

        <div
          className={cn(
            "relative group rounded-xl border border-dashed p-5 text-center cursor-pointer transition-all duration-200",
            isDragging
              ? "border-primary bg-primary/[0.04]"
              : "border-border hover:border-primary/40",
            validationErrors.files && "border-destructive",
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleUploadZoneClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={FILE_ACCEPT_TYPES}
            multiple
            onChange={handleFileSelect}
          />
          <div className="flex flex-col items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl bg-muted flex items-center justify-center transition-colors",
              isDragging && "bg-primary/10"
            )}>
              <Upload className={cn(
                "w-4.5 h-4.5 transition-colors",
                isDragging ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )} />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-foreground">
                Drop files or <span className="text-primary font-medium">browse</span>
              </p>
              <p className="text-xs text-muted-foreground">
                PDF, DOCX, TXT up to {MAX_FILE_SIZE_MB}MB
              </p>
            </div>
          </div>
        </div>

        {uploadedFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Uploaded files
            </p>
            {uploadedFiles.map((file, index) => (
              <FileItem
                key={`${file.name}-${file.size}-${index}`}
                fileName={file.name}
                index={index}
                onRemove={removeFile}
              />
            ))}
          </div>
        )}
        {validationErrors.files && (
          <div className="mt-2 flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4" />
            <span>{validationErrors.files}</span>
          </div>
        )}
      </div>

      <div className="bg-card border border-border/50 rounded-2xl p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
          <div className="flex-shrink-0">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Property URL</h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">Optional — extracts property info</p>
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            {isEditingUrl ? (
              <Input
                type="url"
                placeholder={PROPERTY_URL_PLACEHOLDER}
                value={propertyUrl}
                onChange={handleUrlChange}
                onBlur={handleUrlBlur}
                onKeyDown={handleUrlKeyDown}
                autoFocus
                className={cn(
                  "flex-1 min-w-0",
                  validationErrors.propertyUrl && "border-destructive",
                )}
                disabled={isSubmitting}
              />
            ) : (
              <div
                className={cn(
                  "flex-1 min-w-0 flex items-center justify-between bg-background border rounded-md px-3 py-2 cursor-text",
                  validationErrors.propertyUrl
                    ? "border-destructive"
                    : "border-border",
                )}
                onClick={handleUrlDisplayClick}
              >
                <span
                  className={cn(
                    "text-sm truncate min-w-0",
                    propertyUrl ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {propertyUrl || PROPERTY_URL_PLACEHOLDER}
                </span>
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0 ml-2" />
                ) : (
                  <Pencil className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
                )}
              </div>
            )}
            {validationErrors.propertyUrl && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                <span>{validationErrors.propertyUrl}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => handleWatchlistChange(!addToWatchlist)}
          className={cn(
            "flex items-center gap-2 px-3.5 py-2 rounded-lg border text-[13px] font-medium transition-colors",
            addToWatchlist
              ? "border-primary/20 bg-primary/[0.04] text-primary"
              : "border-border bg-card text-muted-foreground hover:text-foreground"
          )}
        >
          <Star className={cn("w-3.5 h-3.5", addToWatchlist && "fill-primary")} />
          {addToWatchlist ? "Watchlisted" : "Watchlist"}
        </button>

        <Button
          variant="primary"
          className="flex-1 h-11"
          onClick={handleAnalyse}
          disabled={isButtonDisabled}
        >
          {buttonContent}
        </Button>
      </div>

      <PaymentRequiredModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
      />
    </div>
  );
}
