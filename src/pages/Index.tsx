import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { UploadSection } from "@/components/dashboard/UploadSection";
import { LastReports } from "@/components/dashboard/LastReports";

const Index = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6 w-full">
        <StatsCards />
        <UploadSection />
        <LastReports />
      </div>
    </DashboardLayout>
  );
};

export default Index;
