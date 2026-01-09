import { useState, useCallback } from "react";
import {
  Upload,
  Loader2,
  Copy,
  Check,
  Play,
  X,
  ExternalLink,
  FileText,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { firecrawlApi } from "@/lib/api/firecrawl";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { MarkdownRenderer } from "@/components/test/MarkdownRenderer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TestResult {
  model: string;
  markdown: string;
  timestamp: Date;
  tokensUsed?: number;
  responseTime?: number;
}

const DEFAULT_SYSTEM_PROMPT = `You are an expert UK property law analyst specializing in auction legal packs.
Analyze the provided documents and extract comprehensive information in markdown format.

CRITICAL: Extract property details first from the documents:
- Property address
- Property type (e.g., Semi-Detached, Terraced, Flat, etc.)
- Number of bedrooms
- Number of bathrooms
- Auction date
- Guide price
- Any other relevant property details

Use the following section headers (## for main sections):
## Title
## Ownership  
## Charges and Money
## Covenants
## Tenure
## Planning and Development
## Completion & Penalty Risks
## Physical & Environmental Risks
## Special Conditions & Amenities

For each section, structure your response as follows:

## Section Name

[Brief summary paragraph - 1-2 sentences describing the key information from ALL relevant documents]

**Key Legal Findings:**
[Important points, facts, or findings identified in the legal documents - be specific and cite document names when possible]

**Issues/Risks/Concerns:**
- Critical: [Critical issue description - things that could cause major problems]
- Warning: [Warning issue description - things that need attention]
- [Any other issues as bullet points]

**Details:**
[Additional relevant details, facts, or context from the documents]

IMPORTANT FORMATTING RULES:
- Start each issue with "Critical:", "Warning:", or just list it as a bullet point
- Keep issues concise (1-2 sentences max)
- Issues should be actionable and specific
- Cite document names when referencing specific information (e.g., "According to Official Copy (Register) - LAN124431.pdf...")
- For sections with no issues (like Covenants or Tenure), just provide the summary and key findings
- If information is not found, write "Unknown"
- Provide detailed analysis of EACH legal document - extract all important information from each document
- Focus on information that would affect a property investor's decision

DOCUMENT ANALYSIS REQUIREMENTS:
- Analyze each document individually and extract all important information
- Identify key legal findings from each document
- Cross-reference information across documents when relevant
- Highlight any discrepancies or important details that appear in multiple documents
- Extract specific details like title numbers, dates, amounts, names, addresses, etc.

Focus on extracting actionable issues and comprehensive information that would affect a property investor's decision.`;

