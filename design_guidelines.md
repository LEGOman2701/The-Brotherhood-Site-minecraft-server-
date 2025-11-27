# The Brotherhood - Design Guidelines

## Design Approach

**Reference-Based Approach**: Draw inspiration from Discord's gaming community platform aesthetics combined with modern social platforms like Twitter/Reddit for content organization. The design should feel familiar to gamers while maintaining the unique Brotherhood identity.

**Core Principle**: Functional, clean, and community-focused with dark mode aesthetics that won't strain users during extended Minecraft sessions.

---

## Typography

**Font Stack**:
- Primary: Inter or Manrope (modern, highly legible)
- Headers: Same family, bold weights (600-700)
- Code/Usernames: JetBrains Mono or monospace

**Hierarchy**:
- Page titles: text-3xl font-bold
- Section headers: text-xl font-semibold
- Post titles: text-lg font-semibold
- Body text: text-base
- Meta info (timestamps, counts): text-sm text-gray-400
- Chat messages: text-sm

---

## Layout System

**Spacing Units**: Use Tailwind units of **4, 6, 8, 12** (p-4, gap-6, mb-8, py-12)

**Container Strategy**:
- Main content: max-w-6xl mx-auto
- Chat sidebar: Fixed width 380px on desktop
- Posts feed: max-w-3xl for optimal reading
- Admin settings panel: max-w-2xl

**Grid Structure**:
- Desktop: Three-panel layout (Navigation | Feed | Chat)
- Tablet: Two-panel (Navigation collapses to top bar | Feed + Chat toggle)
- Mobile: Single column, bottom navigation

---

## Component Library

### Navigation Header
- Fixed top bar with Brotherhood flag logo (h-16)
- User profile dropdown on right
- "Admin Settings" button visible only for TheBrotherhoodOfAlaska@outlook.com
- Navigation tabs: Feed | Admin Posts | Chat Room

### Posts/Feed Components
**Post Card**:
- Rounded corners (rounded-lg)
- Author info header: avatar + username + timestamp
- Post content with proper line breaks
- Action bar: Like button (with count) | Comment button (with count)
- Comment thread below (collapsible, indented with border-l-2)
- Spacing: p-6 between elements, gap-4 for actions

**Create Post Form**:
- Prominent textarea (min-h-32)
- Character count indicator
- Submit button (primary action)
- Clear visual hierarchy

### Admin Section
**Password Gate** (for non-admins):
- Centered modal/card presentation
- Password input field
- "Unlock Admin Posts" button
- Clear messaging about access

**Admin Post Creation** (password authenticated):
- Distinguished header: "Admin Announcement"
- Same post format but with special badge/indicator
- Only visible to password holders for creation

**Owner Settings Panel** (TheBrotherhoodOfAlaska@outlook.com only):
- Dedicated settings page
- "Set Admin Password" section with input + save button
- Current admins list (users who've unlocked)
- Clear, simple form layout

### Chat Room
**Live Chat Interface**:
- Message list with auto-scroll to bottom
- Message bubble design: sender name + timestamp + message
- Own messages right-aligned, others left-aligned
- Input bar fixed at bottom (sticky)
- Send button inline with input
- Real-time timestamp updates

### Authentication
**Login Screen**:
- Centered card with Brotherhood flag
- "Sign in with Google" button (primary)
- "Sign in with Outlook" button (secondary)
- Tagline: "Join The Brotherhood"
- Clean, focused layout (max-w-md)

---

## Visual Treatment

**Color Application** (dark blue/light blue/white palette):
- Use provided flag colors as accent colors
- Apply to buttons, links, active states, badges
- Maintain high contrast for readability
- No specific background/foreground assignments (colors specified later)

**Brotherhood Flag Placement**:
- Primary: Top-left corner of navigation header (h-12 w-auto)
- Secondary: Login page centered above sign-in options (h-24 w-auto)
- Favicon: Cropped/scaled version

**Card Style**:
- Border radius: rounded-lg throughout
- Subtle shadows for depth hierarchy
- Consistent padding: p-6 for cards, p-4 for nested elements

**Buttons**:
- Primary actions: rounded-md px-6 py-2.5 font-medium
- Secondary actions: rounded-md px-4 py-2 with border
- Icon buttons: p-2 rounded
- Like/Comment counters: inline with icons

---

## Page Layouts

### Main Feed Page
- Navigation header (fixed)
- Create post form (sticky below header)
- Posts list (infinite scroll)
- Right sidebar: Live chat (desktop only)

### Admin Posts Section
- Password unlock gate (if not authenticated)
- Once unlocked: Same feed layout with create form
- Visual badge on admin posts
- All users can comment (same component)

### Chat Room Page
- Full-height chat interface
- Message history (scrollable)
- Input bar (fixed bottom)
- Online users indicator (optional top-right)

### Owner Settings
- Left sidebar: Settings navigation
- Main panel: Admin password management form
- Clear save/update feedback

---

## Responsive Behavior

**Breakpoints**:
- Mobile: < 768px (stack everything, bottom nav)
- Tablet: 768px - 1024px (two-column)
- Desktop: > 1024px (three-column with chat)

**Mobile Optimizations**:
- Bottom tab navigation (Feed | Admin | Chat | Profile)
- Full-width cards with p-4
- Collapsed comment threads by default
- Fixed input bars for chat/post creation

---

## Accessibility

- Keyboard navigation for all interactive elements
- Focus indicators on inputs/buttons (ring-2)
- ARIA labels for icon buttons
- Proper heading hierarchy (h1 → h2 → h3)
- Color contrast compliance for text
- Alt text for Brotherhood flag

---

## Images

**Brotherhood Flag**: Use the provided flag PNG files
- Navigation header: Scaled to h-12
- Login page: Centered, h-24
- Favicon: Generated from flag design

**No hero images**: This is a functional community platform, not a marketing site. Focus on content density and usability rather than decorative imagery.