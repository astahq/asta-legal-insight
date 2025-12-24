import { Calendar, ExternalLink, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Auction {
  id: string;
  auctionHouse: string;
  openLot: number;
  date: string;
  status: "completed" | "upcoming";
}

const auctions: Auction[] = [
  {
    id: "1",
    auctionHouse: "Savills Auctions",
    openLot: 43,
    date: "1/12/2025",
    status: "completed",
  },
  {
    id: "2",
    auctionHouse: "Bond Wolfe",
    openLot: 42,
    date: "2/01/2026",
    status: "upcoming",
  },
  {
    id: "3",
    auctionHouse: "Auction House",
    openLot: 21,
    date: "2/01/2026",
    status: "upcoming",
  },
  {
    id: "4",
    auctionHouse: "Barnard Marcus",
    openLot: 31,
    date: "2/2/2026",
    status: "upcoming",
  },
];

export function AuctionCalendar() {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-muted-foreground" />
        <h3 className="font-semibold text-foreground">Auction Calendar</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="table-header text-left pb-3">Auction House</th>
              <th className="table-header text-left pb-3">Open Lot</th>
              <th className="table-header text-left pb-3">Date</th>
              <th className="table-header text-left pb-3">Website</th>
            </tr>
          </thead>
          <tbody>
            {auctions.map((auction) => (
              <tr key={auction.id} className="border-b border-border last:border-0">
                <td className="py-3 text-sm text-foreground">{auction.auctionHouse}</td>
                <td className="py-3 text-sm text-muted-foreground">{auction.openLot}</td>
                <td className="py-3 text-sm text-muted-foreground">{auction.date}</td>
                <td className="py-3">
                  {auction.status === "completed" ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-destructive">
                      <span className="w-1.5 h-1.5 bg-destructive rounded-full" />
                      Completed
                    </span>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-success text-success hover:bg-success/10"
                    >
                      <span className="w-1.5 h-1.5 bg-success rounded-full mr-1.5" />
                      Visit
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
