// The Brotherhood API Routes
// Reference: javascript_websocket and javascript_database blueprints
import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { verifyIdToken, isFirebaseAdminInitialized } from "./firebase-admin";
import bcrypt from "bcrypt";

// Role to Discord embed color mapping (decimal)
function getRoleColor(role?: string | null): number {
  switch (role) {
    case "Supreme Leader": return 16776960; // Yellow (#FFD700)
    case "The Council of Snow": return 8844475; // Light Blue (#87CEEB)
    case "The Great Hall of the North": return 139; // Dark Blue (#00008B)
    case "admin": return 16711680; // Red (#FF0000)
    default: return 3447003; // Default blue
  }
}

// Role to Discord ANSI color mapping
function getRoleAnsiColor(role?: string | null): string {
  switch (role) {
    case "Supreme Leader": return "33"; // Yellow
    case "The Council of Snow": return "34"; // Blue
    case "The Great Hall of the North": return "34"; // Blue
    case "admin": return "31"; // Red
    default: return "37"; // White/Default
  }
}

// Helper function to send Discord webhooks
async function sendDiscordWebhook(webhookUrl: string, content: string, isEmbed?: boolean, threadName?: string) {
  if (!webhookUrl) {
    console.warn("Webhook URL is empty, skipping send");
    return;
  }
  try {
    const payload: any = isEmbed ? { embeds: [JSON.parse(content)] } : { content };
    if (threadName) {
      payload.thread_name = threadName;
    }
    console.log("Sending webhook payload:", JSON.stringify(payload, null, 2));
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Discord webhook error:", response.status, response.statusText, "Body:", errorText);
    } else {
      console.log("Discord webhook sent successfully");
    }
  } catch (error) {
    console.error("Failed to send Discord webhook:", error);
  }
}

// Extend Request type to include user info
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

// Auth middleware that verifies Firebase ID tokens
async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const userId = req.headers["x-user-id"] as string;
  
  // Development mode: accept test token with X-User-Id header
  if (authHeader === "Bearer test-token-dev" && userId) {
    req.userId = userId;
    return next();
  }
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // Fallback: Check X-User-Id header for development/when Firebase Admin isn't configured
    if (userId && !isFirebaseAdminInitialized()) {
      req.userId = userId;
      return next();
    }
    return res.status(401).json({ error: "Unauthorized - No token provided" });
  }

  const idToken = authHeader.split("Bearer ")[1];

  try {
    const decodedToken = await verifyIdToken(idToken);
    
    if (decodedToken) {
      req.userId = decodedToken.uid;
      req.userEmail = decodedToken.email;
      return next();
    }
    
    // If Firebase Admin is not initialized, fall back to trusting the token's claims
    // This is for development only
    if (!isFirebaseAdminInitialized()) {
      if (userId) {
        req.userId = userId;
        return next();
      }
    }
    
    return res.status(401).json({ error: "Unauthorized - Invalid token" });
  } catch (error) {
    console.error("Auth middleware error:", error);
    // In development mode, accept test token as fallback
    if (userId && process.env.NODE_ENV === "development") {
      req.userId = userId;
      return next();
    }
    return res.status(401).json({ error: "Unauthorized - Token verification failed" });
  }
}

