import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Helper to detect issue severity from text
function getIssueSeverity(text: string): "critical" | "warning" | "info" {
  const lowerText = text.toLowerCase();
  if (lowerText.includes("critical") || lowerText.startsWith("critical:")) {
    return "critical";
  }
  if (lowerText.includes("warning") || lowerText.startsWith("warning:")) {
    return "warning";
  }
  return "info";
}

// IssueBadge component matching ReportDetail style
function IssueBadge({ text }: { text: string }) {
  const severity = getIssueSeverity(text);
  const bgColor = {
    critical: "bg-destructive/10",
    warning: "bg-warning/10",
    info: "bg-primary/10",
  }[severity];

  const dotColor = {
    critical: "bg-destructive",
    warning: "bg-warning",
    info: "bg-primary",
  }[severity];

  // Clean up the text - remove severity prefixes and bullet points
  const displayText = text
    .replace(/^(critical|warning|info):\s*/i, "")
    .replace(/^[•*-]\s*/, "")
    .trim();

  return (
    <div className={cn("flex items-start gap-3 p-3 rounded-md", bgColor)}>
      <span className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", dotColor)} />
      <span className="text-sm text-foreground">{displayText || text}</span>
    </div>
  );
}

// Helper to check if text is an issue
function isIssue(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 500) return false;
  
  // Check for explicit issue markers
  if (/^(critical|warning|info|risk|issue)[:-]/i.test(trimmed)) return true;
  
  // Check for common issue patterns
  const issuePatterns = [
    /penalty/i,
    /risk/i,
    /excluded/i,
    /restriction/i,
    /limitation/i,
    /concern/i,
    /problem/i,
    /defect/i,
    /missing/i,
    /unknown/i,
    /lack of/i,
    /absence of/i,
    /may affect/i,
    /could impact/i,
    /potential/i,
  ];
  
  return issuePatterns.some(pattern => pattern.test(trimmed));
}

