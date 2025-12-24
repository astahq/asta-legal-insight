import { useState, useCallback } from "react";
import { Upload, Info, ChevronRight, Pencil, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { firecrawlApi } from "@/lib/api/firecrawl";
import { useToast } from "@/hooks/use-toast";

interface ScrapedProperty {
  title?: string;
  markdown?: string;
  metadata?: {
    title?: string;
    description?: string;
    sourceURL?: string;
  };
}

export function UploadSection() {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [propertyUrl, setPropertyUrl] = useState("");
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scrapedData, setScrapedData] = useState<ScrapedProperty | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

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
    setUploadedFiles(prev => [...prev, ...files]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const scrapePropertyUrl = async () => {
    if (!propertyUrl.trim()) return;
    
    setIsLoading(true);
    setScrapedData(null);

    try {
      const response = await firecrawlApi.scrape(propertyUrl, {
        formats: ['markdown'],
        onlyMainContent: true,
      });

      if (response.success) {
        const data = response.data || response;
        setScrapedData({
          markdown: data.markdown || data.data?.markdown,
          metadata: data.metadata || data.data?.metadata,
        });
        toast({
          title: "Property details extracted",
          description: "We've successfully scraped the auction listing.",
        });
      } else {
        toast({
          title: "Failed to scrape URL",
          description: response.error || "Could not extract property details.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error scraping:', error);
      toast({
        title: "Error",
        description: "Failed to scrape property URL. Please check the URL and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyze = () => {
    console.log("Analyzing with URL:", propertyUrl);
    console.log("Uploaded files:", uploadedFiles);
    console.log("Scraped data:", scrapedData);
    // Will process the analysis here
  };

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

        {/* Upload Zone */}
        <div
          className={cn(
            "upload-zone min-h-[200px]",
            isDragging && "border-primary bg-primary/5"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById("file-input")?.click()}
        >
          <input
            id="file-input"
            type="file"
            className="hidden"
            accept=".pdf,.docx,.txt"
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
                Supports PDF, DOCX, TXT up to 50MB per file
              </p>
            </div>
          </div>
        </div>

        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-foreground">Uploaded files:</p>
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2">
                <span className="text-sm text-foreground truncate">{file.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  Remove
                </Button>
              </div>
            ))}
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
          <div className="flex-1 flex items-center gap-2">
            {isEditingUrl ? (
              <Input
                type="url"
                placeholder="https://online.auctionhouse.co.uk/lot/details/..."
                value={propertyUrl}
                onChange={(e) => setPropertyUrl(e.target.value)}
                onBlur={() => {
                  setIsEditingUrl(false);
                  if (propertyUrl.trim()) {
                    scrapePropertyUrl();
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setIsEditingUrl(false);
                    if (propertyUrl.trim()) {
                      scrapePropertyUrl();
                    }
                  }
                }}
                autoFocus
                className="flex-1"
                disabled={isLoading}
              />
            ) : (
              <div 
                className="flex-1 flex items-center justify-between bg-background border border-border rounded-md px-3 py-2 cursor-text"
                onClick={() => setIsEditingUrl(true)}
              >
                <span className={cn(
                  "text-sm truncate",
                  propertyUrl ? "text-foreground" : "text-muted-foreground"
                )}>
                  {propertyUrl || "https://online.auctionhouse.co.uk/lot/details/..."}
                </span>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                ) : (
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scraped Property Data */}
      {scrapedData && (
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-foreground">Extracted Property Information</h4>
            {scrapedData.metadata?.sourceURL && (
              <a
                href={scrapedData.metadata.sourceURL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                View original <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          
          {scrapedData.metadata?.title && (
            <p className="text-sm font-medium text-foreground mb-2">
              {scrapedData.metadata.title}
            </p>
          )}
          
          {scrapedData.metadata?.description && (
            <p className="text-sm text-muted-foreground mb-3">
              {scrapedData.metadata.description}
            </p>
          )}
          
          {scrapedData.markdown && (
            <div className="bg-muted/30 rounded-md p-3 max-h-60 overflow-y-auto">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans">
                {scrapedData.markdown.slice(0, 2000)}
                {scrapedData.markdown.length > 2000 && '...'}
              </pre>
            </div>
          )}
        </Card>
      )}

      {/* Analyze Button */}
      <Button 
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 text-base font-medium"
        onClick={handleAnalyze}
        disabled={isLoading || (uploadedFiles.length === 0 && !scrapedData)}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Extracting property details...
          </>
        ) : (
          <>
            Analysis Documents
            <ChevronRight className="w-5 h-5 ml-2" />
          </>
        )}
      </Button>
    </div>
  );
}
