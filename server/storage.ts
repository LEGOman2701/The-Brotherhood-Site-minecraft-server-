// Database storage implementation for The Brotherhood
// Reference: javascript_database blueprint
import { 
  users, posts, comments, likes, chatMessages, directMessages, appSettings,
  type User, type InsertUser,
  type Post, type InsertPost,
  type Comment, type InsertComment,
  type Like, type InsertLike,
  type ChatMessage, type InsertChatMessage,
  type DirectMessage, type InsertDirectMessage,
  type AppSetting, type InsertAppSetting,
  type PostWithAuthor, type ChatMessageWithAuthor, type DirectMessageWithAuthor
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, count } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  grantRole(userId: string, role: string): Promise<User | undefined>;
  revokeRole(userId: string): Promise<User | undefined>;
  
  // Posts
  getPosts(isAdminPost: boolean, userId?: string): Promise<PostWithAuthor[]>;
  getPost(id: number, userId?: string): Promise<PostWithAuthor | undefined>;
  getUserPosts(authorId: string): Promise<PostWithAuthor[]>;
  createPost(post: InsertPost): Promise<Post>;
  deletePost(id: number): Promise<void>;
  
  // Comments
  getComments(postId: number): Promise<(Comment & { author: User })[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  deleteComment(id: number): Promise<void>;
  
  // Likes
  getLikesForPost(postId: number): Promise<Like[]>;
  toggleLike(like: InsertLike): Promise<boolean>; // returns true if liked, false if unliked
  
  // Chat
  getChatMessages(limit?: number): Promise<ChatMessageWithAuthor[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  deleteChatMessage(id: number): Promise<void>;
  clearChatMessages(): Promise<void>;

  // Direct Messages
  getConversation(userId1: string, userId2: string): Promise<DirectMessageWithAuthor[]>;
  createDirectMessage(message: InsertDirectMessage): Promise<DirectMessage>;
  
  // Settings
  getSetting(key: string): Promise<string | undefined>;
  setSetting(key: string, value: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        email: insertUser.email.toLowerCase(),
      })
      .returning();
    return user;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async grantRole(userId: string, role: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async revokeRole(userId: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role: null })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  // Posts
  async getPosts(isAdminPost: boolean, userId?: string): Promise<PostWithAuthor[]> {
    const postsData = await db
      .select()
      .from(posts)
      .where(eq(posts.isAdminPost, isAdminPost))
      .orderBy(desc(posts.createdAt));
    
    const result: PostWithAuthor[] = [];
    
    for (const post of postsData) {
      const [author] = await db.select().from(users).where(eq(users.id, post.authorId));
      const postLikes = await db.select().from(likes).where(eq(likes.postId, post.id));
      const postComments = await db
        .select()
        .from(comments)
        .where(eq(comments.postId, post.id))
        .orderBy(desc(comments.createdAt));
      
      const commentsWithAuthors = await Promise.all(
        postComments.map(async (comment) => {
          const [commentAuthor] = await db.select().from(users).where(eq(users.id, comment.authorId));
          return { ...comment, author: commentAuthor };
        })
      );
      
      result.push({
        ...post,
        author,
        likes: postLikes,
        comments: commentsWithAuthors,
        likesCount: postLikes.length,
        commentsCount: postComments.length,
        isLiked: userId ? postLikes.some(l => l.userId === userId) : false,
      });
    }
    
    return result;
  }

  async getPost(id: number, userId?: string): Promise<PostWithAuthor | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    if (!post) return undefined;
    
    const [author] = await db.select().from(users).where(eq(users.id, post.authorId));
    const postLikes = await db.select().from(likes).where(eq(likes.postId, post.id));
    const postComments = await db
      .select()
      .from(comments)
      .where(eq(comments.postId, post.id))
      .orderBy(desc(comments.createdAt));
    
    const commentsWithAuthors = await Promise.all(
      postComments.map(async (comment) => {
        const [commentAuthor] = await db.select().from(users).where(eq(users.id, comment.authorId));
        return { ...comment, author: commentAuthor };
      })
    );
    
    return {
      ...post,
      author,
      likes: postLikes,
      comments: commentsWithAuthors,
      likesCount: postLikes.length,
      commentsCount: postComments.length,
      isLiked: userId ? postLikes.some(l => l.userId === userId) : false,
    };
  }

  async getUserPosts(authorId: string): Promise<PostWithAuthor[]> {
    const postsData = await db
      .select()
      .from(posts)
      .where(eq(posts.authorId, authorId))
      .orderBy(desc(posts.createdAt));
    
    const result: PostWithAuthor[] = [];
    
    for (const post of postsData) {
      const [author] = await db.select().from(users).where(eq(users.id, post.authorId));
      const postLikes = await db.select().from(likes).where(eq(likes.postId, post.id));
      const postComments = await db
        .select()
        .from(comments)
        .where(eq(comments.postId, post.id));
      
      const commentsWithAuthors = await Promise.all(
        postComments.map(async (comment) => {
          const [commentAuthor] = await db.select().from(users).where(eq(users.id, comment.authorId));
          return { ...comment, author: commentAuthor };
        })
      );
      
      result.push({
        ...post,
        author,
        likes: postLikes,
        comments: commentsWithAuthors,
        likesCount: postLikes.length,
        commentsCount: postComments.length,
        isLiked: postLikes.some(l => l.userId === authorId),
      });
    }
    
    return result;
  }

  async createPost(post: InsertPost): Promise<Post> {
    const [newPost] = await db.insert(posts).values(post).returning();
    return newPost;
  }

  async deletePost(id: number): Promise<void> {
    await db.delete(posts).where(eq(posts.id, id));
  }

  // Comments
  async getComments(postId: number): Promise<(Comment & { author: User })[]> {
    const commentsData = await db
      .select()
      .from(comments)
      .where(eq(comments.postId, postId))
      .orderBy(desc(comments.createdAt));
    
    const result = await Promise.all(
      commentsData.map(async (comment) => {
        const [author] = await db.select().from(users).where(eq(users.id, comment.authorId));
        return { ...comment, author };
      })
    );
    
    return result;
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const [newComment] = await db.insert(comments).values(comment).returning();
    return newComment;
  }

  async deleteComment(id: number): Promise<void> {
    await db.delete(comments).where(eq(comments.id, id));
  }

  // Likes
  async getLikesForPost(postId: number): Promise<Like[]> {
    return db.select().from(likes).where(eq(likes.postId, postId));
  }

  async toggleLike(like: InsertLike): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(likes)
      .where(and(eq(likes.postId, like.postId), eq(likes.userId, like.userId)));
    
    if (existing) {
      await db.delete(likes).where(and(eq(likes.postId, like.postId), eq(likes.userId, like.userId)));
      return false;
    } else {
      await db.insert(likes).values(like);
      return true;
    }
  }

  // Chat
  async getChatMessages(limit: number = 100): Promise<ChatMessageWithAuthor[]> {
    const messages = await db
      .select()
      .from(chatMessages)
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
    
    const result = await Promise.all(
      messages.map(async (msg) => {
        const [author] = await db.select().from(users).where(eq(users.id, msg.authorId));
        return { ...msg, author };
      })
    );
    
    return result.reverse();
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [newMessage] = await db.insert(chatMessages).values(message).returning();
    return newMessage;
  }

  async deleteChatMessage(id: number): Promise<void> {
    await db.delete(chatMessages).where(eq(chatMessages.id, id));
  }

  async clearChatMessages(): Promise<void> {
    await db.delete(chatMessages);
  }

  // Direct Messages
  async getConversation(userId1: string, userId2: string): Promise<DirectMessageWithAuthor[]> {
    const messages = await db
      .select()
      .from(directMessages)
      .where(
        sql`(${directMessages.senderId} = ${userId1} AND ${directMessages.recipientId} = ${userId2}) OR (${directMessages.senderId} = ${userId2} AND ${directMessages.recipientId} = ${userId1})`
      )
      .orderBy(desc(directMessages.createdAt))
      .limit(50);

    const result = await Promise.all(
      messages.map(async (msg) => {
        const [sender] = await db.select().from(users).where(eq(users.id, msg.senderId));
        const [recipient] = await db.select().from(users).where(eq(users.id, msg.recipientId));
        return { ...msg, sender, recipient };
      })
    );

    return result.reverse();
  }

  async createDirectMessage(message: InsertDirectMessage): Promise<DirectMessage> {
    const [newMessage] = await db.insert(directMessages).values(message).returning();
    return newMessage;
  }

  // Settings
  async getSetting(key: string): Promise<string | undefined> {
    const [setting] = await db.select().from(appSettings).where(eq(appSettings.key, key));
    return setting?.value;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await db
      .insert(appSettings)
      .values({ key, value })
      .onConflictDoUpdate({ target: appSettings.key, set: { value } });
  }
}

export const storage = new DatabaseStorage();
