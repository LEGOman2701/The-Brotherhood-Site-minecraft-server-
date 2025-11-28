import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Heart, MessageCircle, ChevronDown, ChevronUp, Send, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/lib/auth-context";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PostWithAuthor } from "@shared/schema";

interface PostCardProps {
  post: PostWithAuthor;
}

export function PostCard({ post }: PostCardProps) {
  const { user, isOwner } = useAuth();
  const { toast } = useToast();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");

  const likeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/posts/${post.id}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin-posts"] });
    },
    onError: () => {
      toast({ title: "Failed to update like", variant: "destructive" });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", `/api/posts/${post.id}/comments`, { content });
    },
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin-posts"] });
      toast({ title: "Comment added!" });
    },
    onError: () => {
      toast({ title: "Failed to add comment", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/posts/${post.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin-posts"] });
      toast({ title: "Post deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete post", variant: "destructive" });
    },
  });

  const handleLike = () => {
    if (!user) return;
    likeMutation.mutate();
  };

  const handleComment = () => {
    if (!commentText.trim() || !user) return;
    commentMutation.mutate(commentText.trim());
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this post?")) {
      deleteMutation.mutate();
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

  const canDelete = isOwner || post.authorId === user?.id;

  return (
    <Card className={`overflow-visible ${post.author.role === "Supreme Leader" ? "bg-yellow-50" : post.author.role === "The Council of Snow" ? "bg-blue-50" : post.author.role === "The Great Hall of the North" ? "bg-blue-50" : post.author.role === "admin" ? "bg-red-50" : ""}`} data-testid={`card-post-${post.id}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
        <div className="flex items-center gap-3">
          <Link href={`/profile/${post.author.id}`}>
            <Avatar className="h-10 w-10 cursor-pointer hover-elevate">
              <AvatarImage src={post.author.photoURL || undefined} alt={post.author.displayName} />
              <AvatarFallback className="bg-secondary text-secondary-foreground text-sm">
                {getInitials(post.author.displayName)}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm" data-testid={`text-author-${post.id}`}>
                {post.author.displayName}
              </span>
              {post.isAdminPost && (
                <Badge variant="default" className="text-xs" data-testid={`badge-admin-${post.id}`}>
                  Announcement
                </Badge>
              )}
              {post.author.isOwner && (
                <Badge variant="secondary" className="text-xs">
                  Owner
                </Badge>
              )}
              {post.author.role && (
                <Badge className={`text-xs ${post.author.role === "Supreme Leader" ? "bg-yellow-500 text-yellow-900" : post.author.role === "The Council of Snow" ? "bg-blue-300 text-blue-900" : post.author.role === "The Great Hall of the North" ? "bg-blue-900 text-blue-100" : post.author.role === "admin" ? "bg-red-500 text-red-900" : ""}`}>
                  {post.author.role}
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground" data-testid={`text-time-${post.id}`}>
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>
        {canDelete && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            data-testid={`button-delete-post-${post.id}`}
          >
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
      </CardHeader>

      <CardContent className="pb-3">
        <p className="text-sm whitespace-pre-wrap" data-testid={`text-content-${post.id}`}>
          {post.content}
        </p>
      </CardContent>

      <CardFooter className="flex flex-col gap-4 pt-0">
        <div className="flex items-center gap-4 w-full">
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2"
            onClick={handleLike}
            disabled={!user || likeMutation.isPending}
            data-testid={`button-like-${post.id}`}
          >
            <Heart 
              className={`h-4 w-4 ${post.isLiked ? "fill-destructive text-destructive" : ""}`} 
            />
            <span data-testid={`text-likes-${post.id}`}>{post.likesCount}</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2"
            onClick={() => setShowComments(!showComments)}
            data-testid={`button-comments-${post.id}`}
          >
            <MessageCircle className="h-4 w-4" />
            <span data-testid={`text-comments-count-${post.id}`}>{post.commentsCount}</span>
            {showComments ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </div>

        {showComments && (
          <div className="w-full space-y-3 border-t pt-4">
            {user && (
              <div className="flex gap-2">
                <Textarea
                  placeholder="Write a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="min-h-[60px] resize-none text-sm"
                  data-testid={`input-comment-${post.id}`}
                />
                <Button 
                  size="icon" 
                  onClick={handleComment}
                  disabled={!commentText.trim() || commentMutation.isPending}
                  data-testid={`button-submit-comment-${post.id}`}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}

            {post.comments.length > 0 ? (
              <div className="space-y-3 border-l-2 border-border pl-4">
                {post.comments.map((comment) => (
                  <div key={comment.id} className="space-y-1" data-testid={`comment-${comment.id}`}>
                    <div className="flex items-center gap-2">
                      <Link href={`/profile/${comment.author.id}`}>
                        <Avatar className="h-6 w-6 cursor-pointer hover-elevate">
                          <AvatarImage src={comment.author.photoURL || undefined} />
                          <AvatarFallback className="text-xs bg-muted">
                            {getInitials(comment.author.displayName)}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <span className="font-medium text-sm">{comment.author.displayName}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm pl-8">{comment.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">
                No comments yet. Be the first to comment!
              </p>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
