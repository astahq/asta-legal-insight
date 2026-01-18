import { Document } from "@/lib/demoReportData";
import { useState, useCallback, useMemo, memo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DocumentsTableProps {
  documents: Document[];
}

const MAX_VISIBLE_LINES = 2;
const MAX_LINE_LENGTH_THRESHOLD = 150;

function formatKeyFindings(text: string): string {
  if (!text?.trim() || text === "—") {
    return "—";
  }

  return text
    .trim()
    .replace(/^[-•]\s+/gm, "")
    .replace(/\s*[-•]\s+/g, "\n")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

function shouldTruncateFindings(lines: string[], formatted: string): boolean {
  return lines.length > MAX_VISIBLE_LINES || 
         (lines.length === MAX_VISIBLE_LINES && formatted.length > MAX_LINE_LENGTH_THRESHOLD);
}

interface KeyFindingsCellProps {
  findings: string;
  isExpanded: boolean;
  onToggle: () => void;
}

const KeyFindingsCell = memo(function KeyFindingsCell({ 
  findings, 
  isExpanded, 
  onToggle 
}: KeyFindingsCellProps) {
  const formatted = useMemo(() => formatKeyFindings(findings), [findings]);
  const lines = useMemo(() => formatted.split("\n"), [formatted]);
  const needsTruncation = useMemo(() => shouldTruncateFindings(lines, formatted), [lines, formatted]);
  const displayLines = useMemo(() => isExpanded ? lines : lines.slice(0, MAX_VISIBLE_LINES), [isExpanded, lines]);
  const remainingCount = useMemo(() => Math.max(0, lines.length - MAX_VISIBLE_LINES), [lines.length]);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle();
  }, [onToggle]);

  if (!formatted || formatted === "—") {
    return <td className="py-3 px-3 text-muted-foreground">—</td>;
  }

  return (
    <td className="py-3 px-3">
      <div className="space-y-1.5">
        <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
          {displayLines.join("\n")}
          {!isExpanded && needsTruncation && remainingCount > 0 && (
            <span className="text-muted-foreground/70">
              {`\n... ${remainingCount} more ${remainingCount === 1 ? "item" : "items"}`}
            </span>
          )}
        </div>
        {needsTruncation && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggle}
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3 h-3 mr-1" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3 mr-1" />
                Show more
              </>
            )}
          </Button>
        )}
      </div>
    </td>
  );
});

interface DocumentRowProps {
  document: Document;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}

const DocumentRow = memo(function DocumentRow({
  document,
  index,
  isExpanded,
  onToggle,
}: DocumentRowProps) {
  const formatted = useMemo(() => formatKeyFindings(document.keyFindings || ""), [document.keyFindings]);
  const hasFindings = formatted !== "—";
  const lines = useMemo(() => hasFindings ? formatted.split("\n") : [], [hasFindings, formatted]);
  const needsTruncation = useMemo(() => hasFindings && shouldTruncateFindings(lines, formatted), [hasFindings, lines, formatted]);

  const handleRowClick = useCallback(() => {
    if (needsTruncation) {
      onToggle();
    }
  }, [needsTruncation, onToggle]);

  return (
    <tr
      onClick={handleRowClick}
      className={cn(
        "border-b border-border last:border-0 hover:bg-muted/30 transition-colors",
        needsTruncation && "cursor-pointer"
      )}
    >
      <td className="py-3 px-3 text-foreground font-medium">{document.name}</td>
      <td className="py-3 px-3 text-foreground">{document.pages || 0}</td>
      <KeyFindingsCell 
        findings={document.keyFindings || ""} 
        isExpanded={isExpanded}
        onToggle={onToggle}
      />
    </tr>
  );
});

export function DocumentsTable({ documents }: DocumentsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = useCallback((index: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  if (documents.length === 0) {
    return (
      <tr>
        <td colSpan={3} className="py-4 px-3 text-center text-muted-foreground">
          No documents found
        </td>
      </tr>
    );
  }

  return (
    <>
      {documents.map((doc, index) => (
        <DocumentRow
          key={`${doc.name}-${index}`}
          document={doc}
          index={index}
          isExpanded={expandedRows.has(index)}
          onToggle={() => toggleRow(index)}
        />
      ))}
    </>
  );
}
