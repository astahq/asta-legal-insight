import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { UploadSection } from "@/components/dashboard/UploadSection";
import { LastReports } from "@/components/dashboard/LastReports";

const Index = () => {
  return (
    <DashboardLayout>
      <div className="space-y-5">
        <StatsCards />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3">
            <UploadSection />
          </div>
          <div className="lg:col-span-2">
            <LastReports />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