const MODELS = [
  { value: "gpt-4o", label: "GPT-4o", description: "Most capable, fastest" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini", description: "Fast and cost-effective" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo", description: "High performance" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo", description: "Fastest, lower cost" },
];

export default function TestPlayground() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [propertyUrl, setPropertyUrl] = useState("");
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [scrapedData, setScrapedData] = useState<{
    markdown?: string;
    metadata?: {
      title?: string;
      description?: string;
      sourceURL?: string;
    };
  } | null>(null);
  const [selectedModel, setSelectedModel] = useState("gpt-4o-mini");
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showRawMarkdown, setShowRawMarkdown] = useState<Record<number, boolean>>({});

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
    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.type === "application/pdf" || f.name.endsWith(".pdf")
    );
    setUploadedFiles((prev) => [...prev, ...files]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(
      (f) => f.type === "application/pdf" || f.name.endsWith(".pdf")
    );
    setUploadedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const scrapePropertyUrl = async () => {
    if (!propertyUrl.trim()) return;

    setIsLoadingUrl(true);
    setScrapedData(null);

    try {
      const response = await firecrawlApi.scrape(propertyUrl, {
        formats: ["markdown"],
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
      console.error("Error scraping:", error);
      toast({
        title: "Error",
        description:
          "Failed to scrape property URL. Please check the URL and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingUrl(false);
    }
  };

  const handleAnalyze = async () => {
    if (uploadedFiles.length === 0 && !scrapedData) {
      toast({
        title: "No content to analyze",
        description: "Please upload PDF files or enter a property URL.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to analyze documents.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    const startTime = Date.now();

    try {
      // Prepare file data
      const fileDataPromises = uploadedFiles.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        return {
          name: file.name,
          type: file.type,
          data: Array.from(new Uint8Array(arrayBuffer)),
        };
      });

      const fileData = await Promise.all(fileDataPromises);

      // Call the test playground edge function
      const { data, error } = await supabase.functions.invoke("test-playground", {
        body: {
          model: selectedModel,
          systemPrompt: systemPrompt,
          files: fileData,
          scrapedData: scrapedData,
        },
      });

      if (error) throw error;

      const responseTime = Date.now() - startTime;

      const newResult: TestResult = {
        model: selectedModel,
        markdown: data.markdown || data.content || "",
        timestamp: new Date(),
        tokensUsed: data.usage?.total_tokens,
        responseTime,
      };

      setResults((prev) => [newResult, ...prev]);
      toast({
        title: "Analysis complete",
        description: `Processed with ${selectedModel} in ${(responseTime / 1000).toFixed(1)}s`,
      });
    } catch (error) {
      console.error("Error analyzing:", error);
      toast({
        title: "Analysis failed",
        description:
          error instanceof Error ? error.message : "Failed to analyze documents.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
      toast({
        title: "Copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">AI Model Test Playground</h1>
          <p className="text-muted-foreground mt-2">
            Compare different AI models and test custom prompts with your legal pack documents.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Input */}
          <div className="space-y-6">
            {/* File Upload */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Upload PDF Files (Required)
              </h3>
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
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
                  accept=".pdf"
                  multiple
                  onChange={handleFileSelect}
                />
                <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Drag and drop PDF files here, or click to browse
                </p>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-foreground truncate">
                          {file.name}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(index);
                        }}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Firecrawl URL */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Property URL (Optional)
              </h3>
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder="https://online.auctionhouse.co.uk/lot/details/..."
                  value={propertyUrl}
                  onChange={(e) => setPropertyUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && propertyUrl.trim()) {
                      scrapePropertyUrl();
                    }
                  }}
                  disabled={isLoadingUrl}
                />
                <Button
                  onClick={scrapePropertyUrl}
                  disabled={!propertyUrl.trim() || isLoadingUrl}
                >
                  {isLoadingUrl ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {scrapedData && (
                <div className="mt-4 p-3 bg-muted/30 rounded-md">
                  <p className="text-sm text-foreground font-medium">
                    ✓ Scraped successfully
                  </p>
                  {scrapedData.metadata?.title && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {scrapedData.metadata.title}
                    </p>
                  )}
                </div>
              )}
            </Card>

            {/* Model Selection */}
            <Card className="p-6">
              <Label htmlFor="model" className="text-lg font-semibold text-foreground mb-4 block">
                AI Model
              </Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger id="model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODELS.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      <div>
                        <div className="font-medium">{model.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {model.description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Card>

            {/* System Prompt */}
            <Card className="p-6">
              <Label htmlFor="prompt" className="text-lg font-semibold text-foreground mb-4 block">
                System Prompt
              </Label>
              <Textarea
                id="prompt"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
                placeholder="Enter your system prompt..."
              />
              <p className="text-xs text-muted-foreground mt-2">
                Add or remove sections by editing the markdown headers (## Section Name) in the prompt.
              </p>
            </Card>

            {/* Analyze Button */}
            <Button
              className="w-full"
              size="lg"
              onClick={handleAnalyze}
              disabled={
                isAnalyzing ||
                (uploadedFiles.length === 0 && !scrapedData) ||
                !systemPrompt.trim()
              }
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Run Analysis
                </>
              )}
            </Button>
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Results {results.length > 0 && `(${results.length})`}
              </h3>

              {results.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No results yet. Run an analysis to see output here.</p>
                </div>
              ) : (
                <Tabs defaultValue="0" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="0">Latest</TabsTrigger>
                    <TabsTrigger value="compare">Compare</TabsTrigger>
                  </TabsList>
                  <TabsContent value="0" className="space-y-4">
                    {results.map((result, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="font-semibold text-foreground">
                              {MODELS.find((m) => m.value === result.model)?.label || result.model}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {result.timestamp.toLocaleTimeString()}
                              {result.responseTime && ` • ${(result.responseTime / 1000).toFixed(1)}s`}
                              {result.tokensUsed && ` • ${result.tokensUsed.toLocaleString()} tokens`}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setShowRawMarkdown((prev) => ({
                                  ...prev,
                                  [index]: !prev[index],
                                }))
                              }
                            >
                              {showRawMarkdown[index] ? "Preview" : "Raw"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(result.markdown, index)}
                            >
                              {copiedIndex === index ? (
                                <Check className="w-4 h-4 text-success" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <div className="border-t border-border pt-4">
                          {showRawMarkdown[index] ? (
                            <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                              {result.markdown}
                            </pre>
                          ) : (
                            <MarkdownRenderer content={result.markdown} />
                          )}
                        </div>
                      </Card>
                    ))}
                  </TabsContent>
                  <TabsContent value="compare" className="space-y-4">
                    {results.length >= 2 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {results.slice(0, 2).map((result, index) => (
                          <Card key={index} className="p-4">
                            <div className="font-semibold text-foreground mb-2">
                              {MODELS.find((m) => m.value === result.model)?.label || result.model}
                            </div>
                            <div className="border-t border-border pt-4">
                              <MarkdownRenderer content={result.markdown} />
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        Run at least 2 analyses to compare models side-by-side.
                      </p>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
