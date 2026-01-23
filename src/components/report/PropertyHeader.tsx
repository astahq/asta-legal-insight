import { useState, useCallback, useMemo } from "react";
import { Star, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DocumentChat } from "./DocumentChat";

interface PropertyHeaderProps {
  propertyAddress: string;
  fullPropertyAddress: string;
  propertySubtitle?: string;
  onWatchlist: boolean;
  onToggleWatchlist: () => void;
  onUpdateName?: (name: string) => void;
  reportId: string;
  isDemo: boolean;
}

export function PropertyHeader({
  propertyAddress,
  fullPropertyAddress,
  propertySubtitle,
  onWatchlist,
  onToggleWatchlist,
  onUpdateName,
  reportId,
  isDemo,
}: PropertyHeaderProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");

  const handleSaveName = useCallback(() => {
    const trimmedName = editedName.trim();
    if (!trimmedName || !onUpdateName) {
      return;
    }
    onUpdateName(trimmedName);
    setIsEditingName(false);
  }, [editedName, onUpdateName]);

  const handleStartEdit = useCallback(() => {
    setEditedName(fullPropertyAddress);
    setIsEditingName(true);
  }, [fullPropertyAddress]);

  const handleCancelEdit = useCallback(() => {
    setIsEditingName(false);
    setEditedName("");
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSaveName();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  }, [handleSaveName, handleCancelEdit]);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedName(e.target.value);
  }, []);

  const showFullTitle = useMemo(() => 
    fullPropertyAddress !== propertyAddress, 
    [fullPropertyAddress, propertyAddress]
  );

  const canEdit = !isDemo && onUpdateName;

  return (
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
      <div className="min-w-0 flex-1 space-y-1">
        {isEditingName && canEdit ? (
          <div className="flex items-center gap-2">
            <Input
              value={editedName}
              onChange={handleNameChange}
              className="text-2xl font-bold h-11 w-full max-w-md"
              autoFocus
              onKeyDown={handleKeyDown}
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={handleSaveName}
            >
              <Check className="w-4 h-4 text-success" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleCancelEdit}
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        ) : (
          <div className="flex items-start gap-3 group min-w-0">
            <h1
              className="text-3xl font-bold tracking-tight text-foreground break-words line-clamp-2"
              title={showFullTitle ? fullPropertyAddress : undefined}
            >
              {propertyAddress}
            </h1>
            {canEdit && (
              <Button
                size="icon"
                variant="ghost"
                className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1"
                onClick={handleStartEdit}
              >
                <Pencil className="w-4 h-4 text-muted-foreground" />
              </Button>
            )}
          </div>
        )}
        {propertySubtitle && (
          <p className="text-sm text-muted-foreground">{propertySubtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-3 print:hidden flex-shrink-0">
        {isDemo ? (
          <span
            className={cn(
              "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
              "border border-primary text-primary bg-background",
              "px-4 py-2 h-10",
              onWatchlist && "bg-primary text-primary-foreground"
            )}
          >
            <Star className={cn("w-4 h-4 mr-2", onWatchlist && "fill-current")} />
            {onWatchlist ? "On Watchlist" : "Add to Watchlist"}
          </span>
        ) : (
          <Button
            variant="outline"
            onClick={onToggleWatchlist}
            className={cn(
              "border-primary text-primary hover:bg-primary hover:text-primary-foreground",
              onWatchlist && "bg-primary text-primary-foreground"
            )}
          >
            <Star className={cn("w-4 h-4 mr-2", onWatchlist && "fill-current")} />
            {onWatchlist ? "On Watchlist" : "Add to Watchlist"}
          </Button>
        )}
        <DocumentChat reportId={reportId} propertyAddress={propertyAddress} isDemo={isDemo} />
      </div>
    </div>
  );
}
