import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Key, Save, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SettingsPage() {
  const { user, isOwner, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Redirect non-owners
  useEffect(() => {
    if (!loading && (!user || !isOwner)) {
      setLocation("/");
    }
  }, [user, isOwner, loading, setLocation]);

  const { data: hasPassword, isLoading: checkingPassword } = useQuery<{ hasPassword: boolean }>({
    queryKey: ["/api/admin/check-password"],
    enabled: isOwner,
  });

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

  if (loading || !isOwner) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Settings className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold" data-testid="text-settings-title">
          Admin Settings
        </h1>
      </div>
      <p className="text-muted-foreground text-sm mb-6">
        Owner-only settings for The Brotherhood
      </p>

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
    </div>
  );
}
