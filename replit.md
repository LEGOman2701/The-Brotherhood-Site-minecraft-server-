# The Brotherhood - Minecraft Community Platform

## Overview

The Brotherhood is a full-stack web application built for a Minecraft server community. It provides a social platform where players can create posts, comment, like content, and chat in real-time. The application features a Discord-inspired dark mode aesthetic and includes admin capabilities for making server announcements.

The platform is built as a single-page React application with an Express backend, PostgreSQL database, and Firebase authentication. It supports real-time chat through WebSockets and includes role-based access control for administrative features.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

**Routing**: Wouter for client-side routing with protected routes that require authentication

**State Management**: TanStack Query (React Query) for server state management with optimistic updates and cache invalidation

**UI Component Library**: Shadcn/ui (Radix UI primitives) with Tailwind CSS for styling
- Design system follows Discord/gaming aesthetics with dark mode as the primary theme
- Custom color scheme based on "The Brotherhood" branding (dark blues, light blues, white)
- Responsive layout with mobile-first approach

**Authentication Flow**: 
- Firebase Authentication handles user authentication (Google and Microsoft OAuth providers)
- After Firebase auth, user data syncs with backend via `/api/auth/sync` endpoint
- Auth context provides user state throughout the application
- User ID passed to backend via `X-User-Id` header for authenticated requests

**Key Pages**:
- Login page with OAuth provider selection
- Feed page for regular user posts
- Admin page for server announcements (restricted access)
- Chat page with real-time messaging
- Profile page showing user information and posts
- Settings page for owner-only configuration (admin password management)

### Backend Architecture

**Framework**: Express.js with TypeScript running on Node.js

**API Design**: RESTful endpoints for CRUD operations with WebSocket support for real-time features

**Authentication Middleware**: Simple header-based authentication extracting `X-User-Id` from request headers

**Authorization Model**: 
- Owner role: Hardcoded email address (TheBrotherhoodOfAlaska@outlook.com) with full access
- Admin access: Other users can unlock admin features with a password
- Regular users: Standard access to posts, comments, likes, and chat

**Real-time Communication**: WebSocket server (ws library) running on `/ws` path for chat message broadcasting

**Key API Endpoints**:
- `/api/auth/sync` - Syncs Firebase user with database
- `/api/posts` - CRUD operations for regular posts
- `/api/admin-posts` - Read-only for admin announcements
- `/api/posts/:id/comments` - Comment management
- `/api/posts/:id/like` - Like toggling
- `/api/chat` - Chat message history and creation
- `/api/admin/unlock` - Admin access password verification
- `/api/admin/set-password` - Owner-only password management

### Data Storage

**Database**: PostgreSQL accessed through Neon serverless driver with connection pooling

**ORM**: Drizzle ORM for type-safe database queries and schema management

**Schema Design**:
- `users` table: Stores Firebase user data (id, email, displayName, photoURL, role flags)
- `posts` table: Regular and admin posts with `isAdminPost` flag
- `comments` table: Nested comments on posts with cascade delete
- `likes` table: Composite primary key (userId, postId) for like tracking
- `chatMessages` table: Real-time chat message history
- `appSettings` table: Key-value store for application configuration (admin password)

**Relationships**:
- One user to many posts, comments, likes, and chat messages
- One post to many comments and likes with cascade deletes
- All content references users via foreign keys

**Password Security**: Bcrypt for hashing admin access passwords (6 rounds)

### External Dependencies

**Firebase Authentication**: Provides OAuth authentication with Google and Microsoft identity providers
- Configuration via environment variables (API key, project ID, app ID)
- Graceful fallback when Firebase is not configured

**Neon PostgreSQL**: Serverless PostgreSQL database with WebSocket support
- Connection string provided via `DATABASE_URL` environment variable
- WebSocket constructor injected for serverless compatibility

**Build & Development Tools**:
- Vite for fast development and production builds
- ESBuild for server bundling with selective dependency bundling
- Drizzle Kit for database migrations and schema management
- Replit-specific plugins for development experience (error overlay, cartographer, dev banner)

**Third-party UI Libraries**:
- Radix UI primitives for accessible components
- Lucide React for icons
- React Icons for brand icons (Google, Microsoft)
- date-fns for timestamp formatting
- cmdk for command menu interfaces

**WebSocket**: Native WebSocket (ws library) for real-time chat with manual client connection management and message broadcasting