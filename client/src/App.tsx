import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { SearchProvider } from "@/lib/search-context";
import { PreferencesProvider, usePreferences } from "@/lib/preferences-context";
import { Header } from "@/components/header";
import LoginPage from "@/pages/login";
import FeedPage from "@/pages/feed";
import AdminPage from "@/pages/admin";
import ChatPage from "@/pages/chat";
import DMPage from "@/pages/dm";
import SettingsPage from "@/pages/settings";
import ProfilePage from "@/pages/profile";
import InventoryPage from "@/pages/inventory";
import NotFound from "@/pages/not-found";

// Suppress Vite HMR connection errors in development
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    if (
      event.reason?.message?.includes("Failed to construct 'WebSocket'") &&
      event.reason?.message?.includes("localhost:undefined")
    ) {
      event.preventDefault();
    }
  });
}

function ProtectedRoute({ component: Component }: { component: () => JSX.Element }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Component />
      </main>
    </div>
  );
}

function ProtectedFeed() {
  return <ProtectedRoute component={FeedPage} />;
}

function ProtectedAdmin() {
  return <ProtectedRoute component={AdminPage} />;
}

function ProtectedChat() {
  return <ProtectedRoute component={ChatPage} />;
}

function ProtectedDM() {
  return <ProtectedRoute component={DMPage} />;
}

function ProtectedSettings() {
  return <ProtectedRoute component={SettingsPage} />;
}

function ProtectedProfile() {
  return <ProtectedRoute component={ProfilePage} />;
}

function ProtectedInventory() {
  return <ProtectedRoute component={InventoryPage} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/admin" component={ProtectedAdmin} />
      <Route path="/chat" component={ProtectedChat} />
      <Route path="/inventory" component={ProtectedInventory} />
      <Route path="/dm/:userId" component={ProtectedDM} />
      <Route path="/settings" component={ProtectedSettings} />
      <Route path="/profile/:userId" component={ProtectedProfile} />
      <Route path="/profile" component={ProtectedProfile} />
      <Route path="/" component={ProtectedFeed} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppWithPreferences() {
  const { preferences } = usePreferences();
  
  return (
    <div className={`
      ${preferences.textSize === "small" ? "text-size-small" : ""}
      ${preferences.textSize === "large" ? "text-size-large" : ""}
      ${preferences.compactMode ? "compact-mode" : ""}
      ${!preferences.showAnimations ? "disable-animations" : ""}
    `}>
      <Router />
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <SearchProvider>
              <PreferencesProvider>
                <AppWithPreferences />
              </PreferencesProvider>
            </SearchProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
