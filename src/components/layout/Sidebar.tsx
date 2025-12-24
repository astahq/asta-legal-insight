import { 
  LayoutDashboard, 
  FileText, 
  Star, 
  GitCompare, 
  Bell, 
  Settings, 
  HelpCircle,
  Plus,
  Home
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  active?: boolean;
  badge?: string;
  badgeColor?: string;
}

const mainNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/", active: true },
  { icon: FileText, label: "Reports", href: "/reports" },
  { icon: Star, label: "Watchlist", href: "/watchlist" },
  { icon: GitCompare, label: "Compare Properties", href: "/compare", badge: "NEW", badgeColor: "bg-primary text-primary-foreground" },
  { icon: Bell, label: "Auction Alerts", href: "/alerts", badge: "coming soon", badgeColor: "bg-destructive/10 text-destructive" },
];

const bottomNavItems: NavItem[] = [
  { icon: Settings, label: "Billing & Settings", href: "/settings" },
  { icon: HelpCircle, label: "Support", href: "/support" },
];

export function Sidebar() {
  return (
    <aside className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Home className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sidebar-foreground">Property Bidding Assistant</span>
        </div>
      </div>

      {/* New Analysis Button */}
      <div className="p-4">
        <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" />
          New Property Analysis
        </Button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {mainNavItems.map((item) => (
            <li key={item.label}>
              <a
                href={item.href}
                className={cn(
                  "nav-item",
                  item.active && "nav-item-active"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", item.badgeColor)}>
                    {item.badge}
                  </span>
                )}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom Navigation */}
      <nav className="p-3 border-t border-sidebar-border">
        <ul className="space-y-1">
          {bottomNavItems.map((item) => (
            <li key={item.label}>
              <a href={item.href} className="nav-item">
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
