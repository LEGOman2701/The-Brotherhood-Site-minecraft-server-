import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-context";
import { logOut } from "@/lib/firebase";
import { useLocation, Link } from "wouter";
import { Moon, Sun, Settings, LogOut, User, Search } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useSearch } from "@/lib/search-context";
import brotherhoodFlag from "@assets/flag png_1764277483845.png";

export function Header() {
  const { user, isOwner } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [location, setLocation] = useLocation();
  const { searchQuery, setSearchQuery } = useSearch();

  const handleLogout = async () => {
    try {
      await logOut();
      setLocation("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-card">
      <div className="flex h-16 items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3 hover-elevate rounded-md px-2 py-1">
            <img 
              src={brotherhoodFlag} 
              alt="The Brotherhood" 
              className="h-10 w-auto"
              data-testid="img-header-logo"
            />
            <span className="font-bold text-lg hidden sm:inline" data-testid="text-app-name">
              The Brotherhood
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-4 flex-1">
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link href="/">
              <Button 
                variant={location === "/" ? "secondary" : "ghost"} 
                size="sm"
                data-testid="link-feed"
              >
                Feed
              </Button>
            </Link>
            <Link href="/admin">
              <Button 
                variant={location === "/admin" ? "secondary" : "ghost"} 
                size="sm"
                data-testid="link-admin"
              >
                Announcements
              </Button>
            </Link>
            <Link href="/chat">
              <Button 
                variant={location === "/chat" ? "secondary" : "ghost"} 
                size="sm"
                data-testid="link-chat"
              >
                Chat
              </Button>
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-2 flex-1 max-w-md ml-4 rounded-md px-3 py-1.5 bg-muted/50 border border-muted hover:bg-muted/70 transition-colors">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Input
              placeholder="Search posts by content or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 bg-transparent text-sm focus-visible:ring-0 placeholder:text-muted-foreground/70"
              data-testid="input-search"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleTheme}
            data-testid="button-theme-toggle"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-user-menu">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getInitials(user.displayName)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-2">
                  <p className="font-medium text-sm" data-testid="text-user-name">{user.displayName}</p>
                  <p className="text-xs text-muted-foreground" data-testid="text-user-email">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <Link href="/profile">
                  <DropdownMenuItem data-testid="link-profile">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                </Link>
                <Link href="/settings">
                  <DropdownMenuItem data-testid="link-settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} data-testid="button-logout">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
