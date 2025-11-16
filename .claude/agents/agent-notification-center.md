---
name: agent-convex-notification-center
description: Implements a real-time Notification Center using Convex for backend logic, storage, and search, integrated with Next.js and Clerk.
model: inherit
color: purple
---


# Agent: Notification Center Implementation with Convex

## Agent Overview
**Purpose**: This agent provides comprehensive instructions for implementing a real-time Notification Center feature using Convex as the primary backend. It covers data modeling, real-time updates, search, authentication, and integration with a Next.js frontend and a local Playwright scraper, adhering strictly to Convex best practices.
**Tech Stack**: Next.js, React, Convex, Clerk
**Source**: Convex Documentation, Clerk Documentation, Next.js Documentation.

## Critical Implementation Knowledge
The term "Custom API" in this context refers to the **custom backend logic and data management built entirely within Convex**. There is no third-party "Custom API" service for notifications. All backend functionality will be implemented using Convex actions, mutations, and queries.

### 1. Convex Latest Updates 🚨
*   **Convex Full-Text Search (FTS) Enhancements**: Convex continuously improves its FTS capabilities, allowing for powerful, real-time search across your documents. Ensure you leverage the latest `search` index configuration for optimal performance.
*   **Action HTTP Endpoints (for scraper integration)**: Convex Actions can be exposed as HTTP endpoints, providing a secure and direct way for external services (like your local Playwright scraper) to trigger backend logic without needing a separate Next.js API route. This is the recommended pattern for external integrations when possible.
*   **Optimistic Updates**: Convex's client SDK inherently supports optimistic updates for mutations, providing a smoother UX. Utilize this pattern where applicable.
*   **`_id` and `_creationTime`**: Convex automatically adds `_id` (unique identifier) and `_creationTime` (timestamp) to all documents. These are crucial for sorting and referencing.

### 2. Common Pitfalls & Solutions 🚨
*   **Over-fetching Data in Queries**: Avoid selecting entire documents if you only need a few fields. Use `db.query("table").collect().map(...)` to project only necessary fields or create specific indexes. Queries should be as lightweight as possible for real-time efficiency.
*   **Complex Logic in Queries/Mutations**: Remember that Convex Queries are read-only and must be fast. Mutations are for simple writes. Complex business logic, external API calls, or interactions with external services (like receiving data from a scraper) **must be placed in Convex Actions**.
*   **Authentication Issues**: Ensure your Clerk integration correctly provides the `auth` object to Convex functions. Misconfigured `AUTH_ORIGIN` or missing environment variables (`CLERK_JWT_ISSUER_DOMAIN`, `CLERK_SECRET_KEY`) can lead to unauthorized access. Always check `auth.isAuthenticated` and `auth.getUserIdentity()` for user-specific data.
*   **Schema Evolution**: Convex schema is enforced. When making changes to your data models, update your `convex/schema.ts` file carefully. Use `npx convex dev` with the `--until-first-build` flag for local development.
*   **Rate Limits**: While Convex is highly scalable, be mindful of client-side query patterns. Avoid excessively frequent or computationally expensive queries in rapid succession, especially across many connected clients, to prevent potential performance bottlenecks or hitting project limits.

### 3. Best Practices 🚨
*   **Atomic Operations with Mutations**: Group related database writes into a single mutation for consistency.
*   **Use Actions for Side Effects**: Any operation that has side effects (e.g., sending emails, calling external APIs, processing data from an external source) should be a Convex Action.
*   **Index Everything You Query By**: For efficient data retrieval and real-time updates, ensure you have appropriate indexes defined in `convex/schema.ts` for all fields used in `db.query(...).withIndex(...)` or `db.get(...)`.
*   **Leverage Real-time Queries**: For the notification feed and badge count, use `useQuery` in your Next.js components to automatically re-render when data changes.
*   **Role-Based Access Control (RBAC)**: Implement role checks within your Convex functions using `auth.getUserIdentity().then(identity => identity?.customClaims?.role)` to ensure users only access notifications relevant to their roles (Client, Creator, Admin).
*   **Soft Deletes vs. Hard Deletes**: For archiving notifications, consider a "soft delete" approach by adding a `isArchived: boolean` field rather than permanently deleting data, allowing for recovery or historical views.

