import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - stores authenticated users
export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  photoURL: text("photo_url"),
  isOwner: boolean("is_owner").default(false).notNull(),
  hasAdminAccess: boolean("has_admin_access").default(false).notNull(),
  role: text("role"), // Role in the government structure (Supreme Leader, The Council of Snow, The Great Hall of the North)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  comments: many(comments),
  likes: many(likes),
  chatMessages: many(chatMessages),
}));

// Posts table - for both regular and admin posts
export const posts = pgTable("posts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  content: text("content").notNull(),
  authorId: varchar("author_id", { length: 255 }).notNull().references(() => users.id),
  isAdminPost: boolean("is_admin_post").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  comments: many(comments),
  likes: many(likes),
}));

// Comments table
export const comments = pgTable("comments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  content: text("content").notNull(),
  postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  authorId: varchar("author_id", { length: 255 }).notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
}));

// Likes table
export const likes = pgTable("likes", {
  postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
}, (table) => ({
  pk: primaryKey({ columns: [table.postId, table.userId] }),
}));

export const likesRelations = relations(likes, ({ one }) => ({
  post: one(posts, {
    fields: [likes.postId],
    references: [posts.id],
  }),
  user: one(users, {
    fields: [likes.userId],
    references: [users.id],
  }),
}));

// Chat messages table
export const chatMessages = pgTable("chat_messages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  content: text("content").notNull(),
  authorId: varchar("author_id", { length: 255 }).notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  author: one(users, {
    fields: [chatMessages.authorId],
    references: [users.id],
  }),
}));

// Direct messages table
export const directMessages = pgTable("direct_messages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  content: text("content").notNull(),
  senderId: varchar("sender_id", { length: 255 }).notNull().references(() => users.id),
  recipientId: varchar("recipient_id", { length: 255 }).notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const directMessagesRelations = relations(directMessages, ({ one }) => ({
  sender: one(users, {
    fields: [directMessages.senderId],
    references: [users.id],
  }),
  recipient: one(users, {
    fields: [directMessages.recipientId],
    references: [users.id],
  }),
}));

// App settings table - stores admin password
export const appSettings = pgTable("app_settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ createdAt: true as const });
export const insertPostSchema = createInsertSchema(posts).omit({ id: true as const, createdAt: true as const });
export const insertCommentSchema = createInsertSchema(comments).omit({ id: true as const, createdAt: true as const });
export const insertLikeSchema = createInsertSchema(likes);
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true as const, createdAt: true as const });
export const insertDirectMessageSchema = createInsertSchema(directMessages).omit({ id: true as const, createdAt: true as const });
export const insertAppSettingSchema = createInsertSchema(appSettings);

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Like = typeof likes.$inferSelect;
export type InsertLike = z.infer<typeof insertLikeSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type DirectMessage = typeof directMessages.$inferSelect;
export type InsertDirectMessage = z.infer<typeof insertDirectMessageSchema>;
export type AppSetting = typeof appSettings.$inferSelect;
export type InsertAppSetting = z.infer<typeof insertAppSettingSchema>;

// Extended types for frontend with relations
export type PostWithAuthor = Post & { 
  author: User;
  likes: Like[];
  comments: (Comment & { author: User })[];
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
};

export type ChatMessageWithAuthor = ChatMessage & { author: User };
export type DirectMessageWithAuthor = DirectMessage & { sender: User; recipient: User };
