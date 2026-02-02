import { useState, useMemo, useCallback, useRef, useEffect, memo } from "react";
import { Upload, Info, ChevronRight, Pencil, Loader2, Star, AlertCircle, FileText, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { firecrawlApi } from "@/lib/api/firecrawl";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useBilling } from "@/contexts/BillingContext";
import { processLegalPack, uploadPdfsToStorage } from "@/lib/api/legalPackProcessor";
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
const PROPERTY_URL_PLACEHOLDER = "https://online.auctionhouse.co.uk/lot/details/...";
const DEFAULT_PROPERTY_NAME = "Property Analysis";
const DESCRIPTION_MAX_LENGTH = 100;

const validFileExtensions = ['.pdf', '.docx', '.txt'];

const fileSchema = z.file()
  .max(MAX_FILE_SIZE_BYTES, `File size must be under ${MAX_FILE_SIZE_MB}MB`)
  .refine(
    (file) => {
      const fileName = file.name.toLowerCase();
      return validFileExtensions.some(ext => fileName.endsWith(ext));
    },
    {
      message: `File must be PDF, DOCX, or TXT`
    }
  );

const uploadFormSchema = z.object({
  files: z.array(fileSchema).min(1, "At least one PDF, DOCX, or TXT file is required"),
  propertyUrl: z.url("Please enter a valid property URL").min(1, "Property URL is required"),
});

type UploadFormData = z.infer<typeof uploadFormSchema>;

interface FileItemProps {
  fileName: string;
  index: number;
  onRemove: (index: number) => void;
}

