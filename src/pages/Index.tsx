import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { UploadSection } from "@/components/dashboard/UploadSection";
import { LastReports } from "@/components/dashboard/LastReports";
import { AuctionCalendar } from "@/components/dashboard/AuctionCalendar";

const Index = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6 w-full">
        <StatsCards />
        <UploadSection />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LastReports />
          <AuctionCalendar />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
