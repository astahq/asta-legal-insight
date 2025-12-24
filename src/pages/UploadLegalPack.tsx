import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { UploadSection } from "@/components/dashboard/UploadSection";

const UploadLegalPack = () => {
  return (
    <DashboardLayout userName="Jack Williams">
      <div className="max-w-4xl mx-auto">
        <UploadSection />
      </div>
    </DashboardLayout>
  );
};

export default UploadLegalPack;
