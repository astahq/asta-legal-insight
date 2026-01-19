import { 
  LayoutDashboard, 
  FileText, 
  Star, 
  GitCompare, 
  Bell, 
  Settings, 
  HelpCircle,
  Plus,
  LogOut
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import astaLogo from "@/assets/asta-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: string;
  badgeColor?: string;
  disabled?: boolean;
}

const mainNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: FileText, label: "Reports", href: "/reports" },
  { icon: Star, label: "Watchlist", href: "/watchlist" },
  { icon: GitCompare, label: "Compare Properties", href: "/compare", badge: "NEW", badgeColor: "bg-primary text-primary-foreground" },
  { icon: Bell, label: "Auction Alerts", href: "/alerts", badge: "coming soon", badgeColor: "bg-destructive/10 text-destructive", disabled: true },
];

const bottomNavItems: NavItem[] = [
  { icon: Settings, label: "Billing & Settings", href: "/settings" },
];

function SidebarContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isMobile, setIsOpen } = useSidebar();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleLinkClick = () => {
    if (isMobile) {
      setIsOpen(false);
    }
  };

  return (
    <div className="w-64 h-full bg-sidebar flex flex-col">
      <div className="p-4 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2" onClick={handleLinkClick}>
          <div className="w-8 h-8 flex items-center justify-center">
            <img src={astaLogo} alt="Asta" className="w-8 h-8 object-contain" />
          </div>
          <span className="font-semibold text-sidebar-foreground">Asta</span>
        </Link>
      </div>

      <div className="p-4">
        <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
          <Link to="/upload" onClick={handleLinkClick}>
            <Plus className="w-4 h-4 mr-2" />
            New Property Analysis
          </Link>
        </Button>
      </div>

      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {mainNavItems.map((item) => (
            <li key={item.label}>
              {item.disabled ? (
                <span
                  className="nav-item opacity-50 cursor-not-allowed"
                >
                  <item.icon className="w-5 h-5" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", item.badgeColor)}>
                      {item.badge}
                    </span>
                  )}
                </span>
              ) : (
                <Link
                  to={item.href}
                  onClick={handleLinkClick}
                  className={cn(
                    "nav-item",
                    location.pathname === item.href && "nav-item-active"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", item.badgeColor)}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <nav className="p-3 border-t border-sidebar-border">
        <ul className="space-y-1">
          {bottomNavItems.map((item) => (
            <li key={item.label}>
              <Link 
                to={item.href}
                onClick={handleLinkClick}
                className={cn(
                  "nav-item",
                  location.pathname === item.href && "nav-item-active"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
          <li>
            <Link 
              to="/support"
              onClick={handleLinkClick}
              className={cn(
                "nav-item",
                location.pathname === "/support" && "nav-item-active"
              )}
            >
              <HelpCircle className="w-5 h-5" />
              <span>Support</span>
            </Link>
          </li>
          <li>
            <button 
              onClick={handleSignOut}
              className="nav-item w-full text-left text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-5 h-5" />
              <span>Exit</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}

export function Sidebar() {
  const { isOpen, setIsOpen, isMobile } = useSidebar();

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="left" className="w-64 p-0 bg-sidebar border-sidebar-border">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside className="hidden md:flex border-r border-sidebar-border">
      <SidebarContent />
    </aside>
  );
}
