import {
  LayoutDashboard,
  FileText,
  Star,
  Settings,
  HelpCircle,
  Plus,
  LogOut,
  CreditCard,
  TrendingUp,
  Crown
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import astaLogo from "@/assets/asta-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { useBilling } from "@/contexts/BillingContext";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { usePostHog } from "posthog-js/react";

function SidebarUsageDisplay() {
  const navigate = useNavigate();
  const { usage, access, subscription, hasUsageLimits, isNearLimit, isAtLimit, isPaidPlan, isTrialActive, isCanceled } = useBilling();

  const hasValidSubscription = Boolean(
    subscription && ['active', 'trialing'].includes(subscription.status)
  );

  if (!access?.hasAccess && !isTrialActive && !hasValidSubscription) {
    return (
      <div className="px-3 pb-3">
        <button
          onClick={() => navigate('/pricing')}
          className="w-full p-3 rounded-lg bg-sidebar-primary/10 hover:bg-sidebar-primary/20 transition-colors text-left"
        >
          <div className="flex items-center gap-2 text-sidebar-primary font-medium text-sm">
            <Crown className="w-4 h-4" />
            Upgrade to Pro
          </div>
          <p className="text-xs text-[hsl(var(--sidebar-muted-foreground))] mt-1">
            Get unlimited analyses
          </p>
        </button>
      </div>
    );
  }

  if (isPaidPlan && !hasUsageLimits) {
    return (
      <div className="px-3 pb-3">
        <div className="p-3 rounded-xl bg-sidebar-accent">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[hsl(var(--sidebar-muted-foreground))]">Plan</span>
            <span className="text-xs font-medium text-emerald-400 capitalize">
              {access?.planId || 'Professional'}
            </span>
          </div>
          <p className="text-sm font-medium text-sidebar-foreground mt-1">Unlimited analyses</p>
        </div>
      </div>
    );
  }

  if (hasUsageLimits && usage) {
    return (
      <div className="px-3 pb-3">
        <div className={cn(
          "p-3 rounded-xl transition-colors",
          isAtLimit ? "bg-red-500/[0.06]" : isNearLimit ? "bg-yellow-500/[0.06]" : isCanceled ? "bg-orange-500/[0.06]" : "bg-sidebar-accent"
        )}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[hsl(var(--sidebar-muted-foreground))]">
              {isTrialActive ? 'Trial Usage' : isCanceled ? 'Canceling' : 'Monthly Usage'}
            </span>
            <span className={cn(
              "text-xs font-medium",
              isAtLimit ? "text-red-400" : isNearLimit ? "text-yellow-400" : "text-sidebar-foreground"
            )}>
              {usage.remaining} left
            </span>
          </div>
          <Progress
            value={usage.percentUsed}
            className={cn(
              "h-1",
              isAtLimit && "[&>div]:bg-red-400",
              isNearLimit && !isAtLimit && "[&>div]:bg-yellow-400"
            )}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-[hsl(var(--sidebar-muted-foreground))]">
              {usage.used} / {usage.limit} used
            </span>
            {access?.planId === 'starter' && !isTrialActive && !isCanceled && (
              <button
                onClick={() => navigate('/pricing')}
                className="text-xs text-sidebar-primary hover:underline flex items-center gap-1"
              >
                <TrendingUp className="w-3 h-3" />
                Upgrade
              </button>
            )}
            {isCanceled && (
              <button
                onClick={() => navigate('/billing')}
                className="text-xs text-orange-400 hover:underline"
              >
                Reactivate
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: string;
  badgeColor?: string;
  disabled?: boolean;
  posthogEventName?: string;
}

const mainNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: FileText, label: "Reports", href: "/reports" },
  { icon: Star, label: "Watchlist", href: "/watchlist" },
];

const bottomNavItems: NavItem[] = [
  { icon: CreditCard, label: "Pricing", href: "/pricing" },
  { icon: Settings, label: "Billing & Settings", href: "/billing" },
];

function SidebarContent() {
  const posthog = usePostHog();
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

    posthog.capture("sidebar_new_property_analysis_button_clicked", {
      button_name: "New Property Analysis",
      href: "/upload",
    });
  };

  const handleNavItemClick = (eventName: string, buttonText: string) => {
    posthog.capture(eventName, {
      button_text: buttonText,
    });
  };

  return (
    <div className="w-60 h-full bg-sidebar flex flex-col">
      <div className="px-4 pt-5 pb-6">
        <Link to="/" className="flex items-center gap-2.5" onClick={handleLinkClick}>
          <div className="w-7 h-7 flex items-center justify-center">
            <img src={astaLogo} alt="Asta" className="w-7 h-7 object-contain" />
          </div>
          <span className="font-semibold text-sidebar-foreground tracking-tight">Asta</span>
        </Link>
      </div>

      <div className="px-3 pb-5">
        <Button asChild variant="primary" className="w-full h-9 text-[13px]">
          <Link to="/upload" onClick={handleLinkClick}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New Analysis
          </Link>
        </Button>
      </div>

      <nav className="flex-1 px-3">
        <ul className="space-y-0.5">
          {mainNavItems.map((item) => (
            <li key={item.label}>
              {item.disabled ? (
                <span
                  className="nav-item opacity-50 cursor-not-allowed"
                  onClick={() => {
                    if (item.posthogEventName) {
                      handleNavItemClick(item.posthogEventName, item.label);
                    }
                  }}
                >
                  <item.icon className="w-4 h-4" />
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
                  onClick={() => {
                    if (isMobile) {
                      setIsOpen(false);
                    }
                    if (item.posthogEventName) {
                      handleNavItemClick(item.posthogEventName, item.label);
                    }
                  }}
                  className={cn(
                    "nav-item",
                    location.pathname === item.href && "nav-item-active"
                  )}
                >
                  <item.icon className="w-4 h-4" />
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

      <div className="mt-auto">
        <div className="mx-3 mb-2 h-px bg-sidebar-border" />
        <SidebarUsageDisplay />

        <nav className="px-3 pb-4">
          <ul className="space-y-0.5">
            {bottomNavItems.map((item) => (
              <li key={item.label}>
                <Link
                  to={item.href}
                  onClick={() => {
                    if (isMobile) {
                      setIsOpen(false);
                    }
                    if (item.posthogEventName) {
                      handleNavItemClick(item.posthogEventName, item.label ?? "sidebar_button_clicked");
                    }
                  }}
                  className={cn(
                    "nav-item",
                    location.pathname === item.href && "nav-item-active"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
            <li>
              <Link
                to="/support"
                onClick={() => {
                  if (isMobile) {
                    setIsOpen(false);
                  }
                  handleNavItemClick("sidebar_support_button_clicked", "Support");
                }}
                className={cn(
                  "nav-item",
                  location.pathname === "/support" && "nav-item-active"
                )}
              >
                <HelpCircle className="w-4 h-4" />
                <span>Support</span>
              </Link>
            </li>
            <li>
              <button
                onClick={handleSignOut}
                className="nav-item w-full text-left text-red-400 hover:text-red-400 hover:bg-red-500/10"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign out</span>
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}

export function Sidebar() {
  const { isOpen, setIsOpen, isMobile } = useSidebar();

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="left" className="w-60 p-0 bg-sidebar border-sidebar-border">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside className="hidden md:flex">
      <SidebarContent />
    </aside>
  );
}
