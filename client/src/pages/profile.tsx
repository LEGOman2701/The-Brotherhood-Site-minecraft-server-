import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PostCard } from "@/components/post-card";
import { User, Mail, Calendar, FileText, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/lib/auth-context";
import { useRoute, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PostWithAuthor, User as UserType } from "@shared/schema";

const ROLES = [
  { id: "Supreme Leader", label: "Supreme Leader", color: "bg-yellow-500" },
  { id: "The Council of Snow", label: "The Council of Snow", color: "bg-blue-300" },
  { id: "The Great Hall of the North", label: "The Great Hall of the North", color: "bg-blue-900" },
  { id: "admin", label: "Admin", color: "bg-red-500" },
];

export default function ProfilePage() {
  const { user, isOwner } = useAuth();
  const { toast } = useToast();
  const [match, params] = useRoute("/profile/:userId");
  const [, setLocation] = useLocation();
  const userId = params?.userId;
  const isOwnProfile = !userId || userId === user?.id;

  const { data: posts, isLoading } = useQuery<PostWithAuthor[]>({
    queryKey: [`/api/users/${userId || user?.id}/posts`],
    enabled: !!user,
  });

  const { data: profileUser, isLoading: profileLoading } = useQuery<UserType>({
    queryKey: ["/api/users/:userId", userId],
    enabled: !!userId && userId !== user?.id,
  });

  const grantRoleMutation = useMutation({
    mutationFn: async (role: string) => {
      return apiRequest("POST", `/api/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/:userId", userId] });
      toast({ title: "Role granted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to grant role", variant: "destructive" });
    },
  });

  const revokeRoleMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/users/${userId}/role`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/:userId", userId] });
      toast({ title: "Role revoked successfully" });
    },
    onError: () => {
      toast({ title: "Failed to revoke role", variant: "destructive" });
    },
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted-foreground">Please log in to view profiles</div>
      </div>
    );
  }

  const displayUser = isOwnProfile ? user : profileUser;
  const displayLoading = isOwnProfile ? false : profileLoading;

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      {displayLoading ? (
        <Card className="p-6">
          <Skeleton className="h-20 w-full" />
        </Card>
      ) : displayUser ? (
        <Card data-testid="card-profile">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={displayUser.photoURL || undefined} alt={displayUser.displayName} />
                <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                  {getInitials(displayUser.displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-xl" data-testid="text-profile-name">
                    {displayUser.displayName}
                  </CardTitle>
                  {displayUser.isOwner && (
                    <Badge variant="default" data-testid="badge-owner">Owner</Badge>
                  )}
                  {displayUser.hasAdminAccess && !displayUser.isOwner && (
                    <Badge variant="secondary">Admin</Badge>
                  )}
                  {displayUser.role && (
                    <Badge className={displayUser.role === "Supreme Leader" ? "bg-yellow-500 text-yellow-900" : displayUser.role === "The Council of Snow" ? "bg-blue-300 text-blue-900" : "bg-blue-900 text-blue-100"}>
                      {displayUser.role}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span data-testid="text-profile-email">{displayUser.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                Member since {formatDistanceToNow(new Date(displayUser.createdAt), { addSuffix: true })}
              </span>
            </div>
            <div className="pt-2 border-t">
              <Button
                onClick={() => setLocation(`/dm/${displayUser?.id}`)}
                className="w-full gap-2"
                data-testid="button-message-user"
              >
                <MessageSquare className="h-4 w-4" />
                Send Message
              </Button>
            </div>
            {(isOwner || user?.hasAdminAccess) && (
              <div className={`pt-2 ${!isOwnProfile ? "border-t" : ""}`}>
                <p className="text-xs font-semibold mb-2 text-muted-foreground">Assign Role</p>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map((role) => (
                    <Button
                      key={role.id}
                      size="sm"
                      variant="outline"
                      onClick={() => grantRoleMutation.mutate(role.id)}
                      disabled={grantRoleMutation.isPending || displayUser.role === role.id}
                      data-testid={`button-role-${role.id}`}
                    >
                      {role.label}
                    </Button>
                  ))}
                  {displayUser.role && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => revokeRoleMutation.mutate()}
                      disabled={revokeRoleMutation.isPending}
                      data-testid="button-revoke-role"
                    >
                      Clear Role
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">User not found</p>
        </Card>
      )}

      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">{isOwnProfile ? "Your" : `${displayUser?.displayName}'s`} Posts</h2>
      </div>

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
              <Skeleton className="h-16 w-full" />
            </Card>
          ))}
        </div>
      ) : posts && posts.length > 0 ? (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold mb-1" data-testid="text-empty-profile-posts">
            No posts yet
          </h3>
          <p className="text-sm text-muted-foreground">
            {isOwnProfile ? "Share your first post with The Brotherhood!" : `${displayUser?.displayName} hasn't shared any posts yet.`}
          </p>
        </Card>
      )}
    </div>
  );
}
