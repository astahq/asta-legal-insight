import { PropertyDetails as PropertyDetailsType } from "@/lib/demoReportData";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface PropertyDetailsProps {
  details: PropertyDetailsType;
}

export function PropertyDetails({ details }: PropertyDetailsProps) {
  const formatValue = (value: string | number | undefined | null, isUnknown = false) => {
    if (value === undefined || value === null) return "—";
    if (isUnknown && value === "Unknown") return "—";
    return value;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Guide Price</p>
            <p className="text-3xl font-bold text-foreground">
              {formatValue(details.guidePrice, true)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-muted-foreground mb-1">Auction Date</p>
            <p className="text-xl font-semibold text-foreground">
              {formatValue(details.auctionDate, true)}
            </p>
            {details.auctionDateNote && (
              <p className="text-xs text-muted-foreground mt-0.5">{details.auctionDateNote}</p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Separator />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          <DetailItem label="Address" value={details.address} />
          <DetailItem label="Property Type" value={details.propertyType} isUnknown />
          <DetailItem label="Bedrooms" value={details.bedrooms} />
          <DetailItem label="Bathrooms" value={details.bathrooms} />
          <DetailItem label="Size" value={details.size} isUnknown />
          <DetailItem label="Catalog Number" value={details.catalogNumber} />
          <DetailItem label="Lot Type" value={details.lotType} />
          <DetailItem label="EPC Rating" value={details.epcRating} />
          <DetailItem label="Council Tax" value={details.councilTax} />
          <DetailItem label="Buyers' Charge" value={details.buyersCharge} />
          <DetailItem label="Admin Charge Band" value={details.administrationChargeBand} />
        </div>
        {details.description && (
          <>
            <Separator />
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Description
              </p>
              <p className="text-sm text-foreground leading-relaxed">{details.description}</p>
            </div>
          </>
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
    value === undefined || value === null || (isUnknown && value === "Unknown")
      ? "—"
      : value;

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-foreground">{displayValue}</p>
    </div>
  );
}