const FileItem = memo(({ fileName, index, onRemove }: FileItemProps) => {
  const handleRemoveClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(index);
  }, [onRemove, index]);

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
  uploadedFiles: File[]
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
  const [pendingReportId, setPendingReportId] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateFiles = useCallback((files: File[]): { valid: File[]; errors: string[] } => {
    const valid: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      const fileName = file.name.toLowerCase();
      const isValidExtension = validFileExtensions.some(ext => fileName.endsWith(ext));
      
      if (!isValidExtension) {
        errors.push(`${file.name}: File must be PDF, DOCX, or TXT`);
        continue;
      }
      
      if (file.size > MAX_FILE_SIZE_BYTES) {
        errors.push(`${file.name}: File size must be under ${MAX_FILE_SIZE_MB}MB`);
        continue;
      }
      
      valid.push(file);
    }

    return { valid, errors };
  }, []);

  const processValidFiles = useCallback((files: File[]) => {
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
  }, [validateFiles, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    processValidFiles(files);
  }, [processValidFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processValidFiles(files);
    
    if (e.target) {
      e.target.value = '';
    }
  }, [processValidFiles]);

  const removeFile = useCallback((index: number) => {
    setUploadedFiles((prev) => {
      const newFiles = prev.filter((_, i) => i !== index);
      if (newFiles.length === 0) {
        setValidationErrors((prevErrors) => ({ ...prevErrors, files: undefined }));
      }
      return newFiles;
    });
  }, []);

  const handleUploadZoneClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const urlValidationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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
          propertyUrl: "Please enter a valid URL" 
        }));
      }
    }, 300);
  }, []);

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

  const handleUrlKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setIsEditingUrl(false);
    }
  }, []);

  const handleUrlDisplayClick = useCallback(() => {
    if (!isSubmitting) {
      setIsEditingUrl(true);
    }
  }, [isSubmitting]);

  const handleWatchlistChange = useCallback((checked: boolean) => {
    setAddToWatchlist(checked);
  }, []);

  const isFormValid = useMemo(() => {
    if (uploadedFiles.length === 0 || !propertyUrl.trim()) {
      return false;
    }
    
    try {
      new URL(propertyUrl.trim());
      return true;
    } catch {
      return false;
    }
  }, [uploadedFiles.length, propertyUrl]);

  const isButtonDisabled = isSubmitting || !isFormValid;

  const buttonContent = useMemo(() => 
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
    ), [isSubmitting]);


  const scrapePropertyUrl = async (url: string): Promise<ScrapedProperty | null> => {
    try {
      const response = await firecrawlApi.scrape(url, {
        formats: ['markdown'],
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
    url: string
  ) => {
    try {
      const [filePaths, scrapedData] = await Promise.all([
        files.length > 0 ? uploadPdfsToStorage(files, userId) : Promise.resolve([]),
        url.trim() ? scrapePropertyUrl(url).catch(() => null) : Promise.resolve(null),
      ]);

      if (filePaths.length > 0 || scrapedData) {
        const updateData: Record<string, unknown> = {};
        if (filePaths.length > 0) {
          updateData.file_paths = filePaths;
        }
        if (scrapedData) {
          updateData.scraped_data = scrapedData;
        }
        await supabase.from('reports').update(updateData).eq('id', reportId);
      }

      await processLegalPack({
        reportId,
        userId,
        url: url || undefined,
      });
    } catch (error) {
      await supabase.from('reports').update({ status: 'failed' }).eq('id', reportId);
      
      posthog.capture("upload_section_background_processing_failed", {
        report_id: reportId,
        error_message: error instanceof Error ? error.message : "Background processing failed",
      });
    }
  };

  const handleAnalyse = async () => {
    posthog.capture("upload_section_new_property_analysis_button_clicked", {
      button_name: "New Property Analysis",
    });

    const formData: UploadFormData = {
      files: uploadedFiles,
      propertyUrl: propertyUrl.trim(),
    };

    try {
      uploadFormSchema.parse(formData);
      setValidationErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: { files?: string; propertyUrl?: string } = {};
        
        error.issues.forEach((err) => {
          if (err.path[0] === 'files') {
            errors.files = err.message;
          } else if (err.path[0] === 'propertyUrl') {
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
          description: error instanceof Error ? error.message : "Failed to initialize trial. Please try again.",
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
        plan_id: access?.planId ?? 'none',
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
        status: 'processing' as const,
        scraped_data: null,
        on_watchlist: addToWatchlist,
        user_id: user.id,
        documents_count: uploadedFiles.length,
        file_paths: [],
        payment_status: 'unpaid' as const,
      };

      const { error: insertError } = await supabase
        .from('reports')
        .insert(insertData as import('@/integrations/supabase/types').Database['public']['Tables']['reports']['Insert'] & { file_paths: string[] });

      if (insertError) {
        throw new Error(`Failed to create report: ${insertError.message}`);
      }

      posthog.capture("upload_section_new_property_analysis_created", {
        button_name: "New Property Analysis",
      });

      toast({
        title: addToWatchlist ? "Report created and added to watchlist" : "Analysis started",
        description: "Your analysis is processing (5-10 minutes). We'll email you when it's ready.",
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
        description: error instanceof Error ? error.message : "Failed to create report. Please try again.",
        variant: "destructive",
      });

      posthog.capture("upload_section_new_property_analysis_failed", {
        button_name: "New Property Analysis",
        error_message: error instanceof Error ? error.message : "Failed to create report. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {(isPaidPlan || isTrialActive) && hasUsageLimits && usage && (() => {
        const radius = 28;
        const circumference = 2 * Math.PI * radius;
        const remainingPercent = 100 - usage.percentUsed;
        const strokeDashoffset = circumference - (remainingPercent / 100) * circumference;
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
          <div className="bg-card rounded-xl border border-border shadow-sm px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="relative flex-shrink-0">
                  <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
                    <circle
                      cx="36"
                      cy="36"
                      r={radius}
                      fill="none"
                      strokeWidth="7"
                      className="stroke-muted"
                    />
                    <circle
                      cx="36"
                      cy="36"
                      r={radius}
                      fill="none"
                      strokeWidth="7"
                      strokeLinecap="round"
                      className={cn(progressColor, "transition-all duration-700 ease-out")}
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={cn("text-xl font-bold", accentColor)}>
                      {usage.remaining}
                    </span>
                    <span className="text-[9px] text-muted-foreground">left</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    {isTrialActive ? 'Free Trial' : 'Monthly Usage'}
                    {isTrialActive && trial && (
                      <span className={cn(
                        "text-[10px] font-medium px-1.5 py-0.5 rounded",
                        trial.daysRemaining <= 3
                          ? "bg-warning/10 text-warning"
                          : "bg-primary/10 text-primary"
                      )}>
                        {trial.daysRemaining}d
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {usage.used} of {usage.limit} reports used
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="hidden sm:flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">{usage.used}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Used</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">{usage.limit}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Limit</div>
                  </div>
                </div>

                {isAtLimit ? (
                  <Button asChild size="sm">
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
                  <Button asChild size="sm" variant="ghost" className="text-muted-foreground">
                    <Link to="/pricing">View Plans</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
      
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Upload Your Legal Pack <span className="text-destructive">*</span>
        </h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-full">
          Our AI has been trained on thousands of legal packs and property auction documents. It can identify issues that even experienced lawyers might miss, and it does it in minutes instead of hours. The reports are comprehensive, easy to understand, and highlight all potential risks.
        </p>

        {/* Disclaimer */}
        <div className="flex items-center gap-2 mb-4 text-sm text-success">
          <Info className="w-4 h-4 flex-shrink-0" />
          <span>Not legal advice - your smarter due-diligence co-pilot</span>
        </div>

        <div
          className={cn(
            "upload-zone min-h-[200px]",
            isDragging && "border-primary bg-primary/5",
            validationErrors.files && "border-destructive"
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
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
              <Upload className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">
                Drag and drop files here, or click to browse
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Supports PDF, DOCX, TXT up to {MAX_FILE_SIZE_MB}MB per file
              </p>
            </div>
          </div>
        </div>

        {uploadedFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-foreground">Uploaded files:</p>
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

      {/* Property URL Section */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-8">
          <div className="flex-shrink-0">
            <h4 className="font-medium text-foreground">
              Property URL <span className="text-destructive">*</span>
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              Adding a property URL allows us to<br className="hidden md:block" />
              extract additional property information.
            </p>
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
                  validationErrors.propertyUrl && "border-destructive"
                )}
                disabled={isSubmitting}
              />
            ) : (
              <div 
                className={cn(
                  "flex-1 min-w-0 flex items-center justify-between bg-background border rounded-md px-3 py-2 cursor-text",
                  validationErrors.propertyUrl ? "border-destructive" : "border-border"
                )}
                onClick={handleUrlDisplayClick}
              >
                <span className={cn(
                  "text-sm truncate min-w-0",
                  propertyUrl ? "text-foreground" : "text-muted-foreground"
                )}>
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


      <div className="flex items-center space-x-2">
        <Checkbox 
          id="watchlist" 
          checked={addToWatchlist}
          onCheckedChange={handleWatchlistChange}
        />
        <label
          htmlFor="watchlist"
          className="text-sm font-medium text-foreground cursor-pointer flex items-center gap-2"
        >
          <Star className="w-4 h-4 text-warning" />
          Add to Watchlist
        </label>
      </div>

      <Button 
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 text-base font-medium"
        onClick={handleAnalyse}
        disabled={isButtonDisabled}
      >
        {buttonContent}
      </Button>

      <PaymentRequiredModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        reportId={pendingReportId || undefined}
      />
    </div>
  );
}