## Implementation Steps
1.  **Convex Schema Definition**: Define the `notifications` table and `user_preferences` table with appropriate fields and indexes.
2.  **Convex Authentication Setup**: Configure Convex to work with Clerk JWTs.
3.  **Convex Mutations**: Create mutations for `markAsRead`, `markAsUnread`, `archiveNotification`, and `updatePreferences`.
4.  **Convex Queries**: Implement queries for `getNotificationsForUser`, `getUnreadCountForUser`, `searchNotifications`, and `getUserPreferences`.
5.  **Convex Actions**: Create an action `ingestScraperData` that processes data from the Playwright scraper and creates new notifications.
6.  **Next.js Frontend Integration**: Develop React components to display notifications, manage preferences, and integrate search.
7.  **Playwright Scraper Integration**: Configure the local Playwright scraper to call the Convex Action HTTP endpoint.

### Backend Implementation
The entire backend for the Notification Center will be implemented using Convex actions, mutations, and queries. No Next.js API routes are needed for internal business logic. A Next.js API route might *only* be considered if the Playwright scraper cannot directly make HTTP requests to a Convex Action endpoint for some reason (e.g., complex authentication or data transformation that can't be handled by Convex). However, a Convex Action HTTP endpoint is the preferred and simpler approach.

#### Convex Functions (Primary)
*   **`convex/notifications.ts`**:
    *   **Mutations**:
        *   `createNotification(args: { recipientId: Id<'users'>, type: string, content: string, link?: string, metadata?: any })`: Creates a new notification.
        *   `markAsRead(args: { notificationId: Id<'notifications'> })`: Marks a specific notification as read.
        *   `markAllAsRead()`: Marks all unread notifications for the current user as read.
        *   `archiveNotification(args: { notificationId: Id<'notifications'> })`: Archives a notification (soft delete).
        *   `updateNotificationPreferences(args: { preferences: { [key: string]: boolean } })`: Updates user notification preferences.
    *   **Queries**:
        *   `getNotifications(args: { status?: 'read' | 'unread' | 'archived', limit?: number })`: Fetches notifications for the authenticated user, potentially filtered by status.
        *   `getUnreadCount()`: Returns the number of unread notifications for the authenticated user.
        *   `searchNotifications(args: { query: string })`: Performs a full-text search across notification content for the authenticated user.
    *   **Actions**:
        *   `ingestScraperData(args: { scrapedContent: any[] })`: This action will be called by the Playwright scraper. It will process the `scrapedContent`, identify relevant changes, and then call `createNotification` mutations for the appropriate users based on roles and content. This action can perform external checks or complex logic.
*   **`convex/users.ts`**:
    *   **Queries**: `getUserRole()`: Returns the role of the authenticated user to enable role-based filtering on the frontend.

### Frontend Integration
The Next.js frontend will use the Convex client SDK (`useQuery`, `useMutation`) to interact with the backend functions.
*   **Notification List Component**: Uses `useQuery(api.notifications.getNotifications, { status: ... })` to display real-time notifications.
*   **Unread Badge Component**: Uses `useQuery(api.notifications.getUnreadCount)` to display the number of unread notifications, updating in real-time.
*   **Search Bar Component**: Uses `useQuery(api.notifications.searchNotifications, { query: searchText })` with debouncing for real-time search suggestions and results.
*   **Preference Settings Component**: Uses `useQuery(api.notifications.getUserPreferences)` to display current preferences and `useMutation(api.notifications.updateNotificationPreferences)` to save changes.
*   **Action Buttons**: Use `useMutation` for "Mark Read", "Archive", "Mark All Read" buttons.

## Code Patterns

### Convex Backend Functions
*   **Schema Definition (`convex/schema.ts`)**:
    ```typescript
    import { defineSchema, defineTable } from "convex/server";
    import { v } from "convex/values";

    export default defineSchema({
      notifications: defineTable({
        recipientId: v.id("users"), // Assuming a 'users' table or clerk user ID
        type: v.string(), // e.g., "new_video", "milestone", "payment", "approval"
        content: v.string(), // The message body
        link: v.optional(v.string()), // URL to related content
        isRead: v.boolean(),
        isArchived: v.boolean(),
        // Metadata for filtering/searching, e.g., campaignId, creatorName
        metadata: v.optional(v.any()), // Store structured data relevant to the notification
        // For search:
        searchableContent: v.string(), // Denormalized string for full-text search
      }).index("by_recipient_and_status", ["recipientId", "isRead", "isArchived"])
        .index("by_recipient_and_archived", ["recipientId", "isArchived"])
        .searchIndex("search_content", {
          searchField: "searchableContent",
          filterFields: ["recipientId"],
        }),

      user_preferences: defineTable({
        userId: v.id("users"), // Assuming a 'users' table or clerk user ID
        preferences: v.any(), // e.g., { emailNotifications: true, pushNotifications: false, type: { new_video: true } }
      }).index("by_user", ["userId"]),

      // Assuming a 'users' table from Clerk integration
      users: defineTable({
        clerkId: v.string(), // Clerk user ID
        email: v.string(),
        role: v.union(v.literal("client"), v.literal("creator"), v.literal("admin")),
        // other user-related fields
      }).index("by_clerk_id", ["clerkId"]),
    });
    ```
*   **Mutation (`convex/notifications.ts`) - Example `markAsRead`**:
    ```typescript
    import { mutation } from "./_generated/server";
    import { v } from "convex/values";

    export const markAsRead = mutation({
      args: { notificationId: v.id("notifications") },
      handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
          throw new Error("Not authenticated");
        }
        // You might want to get the user from your 'users' table to match by clerkId
        const user = await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) =>
            q.eq("clerkId", identity.subject)
          )
          .unique();

        if (!user) {
          throw new Error("User not found in Convex");
        }

        const notification = await ctx.db.get(args.notificationId);
        if (!notification || notification.recipientId !== user._id) {
          throw new Error("Notification not found or not authorized");
        }

        await ctx.db.patch(args.notificationId, { isRead: true });
      },
    });
    ```
*   **Query (`convex/notifications.ts`) - Example `getUnreadCount`**:
    ```typescript
    import { query } from "./_generated/server";

    export const getUnreadCount = query({
      handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
          return 0; // Or throw an error depending on desired behavior
        }
        const user = await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) =>
            q.eq("clerkId", identity.subject)
          )
          .unique();

        if (!user) {
          return 0; // User not found, no notifications
        }

        const count = await ctx.db
          .query("notifications")
          .withIndex("by_recipient_and_status", (q) =>
            q.eq("recipientId", user._id).eq("isRead", false).eq("isArchived", false)
          )
          .collect(); // collect() is fine for counting, but avoid for large data

        return count.length;
      },
    });
    ```
*   **Action (`convex/notifications.ts`) - Example `ingestScraperData`**:
    ```typescript
    import { action } from "./_generated/server";
    import { v } from "convex/values";
    import { internalMutation } from "./_generated/api"; // For calling mutations from actions

    // This action could be called directly by your local scraper
    // or through an HTTP endpoint configured in convex.config.ts
    export const ingestScraperData = action({
      args: { scrapedContent: v.array(v.any()) }, // Adjust schema as per scraper output
      handler: async (ctx, args) => {
        console.log("Ingesting scraped data:", args.scrapedContent);

        // Example: Process scraped data to create notifications
        for (const item of args.scrapedContent) {
          // Assume item has properties like 'creatorId', 'type', 'message'
          // Logic to determine recipients and notification content based on scraped data
          // For example, if a new video is posted by a creator, notify clients subscribed to them.

          // Find relevant users to notify (e.g., all clients, or clients subscribed to a creator)
          const allClients = await ctx.runQuery(internal.users.getClients); // An internal query to get clients

          for (const client of allClients) {
            // Determine notification content based on the scraped item and client role
            const notificationContent = `New video from ${item.creatorName}: ${item.videoTitle}`;
            const searchableContent = `${notificationContent} ${item.creatorName} ${item.campaign} ${item.hashtags}`;

            await ctx.runMutation(internal.notifications.createNotification, {
              recipientId: client._id,
              type: "new_video",
              content: notificationContent,
              link: item.videoUrl,
              isRead: false,
              isArchived: false,
              metadata: { creatorId: item.creatorId, videoId: item.videoId },
              searchableContent: searchableContent.toLowerCase(),
            });
          }
        }

        return { success: true, processedItems: args.scrapedContent.length };
      },
    });
    ```
    *   **HTTP Endpoint Configuration (`convex.config.ts`)**:
        ```typescript
        import { defineConvexConfig } from "convex/server";
        import { httpRouter } from "./http"; // Assuming you define httpRouter for custom HTTP endpoints

        export default defineConvexConfig({
          // ... other config
          http: {
            routes: httpRouter,
          },
        });
        ```
        *   **`convex/http.ts`**:
            ```typescript
            import { httpRouter } from "convex/server";
            import { internal } from "./_generated/api";

            const http = httpRouter();

            http.route({
              path: "/scraper-webhook",
              method: "POST",
              handler: async (ctx, request) => {
                const payload = await request.json();
                // Perform any validation or authentication for the scraper webhook
                // For example, check a secret header or API key

                if (payload.secret !== process.env.SCRAPER_WEBHOOK_SECRET) {
                  return new Response("Unauthorized", { status: 401 });
                }

                await ctx.runAction(internal.notifications.ingestScraperData, {
                  scrapedContent: payload.data, // Adjust based on your scraper's payload
                });

                return new Response(JSON.stringify({ success: true }), {
                  status: 200,
                  headers: new Headers({ "Content-Type": "application/json" }),
                });
              },
            });

            export default http;
            ```

## Testing & Debugging
*   **Convex Dashboard**: Use the Convex dashboard to inspect your database tables, query results, and view function logs. This is invaluable for debugging data issues and ensuring your functions run as expected.
*   **Convex Local Development (`npx convex dev`)**: Run Convex locally to test changes quickly. The `npx convex dev` command provides a local database and server, allowing you to debug with console logs.
*   **Unit Testing (Not built-in for Convex yet)**: For complex logic, consider writing pure functions that can be tested outside of the Convex runtime. Integrate these into Convex Actions/Mutations.
*   **Browser Developer Tools**: Use the network tab to inspect Convex API calls from your Next.js frontend, ensuring data is sent and received correctly.
*   **Clerk Debugging**: Use the Clerk dashboard to check user identities, session tokens, and webhook events.
*   **Action/HTTP Endpoint Testing**: Use tools like Postman, Insomnia, or `curl` to send test requests to your Convex Action HTTP endpoint to simulate scraper data ingestion.

## Environment Variables
Ensure these are set in your `.env.local` for development and in your hosting environment (Vercel, Netlify) for production.
*   `NEXT_PUBLIC_CONVEX_URL`: Your Convex deployment URL.
*   `CLERK_SECRET_KEY`: Your Clerk secret key.
*   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Your Clerk publishable key.
*   `NEXT_PUBLIC_CLERK_SIGN_IN_URL`: Clerk sign-in URL.
*   `NEXT_PUBLIC_CLERK_SIGN_UP_URL`: Clerk sign-up URL.
*   `CLERK_JWT_ISSUER_DOMAIN`: Your Clerk domain (e.g., `https://your-app-name.clerk.accounts.dev`). This is crucial for Convex to validate Clerk JWTs.
*   `SCRAPER_WEBHOOK_SECRET`: A secret key for authenticating incoming requests from your Playwright scraper to your Convex HTTP endpoint.

## Success Metrics
*   **Real-time Updates**: New notifications appear instantly in the UI without manual refresh.
*   **Unread Badge Accuracy**: The unread count badge updates immediately when notifications are read/unread.
*   **Role-Based Visibility**: Users only see notifications relevant to their assigned roles (Client, Creator, Admin).
*   **Search Functionality**: Search results appear in real-time, filtered by user.
*   **Scraper Integration**: Data from the Playwright scraper successfully creates new notifications in Convex, targeting the correct recipients.
*   **Authentication**: All notification actions and queries are secured, requiring authentication and proper authorization.
*   **Scalability**: The system remains responsive and performant under increasing user load and notification volume, leveraging Convex's managed backend.---
name: agent-convex-notification-center
description: Implements a real-time Notification Center using Convex for backend logic, storage, and search, integrated with Next.js and Clerk.
model: inherit
color: purple
---

# Agent: Notification Center Implementation with Convex

## Agent Overview
**Purpose**: This agent provides comprehensive instructions for implementing a real-time Notification Center feature using Convex as the primary backend. It covers data modeling, real-time updates, search, authentication, and integration with a Next.js frontend and a local Playwright scraper, adhering strictly to Convex best practices.
**Tech Stack**: Next.js, React, Convex, Clerk
**Source**: Convex Documentation, Clerk Documentation, Next.js Documentation.

## Critical Implementation Knowledge
The term "Custom API" in this context refers to the **custom backend logic and data management built entirely within Convex**. There is no third-party "Custom API" service for notifications. All backend functionality will be implemented using Convex actions, mutations, and queries.

### 1. Convex Latest Updates 🚨
*   **Convex Full-Text Search (FTS) Enhancements**: Convex continuously improves its FTS capabilities, allowing for powerful, real-time search across your documents. Ensure you leverage the latest `search` index configuration for optimal performance.
*   **Action HTTP Endpoints**: Convex Actions can be exposed as HTTP endpoints, providing a secure and direct way for external services (like your local Playwright scraper) to trigger backend logic without needing a separate Next.js API route. This is the recommended pattern for external integrations when possible. HTTP actions take a `Request` and return a `Response` following the Fetch API, and can interact with data in Convex indirectly by running queries, mutations, and actions.
*   **Optimistic Updates**: Convex's client SDK inherently supports optimistic updates for mutations, providing a smoother UX. Utilize this pattern where applicable.
*   **`_id` and `_creationTime`**: Convex automatically adds `_id` (unique identifier) and `_creationTime` (timestamp) to all documents. These are crucial for sorting and referencing.

### 2. Common Pitfalls & Solutions 🚨
*   **Over-fetching Data in Queries**: Avoid selecting entire documents if you only need a few fields. Use `db.query("table").collect().map(...)` to project only necessary fields or create specific indexes. Queries should be as lightweight as possible for real-time efficiency.
*   **Complex Logic in Queries/Mutations**: Remember that Convex Queries are read-only and must be fast. Mutations are for simple writes. Complex business logic, external API calls, or interactions with external services (like receiving data from a scraper) **must be placed in Convex Actions**.
*   **Authentication Issues**: Ensure your Clerk integration correctly provides the `auth` object to Convex functions. Misconfigured `AUTH_ORIGIN` or missing environment variables (`CLERK_JWT_ISSUER_DOMAIN`, `CLERK_SECRET_KEY`) can lead to unauthorized access. Always check `auth.isAuthenticated` and `auth.getUserIdentity()` for user-specific data.
*   **Schema Evolution**: Convex schema is enforced. When making changes to your data models, update your `convex/schema.ts` file carefully. Use `npx convex dev` with the `--until-first-build` flag for local development.
*   **Rate Limits**: While Convex is highly scalable, be mindful of client-side query patterns. Avoid excessively frequent or computationally expensive queries in rapid succession, especially across many connected clients, to prevent potential performance bottlenecks or hitting project limits.

### 3. Best Practices 🚨
*   **Atomic Operations with Mutations**: Group related database writes into a single mutation for consistency.
*   **Use Actions for Side Effects**: Any operation that has side effects (e.g., sending emails, calling external APIs, processing data from an external source) should be a Convex Action.
*   **Index Everything You Query By**: For efficient data retrieval and real-time updates, ensure you have appropriate indexes defined in `convex/schema.ts` for all fields used in `db.query(...).withIndex(...)` or `db.get(...)`.
*   **Leverage Real-time Queries**: For the notification feed and badge count, use `useQuery` in your Next.js components to automatically re-render when data changes.
*   **Role-Based Access Control (RBAC)**: Implement role checks within your Convex functions using `auth.getUserIdentity().then(identity => identity?.customClaims?.role)` to ensure users only access notifications relevant to their roles (Client, Creator, Admin).
*   **Soft Deletes vs. Hard Deletes**: For archiving notifications, consider a "soft delete" approach by adding a `isArchived: boolean` field rather than permanently deleting data, allowing for recovery or historical views.

## Implementation Steps
1.  **Convex Schema Definition**: Define the `notifications` table and `user_preferences` table with appropriate fields and indexes.
2.  **Convex Authentication Setup**: Configure Convex to work with Clerk JWTs.
3.  **Convex Mutations**: Create mutations for `markAsRead`, `markAsUnread`, `archiveNotification`, and `updatePreferences`.
4.  **Convex Queries**: Implement queries for `getNotificationsForUser`, `getUnreadCountForUser`, `searchNotifications`, and `getUserPreferences`.
5.  **Convex Actions**: Create an action `ingestScraperData` that processes data from the Playwright scraper and creates new notifications.
6.  **Next.js Frontend Integration**: Develop React components to display notifications, manage preferences, and integrate search.
7.  **Playwright Scraper Integration**: Configure the local Playwright scraper to call the Convex Action HTTP endpoint.

### Backend Implementation
The entire backend for the Notification Center will be implemented using Convex actions, mutations, and queries. No Next.js API routes are needed for internal business logic. A Next.js API route might *only* be considered if the Playwright scraper cannot directly make HTTP requests to a Convex Action endpoint for some reason (e.g., complex authentication or data transformation that can't be handled by Convex). However, a Convex Action HTTP endpoint is the preferred and simpler approach.

#### Convex Functions (Primary)
*   **`convex/notifications.ts`**:
    *   **Mutations**:
        *   `createNotification(args: { recipientId: Id<'users'>, type: string, content: string, link?: string, metadata?: any })`: Creates a new notification.
        *   `markAsRead(args: { notificationId: Id<'notifications'> })`: Marks a specific notification as read.
        *   `markAllAsRead()`: Marks all unread notifications for the current user as read.
        *   `archiveNotification(args: { notificationId: Id<'notifications'> })`: Archives a notification (soft delete).
        *   `updateNotificationPreferences(args: { preferences: { [key: string]: boolean } })`: Updates user notification preferences.
    *   **Queries**:
        *   `getNotifications(args: { status?: 'read' | 'unread' | 'archived', limit?: number })`: Fetches notifications for the authenticated user, potentially filtered by status.
        *   `getUnreadCount()`: Returns the number of unread notifications for the authenticated user.
        *   `searchNotifications(args: { query: string })`: Performs a full-text search across notification content for the authenticated user.
    *   **Actions**:
        *   `ingestScraperData(args: { scrapedContent: any[] })`: This action will be called by the Playwright scraper. It will process the `scrapedContent`, identify relevant changes, and then call `createNotification` mutations for the appropriate users based on roles and content. This action can perform external checks or complex logic.
*   **`convex/users.ts`**:
    *   **Queries**: `getUserRole()`: Returns the role of the authenticated user to enable role-based filtering on the frontend.

### Frontend Integration
The Next.js frontend will use the Convex client SDK (`useQuery`, `useMutation`) to interact with the backend functions.
*   **Notification List Component**: Uses `useQuery(api.notifications.getNotifications, { status: ... })` to display real-time notifications.
*   **Unread Badge Component**: Uses `useQuery(api.notifications.getUnreadCount)` to display the number of unread notifications, updating in real-time.
*   **Search Bar Component**: Uses `useQuery(api.notifications.searchNotifications, { query: searchText })` with debouncing for real-time search suggestions and results.
*   **Preference Settings Component**: Uses `useQuery(api.notifications.getUserPreferences)` to display current preferences and `useMutation(api.notifications.updateNotificationPreferences)` to save changes.
*   **Action Buttons**: Use `useMutation` for "Mark Read", "Archive", "Mark All Read" buttons.

## Code Patterns

### Convex Backend Functions
*   **Schema Definition (`convex/schema.ts`)**:
    ```typescript
    import { defineSchema, defineTable } from "convex/server";
    import { v } from "convex/values";

    export default defineSchema({
      notifications: defineTable({
        recipientId: v.id("users"), // Assuming a 'users' table or clerk user ID
        type: v.string(), // e.g., "new_video", "milestone", "payment", "approval"
        content: v.string(), // The message body
        link: v.optional(v.string()), // URL to related content
        isRead: v.boolean(),
        isArchived: v.boolean(),
        // Metadata for filtering/searching, e.g., campaignId, creatorName
        metadata: v.optional(v.any()), // Store structured data relevant to the notification
        // For search:
        searchableContent: v.string(), // Denormalized string for full-text search
      }).index("by_recipient_and_status", ["recipientId", "isRead", "isArchived"])
        .index("by_recipient_and_archived", ["recipientId", "isArchived"])
        .searchIndex("search_content", {
          searchField: "searchableContent",
          filterFields: ["recipientId"],
        }),

      user_preferences: defineTable({
        userId: v.id("users"), // Assuming a 'users' table or clerk user ID
        preferences: v.any(), // e.g., { emailNotifications: true, pushNotifications: false, type: { new_video: true } }
      }).index("by_user", ["userId"]),

      // Assuming a 'users' table from Clerk integration
      users: defineTable({
        clerkId: v.string(), // Clerk user ID
        email: v.string(),
        role: v.union(v.literal("client"), v.literal("creator"), v.literal("admin")),
        // other user-related fields
      }).index("by_clerk_id", ["clerkId"]),
    });
    ```
*   **Mutation (`convex/notifications.ts`) - Example `markAsRead`**:
    ```typescript
    import { mutation } from "./_generated/server";
    import { v } from "convex/values";

    export const markAsRead = mutation({
      args: { notificationId: v.id("notifications") },
      handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
          throw new Error("Not authenticated");
        }
        // You might want to get the user from your 'users' table to match by clerkId
        const user = await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) =>
            q.eq("clerkId", identity.subject)
          )
          .unique();

        if (!user) {
          throw new Error("User not found in Convex");
        }

        const notification = await ctx.db.get(args.notificationId);
        if (!notification || notification.recipientId !== user._id) {
          throw new Error("Notification not found or not authorized");
        }

        await ctx.db.patch(args.notificationId, { isRead: true });
      },
    });
    ```
*   **Query (`convex/notifications.ts`) - Example `getUnreadCount`**:
    ```typescript
    import { query } from "./_generated/server";

    export const getUnreadCount = query({
      handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
          return 0; // Or throw an error depending on desired behavior
        }
        const user = await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) =>
            q.eq("clerkId", identity.subject)
          )
          .unique();

        if (!user) {
          return 0; // User not found, no notifications
        }

        const count = await ctx.db
          .query("notifications")
          .withIndex("by_recipient_and_status", (q) =>
            q.eq("recipientId", user._id).eq("isRead", false).eq("isArchived", false)
          )
          .collect(); // collect() is fine for counting, but avoid for large data

        return count.length;
      },
    });
    ```
*   **Action (`convex/notifications.ts`) - Example `ingestScraperData`**:
    ```typescript
    import { action } from "./_generated/server";
    import { v } from "convex/values";
    import { internal } from "./_generated/api"; // For calling mutations from actions

    // This action could be called directly by your local scraper
    // or through an HTTP endpoint configured in convex.config.ts
    export const ingestScraperData = action({
      args: { scrapedContent: v.array(v.any()) }, // Adjust schema as per scraper output
      handler: async (ctx, args) => {
        console.log("Ingesting scraped data:", args.scrapedContent);

        // Example: Process scraped data to create notifications
        for (const item of args.scrapedContent) {
          // Assume item has properties like 'creatorId', 'type', 'message'
          // Logic to determine recipients and notification content based on scraped data
          // For example, if a new video is posted by a creator, notify clients subscribed to them.

          // Find relevant users to notify (e.g., all clients, or clients subscribed to a creator)
          // This would typically be an internal query or direct db access if within an action
          const allClients = await ctx.runQuery(internal.users.getClients); // An internal query to get clients (implement getClients in users.ts)

          for (const client of allClients) {
            // Determine notification content based on the scraped item and client role
            const notificationContent = `New video from ${item.creatorName}: ${item.videoTitle}`;
            const searchableContent = `${notificationContent} ${item.creatorName} ${item.campaign || ''} ${item.hashtags || ''}`;

            await ctx.runMutation(internal.notifications.createNotification, {
              recipientId: client._id,
              type: "new_video",
              content: notificationContent,
              link: item.videoUrl,
              isRead: false,
              isArchived: false,
              metadata: { creatorId: item.creatorId, videoId: item.videoId },
              searchableContent: searchableContent.toLowerCase(),
            });
          }
        }

        return { success: true, processedItems: args.scrapedContent.length };
      },
    });
    ```
    *   **HTTP Endpoint Configuration (`convex.config.ts`)**:
        ```typescript
        import { defineConvexConfig } from "convex/server";
        import { httpRouter } from "./http"; // Assuming you define httpRouter for custom HTTP endpoints

        export default defineConvexConfig({
          // ... other config
          http: {
            routes: httpRouter,
          },
        });
        ```
        *   **`convex/http.ts`**:
            ```typescript
            import { httpRouter } from "convex/server";
            import { internal } from "./_generated/api";

            const http = httpRouter();

            // This route exposes an HTTP endpoint for your local scraper
            // It's crucial to secure this endpoint (e.g., with a secret key)
            http.route({
              path: "/scraper-webhook",
              method: "POST",
              handler: async (ctx, request) => {
                const payload = await request.json();
                // Perform any validation or authentication for the scraper webhook
                // For example, check a secret header or API key
                // process.env.SCRAPER_WEBHOOK_SECRET must be set

                if (payload.secret !== process.env.SCRAPER_WEBHOOK_SECRET) {
                  return new Response("Unauthorized", { status: 401 });
                }

                // Call the internal Convex action to ingest the data
                await ctx.runAction(internal.notifications.ingestScraperData, {
                  scrapedContent: payload.data, // Adjust based on your scraper's payload structure
                });

                return new Response(JSON.stringify({ success: true }), {
                  status: 200,
                  headers: new Headers({ "Content-Type": "application/json" }),
                });
              },
            });

            export default http;
            ```

## Testing & Debugging
*   **Convex Dashboard**: Use the Convex dashboard to inspect your database tables, query results, and view function logs. This is invaluable for debugging data issues and ensuring your functions run as expected.
*   **Convex Local Development (`npx convex dev`)**: Run Convex locally to test changes quickly. The `npx convex dev` command provides a local database and server, allowing you to debug with console logs.
*   **Unit Testing (Not built-in for Convex yet)**: For complex logic, consider writing pure functions that can be tested outside of the Convex runtime. Integrate these into Convex Actions/Mutations.
*   **Browser Developer Tools**: Use the network tab to inspect Convex API calls from your Next.js frontend, ensuring data is sent and received correctly.
*   **Clerk Debugging**: Use the Clerk dashboard to check user identities, session tokens, and webhook events.
*   **Action/HTTP Endpoint Testing**: Use tools like Postman, Insomnia, or `curl` to send test requests to your Convex Action HTTP endpoint to simulate scraper data ingestion.

## Environment Variables
Ensure these are set in your `.env.local` for development and in your hosting environment (Vercel, Netlify) for production.
*   `NEXT_PUBLIC_CONVEX_URL`: Your Convex deployment URL.
*   `CLERK_SECRET_KEY`: Your Clerk secret key.
*   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Your Clerk publishable key.
*   `NEXT_PUBLIC_CLERK_SIGN_IN_URL`: Clerk sign-in URL.
*   `NEXT_PUBLIC_CLERK_SIGN_UP_URL`: Clerk sign-up URL.
*   `CLERK_JWT_ISSUER_DOMAIN`: Your Clerk domain (e.g., `https://your-app-name.clerk.accounts.dev`). This is crucial for Convex to validate Clerk JWTs.
*   `SCRAPER_WEBHOOK_SECRET`: A secret key for authenticating incoming requests from your Playwright scraper to your Convex HTTP endpoint.

## Success Metrics
*   **Real-time Updates**: New notifications appear instantly in the UI without manual refresh.
*   **Unread Badge Accuracy**: The unread count badge updates immediately when notifications are read/unread.
*   **Role-Based Visibility**: Users only see notifications relevant to their assigned roles (Client, Creator, Admin).
*   **Search Functionality**: Search results appear in real-time, filtered by user.
*   **Scraper Integration**: Data from the Playwright scraper successfully creates new notifications in Convex, targeting the correct recipients.
*   **Authentication**: All notification actions and queries are secured, requiring authentication and proper authorization.
*   **Scalability**: The system remains responsive and performant under increasing user load and notification volume, leveraging Convex's managed backend.