import { useState, useCallback } from "react";
import { Upload, Info, ChevronRight, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function UploadSection() {
  const [isDragging, setIsDragging] = useState(false);
  const [propertyUrl, setPropertyUrl] = useState("");
  const [isEditingUrl, setIsEditingUrl] = useState(false);

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
    console.log("Dropped files:", files);
  }, []);

  const handleAnalyze = () => {
    console.log("Analyzing with URL:", propertyUrl);
    // Will integrate with Firecrawl here
  };

  return (
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
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            console.log("Selected files:", files);
          }}
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

      {/* Property URL Section */}
      <div className="mt-6 bg-card border border-border rounded-lg p-4">
        <div className="flex items-start gap-8">
          <div className="flex-shrink-0">
            <h4 className="font-medium text-foreground">Property URL (recommended)</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Adding a property URL allows us to<br />
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
                onBlur={() => setIsEditingUrl(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingUrl(false)}
                autoFocus
                className="flex-1"
              />
            ) : (
              <div 
                className="flex-1 flex items-center justify-between bg-background border border-border rounded-md px-3 py-2 cursor-text"
                onClick={() => setIsEditingUrl(true)}
              >
                <span className={cn(
                  "text-sm",
                  propertyUrl ? "text-foreground" : "text-muted-foreground"
                )}>
                  {propertyUrl || "https://online.auctionhouse.co.uk/lot/details/..."}
                </span>
                <Pencil className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analyze Button */}
      <Button 
        className="w-full mt-6 bg-primary hover:bg-primary/90 text-primary-foreground py-6 text-base font-medium"
        onClick={handleAnalyze}
      >
        Analysis Documents
        <ChevronRight className="w-5 h-5 ml-2" />
      </Button>
    </div>
  );
}
