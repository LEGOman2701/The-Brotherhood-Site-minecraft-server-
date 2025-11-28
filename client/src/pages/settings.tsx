import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Key, Save, Loader2, CheckCircle, AlertCircle, Sliders, MessageSquare } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTheme } from "@/components/theme-provider";
import { usePreferences, type TextSize } from "@/lib/preferences-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
  const { user, isOwner, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const { preferences, setTextSize, setCompactMode, setShowAnimations } = usePreferences();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [feedWebhook, setFeedWebhook] = useState("");
  const [announcementsWebhook, setAnnouncementsWebhook] = useState("");
  const [chatWebhook, setChatWebhook] = useState("");

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      setLocation("/login");
    }
  }, [user, loading, setLocation]);

  const { data: hasPassword, isLoading: checkingPassword } = useQuery<{ hasPassword: boolean }>({
    queryKey: ["/api/admin/check-password"],
    enabled: isOwner,
  });

  const { data: webhooks, isLoading: loadingWebhooks, refetch: refetchWebhooks } = useQuery<{ feedWebhook: string; announcementsWebhook: string; chatWebhook: string }>({
    queryKey: ["/api/admin/webhooks"],
    enabled: isOwner || user?.role === "Supreme Leader",
  });

  useEffect(() => {
    if (webhooks) {
      setFeedWebhook(webhooks.feedWebhook || "");
      setAnnouncementsWebhook(webhooks.announcementsWebhook || "");
      setChatWebhook(webhooks.chatWebhook || "");
    }
  }, [webhooks]);

  // Refetch webhooks when user becomes available
  useEffect(() => {
    if (user && (isOwner || user?.role === "Supreme Leader")) {
      refetchWebhooks();
    }
  }, [user, isOwner, refetchWebhooks]);

  const setPasswordMutation = useMutation({
    mutationFn: async (password: string) => {
      return apiRequest("POST", "/api/admin/set-password", { password });
    },
    onSuccess: () => {
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Admin password updated successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to update password", variant: "destructive" });
    },
  });

  const setWebhooksMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/webhooks", {
        feedWebhook,
        announcementsWebhook,
        chatWebhook,
      });
    },
    onSuccess: () => {
      toast({ title: "Discord webhooks updated successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to update webhooks", variant: "destructive" });
    },
  });

  const handleSetPassword = () => {
    if (!newPassword.trim()) {
      toast({ title: "Please enter a password", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 4) {
      toast({ title: "Password must be at least 4 characters", variant: "destructive" });
      return;
    }
    setPasswordMutation.mutate(newPassword);
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold" data-testid="text-settings-title">
          Settings
        </h1>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className={`grid w-full ${(isOwner || user?.role === "Supreme Leader") ? "grid-cols-2" : "grid-cols-1"}`}>
          <TabsTrigger value="general">General</TabsTrigger>
          {(isOwner || user?.role === "Supreme Leader") && <TabsTrigger value="admin">Admin</TabsTrigger>}
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          {/* Theme Settings */}
          <Card data-testid="card-theme-settings">
            <CardHeader>
              <CardTitle className="text-lg">Theme</CardTitle>
              <CardDescription>Customize your display preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    {theme === "dark" ? "Currently using dark theme" : "Currently using light theme"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={toggleTheme}
                  className="gap-2"
                  data-testid="button-toggle-theme"
                >
                  {theme === "dark" ? "Light" : "Dark"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Text Size Settings */}
          <Card data-testid="card-text-size">
            <CardHeader>
              <CardTitle className="text-lg">Text Size</CardTitle>
              <CardDescription>Adjust text size throughout the app</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {["small", "normal", "large"].map((size) => (
                  <Button
                    key={size}
                    variant={preferences.textSize === size ? "default" : "outline"}
                    className="w-full justify-start gap-3"
                    onClick={() => setTextSize(size as TextSize)}
                    data-testid={`button-text-size-${size}`}
                  >
                    <span
                      className={`capitalize ${
                        size === "small"
                          ? "text-xs"
                          : size === "large"
                            ? "text-lg"
                            : "text-base"
                      }`}
                    >
                      {size}
                    </span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Display Settings */}
          <Card data-testid="card-display-settings">
            <CardHeader>
              <CardTitle className="text-lg">Display</CardTitle>
              <CardDescription>Adjust how content is displayed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Compact Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Reduce spacing and padding for a denser layout
                  </p>
                </div>
                <Switch
                  checked={preferences.compactMode}
                  onCheckedChange={setCompactMode}
                  data-testid="switch-compact-mode"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Animations</Label>
                  <p className="text-sm text-muted-foreground">
                    Show smooth transitions and animations
                  </p>
                </div>
                <Switch
                  checked={preferences.showAnimations}
                  onCheckedChange={setShowAnimations}
                  data-testid="switch-animations"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {(isOwner || user?.role === "Supreme Leader") && (
          <TabsContent value="admin" className="space-y-6">
            <Card data-testid="card-admin-password">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Key className="h-5 w-5" />
            Admin Access Password
          </CardTitle>
          <CardDescription>
            Set a password that allows trusted members to create announcements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!checkingPassword && (
            <Alert variant={hasPassword?.hasPassword ? "default" : "destructive"}>
              {hasPassword?.hasPassword ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                {hasPassword?.hasPassword 
                  ? "An admin password is currently set. You can update it below."
                  : "No admin password is set. Set one below to enable announcement creation for trusted members."
                }
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="new-password">
              {hasPassword?.hasPassword ? "New Password" : "Create Password"}
            </Label>
            <Input
              id="new-password"
              type="password"
              placeholder="Enter a secure password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              data-testid="input-new-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              data-testid="input-confirm-password"
            />
          </div>

          <Button 
            onClick={handleSetPassword}
            disabled={!newPassword.trim() || setPasswordMutation.isPending}
            className="gap-2"
            data-testid="button-save-password"
          >
            {setPasswordMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {hasPassword?.hasPassword ? "Update Password" : "Set Password"}
          </Button>
        </CardContent>
      </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">About Admin Access</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Members who enter the correct password can create announcements in the Admin Posts section.
                </p>
                <p>
                  All members can view and comment on announcements, but only those with the password can create them.
                </p>
                <p>
                  As an owner (TheBrotherhoodOfAlaska@outlook.com or 2thumbsupgames@gmail.com), you always have admin access and can change this password at any time.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-discord-webhooks">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MessageSquare className="h-5 w-5" />
                  Discord Webhooks
                </CardTitle>
                <CardDescription>
                  Send posts, announcements, and chat messages to Discord channels
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingWebhooks ? (
                  <div className="text-muted-foreground animate-pulse">Loading webhooks...</div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="feed-webhook">Feed Posts Webhook URL</Label>
                      <Input
                        id="feed-webhook"
                        type="text"
                        placeholder="https://discord.com/api/webhooks/..."
                        value={feedWebhook}
                        onChange={(e) => setFeedWebhook(e.target.value)}
                        data-testid="input-feed-webhook"
                      />
                      <p className="text-xs text-muted-foreground">
                        Posts will be sent with author information
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="announcements-webhook">Announcements Webhook URL</Label>
                      <Input
                        id="announcements-webhook"
                        type="text"
                        placeholder="https://discord.com/api/webhooks/..."
                        value={announcementsWebhook}
                        onChange={(e) => setAnnouncementsWebhook(e.target.value)}
                        data-testid="input-announcements-webhook"
                      />
                      <p className="text-xs text-muted-foreground">
                        Announcements will be sent without author information
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="chat-webhook">Chat Messages Webhook URL</Label>
                      <Input
                        id="chat-webhook"
                        type="text"
                        placeholder="https://discord.com/api/webhooks/..."
                        value={chatWebhook}
                        onChange={(e) => setChatWebhook(e.target.value)}
                        data-testid="input-chat-webhook"
                      />
                      <p className="text-xs text-muted-foreground">
                        Chat messages will be sent with author information
                      </p>
                    </div>

                    <Button 
                      onClick={() => setWebhooksMutation.mutate()}
                      disabled={setWebhooksMutation.isPending}
                      className="gap-2"
                      data-testid="button-save-webhooks"
                    >
                      {setWebhooksMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save Discord Webhooks
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
