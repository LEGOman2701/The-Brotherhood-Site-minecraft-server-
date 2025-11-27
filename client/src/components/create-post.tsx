import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2 } from "lucide-react";

interface CreatePostProps {
  isAdminPost?: boolean;
}

export function CreatePost({ isAdminPost = false }: CreatePostProps) {
  const [content, setContent] = useState("");
  const { toast } = useToast();
  const maxLength = 2000;

  const createMutation = useMutation({
    mutationFn: async (postContent: string) => {
      return apiRequest("POST", "/api/posts", { 
        content: postContent,
        isAdminPost 
      });
    },
    onSuccess: () => {
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin-posts"] });
      toast({ 
        title: isAdminPost ? "Announcement posted!" : "Post created!",
      });
    },
    onError: () => {
      toast({ 
        title: "Failed to create post", 
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = () => {
    if (!content.trim()) return;
    createMutation.mutate(content.trim());
  };

  return (
    <Card data-testid="card-create-post">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">
          {isAdminPost ? "Create Announcement" : "Create Post"}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <Textarea
          placeholder={isAdminPost 
            ? "Write an announcement for the community..." 
            : "What's on your mind?"
          }
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[120px] resize-none"
          maxLength={maxLength}
          data-testid="input-post-content"
        />
      </CardContent>
      <CardFooter className="flex justify-between gap-2 pt-0">
        <span className="text-xs text-muted-foreground" data-testid="text-char-count">
          {content.length}/{maxLength}
        </span>
        <Button 
          onClick={handleSubmit}
          disabled={!content.trim() || createMutation.isPending}
          className="gap-2"
          data-testid="button-submit-post"
        >
          {createMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {isAdminPost ? "Post Announcement" : "Post"}
        </Button>
      </CardFooter>
    </Card>
  );
}
