import { useState, useCallback, useMemo, useEffect } from "react";
import { Star, Pencil, Check, X, Share2, Link2, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from "@/components/ui/button-group";
import { DocumentChat } from "./DocumentChat";
import { useToggleShare } from "@/hooks/useReport";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface PropertyHeaderProps {
  propertyAddress: string;
  fullPropertyAddress: string;
  propertySubtitle?: string;
  onWatchlist: boolean;
  onToggleWatchlist: () => void;
  onUpdateName?: (name: string) => void;
  reportId: string;
  isDemo: boolean;
  isAnalysisComplete: boolean;
  isPublic?: boolean;
  shareToken?: string | null;
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
  isAnalysisComplete,
  isPublic = false,
  shareToken = null,
}: PropertyHeaderProps) {
  const { user } = useAuth();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [showShareField, setShowShareField] = useState(false);
  const toggleShare = useToggleShare(reportId, isDemo, isPublic);

  useEffect(() => {
    if (isPublic && shareToken) {
      setShowShareField(true);
    } else {
      setShowShareField(false);
    }
  }, [isPublic, shareToken]);

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
  const canShare = !isDemo && user && isAnalysisComplete;

  const shareUrl = useMemo(() => {
    if (isPublic && shareToken) {
      return `${window.location.origin}/reports/${reportId}?token=${shareToken}`;
    }
    return null;
  }, [isPublic, shareToken, reportId]);

  const handleShare = useCallback(() => {
    if (isPublic && shareToken) {
      setShowShareField(true);
    } else {
      toggleShare.mutate();
    }
  }, [isPublic, shareToken, toggleShare]);

  const handleCopyLink = useCallback(() => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard");
    }
  }, [shareUrl]);

  const handleMakePrivate = useCallback(() => {
    toggleShare.mutate();
  }, [toggleShare]);

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
      <div className="flex items-center gap-3 print:hidden flex-shrink-0 flex-wrap">
        <ButtonGroup
          orientation="horizontal"
          aria-label="Report actions"
          className="rounded-xl overflow-hidden bg-background border border-border shadow-elevation-2 [&>*:first-child]:rounded-l-xl [&>*:last-child]:rounded-r-xl"
        >
          <DocumentChat
            reportId={reportId}
            propertyAddress={propertyAddress}
            isDemo={isDemo}
            isAnalysisComplete={isAnalysisComplete}
            buttonClassName={(isDemo || canShare) ? "rounded-l-xl rounded-r-none border-0 shadow-none h-10" : undefined}
          />
          {(isDemo || canShare) && (
            <ButtonGroupSeparator orientation="vertical" className="bg-neutral-200" />
          )}
          {isDemo ? (
            <ButtonGroupText asChild>
              <span className="inline-flex h-10 w-10 items-center justify-center text-foreground/70" aria-hidden>
                <Star className={cn("w-4 h-4", onWatchlist && "fill-amber-500 text-amber-500")} />
              </span>
            </ButtonGroupText>
          ) : (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={onToggleWatchlist}
                    disabled={!isAnalysisComplete}
                    className={cn(
                      "h-10 w-10 rounded-none text-foreground/80 transition-colors duration-150 hover:bg-neutral-200 hover:text-foreground",
                      onWatchlist && "text-amber-600 hover:text-amber-600"
                    )}
                  >
                    <Star className={cn("w-4 h-4", onWatchlist && "fill-current")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {onWatchlist ? "On watchlist" : "Add to watchlist"}
                </TooltipContent>
              </Tooltip>
              {canShare && (
                <>
                  <ButtonGroupSeparator orientation="vertical" className="bg-neutral-200" />
                  {showShareField && shareUrl ? (
                    <div className="flex items-center gap-0.5 pr-2 py-1 min-w-0 max-w-[200px] bg-muted/40">
                      <Input
                        value={shareUrl}
                        readOnly
                        className="h-8 text-xs border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 flex-1 min-w-0 rounded-none"
                        onClick={(e) => e.currentTarget.select()}
                      />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" onClick={handleCopyLink} className="h-8 w-8 shrink-0 rounded-md text-foreground/80 transition-colors duration-150 hover:bg-neutral-200 hover:text-foreground">
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Copy link</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" onClick={handleMakePrivate} disabled={toggleShare.isPending} className="h-8 w-8 shrink-0 rounded-md text-foreground/80 transition-colors duration-150 hover:bg-neutral-200 hover:text-foreground">
                            {toggleShare.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Make private</TooltipContent>
                      </Tooltip>
                    </div>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={handleShare}
                          disabled={toggleShare.isPending}
                          className={cn(
                            "h-10 w-10 rounded-none text-foreground/80 transition-colors duration-150 hover:bg-neutral-200 hover:text-foreground",
                            isPublic && "text-primary"
                          )}
                        >
                          {toggleShare.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : isPublic ? (
                            <Link2 className="w-4 h-4" />
                          ) : (
                            <Share2 className="w-4 h-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        {toggleShare.isPending ? "Sharing…" : isPublic ? "Copy link" : "Share report"}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </>
              )}
            </>
          )}
        </ButtonGroup>
      </div>
    </div>
  );
}
