import { Plus, LogOut, Menu } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebar } from "@/contexts/SidebarContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePostHog } from "posthog-js/react";

interface HeaderProps {
  userName: string;
  avatarUrl?: string | null;
}

export function Header({ userName, avatarUrl }: HeaderProps) {
  const posthog = usePostHog();
  const { signOut } = useAuth();
  const { toggleSidebar, isMobile } = useSidebar();

  const handleClickNewPropertyAnalysis = () => {
    posthog.capture("header_new_property_analysis_button_clicked", {
      button_name: "New Property Analysis",
      href: "/upload",
    });
  };

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="h-14 border-b border-border/50 px-4 md:px-8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="md:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <div className="hidden sm:block">
          <p className="text-sm text-muted-foreground">Welcome back, <span className="text-foreground font-medium">{userName}</span></p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button asChild size="sm" variant="outline" className="text-muted-foreground hover:text-foreground">
          <Link to="/upload" onClick={handleClickNewPropertyAnalysis}>
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Analysis</span>
          </Link>
        </Button>
        <div className="w-px h-5 bg-border/60 mx-1" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
              <Avatar className="h-8 w-8">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
                <AvatarFallback className="bg-foreground/5 text-foreground text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium text-foreground">{userName}</p>
              <p className="text-xs text-muted-foreground">Manage your account</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