// Schedule chat cleanup for midnight PST
function scheduleChatCleanup() {
  function scheduleNext() {
    const now = new Date();
    // Convert to PST (UTC-8)
    const pstTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    
    // Calculate next midnight PST
    const nextMidnight = new Date(pstTime);
    nextMidnight.setDate(nextMidnight.getDate() + 1);
    nextMidnight.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = nextMidnight.getTime() - pstTime.getTime();
    
    setTimeout(async () => {
      try {
        await storage.clearChatMessages();
        console.log("Chat messages cleared at midnight PST");
      } catch (error) {
        console.error("Failed to clear chat messages:", error);
      }
      scheduleNext(); // Schedule the next cleanup
    }, msUntilMidnight);
  }
  
  scheduleNext();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Start the chat cleanup scheduler
  scheduleChatCleanup();
  
  // WebSocket server for real-time chat
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Map<WebSocket, string>(); // Map WebSocket to userId

  wss.on('connection', (ws, req) => {
    // For WebSocket, we'll authenticate via query parameter or first message
    // For now, just track the connection
    clients.set(ws, '');
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Handle authentication message
        if (message.type === 'auth' && message.token) {
          const decodedToken = await verifyIdToken(message.token);
          if (decodedToken) {
            clients.set(ws, decodedToken.uid);
            ws.send(JSON.stringify({ type: 'auth_success' }));
          } else if (!isFirebaseAdminInitialized() && message.userId) {
            // Fallback for development
            clients.set(ws, message.userId);
            ws.send(JSON.stringify({ type: 'auth_success' }));
          }
        }
      } catch (e) {
        console.error("WebSocket message error:", e);
      }
    });
    
    ws.on('close', () => {
      clients.delete(ws);
    });
  });

  function broadcast(message: object) {
    const data = JSON.stringify(message);
    clients.forEach((userId, client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  // Auth sync endpoint - creates or updates user from Firebase auth
  app.post("/api/auth/sync", async (req, res) => {
    try {
      const { id, email, displayName, photoURL } = req.body;
      
      if (!id || !email || !displayName) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Check if user is an owner based on email
      const isOwner = email?.toLowerCase() === "thebrotherhoodofalaska@outlook.com" || 
                      email?.toLowerCase() === "2thumbsupgames@gmail.com";

      let user = await storage.getUser(id);
      
      if (!user) {
        user = await storage.createUser({
          id,
          email,
          displayName,
          photoURL,
          isOwner,
        });
      } else {
        // Update user info and isOwner flag
        user = await storage.updateUser(id, {
          displayName,
          photoURL,
          isOwner,
        }) || user;
      }

      res.json(user);
    } catch (error) {
      console.error("Auth sync error:", error);
      res.status(500).json({ error: "Failed to sync user" });
    }
  });

  // Get regular posts
  app.get("/api/posts", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const posts = await storage.getPosts(false, userId);
      res.json(posts);
    } catch (error) {
      console.error("Get posts error:", error);
      res.status(500).json({ error: "Failed to get posts" });
    }
  });

  // Get admin posts
  app.get("/api/admin-posts", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const posts = await storage.getPosts(true, userId);
      res.json(posts);
    } catch (error) {
      console.error("Get admin posts error:", error);
      res.status(500).json({ error: "Failed to get admin posts" });
    }
  });

  // Create post
  app.post("/api/posts", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const { content, isAdminPost, fileAttachmentIds, title } = req.body;
      
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: "Content is required" });
      }

      // Check admin access for admin posts
      if (isAdminPost) {
        const user = await storage.getUser(userId);
        if (!user?.isOwner && !user?.hasAdminAccess) {
          return res.status(403).json({ error: "Admin access required" });
        }
      }

      const post = await storage.createPost({
        content: content.trim(),
        title: isAdminPost && title ? title.trim() : undefined,
        authorId: userId,
        isAdminPost: isAdminPost || false,
        fileAttachmentIds: fileAttachmentIds || undefined,
      });

      // Send Discord webhook if configured
      if (post) {
        const author = await storage.getUser(userId);
        const webhookKey = isAdminPost ? "discord_announcements_webhook" : "discord_feed_webhook";
        const webhookUrl = await storage.getSetting(webhookKey);
        
        if (webhookUrl && author) {
          if (isAdminPost) {
            // Announcements use embeds with custom title
            const embed = {
              title: post.title || "New Announcement",
              description: post.content.substring(0, 2000),
              color: 16711680,
              timestamp: post.createdAt?.toISOString(),
            };
            await sendDiscordWebhook(webhookUrl, JSON.stringify(embed), true);
          } else {
            // Feed posts use simple text format with colored emoji square
            const message = post.content.substring(0, 2000);
            let emoji = "⬜"; // Default white square
            if (author.role === "Supreme Leader") emoji = "🟨"; // Yellow square
            else if (author.role === "Council" || author.role === "Great Hall") emoji = "🟦"; // Blue square
            else if (author.role === "Admin") emoji = "🟥"; // Red square
            const threadName = `${emoji} ${author.displayName || "Unknown"} (${author.role || "Member"})`;
            await sendDiscordWebhook(webhookUrl, message, false, threadName);
          }
        }
      }

      res.json(post);
    } catch (error) {
      console.error("Create post error:", error);
      res.status(500).json({ error: "Failed to create post" });
    }
  });

  // Delete post
  app.delete("/api/posts/:id", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const postId = parseInt(req.params.id);
      
      const post = await storage.getPost(postId);
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }

      const user = await storage.getUser(userId);
      if (post.authorId !== userId && !user?.isOwner) {
        return res.status(403).json({ error: "Not authorized" });
      }

      await storage.deletePost(postId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete post error:", error);
      res.status(500).json({ error: "Failed to delete post" });
    }
  });

  // Toggle like
  app.post("/api/posts/:id/like", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const postId = parseInt(req.params.id);
      
      const isLiked = await storage.toggleLike({
        postId,
        userId,
      });

      res.json({ isLiked });
    } catch (error) {
      console.error("Toggle like error:", error);
      res.status(500).json({ error: "Failed to toggle like" });
    }
  });

  // Add comment
  app.post("/api/posts/:id/comments", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const postId = parseInt(req.params.id);
      const { content } = req.body;
      
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: "Content is required" });
      }

      const comment = await storage.createComment({
        content: content.trim(),
        postId,
        authorId: userId,
      });

      res.json(comment);
    } catch (error) {
      console.error("Create comment error:", error);
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  // Get user's posts
  app.get("/api/users/me/posts", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const posts = await storage.getUserPosts(userId);
      res.json(posts);
    } catch (error) {
      console.error("Get user posts error:", error);
      res.status(500).json({ error: "Failed to get user posts" });
    }
  });

  // Get specific user profile and posts
  app.get("/api/users/:userId", authMiddleware, async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // Get specific user's posts
  app.get("/api/users/:userId/posts", authMiddleware, async (req, res) => {
    try {
      const { userId } = req.params;
      const posts = await storage.getUserPosts(userId);
      res.json(posts);
    } catch (error) {
      console.error("Get user posts error:", error);
      res.status(500).json({ error: "Failed to get user posts" });
    }
  });

  // Grant role to user
  app.post("/api/users/:userId/role", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const targetUserId = req.params.userId;
      const { role } = req.body;
      
      const user = await storage.getUser(userId);
      if (!user?.isOwner && !user?.hasAdminAccess) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const updated = await storage.grantRole(targetUserId, role);
      if (!updated) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Grant role error:", error);
      res.status(500).json({ error: "Failed to grant role" });
    }
  });

  // Revoke role from user
  app.delete("/api/users/:userId/role", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const targetUserId = req.params.userId;
      
      const user = await storage.getUser(userId);
      if (!user?.isOwner && !user?.hasAdminAccess) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const updated = await storage.revokeRole(targetUserId);
      if (!updated) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Revoke role error:", error);
      res.status(500).json({ error: "Failed to revoke role" });
    }
  });

  // Get chat messages
  app.get("/api/chat", authMiddleware, async (req, res) => {
    try {
      const messages = await storage.getChatMessages(100);
      res.json(messages);
    } catch (error) {
      console.error("Get chat error:", error);
      res.status(500).json({ error: "Failed to get chat messages" });
    }
  });

  // Send chat message
  app.post("/api/chat", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const { content, fileAttachmentIds } = req.body;
      
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: "Content is required" });
      }

      const message = await storage.createChatMessage({
        content: content.trim(),
        authorId: userId,
        fileAttachmentIds: fileAttachmentIds || undefined,
      });

      // Send Discord webhook if configured
      const author = await storage.getUser(userId);
      const webhookUrl = await storage.getSetting("discord_chat_webhook");
      
      if (webhookUrl && author) {
        // Chat webhook uses ANSI colored text format
        const colorCode = getRoleAnsiColor(author.role);
        const ansiText = `\u001b[2;${colorCode}m${author.displayName || "Unknown"}\u001b[0m - ${message.content.substring(0, 2000)}`;
        const discordMessage = `\`\`\`ansi\n${ansiText}\n\`\`\``;
        await sendDiscordWebhook(webhookUrl, discordMessage, false);
      }

      // Broadcast to all WebSocket clients
      broadcast({ type: "chat_message", message });

      res.json(message);
    } catch (error) {
      console.error("Send chat error:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Delete chat message (admin only)
  app.delete("/api/chat/:id", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const messageId = parseInt(req.params.id);
      
      const user = await storage.getUser(userId);
      if (!user?.hasAdminAccess) {
        return res.status(403).json({ error: "Admin access required" });
      }

      await storage.deleteChatMessage(messageId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete chat error:", error);
      res.status(500).json({ error: "Failed to delete message" });
    }
  });

  // Get direct messages conversation
  app.get("/api/dm/:userId", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const otherUserId = req.params.userId;
      
      const messages = await storage.getConversation(userId, otherUserId);
      res.json(messages);
    } catch (error) {
      console.error("Get DM error:", error);
      res.status(500).json({ error: "Failed to get messages" });
    }
  });

  // Send direct message
  app.post("/api/dm/:userId", authMiddleware, async (req, res) => {
    try {
      const senderId = req.userId!;
      const recipientId = req.params.userId;
      const { content } = req.body;
      
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: "Content is required" });
      }

      const message = await storage.createDirectMessage({
        content: content.trim(),
        senderId,
        recipientId,
      });

      res.json(message);
    } catch (error) {
      console.error("Send DM error:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Check if admin password is set
  app.get("/api/admin/check-password", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const user = await storage.getUser(userId);
      
      if (!user?.isOwner) {
        return res.status(403).json({ error: "Owner access required" });
      }

      const password = await storage.getSetting("admin_password");
      res.json({ hasPassword: !!password });
    } catch (error) {
      console.error("Check password error:", error);
      res.status(500).json({ error: "Failed to check password" });
    }
  });

  // Set admin password (owner only)
  app.post("/api/admin/set-password", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const user = await storage.getUser(userId);
      
      if (!user?.isOwner) {
        return res.status(403).json({ error: "Owner access required" });
      }

      const { password } = req.body;
      if (!password || password.length < 4) {
        return res.status(400).json({ error: "Password must be at least 4 characters" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await storage.setSetting("admin_password", hashedPassword);

      res.json({ success: true });
    } catch (error) {
      console.error("Set password error:", error);
      res.status(500).json({ error: "Failed to set password" });
    }
  });

  // Unlock admin access
  app.post("/api/admin/unlock", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ error: "Password required" });
      }

      const storedPassword = await storage.getSetting("admin_password");
      if (!storedPassword) {
        return res.status(400).json({ error: "Admin password not set" });
      }

      const isValid = await bcrypt.compare(password, storedPassword);
      if (!isValid) {
        return res.status(401).json({ error: "Incorrect password" });
      }

      // Grant admin access to user
      await storage.updateUser(userId, { hasAdminAccess: true });

      res.json({ success: true });
    } catch (error) {
      console.error("Unlock admin error:", error);
      res.status(500).json({ error: "Failed to unlock admin" });
    }
  });

  // Get Discord webhook URLs (owner or Supreme Leader only)
  app.get("/api/admin/webhooks", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const user = await storage.getUser(userId);
      
      if (!user?.isOwner && user?.role !== "Supreme Leader") {
        return res.status(403).json({ error: "Owner access required" });
      }

      const feedWebhook = await storage.getSetting("discord_feed_webhook");
      const announcementsWebhook = await storage.getSetting("discord_announcements_webhook");
      const chatWebhook = await storage.getSetting("discord_chat_webhook");

      res.json({
        feedWebhook: feedWebhook || "",
        announcementsWebhook: announcementsWebhook || "",
        chatWebhook: chatWebhook || "",
      });
    } catch (error) {
      console.error("Get webhooks error:", error);
      res.status(500).json({ error: "Failed to get webhooks" });
    }
  });

  // Set Discord webhook URLs (owner or Supreme Leader only)
  app.post("/api/admin/webhooks", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const user = await storage.getUser(userId);
      
      if (!user?.isOwner && user?.role !== "Supreme Leader") {
        return res.status(403).json({ error: "Owner access required" });
      }

      const { feedWebhook, announcementsWebhook, chatWebhook } = req.body;

      if (feedWebhook) {
        await storage.setSetting("discord_feed_webhook", feedWebhook);
      }
      if (announcementsWebhook) {
        await storage.setSetting("discord_announcements_webhook", announcementsWebhook);
      }
      if (chatWebhook) {
        await storage.setSetting("discord_chat_webhook", chatWebhook);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Set webhooks error:", error);
      res.status(500).json({ error: "Failed to set webhooks" });
    }
  });

  // Upload file
  app.post("/api/files", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const { filename, mimeType, size, data } = req.body;
      
      const MAX_FILE_SIZE = 25 * 1024 * 1024;
      if (size > MAX_FILE_SIZE) {
        return res.status(400).json({ error: "File size exceeds 25MB limit" });
      }
      
      if (!filename || !mimeType || !data) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const file = await storage.uploadFile({
        filename,
        mimeType,
        size,
        data,
        uploadedBy: userId,
      });

      res.json(file);
    } catch (error) {
      console.error("Upload file error:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // Download file
  app.get("/api/files/:id", authMiddleware, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const file = await storage.getFile(fileId);
      
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }

      res.setHeader("Content-Type", file.mimeType);
      res.setHeader("Content-Disposition", `inline; filename="${file.filename}"`);
      res.setHeader("Content-Length", file.size);
      res.send(Buffer.from(file.data, "base64"));
    } catch (error) {
      console.error("Download file error:", error);
      res.status(500).json({ error: "Failed to download file" });
    }
  });

  // Delete file
  app.delete("/api/files/:id", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const fileId = parseInt(req.params.id);
      const file = await storage.getFile(fileId);
      
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }

      const user = await storage.getUser(userId);
      if (file.uploadedBy !== userId && !user?.hasAdminAccess) {
        return res.status(403).json({ error: "Not authorized" });
      }

      await storage.deleteFile(fileId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete file error:", error);
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  // Schedule file cleanup (every hour)
  setInterval(async () => {
    try {
      await storage.deleteExpiredFiles();
      console.log("Expired files cleaned up");
    } catch (error) {
      console.error("File cleanup error:", error);
    }
  }, 60 * 60 * 1000);

  return httpServer;
}