// Parse markdown to extract sections and issues
function parseMarkdownSections(content: string) {
  const sections: Array<{
    title: string;
    issues: string[];
    description: string;
    keyFindings?: string;
    rightContent?: string;
  }> = [];

  // Split by h2 headers (## Section Name)
  const sectionMatches = content.split(/(?=^##\s+)/m).filter(Boolean);
  
  for (const sectionText of sectionMatches) {
    const titleMatch = sectionText.match(/^##\s+(.+)$/m);
    if (!titleMatch) continue;
    
    const title = titleMatch[1].trim();
    const issues: string[] = [];
    let description = "";
    let keyFindings = "";
    let rightContent: string | undefined;
    
    // Extract key legal findings - handle both **Key Legal Findings:** and plain text formats
    const keyFindingsMatch = sectionText.match(/\*{0,2}key\s+legal\s+findings:?\*{0,2}\s*\n(.+?)(?=\n\n|\n\*{1,2}issues|\n\*{1,2}details:|\n\*{1,2}summary:|$)/is);
    if (keyFindingsMatch) {
      keyFindings = keyFindingsMatch[1].trim();
      // Clean up any markdown formatting artifacts
      keyFindings = keyFindings.replace(/^\*+\s*/, "").trim();
    }
    
    // Extract summary/description (after "Summary:" or first substantial paragraph after header)
    const summaryMatch = sectionText.match(/summary:?\s*\n(.+?)(?=\n\n|\nissues|details:|$)/is);
    if (summaryMatch) {
      description = summaryMatch[1].trim();
    } else {
      // If no explicit "Summary:" label, get content after the header
      const contentAfterHeader = sectionText.replace(/^##\s+.+?\n/, "").trim();
      
      // Check for bold key-value pairs (like **Property Address:** value)
      // Stop before "Key Legal Findings", "Issues/Risks/Concerns", or "Details:" sections
      const contentBeforeSections = contentAfterHeader.split(/\n\*\*Key\s+Legal\s+Findings|\n\*\*Issues|\n\*\*Details:/i)[0];
      // Match **Key:** value pattern, capturing everything on the same line
      const boldKeyValuePattern = /\*\*([^*:]+):\*\*\s*([^\n]+)/g;
      const boldMatches = Array.from(contentBeforeSections.matchAll(boldKeyValuePattern));
      
      if (boldMatches.length > 0) {
        // Format as a list for better readability
        const formattedDetails = boldMatches
          .map(match => {
            const key = match[1].trim();
            const value = match[2].trim();
            return `- **${key}** ${value}`;
          })
          .join("\n");
        description = formattedDetails;
      } else {
        // Fallback: get the first paragraph
        const firstParagraph = contentAfterHeader.split(/\n\n/)[0]?.trim();
        if (firstParagraph && 
            !firstParagraph.match(/^(issues|risks|concerns|details|summary|key\s+legal\s+findings):/i) &&
            !firstParagraph.startsWith("-") &&
            !firstParagraph.startsWith("*") &&
            !firstParagraph.startsWith("•") &&
            firstParagraph.length > 20) {
          description = firstParagraph;
        }
      }
    }
    
    // Extract issues (after "Issues/Risks/Concerns:" or in lists)
    // Handle both **Issues/Risks/Concerns:** and *Issues/Risks/Concerns:** formats
    const issuesMatch = sectionText.match(/\*{1,2}issues[/\s]risks[/\s]concerns:?\*{0,2}\s*\n(.+?)(?=\n\n|\n\*{1,2}details:|\n\*{1,2}summary:|\n##|$)/is);
    if (issuesMatch) {
      const issuesText = issuesMatch[1].trim();
      
      // Check if the entire content is just "None identified" (even if formatted with section labels)
      const containsOnlyNone = /^\*{0,2}issues[/\s]risks[/\s]concerns:?\*{0,2}\s*[-•*]?\s*(?:none|no issues?|no risks?|no concerns?|none identified)[\s.]*$/i.test(issuesText) ||
                               /^[-•*]\s*(?:none|no issues?|no risks?|no concerns?|none identified)[\s.]*$/i.test(issuesText) ||
                               /^(?:none|no issues?|no risks?|no concerns?|none identified)[\s.]*$/i.test(issuesText);
      
      if (containsOnlyNone) {
        // Don't add any issues, but mark that we found "none"
        // The green dot will show automatically since issues.length === 0
      } else {
        // Extract list items or lines that look like issues
        const issueLines = issuesText.split(/\n/).filter(line => {
          const originalLine = line.trim();
          
          // Skip lines that contain section labels (like *Issues/Risks/Concerns:**)
          if (/\*{1,2}(issues|risks|concerns|details|summary|key\s+legal\s+findings):/i.test(originalLine)) {
            return false;
          }
          
          // Remove markdown formatting and bullet points
          const trimmed = originalLine
            .replace(/^\*+\s*/, "") // Remove leading asterisks
            .replace(/^[-•*]\s*/, "") // Remove bullet points
            .replace(/^(critical|warning):\s*/i, "") // Remove severity prefixes
            .trim();
          
          // Skip lines that say "None identified" or similar
          if (/^(none|no issues?|no risks?|no concerns?|none identified)[\s.]*$/i.test(trimmed)) {
            return false;
          }
          // Skip section labels (double check after cleaning)
          if (/^(issues|risks|concerns|details|summary|key\s+legal\s+findings):/i.test(trimmed)) {
            return false;
          }
          // Skip if the line contains "None identified" as part of a section label pattern
          if (/issues[/\s]risks[/\s]concerns.*none\s+identified/i.test(originalLine)) {
            return false;
          }
          
          return trimmed && isIssue(trimmed) && trimmed.length < 500;
        });
        issues.push(...issueLines);
      }
    }
    
    // Also check for bullet lists that might be issues (look for lists after section header)
    // But skip if we already found issues in the Issues/Risks/Concerns section
    if (issues.length === 0) {
      const listMatches = sectionText.match(/(?:^[-•*]\s+.+$)+/gm);
      if (listMatches) {
        for (const list of listMatches) {
          const items = list.split(/\n/).map(line => line.replace(/^[-•*]\s+/, "").trim());
          const issueItems = items.filter(item => {
            // Skip lines that contain section labels
            if (/\*{1,2}(issues|risks|concerns|details|summary|key\s+legal\s+findings):/i.test(item)) {
              return false;
            }
            // Skip "None identified" or similar
            if (/^(critical|warning):\s*(none|no issues?|no risks?|no concerns?|none identified)[\s.]*$/i.test(item)) {
              return false;
            }
            if (/^(none|no issues?|no risks?|no concerns?|none identified)[\s.]*$/i.test(item)) {
              return false;
            }
            // Skip if contains section label pattern with "None identified"
            if (/issues[/\s]risks[/\s]concerns.*none\s+identified/i.test(item)) {
              return false;
            }
            return isIssue(item) && item.length < 500;
          });
          issues.push(...issueItems);
        }
      }
    }
    
    // Also check paragraphs that look like issues (if no issues found yet)
    if (issues.length === 0) {
      const paragraphs = sectionText.split(/\n\n/).filter(p => {
        const trimmed = p.trim();
        // Skip section labels (check both with and without markdown formatting)
        if (/^\*{1,2}(issues|risks|concerns|details|summary|key\s+legal\s+findings):/i.test(trimmed)) {
          return false;
        }
        // Skip lines that contain section label patterns with "None identified"
        if (/issues[/\s]risks[/\s]concerns.*none\s+identified/i.test(trimmed)) {
          return false;
        }
        // Skip "None identified" or similar
        if (/^(none|no issues?|no risks?|no concerns?|none identified)[\s.]*$/i.test(trimmed)) {
          return false;
        }
        // Skip lines that contain "None identified" as part of the text (but not as a real issue)
        if (/none\s+identified/i.test(trimmed) && !isIssue(trimmed.replace(/none\s+identified/gi, "").trim())) {
          return false;
        }
        return trimmed && !trimmed.startsWith("##") && !trimmed.match(/^(summary|issues|details):/i) && isIssue(trimmed);
      });
      issues.push(...paragraphs.slice(0, 5)); // Limit to 5 to avoid too many
    }
    
    // Extract details - handle both **Details:** and *Details:** formats
    const detailsMatch = sectionText.match(/\*{1,2}details:?\*{0,2}\s*\n(.+?)(?=\n\n##|\n\*{1,2}key\s+legal\s+findings:|\n\*{1,2}issues:|$)/is);
    if (detailsMatch) {
      const detailsText = detailsMatch[1].trim();
      if (!description) {
        description = detailsText;
      } else {
        description += "\n\n" + detailsText;
      }
    }
    
    // For simple sections like Covenants/Tenure, use the description as rightContent
    if ((title.toLowerCase().includes("covenants") || title.toLowerCase().includes("tenure")) && description && !issues.length) {
      rightContent = description.split("\n")[0].trim();
      description = "";
    }
    
    sections.push({ title, issues, description, keyFindings, rightContent });
  }
  
  return sections;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const sections = useMemo(() => parseMarkdownSections(content), [content]);
  
  // If we successfully parsed sections, render them in ReportSection style
  if (sections.length > 0) {
    return (
      <div className={cn("", className)}>
        {sections.map((section, index) => {
          // Determine dot color based on issues (green if no issues, warning/critical if issues exist)
          const dotColor = section.issues.length === 0 ? "green" : undefined;
          
          return (
            <div key={index} className="py-5 border-b border-border last:border-b-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {dotColor && (
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full",
                        dotColor === "green" && "bg-success"
                      )}
                    />
                  )}
                  <h3 className="font-semibold text-foreground">{section.title}</h3>
                </div>
                {section.rightContent && (
                  <span className="text-foreground">{section.rightContent}</span>
                )}
              </div>
              {section.issues.length > 0 && (
                <p className="text-sm text-muted-foreground mb-3">
                  {section.issues.length} potential issue{section.issues.length !== 1 ? "s" : ""} found
                </p>
              )}
              {section.issues.length > 0 && (
                <div className="space-y-2">
                  {section.issues.map((issue, i) => (
                    <IssueBadge key={i} text={issue} />
                  ))}
                </div>
              )}
              {section.keyFindings && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Key Legal Findings</p>
                  <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {section.keyFindings}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
              {section.description && (
                <div className="text-sm text-muted-foreground mt-3 bg-muted/50 p-3 rounded-md prose prose-sm max-w-none">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]} 
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="space-y-1.5 mt-2 mb-0 list-disc list-inside">{children}</ul>,
                      li: ({ children }) => <li className="ml-0">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                    }}
                  >
                    {section.description}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }
  
  // Fallback to regular markdown rendering if parsing fails
  return (
    <div className={cn("", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (props) => (
            <h1 className="text-2xl font-bold mt-6 mb-4 text-foreground" {...props} />
          ),
          h2: ({ children, ...props }) => {
            const sectionTitle = String(children);
            return (
              <div className="py-5 border-b border-border first:pt-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{sectionTitle}</h3>
                  </div>
                </div>
              </div>
            );
          },
          h3: (props) => (
            <h3 className="text-lg font-semibold mt-4 mb-2 text-foreground" {...props} />
          ),
          p: ({ children, ...props }) => {
            const text = String(children).trim();
            
            // Skip "Summary:", "Issues/Risks/Concerns:", "Details:" labels
            if (/^(summary|issues[/\s]risks[/\s]concerns|details):?$/i.test(text)) {
              return null;
            }
            
            if (isIssue(text)) {
              return <IssueBadge text={text} />;
            }
            
            return (
              <p className="text-sm text-muted-foreground mt-3 bg-muted/50 p-3 rounded-md" {...props}>
                {children}
              </p>
            );
          },
          ul: (props) => (
            <ul className="space-y-2 mt-3" {...props} />
          ),
          ol: (props) => (
            <ol className="mb-3 ml-6 list-decimal space-y-1 text-foreground mt-3" {...props} />
          ),
          li: ({ children, ...props }) => {
            const text = String(children).trim();
            
            if (isIssue(text)) {
              return <IssueBadge text={text.replace(/^[•*-]\s*/, "")} />;
            }
            
            return (
              <li className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md" {...props}>
                {children}
              </li>
            );
          },
          strong: (props) => (
            <strong className="font-semibold text-foreground" {...props} />
          ),
          em: (props) => (
            <em className="italic text-foreground" {...props} />
          ),
          code: ({ className, children, ...props }: { className?: string; children?: React.ReactNode }) => {
            const isInline = !className;
            return isInline ? (
              <code
                className="px-1.5 py-0.5 rounded bg-muted text-foreground text-sm font-mono"
                {...props}
              >
                {children}
              </code>
            ) : (
              <code
                className="block p-3 rounded-md bg-muted text-foreground text-sm font-mono overflow-x-auto mb-3"
                {...props}
              >
                {children}
              </code>
            );
          },
          table: (props) => (
            <div className="overflow-x-auto mb-4 -mx-2 mt-4">
              <table className="w-full text-sm min-w-[500px]" {...props} />
            </div>
          ),
          thead: (props) => (
            <thead className="bg-muted" {...props} />
          ),
          th: (props) => (
            <th className="text-left py-2 px-2 font-medium text-muted-foreground" {...props} />
          ),
          tbody: (props) => <tbody {...props} />,
          tr: (props) => (
            <tr className="border-b border-border last:border-0" {...props} />
          ),
          td: (props) => (
            <td className="py-2 px-2 text-foreground" {...props} />
          ),
          blockquote: (props) => (
            <blockquote
              className="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground bg-muted/50 p-3 rounded-md"
              {...props}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
