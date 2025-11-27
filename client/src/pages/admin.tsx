import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PostCard } from "@/components/post-card";
import { CreatePost } from "@/components/create-post";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Lock, Unlock, Megaphone } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PostWithAuthor } from "@shared/schema";

export default function AdminPage() {
  const { user, isOwner, hasAdminAccess, setHasAdminAccess } = useAuth();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [showUnlock, setShowUnlock] = useState(false);

  const { data: posts, isLoading, error } = useQuery<PostWithAuthor[]>({
    queryKey: ["/api/admin-posts"],
  });

  const unlockMutation = useMutation({
    mutationFn: async (pwd: string) => {
      const res = await apiRequest("POST", "/api/admin/unlock", { password: pwd });
      return res;
    },
    onSuccess: () => {
      setHasAdminAccess(true);
      setPassword("");
      setShowUnlock(false);
      toast({ title: "Access granted! You can now create announcements." });
    },
    onError: () => {
      toast({ title: "Incorrect password", variant: "destructive" });
    },
  });

  const handleUnlock = () => {
    if (!password.trim()) return;
    unlockMutation.mutate(password);
  };

  const canCreatePosts = isOwner || hasAdminAccess;

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Megaphone className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold" data-testid="text-admin-title">
          Announcements
        </h1>
      </div>
      <p className="text-muted-foreground text-sm mb-6">
        Official announcements from The Brotherhood leadership
      </p>

      {canCreatePosts ? (
        <CreatePost isAdminPost />
      ) : (
        <Card data-testid="card-unlock-admin">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5" />
              Admin Access Required
            </CardTitle>
            <CardDescription>
              Enter the admin password to create announcements
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showUnlock ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-password">Admin Password</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    placeholder="Enter the admin password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                    data-testid="input-admin-password"
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleUnlock}
                    disabled={!password.trim() || unlockMutation.isPending}
                    className="gap-2"
                    data-testid="button-unlock-admin"
                  >
                    <Unlock className="h-4 w-4" />
                    Unlock
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowUnlock(false)}
                    data-testid="button-cancel-unlock"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button 
                onClick={() => setShowUnlock(true)} 
                className="gap-2"
                data-testid="button-show-unlock"
              >
                <Lock className="h-4 w-4" />
                Enter Password
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i} className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-20 w-full" />
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="p-8 text-center">
          <p className="text-destructive">Failed to load announcements. Please try again.</p>
        </Card>
      ) : posts && posts.length > 0 ? (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2" data-testid="text-empty-announcements">
            No announcements yet
          </h3>
          <p className="text-muted-foreground">
            Check back later for updates from The Brotherhood leadership.
          </p>
        </Card>
      )}
    </div>
  );
}
