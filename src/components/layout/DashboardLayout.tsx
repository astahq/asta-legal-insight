import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useProfile } from "@/contexts/ProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarProvider } from "@/contexts/SidebarProvider";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const userName = profile.full_name || user?.email?.split('@')[0] || 'User';
  const avatarUrl = profile.avatar_url;

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-secondary">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden w-full">
          <Header userName={userName} avatarUrl={avatarUrl} />
          <main className="flex-1 overflow-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
