import { PropertyDetails as PropertyDetailsType } from "@/lib/demoReportData";
import { Card, CardContent } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";

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

        {/* Details grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-5">
          <DetailItem label="Property Type" value={details.propertyType} isUnknown />
          <DetailItem label="Bedrooms" value={details.bedrooms} />
          <DetailItem label="Bathrooms" value={details.bathrooms ?? 1} />
          <DetailItem label="Size" value={details.size} isUnknown />
          <DetailItem label="EPC Rating" value={details.epcRating} />
          <DetailItem label="Catalog No." value={details.catalogNumber} />
          <DetailItem label="Lot Type" value={details.lotType} />
          <DetailItem label="Council Tax" value={details.councilTax} />
          <DetailItem label="Buyers' Charge" value={details.buyersCharge} />
          <DetailItem label="Admin Charge" value={details.administrationChargeBand} />
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
}: {
  label: string;
  value: string | number | undefined | null;
  isUnknown?: boolean;
}) {
  const displayValue =
    value === undefined ||
    value === null ||
    value === "" ||
    (isUnknown && value === "Unknown")
      ? "—"
      : value;

  return (
    <div>
      <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-[14px] font-medium text-foreground/80 mt-0.5">{displayValue}</p>
    </div>
  );
}
