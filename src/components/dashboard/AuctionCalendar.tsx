import { useQuery } from "@tanstack/react-query";
import { Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Auction {
  id: string;
  auction_house: string;
  open_lot: string;
  auction_date: string;
  website: string | null;
  status: string;
}

export function AuctionCalendar() {
  const { data: auctions, isLoading } = useQuery({
    queryKey: ['auction-calendar'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auction_calendar')
        .select('*')
        .order('auction_date', { ascending: true });
      
      if (error) throw error;
      return data as Auction[];
    },
  });

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-muted-foreground" />
        <h3 className="font-semibold text-foreground">Auction Calendar</h3>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : auctions && auctions.length > 0 ? (
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
                  <td className="py-3 text-sm text-foreground">{auction.auction_house}</td>
                  <td className="py-3 text-sm text-muted-foreground">{auction.open_lot}</td>
                  <td className="py-3 text-sm text-muted-foreground">
                    {format(new Date(auction.auction_date), 'd/M/yyyy')}
                  </td>
                  <td className="py-3">
                    {auction.status === "completed" ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-destructive">
                        <span className="w-1.5 h-1.5 bg-destructive rounded-full" />
                        Completed
                      </span>
                    ) : auction.website ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs border-success text-success hover:bg-success/10"
                        asChild
                      >
                        <a href={auction.website} target="_blank" rel="noopener noreferrer">
                          <span className="w-1.5 h-1.5 bg-success rounded-full mr-1.5" />
                          Visit
                        </a>
                      </Button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-warning">
                        <span className="w-1.5 h-1.5 bg-warning rounded-full" />
                        Upcoming
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No auctions scheduled</p>
          <p className="text-xs mt-1">Add auctions via Supabase dashboard</p>
        </div>
      )}
    </div>
  );
}
