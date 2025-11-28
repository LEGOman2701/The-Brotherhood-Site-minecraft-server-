import { useState, useRef } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2, Paperclip } from "lucide-react";

interface CreatePostProps {
  isAdminPost?: boolean;
}

export function CreatePost({ isAdminPost = false }: CreatePostProps) {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [fileAttachments, setFileAttachments] = useState<{ id: number; filename: string; mimeType: string; size: number }[]>([]);
  const { toast } = useToast();
  const maxLength = 2000;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const reader = new FileReader();
      return new Promise<any>((resolve, reject) => {
        reader.onload = async () => {
          const base64 = reader.result?.toString().split(",")[1];
          if (!base64) {
            reject(new Error("Failed to read file"));
            return;
          }
          
          try {
            const uploaded = await apiRequest("POST", "/api/files", {
              filename: file.name,
              mimeType: file.type,
              size: file.size,
              data: base64,
            });
            resolve(uploaded);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
    },
    onSuccess: (uploaded) => {
      setFileAttachments(prev => [...prev, uploaded]);
    },
    onError: () => {
      toast({ title: "Failed to upload file", variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (postContent: string) => {
      return apiRequest("POST", "/api/posts", { 
        content: postContent,
        title: isAdminPost ? title : undefined,
        isAdminPost,
        fileAttachmentIds: fileAttachments.map(f => f.id.toString()).join(","),
      });
    },
    onSuccess: () => {
      setContent("");
      setTitle("");
      setFileAttachments([]);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 25 * 1024 * 1024) {
      toast({ title: "File is too large (max 25MB)", variant: "destructive" });
      return;
    }
    
    uploadFileMutation.mutate(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (id: number) => {
    setFileAttachments(prev => prev.filter(f => f.id !== id));
  };

  return (
    <Card data-testid="card-create-post">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">
          {isAdminPost ? "Create Announcement" : "Create Post"}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3 space-y-3">
        {isAdminPost && (
          <Input
            placeholder="Announcement header (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            data-testid="input-announcement-title"
          />
        )}
        <Textarea
          placeholder={isAdminPost 
            ? "Write an announcement for the community..." 
            : "Share something with The Brotherhood..."
          }
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[120px] resize-none"
          maxLength={maxLength}
          data-testid="input-post-content"
        />
        {fileAttachments.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {fileAttachments.map((file, idx) => (
              <div key={`file-${file.id}-${idx}`} className="bg-muted rounded px-2 py-1 flex items-center gap-2 text-sm">
                <span>{file.filename}</span>
                <button
                  onClick={() => removeAttachment(file.id)}
                  className="text-xs hover:text-destructive"
                  data-testid={`button-remove-post-file-${file.id}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between gap-2 pt-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground" data-testid="text-char-count">
            {content.length}/{maxLength}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            data-testid="input-file-upload-post"
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadFileMutation.isPending}
            data-testid="button-attach-file-post"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
        </div>
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
