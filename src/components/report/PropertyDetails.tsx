import { ReactNode } from "react";
import { PropertyDetails as PropertyDetailsType } from "@/lib/demoReportData";
import { Card, CardContent } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import {
  Home,
  BedDouble,
  Bath,
  Maximize,
  Zap,
  Hash,
  Building2,
  Receipt,
  CreditCard,
  Settings,
} from "lucide-react";

interface PropertyDetailsProps {
  details?: PropertyDetailsType | undefined;
}

function hasPropertyDetails(d: PropertyDetailsType | undefined): boolean {
  return !!d?.guidePrice || !!d?.auctionDate || !!d?.propertyType;
}

export function PropertyDetails({ details }: PropertyDetailsProps) {
  if (!hasPropertyDetails(details)) return null;

  const hasGuidePrice = details.guidePrice && details.guidePrice !== "Unknown";
  const hasAuctionDate = details.auctionDate && details.auctionDate !== "Unknown";

  return (
    <Card>
      <CardContent className="px-5 py-5 md:px-7">
        {/* Hero row */}
        {(hasGuidePrice || hasAuctionDate) && (
          <div className="flex flex-wrap items-baseline justify-between gap-4 mb-6 pb-5 border-b border-border/30">
            {hasGuidePrice && (
              <div>
                <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider mb-1">Guide Price</p>
                <p className="text-2xl font-semibold text-foreground/90 tracking-tight">{details.guidePrice}</p>
              </div>
            )}
            {hasAuctionDate && (
              <div className={hasGuidePrice ? "text-right" : ""}>
                <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider mb-1">Auction Date</p>
                <p className="text-lg font-semibold text-foreground/90 tracking-tight">{details.auctionDate}</p>
                {details.auctionDateNote && (
                  <p className="text-[11px] text-muted-foreground/55 mt-0.5">{details.auctionDateNote}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Details grid with icons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          <DetailItem label="Property Type" value={details.propertyType} isUnknown icon={<Home className="w-3.5 h-3.5" />} />
          <DetailItem label="Bedrooms" value={details.bedrooms} icon={<BedDouble className="w-3.5 h-3.5" />} />
          <DetailItem label="Bathrooms" value={details.bathrooms ?? 1} icon={<Bath className="w-3.5 h-3.5" />} />
          <DetailItem label="Size" value={details.size} isUnknown icon={<Maximize className="w-3.5 h-3.5" />} />
          <DetailItem label="EPC Rating" value={details.epcRating} icon={<Zap className="w-3.5 h-3.5" />} />
          <DetailItem label="Catalog No." value={details.catalogNumber} icon={<Hash className="w-3.5 h-3.5" />} />
          <DetailItem label="Lot Type" value={details.lotType} icon={<Building2 className="w-3.5 h-3.5" />} />
          <DetailItem label="Council Tax" value={details.councilTax} icon={<Receipt className="w-3.5 h-3.5" />} />
          <DetailItem label="Buyers' Charge" value={details.buyersCharge} icon={<CreditCard className="w-3.5 h-3.5" />} />
          <DetailItem label="Admin Charge" value={details.administrationChargeBand} icon={<Settings className="w-3.5 h-3.5" />} />
        </div>

        {details.description && (
          <div className="border-t border-border/30 pt-5 mt-6">
            <ReactMarkdown
              components={{
                p: ({ ...props }) => (
                  <p className="text-[13px] text-foreground/65 leading-[1.7] mb-1 last:mb-0" {...props} />
                ),
                strong: ({ ...props }) => <strong className="font-semibold text-foreground/70" {...props} />,
                em: ({ ...props }) => <em className="italic" {...props} />,
                ul: ({ ...props }) => <ul className="list-disc list-inside my-1 space-y-0.5" {...props} />,
                ol: ({ ...props }) => <ol className="list-decimal list-inside my-1 space-y-0.5" {...props} />,
                li: ({ ...props }) => <li className="text-[13px] text-foreground/65 leading-[1.7]" {...props} />,
              }}
            >
              {details.description}
            </ReactMarkdown>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DetailItem({
  label,
  value,
  isUnknown = false,
  icon,
}: {
  label: string;
  value: string | number | undefined | null;
  isUnknown?: boolean;
  icon?: ReactNode;
}) {
  const displayValue =
    value === undefined ||
    value === null ||
    value === "" ||
    (isUnknown && value === "Unknown")
      ? "—"
      : value;

  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-border/30 bg-muted/15 px-3 py-2.5">
      {icon && (
        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-foreground/5 text-muted-foreground/60 flex-shrink-0 mt-0.5">
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
          {label}
        </p>
        <p className="text-[13px] font-medium text-foreground/80 mt-0.5 truncate">{displayValue}</p>
      </div>
    </div>
  );
}
