# Roadmap: Notification Center

## Context
- Stack: Next.js, Convex, Clerk
- Feature: Universal Notifications & Search (Custom Implementation)
- SylcRoad's Notification Center will serve as the central hub for real-time updates across user roles (Client, Creator, Admin) and enable efficient searching through scraped content. Leveraging Convex for real-time data management and Next.js for the frontend, this feature aims to keep all users informed and empowered with quick access to relevant information.

## Implementation Steps

### 1. Manual Setup (User Required)
- [ ] Create Convex project and deploy initial schema.
- [ ] Configure Clerk application and add it to the Next.js project.
- [ ] Set up environment variables locally and in deployment for Clerk and Convex.
- [ ] Ensure Playwright scraper is operational and can output data to be processed for notifications.

### 2. Dependencies & Environment
- [ ] Install: `@clerk/nextjs`, `convex`, `react-convex`
- [ ] Env vars: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CONVEX_URL`

### 3. Database Schema (Convex)
- [ ] Structure:
    -   `notifications`:
        -   `userId`: `string` (Clerk user ID, indexed)
        -   `type`: `string` (e.g., 'newVideo', 'milestone', 'payment', 'approval', 'review', 'error')
        -   `message`: `string` (Concise notification text)
        -   `details`: `object` (JSON object for additional context: campaignId, creatorId, videoUrl, amount, etc.)
        -   `role`: `string[]` (e.g., 'client', 'creator', 'admin')
        -   `isRead`: `boolean` (default `false`, indexed)
        -   `isArchived`: `boolean` (default `false`, indexed)
        -   `createdAt`: `number` (timestamp, indexed)
    -   `scraped_content`:
        -   `creatorId`: `string` (indexed)
        -   `platform`: `string` (e.g., 'instagram', 'tiktok')
        -   `postId`: `string` (unique post identifier, indexed)
        -   `caption`: `string` (searchable)
        -   `hashtags`: `string[]` (searchable)
        -   `creatorName`: `string` (searchable)
        -   `campaignName`: `string` (derived, searchable)
        -   `postUrl`: `string`
        -   `metrics`: `object` (JSON for likes, comments, etc.)
        -   `scrapedAt`: `number`

### 4. Backend Functions (Convex)
- [ ] **Mutations:**
    -   `notifications.create`: Create a new notification.
    -   `notifications.markAsRead`: Mark a notification or all notifications as read for a user.
    -   `notifications.archive`: Archive a notification for a user.
    -   `notifications.updatePreferences`: Update user notification preferences (e.g., disable certain types).
    -   `scraped_content.upsert`: Insert or update scraped content.
- [ ] **Queries:**
    -   `notifications.list`: Retrieve notifications for the current user, filtered by `isRead`, `isArchived`, `role`, and `type`.
    -   `notifications.getUnreadCount`: Get the count of unread notifications for the current user.
    -   `search.content`: Search `scraped_content` by `caption`, `creatorName`, `campaignName`, `hashtags`.
- [ ] **Actions:**
    -   `scraper.processAndNotify`: An action to receive data from the Playwright scraper, `upsert` `scraped_content`, and `create` relevant `notifications` based on content analysis and predefined rules for each user role. This can be triggered by a webhook from the scraper or a scheduled Convex function.

### 5. Frontend (Next.js)
- [ ] **Components:**
    -   `NotificationIcon`: Displays unread badge, fetches `notifications.getUnreadCount`.
    -   `NotificationCenterPopover`: Fetches `notifications.list` (active, unarchived, paginated).
    -   `NotificationItem`: Displays individual notification with mark read/unread/archive actions.
    -   `NotificationPreferences`: UI for users to manage notification types and frequency.
    -   `NotificationSearch`: Input field for real-time search, fetches `search.content` query.
    -   `SearchResultList`: Displays search results with links to relevant content.
- [ ] **State:**
    -   `Convex`'s reactivity will manage real-time updates for `NotificationIcon` and `NotificationCenterPopover`.
    -   Local React state for search input, history, and suggestions.

### 6. Error Prevention
- [ ] **API errors:** Implement robust error handling in Convex mutations/queries (e.g., try-catch blocks, informative error messages).
- [ ] **Validation:** Server-side validation for all incoming data to Convex (e.g., Zod schemas for mutation arguments).
- [ ] **Rate limiting:** Implement application-level rate limiting for external scraper inputs if not handled upstream.
- [ ] **Auth:** Protect all sensitive Convex functions using Clerk authentication, ensuring only authenticated users with correct roles can access specific data.
- [ ] **Type safety:** Leverage TypeScript end-to-end with Convex's generated types and Clerk's user types.
- [ ] **Boundaries:** Define clear API contracts between Next.js frontend and Convex backend. Handle data scraping failures gracefully.

### 7. Testing
- [ ] **Unit Tests:** For Convex mutations and queries (e.g., creating notification, marking read, archiving, content search).
- [ ] **Integration Tests:**
    -   Verify that new scraped content triggers the correct notifications for relevant users based on their roles.
    -   Test real-time updates for notification badges and lists.
    -   Ensure role-based access control for notifications is enforced.
    -   Test search functionality with various keywords, hashtags, and creator names.
- [ ] **End-to-End Tests:**
    -   User logs in and sees unread notifications badge.
    -   User opens notification center, marks notifications as read, and archives them.
    -   Admin user triggers scraper error, and an admin notification appears.
    -   Client user views campaign milestone, and a client notification appears.
    -   User searches for a campaign/creator/hashtag and sees relevant results.