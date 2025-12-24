import { useState, useCallback } from "react";
import { Upload, X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function UploadSection() {
  const [isDragging, setIsDragging] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

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
    // Handle file drop
    const files = Array.from(e.dataTransfer.files);
    console.log("Dropped files:", files);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-6 relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        onClick={() => setIsOpen(false)}
      >
        <X className="w-4 h-4" />
      </Button>

      <h3 className="text-lg font-semibold text-foreground mb-2">
        Upload Your Property's Legal Pack
      </h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-2xl">
        Our AI has been trained on thousands of legal packs and floor plans. It can identify issues that even experienced lawyers might miss, and it does it in minutes instead of hours. The reports are comprehensive, easy to understand, and highlight all potential risks.
      </p>

      {/* Disclaimer */}
      <div className="flex items-center gap-2 mb-4 text-sm text-success">
        <Info className="w-4 h-4" />
        <span>Not legal advice - your smarter due-diligence co-pilot</span>
      </div>

      {/* Upload Zone */}
      <div
        className={cn(
          "upload-zone",
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
          <div>
            <p className="text-muted-foreground">
              Drag and drop files here, or click to browse
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Supports PDF, DOCX, TXT up to 50MB per file
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
