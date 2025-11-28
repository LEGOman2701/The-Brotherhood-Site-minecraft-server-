import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, MessageCircle, Users, Trash2, Paperclip, Play } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { parseDiscordMarkdown } from "@/lib/discord-markdown";
import type { ChatMessageWithAuthor } from "@shared/schema";

export default function ChatPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [message, setMessage] = useState("");
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [fileAttachments, setFileAttachments] = useState<{ id: number; filename: string; mimeType: string; size: number }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: messages, isLoading } = useQuery<ChatMessageWithAuthor[]>({
    queryKey: ["/api/chat"],
    refetchInterval: socket?.readyState === WebSocket.OPEN ? false : 5000,
  });

  // WebSocket connection for real-time updates
  useEffect(() => {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      // Use relative protocol to handle both local dev and production
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      // Fallback if location.host is undefined (shouldn't happen but safety check)
      if (!window.location.host || window.location.host.includes('undefined')) {
        console.warn('Invalid location.host, skipping WebSocket');
        return;
      }
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("WebSocket connected");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "chat_message") {
            queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
          }
        } catch (e) {
          console.error("Failed to parse WebSocket message:", e);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");
      };

      setSocket(ws);

      return () => {
        ws.close();
      };
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      setSocket(null);
      return () => {};
    }
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", "/api/chat", { content, fileAttachmentIds: fileAttachments.map(f => f.id.toString()).join(",") });
    },
    onSuccess: () => {
      setMessage("");
      setFileAttachments([]);
      inputRef.current?.focus();
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const reader = new FileReader();
      return new Promise<void>((resolve, reject) => {
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
            setFileAttachments(prev => [...prev, uploaded]);
            toast({ title: "File uploaded successfully" });
            resolve();
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
    },
    onError: () => {
      toast({ title: "Failed to upload file", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return apiRequest("DELETE", `/api/chat/${messageId}`, {});
    },
    onMutate: async (messageId: number) => {
      await queryClient.cancelQueries({ queryKey: ["/api/chat"] });
      const previousMessages = queryClient.getQueryData<ChatMessageWithAuthor[]>([
        "/api/chat",
      ]);
      queryClient.setQueryData(
        ["/api/chat"],
        (old: ChatMessageWithAuthor[] | undefined) =>
          old?.filter((msg) => msg.id !== messageId) || []
      );
      return { previousMessages };
    },
    onSuccess: () => {
      toast({ title: "Message deleted" });
    },
    onError: (err, messageId, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(["/api/chat"], context.previousMessages);
      }
      toast({ title: "Failed to delete message", variant: "destructive" });
    },
  });

  const handleSend = () => {
    if (!message.trim() || !user) return;
    sendMutation.mutate(message.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-3 p-4 border-b">
        <MessageCircle className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold" data-testid="text-chat-title">
          Brotherhood Chat
        </h1>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-12 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : messages && messages.length > 0 ? (
          <div className="space-y-4">
            {messages.map((msg) => {
              const isOwnMessage = msg.authorId === user?.id;
              const isAdmin = user?.hasAdminAccess;
              
              return (
                <div 
                  key={msg.id} 
                  className={`flex items-start gap-3 group ${isOwnMessage ? "flex-row-reverse" : ""}`}
                  data-testid={`chat-message-${msg.id}`}
                >
                  <button
                    onClick={() => setLocation(`/profile/${msg.author.id}`)}
                    className="hover-elevate cursor-pointer flex-shrink-0"
                    data-testid={`button-profile-${msg.author.id}`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={msg.author.photoURL || undefined} />
                      <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
                        {getInitials(msg.author.displayName)}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                  <div className={`flex flex-col ${isOwnMessage ? "items-end" : "items-start"}`}>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-medium">{msg.author.displayName}</span>
                      {msg.author.role && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${msg.author.role === "Supreme Leader" ? "bg-yellow-500 text-yellow-900" : msg.author.role === "The Council of Snow" ? "bg-blue-300 text-blue-900" : msg.author.role === "The Great Hall of the North" ? "bg-blue-900 text-blue-100" : msg.author.role === "admin" ? "bg-red-500 text-red-900" : ""}`}>
                          {msg.author.role}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div 
                        className={`px-4 py-2 rounded-lg max-w-xs sm:max-w-md break-words text-sm ${
                          msg.author.role === "Supreme Leader" 
                            ? "bg-yellow-50 text-yellow-900" 
                            : msg.author.role === "The Council of Snow"
                            ? "bg-blue-50 text-blue-900"
                            : msg.author.role === "The Great Hall of the North"
                            ? "bg-blue-50 text-blue-900"
                            : msg.author.role === "admin"
                            ? "bg-red-50 text-red-900"
                            : isOwnMessage 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted"
                        }`}
                      >
                        {parseDiscordMarkdown(msg.content)}
                      </div>
                      {msg.fileAttachmentIds && msg.fileAttachmentIds.split(",").map((fileId) => (
                        <div key={fileId} className="flex items-center gap-2">
                          <a 
                            href={`/api/files/${fileId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline text-sm"
                            data-testid={`link-file-${fileId}`}
                          >
                            <Paperclip className="h-3 w-3 inline mr-1" />
                            View File
                          </a>
                        </div>
                      ))}
                      {isAdmin && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => deleteMutation.mutate(msg.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-message-${msg.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2" data-testid="text-empty-chat">
              No messages yet
            </h3>
            <p className="text-muted-foreground">
              Start a conversation with The Brotherhood!
            </p>
          </div>
        )}
      </ScrollArea>

      <div className="p-4 border-t bg-card">
        {fileAttachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {fileAttachments.map((file) => (
              <div key={file.id} className="bg-muted rounded px-2 py-1 flex items-center gap-2 text-sm">
                <span>{file.filename}</span>
                <button
                  onClick={() => removeAttachment(file.id)}
                  className="text-xs hover:text-destructive"
                  data-testid={`button-remove-file-${file.id}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 max-w-4xl mx-auto">
          <Input
            ref={inputRef}
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!user || sendMutation.isPending || uploadFileMutation.isPending}
            className="flex-1"
            data-testid="input-chat-message"
          />
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            data-testid="input-file-upload"
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={!user || uploadFileMutation.isPending}
            data-testid="button-attach-file"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button 
            onClick={handleSend}
            disabled={!message.trim() || !user || sendMutation.isPending}
            data-testid="button-send-chat"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
