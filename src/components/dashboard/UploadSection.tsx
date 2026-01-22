import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Upload, Info, ChevronRight, Pencil, Loader2, Star, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { firecrawlApi } from "@/lib/api/firecrawl";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { processLegalPack, uploadPdfsToStorage } from "@/lib/api/legalPackProcessor";
import { usePostHog } from "posthog-js/react";
import { z } from "zod";

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
  file: File;
  index: number;
  onRemove: (index: number) => void;
  isLast: boolean;
  onClearError: () => void;
}

const FileItem = ({ file, index, onRemove, isLast, onClearError }: FileItemProps) => {
  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(index);
    if (isLast) {
      onClearError();
    }
  };

  return (
    <div className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2">
      <span className="text-sm text-foreground truncate">{file.name}</span>
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
};

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
  const posthog = usePostHog();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [propertyUrl, setPropertyUrl] = useState("");
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [addToWatchlist, setAddToWatchlist] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    files?: string;
    propertyUrl?: string;
  }>({});

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateFiles = (files: File[]): { valid: File[]; errors: string[] } => {
    const valid: File[] = [];
    const errors: string[] = [];

    files.forEach((file) => {
      try {
        fileSchema.parse(file);
        valid.push(file);
      } catch (error) {
        if (error instanceof z.ZodError) {
          errors.push(`${file.name}: ${error.issues[0]?.message || 'Invalid file'}`);
        }
      }
    });

    return { valid, errors };
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
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
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
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
    
    if (e.target) {
      e.target.value = '';
    }
  };

  const removeFile = useCallback((index: number) => {
    setUploadedFiles((prev) => {
      const newFiles = prev.filter((_, i) => i !== index);
      if (newFiles.length === 0) {
        setValidationErrors((prev) => ({ ...prev, files: undefined }));
      }
      return newFiles;
    });
  }, []);

  const handleUploadZoneClick = () => {
    fileInputRef.current?.click();
  };

  const urlValidationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        z.url().parse(value);
        setValidationErrors((prev) => ({ ...prev, propertyUrl: undefined }));
      } catch {
        setValidationErrors((prev) => ({ 
          ...prev, 
          propertyUrl: "Please enter a valid URL" 
        }));
      }
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (urlValidationTimeoutRef.current) {
        clearTimeout(urlValidationTimeoutRef.current);
      }
    };
  }, []);

  const handleUrlBlur = () => {
    setIsEditingUrl(false);
  };

  const handleUrlKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setIsEditingUrl(false);
    }
  };

  const handleUrlDisplayClick = () => {
    if (!isAnalysing) {
      setIsEditingUrl(true);
    }
  };

  const handleWatchlistChange = (checked: boolean) => {
    setAddToWatchlist(checked);
  };

  const isFormValid = useMemo(() => {
    if (uploadedFiles.length === 0 || !propertyUrl.trim()) {
      return false;
    }
    
    try {
      uploadFormSchema.parse({
        files: uploadedFiles,
        propertyUrl: propertyUrl.trim(),
      });
      return true;
    } catch {
      return false;
    }
  }, [uploadedFiles, propertyUrl]);

  const isButtonDisabled = isLoading || isAnalysing || !isFormValid;

  const buttonContent = isAnalysing ? (
    <>
      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
      Creating report...
    </>
  ) : isLoading ? (
    <>
      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
      Extracting property details...
    </>
  ) : (
    <>
      Analysis Documents
      <ChevronRight className="w-5 h-5 ml-2" />
    </>
  );


  const scrapePropertyUrl = async (url: string): Promise<ScrapedProperty | null> => {
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  const createReport = async (
    reportId: string,
    propertyAddress: string,
    scrapedData: ScrapedProperty | null,
    filePaths: string[]
  ) => {
    const insertData = {
      id: reportId,
      property_address: propertyAddress,
      property_url: propertyUrl || null,
      status: 'processing' as const,
      scraped_data: scrapedData as unknown as import('@/integrations/supabase/types').Json | null,
      on_watchlist: addToWatchlist,
      user_id: user!.id,
      documents_count: uploadedFiles.length,
      file_paths: filePaths,
    };

    const { error: insertError } = await supabase
      .from('reports')
      .insert(insertData as import('@/integrations/supabase/types').Database['public']['Tables']['reports']['Insert'] & { file_paths: string[] });

    if (insertError) {
      throw new Error(`Failed to create report: ${insertError.message}`);
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

    setIsAnalysing(true);

    try {
      let scrapedDataResult: ScrapedProperty | null = null;

      if (propertyUrl.trim()) {
        scrapedDataResult = await scrapePropertyUrl(propertyUrl);
      }


      const propertyAddress = extractPropertyAddress(scrapedDataResult, uploadedFiles);
      const reportId = crypto.randomUUID();

      const filePaths = uploadedFiles.length > 0 
        ? await uploadPdfsToStorage(uploadedFiles, user.id)
        : [];

      await createReport(reportId, propertyAddress, scrapedDataResult, filePaths);

      await processLegalPack({
        reportId,
        userId: user.id,
        url: propertyUrl || undefined,
      });

      toast({
        title: addToWatchlist ? "Report created and added to watchlist" : "Analysis started",
        description: "Your analysis is processing (5-10 minutes). We'll email you when it's ready.",
        duration: 6000,
      });

      posthog.capture("upload_section_new_property_analysis_created", {
        button_name: "New Property Analysis",
      });

      navigate(`/reports/${reportId}`);
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
      setIsAnalysing(false);
    }
  };

  return (
    <div className="space-y-6">
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
                key={`${file.name}-${index}`}
                file={file}
                index={index}
                onRemove={removeFile}
                isLast={uploadedFiles.length === 1}
                onClearError={() => setValidationErrors((prev) => ({ ...prev, files: undefined }))}
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
                disabled={isLoading || isAnalysing}
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
                {isLoading || isAnalysing ? (
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
    </div>
  );
}
