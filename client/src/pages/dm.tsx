import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { useRoute } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Send } from "lucide-react";
import { useState } from "react";
import type { DirectMessageWithAuthor, User as UserType } from "@shared/schema";

export default function DMPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [match, params] = useRoute("/dm/:userId");
  const otherUserId = params?.userId;
  const [messageContent, setMessageContent] = useState("");

  const { data: otherUser, isLoading: userLoading } = useQuery<UserType>({
    queryKey: ["/api/users/:userId", otherUserId],
    enabled: !!otherUserId && otherUserId !== user?.id,
  });

  const { data: messages, isLoading: messagesLoading } = useQuery<DirectMessageWithAuthor[]>({
    queryKey: ["/api/dm/:userId", otherUserId],
    enabled: !!user && !!otherUserId,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!messageContent.trim()) return;
      return apiRequest("POST", `/api/dm/${otherUserId}`, { content: messageContent });
    },
    onSuccess: () => {
      setMessageContent("");
      queryClient.invalidateQueries({ queryKey: ["/api/dm/:userId", otherUserId] });
      toast({ title: "Message sent" });
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
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
        <div className="text-muted-foreground">Please log in to message</div>
      </div>
    );
  }

  if (!otherUserId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted-foreground">Invalid conversation</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 h-[calc(100vh-120px)] flex flex-col">
      {userLoading ? (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <Skeleton className="h-6 w-32" />
          </CardHeader>
        </Card>
      ) : otherUser ? (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={otherUser.photoURL || undefined} alt={otherUser.displayName} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {getInitials(otherUser.displayName)}
                </AvatarFallback>
              </Avatar>
              <CardTitle className="text-lg" data-testid="text-dm-user">
                {otherUser.displayName}
              </CardTitle>
            </div>
          </CardHeader>
        </Card>
      ) : null}

      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messagesLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-20 w-48" />
              </div>
            ))}
          </div>
        ) : messages && messages.length > 0 ? (
          messages.map((msg) => {
            const isOwnMessage = msg.senderId === user.id;
            return (
              <div
                key={msg.id}
                className={`flex gap-2 ${isOwnMessage ? "justify-end" : "justify-start"}`}
                data-testid={`message-${msg.id}`}
              >
                {!isOwnMessage && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={msg.sender.photoURL || undefined} alt={msg.sender.displayName} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getInitials(msg.sender.displayName)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`flex flex-col gap-1 max-w-xs ${isOwnMessage ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`px-4 py-2 rounded-lg break-words ${
                      isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">No messages yet. Say hello!</p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Textarea
          placeholder="Type a message..."
          value={messageContent}
          onChange={(e) => setMessageContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.ctrlKey) {
              sendMutation.mutate();
            }
          }}
          className="resize-none"
          data-testid="input-dm-content"
        />
        <Button
          onClick={() => sendMutation.mutate()}
          disabled={sendMutation.isPending || !messageContent.trim()}
          size="icon"
          data-testid="button-send-dm"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
