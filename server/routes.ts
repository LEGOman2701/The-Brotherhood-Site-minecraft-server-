// The Brotherhood API Routes
// Reference: javascript_websocket and javascript_database blueprints
import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { verifyIdToken, isFirebaseAdminInitialized } from "./firebase-admin";
import bcrypt from "bcrypt";

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
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // Fallback: Check X-User-Id header for development/when Firebase Admin isn't configured
    const userId = req.headers["x-user-id"] as string;
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
      // Extract user ID from header as fallback
      const userId = req.headers["x-user-id"] as string;
      if (userId) {
        req.userId = userId;
        return next();
      }
    }
    
    return res.status(401).json({ error: "Unauthorized - Invalid token" });
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({ error: "Unauthorized - Token verification failed" });
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
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

      let user = await storage.getUser(id);
      
      if (!user) {
        user = await storage.createUser({
          id,
          email,
          displayName,
          photoURL,
        });
      } else {
        // Update user info
        user = await storage.updateUser(id, {
          displayName,
          photoURL,
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
      const { content, isAdminPost } = req.body;
      
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
        authorId: userId,
        isAdminPost: isAdminPost || false,
      });

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
      const { content } = req.body;
      
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: "Content is required" });
      }

      const message = await storage.createChatMessage({
        content: content.trim(),
        authorId: userId,
      });

      // Broadcast to all WebSocket clients
      broadcast({ type: "chat_message", message });

      res.json(message);
    } catch (error) {
      console.error("Send chat error:", error);
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

  return httpServer;
}
