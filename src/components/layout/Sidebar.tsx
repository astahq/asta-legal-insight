import { 
  LayoutDashboard, 
  FileText, 
  Star, 
  GitCompare, 
  Bell, 
  Settings, 
  HelpCircle,
  Plus
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import astaLogo from "@/assets/asta-logo.png";

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: string;
  badgeColor?: string;
}

const mainNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: FileText, label: "Reports", href: "/reports" },
  { icon: Star, label: "Watchlist", href: "/watchlist" },
  { icon: GitCompare, label: "Compare Properties", href: "/compare", badge: "NEW", badgeColor: "bg-primary text-primary-foreground" },
  { icon: Bell, label: "Auction Alerts", href: "/alerts", badge: "coming soon", badgeColor: "bg-destructive/10 text-destructive" },
];

const bottomNavItems: NavItem[] = [
  { icon: Settings, label: "Billing & Settings", href: "/settings" },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 flex items-center justify-center">
            <img src={astaLogo} alt="Asta" className="w-8 h-8 object-contain" />
          </div>
          <span className="font-semibold text-sidebar-foreground">Property Bidding Assistant</span>
        </Link>
      </div>

      {/* New Analysis Button */}
      <div className="p-4">
        <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
          <Link to="/upload">
            <Plus className="w-4 h-4 mr-2" />
            New Property Analysis
          </Link>
        </Button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {mainNavItems.map((item) => (
            <li key={item.label}>
              <Link
                to={item.href}
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
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom Navigation */}
      <nav className="p-3 border-t border-sidebar-border">
        <ul className="space-y-1">
          {bottomNavItems.map((item) => (
            <li key={item.label}>
              <Link 
                to={item.href} 
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
            <a 
              href="mailto:hello@useasta.com" 
              className="nav-item"
            >
              <HelpCircle className="w-5 h-5" />
              <span>Support</span>
            </a>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
