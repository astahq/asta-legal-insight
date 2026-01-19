import { useState, useCallback, useMemo, useRef } from "react";
import { Upload, Info, ChevronRight, Pencil, Loader2, Star } from "lucide-react";
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
const PROPERTY_URL_PLACEHOLDER = "https://online.auctionhouse.co.uk/lot/details/...";
const DEFAULT_PROPERTY_NAME = "Property Analysis";
const DESCRIPTION_MAX_LENGTH = 100;

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [propertyUrl, setPropertyUrl] = useState("");
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [addToWatchlist, setAddToWatchlist] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    setUploadedFiles((prev) => [...prev, ...files]);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles((prev) => [...prev, ...files]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleUploadZoneClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPropertyUrl(e.target.value);
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
    if (!isAnalysing) {
      setIsEditingUrl(true);
    }
  }, [isAnalysing]);

  const handleWatchlistChange = useCallback((checked: boolean) => {
    setAddToWatchlist(checked);
  }, []);

  const isFormValid = useMemo(() => {
    return uploadedFiles.length > 0 || propertyUrl.trim().length > 0;
  }, [uploadedFiles.length, propertyUrl]);

  const isButtonDisabled = useMemo(() => {
    return isLoading || isAnalysing || !isFormValid;
  }, [isLoading, isAnalysing, isFormValid]);

  const buttonContent = useMemo(() => {
    if (isAnalysing) {
      return (
        <>
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          Creating report...
        </>
      );
    }
    if (isLoading) {
      return (
        <>
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          Extracting property details...
        </>
      );
    }
    return (
      <>
        Analysis Documents
        <ChevronRight className="w-5 h-5 ml-2" />
      </>
    );
  }, [isAnalysing, isLoading]);


  const scrapePropertyUrl = useCallback(async (url: string): Promise<ScrapedProperty | null> => {
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
    } catch (error) {
      console.error('Error scraping:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createReport = useCallback(async (
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
  }, [propertyUrl, addToWatchlist, uploadedFiles.length, user]);

  const handleAnalyse = useCallback(async () => {
    if (!isFormValid) {
      toast({
        title: "No content to analyse",
        description: "Please upload files or enter a property URL.",
        variant: "destructive",
      });
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

      if (uploadedFiles.length === 0 && !scrapedDataResult) {
        throw new Error('Please upload files or provide a valid property URL');
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
        title: addToWatchlist ? "Report created and added to watchlist" : "Report created",
        description: "Your analysis is now processing. You'll see results shortly.",
      });

      navigate(`/reports/${reportId}`);
    } catch (error) {
      console.error('Error creating report:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalysing(false);
    }
  }, [
    isFormValid,
    user,
    propertyUrl,
    uploadedFiles,
    scrapePropertyUrl,
    createReport,
    addToWatchlist,
    navigate,
    toast,
  ]);

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Upload Your Legal Pack
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
            isDragging && "border-primary bg-primary/5"
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
            {uploadedFiles.map((file, index) => {
              const handleRemoveClick = (e: React.MouseEvent) => {
                e.stopPropagation();
                removeFile(index);
              };

              return (
                <div key={`${file.name}-${index}`} className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2">
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
            })}
          </div>
        )}
      </div>

      {/* Property URL Section */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-8">
          <div className="flex-shrink-0">
            <h4 className="font-medium text-foreground">Property URL (recommended)</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Adding a property URL allows us to<br className="hidden md:block" />
              extract additional property information.
            </p>
          </div>
          <div className="flex-1 min-w-0 flex items-center gap-2">
            {isEditingUrl ? (
              <Input
                type="url"
                placeholder={PROPERTY_URL_PLACEHOLDER}
                value={propertyUrl}
                onChange={handleUrlChange}
                onBlur={handleUrlBlur}
                onKeyDown={handleUrlKeyDown}
                autoFocus
                className="flex-1 min-w-0"
                disabled={isLoading || isAnalysing}
              />
            ) : (
              <div 
                className="flex-1 min-w-0 flex items-center justify-between bg-background border border-border rounded-md px-3 py-2 cursor-text"
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
