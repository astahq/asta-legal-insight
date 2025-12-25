import { Search, Bell, Plus, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  userName: string;
  avatarUrl?: string | null;
}

export function Header({ userName, avatarUrl }: HeaderProps) {
  const { signOut } = useAuth();

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="h-16 bg-card border-b border-border px-6 flex items-center justify-between">
      {/* User Welcome */}
      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
              <Avatar className="h-10 w-10 bg-muted">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
                <AvatarFallback className="bg-muted text-muted-foreground font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium text-foreground">{userName}</p>
              <p className="text-xs text-muted-foreground">Manage your account</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/billing">Billing</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div>
          <h2 className="font-semibold text-foreground">{userName}</h2>
          <p className="text-sm text-muted-foreground">Welcome back to Asta 👋</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Link to="/upload">
            <Plus className="w-4 h-4 mr-2" />
            New Property Analysis
          </Link>
        </Button>
      </div>
    </header>
  );
}
