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
import { Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { parseDiscordMarkdown } from "@/lib/discord-markdown";
import type { DirectMessageWithAuthor, User as UserType } from "@shared/schema";

export default function DMPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [match, params] = useRoute("/dm/:userId");
  const otherUserId = params?.userId;
  const [messageContent, setMessageContent] = useState("");

  const { data: otherUser, isLoading: userLoading } = useQuery<UserType>({
    queryKey: [`/api/users/${otherUserId}`],
    enabled: !!otherUserId && otherUserId !== user?.id,
  });

  const { data: messages, isLoading: messagesLoading } = useQuery<DirectMessageWithAuthor[]>({
    queryKey: [`/api/dm/${otherUserId}`],
    enabled: !!user && !!otherUserId,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!messageContent.trim()) return;
      return apiRequest("POST", `/api/dm/${otherUserId}`, { content: messageContent });
    },
    onSuccess: () => {
      setMessageContent("");
      queryClient.invalidateQueries({ queryKey: [`/api/dm/${otherUserId}`] });
      toast({ title: "Message sent" });
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return apiRequest("DELETE", `/api/dm/${messageId}`, {});
    },
    onMutate: async (messageId: number) => {
      await queryClient.cancelQueries({ queryKey: [`/api/dm/${otherUserId}`] });
      const previousMessages = queryClient.getQueryData<DirectMessageWithAuthor[]>([
        `/api/dm/${otherUserId}`,
      ]);
      queryClient.setQueryData(
        [`/api/dm/${otherUserId}`],
        (old: DirectMessageWithAuthor[] | undefined) =>
          old?.filter((msg) => msg.id !== messageId) || []
      );
      return { previousMessages };
    },
    onSuccess: () => {
      toast({ title: "Message deleted" });
    },
    onError: (err, messageId, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData([`/api/dm/${otherUserId}`], context.previousMessages);
      }
      toast({ title: "Failed to delete message", variant: "destructive" });
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
    <div className="max-w-2xl mx-auto p-4 sm:p-6 h-[calc(100vh-120px)] flex flex-col bg-background">
      {userLoading ? (
        <Card className="mb-4 border-none shadow-sm">
          <CardHeader className="pb-3">
            <Skeleton className="h-6 w-32" />
          </CardHeader>
        </Card>
      ) : otherUser ? (
        <Card className="mb-4 border-none shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                <AvatarImage src={otherUser.photoURL || undefined} alt={otherUser.displayName} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                  {getInitials(otherUser.displayName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg" data-testid="text-dm-user">
                  {otherUser.displayName}
                </CardTitle>
                {otherUser.role && (
                  <p className="text-xs text-muted-foreground">
                    {otherUser.role}
                  </p>
                )}
              </div>
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
                className={`flex gap-2 group ${isOwnMessage ? "justify-end" : "justify-start"}`}
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
                  <div className="flex items-center gap-2">
                    <div
                      className={`px-4 py-2 rounded-lg break-words text-sm ${
                        isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      {parseDiscordMarkdown(msg.content)}
                    </div>
                    {isOwnMessage && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteMutation.mutate(msg.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-dm-${msg.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
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

      <div className="flex gap-2 items-end">
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
          size="default"
          className="gap-2 whitespace-nowrap"
          data-testid="button-send-dm"
        >
          <Send className="h-4 w-4" />
          <span className="hidden sm:inline">Send</span>
        </Button>
      </div>
    </div>
  );
}
