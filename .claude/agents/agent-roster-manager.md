---
name: agent-convex-rostermanager
description: Implements a Roster Manager feature using Convex for backend logic and data, integrated with Next.js and Clerk authentication.
model: inherit
color: purple
---


# Agent: Roster Manager Implementation with Convex

## Agent Overview
**Purpose**: This agent provides comprehensive instructions for implementing a "Roster Manager" feature. This feature allows administrators to create, customize, manage, and export custom rosters based on internally stored `profiles`, `posts`, and `performance_metrics` data. The "Custom API" mentioned in the request is interpreted as custom backend logic built *within* Convex, leveraging Convex Actions, Mutations, and Queries, rather than an external third-party API.
**Tech Stack**: Next.js, Convex (Database, Actions, Mutations, Queries, File Storage), Clerk (Authentication).
**Source**: Convex Developer Hub, Clerk documentation, GitHub examples, and best practice articles related to Convex, Next.js, and Clerk integration.

## Critical Implementation Knowledge

### 1. Convex Latest Updates 🚨
Convex is continuously evolving. Key considerations for this project include:
*   **Reactive Queries**: Convex provides real-time updates to connected clients automatically when backend data changes, which is ideal for dynamic roster displays.
*   **`aggregate` Component**: For complex data aggregations like calculating total likes, views, or average performance across selected profiles within a roster, Convex recommends using the `aggregate` component or custom aggregation logic within Actions, as native aggregate queries are not a core feature.
*   **TypeScript-first Backend**: All backend logic (queries, mutations, actions, schemas) is written in TypeScript, offering strong type safety.
*   **File Storage**: Convex offers built-in file storage, accessible via Actions, which is crucial for the "export with scraped metrics" requirement.

### 2. Common Pitfalls & Solutions 🚨
*   **Inefficient Data Filtering**:
    *   **Pitfall**: Filtering large datasets in queries without proper indexes can lead to slow performance and high costs. Using `.filter()` on `db.query()` is less efficient than `withIndex()`.
    *   **Solution**: Always define and utilize [Convex indexes](https://docs.convex.dev/database/indexes) in your `schema.ts` for any fields you plan to filter or sort by, especially for "views", "likes", "followers" or "creator ID" when building rosters.
*   **Lack of Authentication Checks**:
    *   **Pitfall**: Assuming client-side authentication is sufficient for backend functions. Unauthorized users could potentially call Convex functions if not properly secured.
    *   **Solution**: Implement explicit authentication and authorization checks within *every* Convex query, mutation, and action using `ctx.auth.getUserIdentity()`.
*   **`useAuth()` vs `useConvexAuth()`**:
    *   **Pitfall**: Using Clerk's `useAuth()` hook directly for conditional rendering based on Convex backend readiness can lead to race conditions where Convex queries run before the authentication token is available.
    *   **Solution**: Always use Convex's `useConvexAuth()` hook and the `<Authenticated>`, `<Unauthenticated>`, `<AuthLoading>` components from `convex/react` (or `convex/react-clerk` if using `ConvexProviderWithClerk`) when dealing with auth-dependent Convex calls on the client side. This ensures the JWT is ready before Convex operations.
*   **Aggregates Out of Sync**:
    *   **Pitfall**: Manually managed aggregate data (e.g., total likes for a profile) can fall out of sync with the base data if not updated transactionally or through triggers.
    *   **Solution**: Use [Convex database triggers](https://docs.convex.dev/database/triggers) or run mutations in Convex Actions that update aggregates whenever the source data (`posts`, `performance_metrics`) changes. The `aggregate` component can simplify this.
*   **Large Data Operations in Queries/Mutations**:
    *   **Pitfall**: Performing heavy computation, external API calls, or generating large export files directly within a query or mutation. Queries and mutations are designed for fast, transactional database operations.
    *   **Solution**: Delegate such tasks to Convex Actions. Actions are designed for complex logic, external integrations, and can run in a Node.js environment if specific npm packages or Node.js APIs are required (e.g., for CSV generation libraries).

### 3. Best Practices 🚨
*   **Schema Definition**: Always define a `schema.ts` to enforce data types, ensure type safety across frontend and backend, and crucially, define indexes for efficient querying.
*   **Robust Access Control**: Implement robust role-based access control (RBAC) within Convex functions. For Roster Manager, ensure only authenticated admins can create, edit, delete, or duplicate rosters, and access potentially sensitive creator performance data. Use `ctx.auth.getUserIdentity()` to get user information and check roles.
*   **Convex Provider Setup**: Use `ConvexProviderWithClerk` to seamlessly integrate Clerk authentication with your Convex client. Wrap your root `layout.tsx` with this provider.
*   **Atomic Operations**: For database writes and state changes, use Convex Mutations to ensure atomicity and consistency.
*   **Complex Logic/External Calls in Actions**: Use Convex Actions for operations that involve calling external services (if any are introduced later), complex data transformations not suitable for queries/mutations, or tasks like generating large reports for export.
*   **Next.js Middleware for Route Protection**: Use Clerk's `authMiddleware` in Next.js to protect routes (`/dashboard`, `/admin/*`) that require a user to be logged in, redirecting unauthenticated users to the sign-in page. This acts as the first line of defense.

## Implementation Steps

### Backend Implementation (Convex)

The entire "Custom API" logic for Roster Manager will be built using Convex functions.

#### 1. Data Modeling
Define the following tables in your `convex/schema.ts` (or let Convex infer them, though explicit schema is recommended):
*   `profiles`: Stores creator profiles (e.g., `_id`, `clerkUserId`, `name`, `platformHandles`, `bio`, `...`).
*   `posts`: Stores content posts by creators (e.g., `_id`, `profileId` (foreign key to `profiles`), `platform`, `url`, `views`, `likes`, `comments`, `...`).
*   `performance_metrics`: Stores aggregated or time-series performance data for profiles/posts (e.g., `_id`, `entityId`, `entityType` (e.g., 'profile' or 'post'), `metricType`, `value`, `date`, `...`).
*   `rosters`: Stores custom roster definitions (e.g., `_id`, `adminId` (Clerk user ID), `name`, `description`, `filters` (JSON object), `sorting` (JSON object), `columns` (array of strings), `colorCoding` (JSON object), `isDefault` (boolean), `createdAt`, `updatedAt`).
*   `rosterProfiles`: A join table for many-to-many relationship between `rosters` and `profiles` (e.g., `_id`, `rosterId`, `profileId`). This allows one profile to be in multiple rosters and one roster to contain multiple profiles.

#### 2. Schema Definition with Indexes
Create `convex/schema.ts` to define tables, data types, and crucial indexes for efficient filtering and sorting. For example:

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  profiles: defineTable({
    clerkUserId: v.string(), // Link to Clerk user
    name: v.string(),
    // ... other profile fields
  }).index("by_clerkUserId", ["clerkUserId"]),

  posts: defineTable({
    profileId: v.id("profiles"),
    platform: v.string(),
    views: v.number(),
    likes: v.number(),
    followers: v.number(), // Scraped field
    // ... other post fields
  })
    .index("by_profileId", ["profileId"])
    .index("by_profileId_views", ["profileId", "views"])
    .index("by_profileId_likes", ["profileId", "likes"])
    .index("by_platform", ["platform"]),

  performance_metrics: defineTable({
    entityId: v.union(v.id("profiles"), v.id("posts")),
    entityType: v.union(v.literal("profile"), v.literal("post")),
    metricType: v.string(), // E.g., "monthly_views", "engagement_rate"
    value: v.number(),
    date: v.number(), // UTC timestamp
  })
    .index("by_entityId_metricType_date", ["entityId", "metricType", "date"])
    .index("by_entityType_metricType_date", ["entityType", "metricType", "date"]),

  rosters: defineTable({
    adminId: v.string(), // Clerk user ID of the admin who owns the roster
    name: v.string(),
    description: v.optional(v.string()),
    filters: v.any(), // JSON object for dynamic filters
    sorting: v.any(), // JSON object for dynamic sorting
    columns: v.array(v.string()), // E.g., ["name", "views", "likes"]
    colorCoding: v.any(), // JSON object for color coding rules
    isDefault: v.boolean(),
  })
  .index("by_adminId", ["adminId"])
  .index("by_adminId_isDefault", ["adminId", "isDefault"])
  .searchIndex("by_name", {
    searchField: "name",
    filterFields: ["adminId"],
  }), // For searching rosters by name, filtered by admin

  rosterProfiles: defineTable({
    rosterId: v.id("rosters"),
    profileId: v.id("profiles"),
  })
    .index("by_rosterId", ["rosterId"])
    .index("by_profileId", ["profileId"])
    .unique("by_rosterId_profileId", ["rosterId", "profileId"]),
});
```

#### 3. Convex Queries (e.g., `convex/rosters.ts`)
*   **`getAdminRosters`**: Fetch all rosters belonging to the authenticated admin.
*   **`getRosterDetails`**: Fetch a specific roster by ID, including its definition, and then dynamically query associated `profiles`, `posts`, and `performance_metrics` based on the roster's `filters`, `sorting`, and `columns` configurations. This will involve multiple `ctx.db.query()` calls, potentially chained or joined using `Promise.all`.

    ```typescript
    // convex/rosters.ts
    import { query } from "./_generated/server";
    import { v } from "convex/values";
    import { internal } from "./_generated/api";

    export const getAdminRosters = query({
      args: {},
      handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
          throw new Error("Not authenticated");
        }
        const adminId = identity.subject; // Clerk user ID

        return await ctx.db
          .query("rosters")
          .withIndex("by_adminId", (q) => q.eq("adminId", adminId))
          .collect();
      },
    });

    export const getRosterData = query({
      args: { rosterId: v.id("rosters") },
      handler: async (ctx, { rosterId }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
          throw new Error("Not authenticated");
        }
        const adminId = identity.subject;

        const roster = await ctx.db.get(rosterId);
        if (!roster || roster.adminId !== adminId) {
          throw new Error("Roster not found or unauthorized");
        }

        // Fetch associated profiles via join table
        const rosterProfileLinks = await ctx.db
          .query("rosterProfiles")
          .withIndex("by_rosterId", (q) => q.eq("rosterId", rosterId))
          .collect();

        const profileIds = rosterProfileLinks.map(link => link.profileId);
        if (profileIds.length === 0) {
          return { roster, profiles: [] };
        }

        const profiles = await Promise.all(
          profileIds.map(async (id) => {
            const profile = await ctx.db.get(id);
            if (!profile) return null;

            // Fetch latest post metrics (example: highest views) for the profile
            const latestPost = await ctx.db
              .query("posts")
              .withIndex("by_profileId_views", (q) => q.eq("profileId", profile._id))
              .order("desc") // Get highest views
              .first();

            // Fetch a specific performance metric for the profile (e.g., 'monthly_views')
            const monthlyViewsMetric = await ctx.db
              .query("performance_metrics")
              .withIndex("by_entityId_metricType_date", (q) =>
                q.eq("entityId", profile._id).eq("metricType", "monthly_views")
              )
              .order("desc")
              .first();

            return {
              ...profile,
              latestPostViews: latestPost?.views || 0,
              monthlyViews: monthlyViewsMetric?.value || 0,
              // ... add other scraped fields as per roster.columns
            };
          })
        );

        // Apply filters and sorting from roster definition if not already applied in queries
        // This part needs careful implementation based on `roster.filters` and `roster.sorting` structure
        let filteredAndSortedProfiles = profiles.filter(Boolean) as any[]; // Remove nulls and cast

        // Example: Dynamic filtering (pseudo-code)
        if (roster.filters && typeof roster.filters === 'object') {
          for (const key in roster.filters) {
            const filterValue = roster.filters[key];
            if (filterValue !== undefined) {
              filteredAndSortedProfiles = filteredAndSortedProfiles.filter(profile => {
                // Implement your filtering logic based on key and filterValue
                // Example: profile.platform === filterValue, profile.likes > filterValue
                if (key === "min_likes") {
                  return profile.latestPostLikes >= filterValue; // Assuming latestPostLikes is added
                }
                return true;
              });
            }
          }
        }

        // Example: Dynamic sorting (pseudo-code)
        if (roster.sorting && typeof roster.sorting === 'object') {
          const { field, direction } = roster.sorting;
          if (field && direction) {
            filteredAndSortedProfiles.sort((a, b) => {
              const valA = a[field];
              const valB = b[field];
              if (valA < valB) return direction === "asc" ? -1 : 1;
              if (valA > valB) return direction === "asc" ? 1 : -1;
              return 0;
            });
          }
        }

        return { roster, profiles: filteredAndSortedProfiles };
      },
    });
    ```

#### 4. Convex Mutations (e.g., `convex/rosters.ts`)
*   **`createRoster`**: Creates a new roster document, associating it with the `adminId`.
*   **`updateRoster`**: Updates an existing roster's name, description, filters, sorting, columns, color coding, and default status.
*   **`deleteRoster`**: Deletes a roster and its associated entries in `rosterProfiles`.
*   **`duplicateRoster`**: Creates a copy of an existing roster and its profile associations.
*   **`addProfileToRoster`**: Adds a `profileId` to a `rosterId` in the `rosterProfiles` table.
*   **`removeProfileFromRoster`**: Removes a `profileId` from a `rosterId`.

    ```typescript
    // convex/rosters.ts (continued)
    import { mutation } from "./_generated/server";
    import { v } from "convex/values";

    export const createRoster = mutation({
      args: {
        name: v.string(),
        description: v.optional(v.string()),
        filters: v.any(),
        sorting: v.any(),
        columns: v.array(v.string()),
        colorCoding: v.any(),
        isDefault: v.boolean(),
      },
      handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
          throw new Error("Not authenticated");
        }
        const adminId = identity.subject;

        // Ensure only one default roster per admin
        if (args.isDefault) {
          const currentDefault = await ctx.db
            .query("rosters")
            .withIndex("by_adminId_isDefault", (q) =>
              q.eq("adminId", adminId).eq("isDefault", true)
            )
            .first();
          if (currentDefault) {
            await ctx.db.patch(currentDefault._id, { isDefault: false });
          }
        }

        return await ctx.db.insert("rosters", { adminId, ...args });
      },
    });

    export const updateRoster = mutation({
      args: {
        rosterId: v.id("rosters"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        filters: v.optional(v.any()),
        sorting: v.optional(v.any()),
        columns: v.optional(v.array(v.string())),
        colorCoding: v.optional(v.any()),
        isDefault: v.optional(v.boolean()),
      },
      handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
          throw new Error("Not authenticated");
        }
        const adminId = identity.subject;

        const { rosterId, ...updates } = args;
        const roster = await ctx.db.get(rosterId);
        if (!roster || roster.adminId !== adminId) {
          throw new Error("Roster not found or unauthorized");
        }

        // Handle default roster logic
        if (updates.isDefault === true) {
          const currentDefault = await ctx.db
            .query("rosters")
            .withIndex("by_adminId_isDefault", (q) =>
              q.eq("adminId", adminId).eq("isDefault", true)
            )
            .first();
          if (currentDefault && currentDefault._id !== rosterId) {
            await ctx.db.patch(currentDefault._id, { isDefault: false });
          }
        }

        await ctx.db.patch(rosterId, updates);
      },
    });

    export const deleteRoster = mutation({
      args: { rosterId: v.id("rosters") },
      handler: async (ctx, { rosterId }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
          throw new Error("Not authenticated");
        }
        const adminId = identity.subject;

        const roster = await ctx.db.get(rosterId);
        if (!roster || roster.adminId !== adminId) {
          throw new Error("Roster not found or unauthorized");
        }

        // Delete associated rosterProfiles entries
        const rosterProfileLinks = await ctx.db
          .query("rosterProfiles")
          .withIndex("by_rosterId", (q) => q.eq("rosterId", rosterId))
          .collect();

        await Promise.all(rosterProfileLinks.map(link => ctx.db.delete(link._id)));

        await ctx.db.delete(rosterId);
      },
    });

    // ... other mutations like duplicateRoster, addProfileToRoster, removeProfileFromRoster
    ```

#### 5. Convex Actions (e.g., `convex/rosterActions.ts`)
*   **`exportRosterData`**:
    *   This action will fetch the roster data using internal queries (similar to `getRosterData`), process it (e.g., format into CSV or JSON), and then store the resulting file in Convex File Storage using `ctx.storage.store()`.
    *   It can optionally run in a Node.js environment (`"use node"`) if external libraries are needed for specific file formats (e.g., `csv-stringify`).
    *   Once stored, it can return a download URL or a `storageId` that the client can then use to retrieve the file.

    ```typescript
    // convex/rosterActions.ts
    import { action, internalMutation } from "./_generated/server";
    import { v } from "convex/values";
    import { internal } from "./_generated/api";

    // This action might need to run in Node.js if using complex libraries
    // "use node";

    export const exportRosterData = action({
      args: { rosterId: v.id("rosters"), format: v.string() }, // e.g., "csv", "json"
      handler: async (ctx, { rosterId, format }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
          throw new Error("Not authenticated");
        }
        const adminId = identity.subject;

        // Fetch the data for the roster (use an internal query)
        const { roster, profiles } = await ctx.runQuery(
          internal.rosters.getRosterData,
          { rosterId }
        );

        if (!roster || roster.adminId !== adminId) {
          throw new Error("Roster not found or unauthorized for export");
        }

        let fileContent: string | ArrayBuffer;
        let mimeType: string;
        let filename: string = `roster-${roster.name.replace(/\s/g, '_')}`;

        if (format === "json") {
          fileContent = JSON.stringify({ roster, profiles }, null, 2);
          mimeType = "application/json";
          filename += ".json";
        } else if (format === "csv") {
          // Example CSV generation (simplistic, real-world would use a library)
          const headers = ["Name", "Latest Post Views", "Monthly Views", ...roster.columns];
          const rows = profiles.map((p: any) =>
            [
              p.name,
              p.latestPostViews,
              p.monthlyViews,
              ...roster.columns.map((col: string) => p[col] !== undefined ? p[col] : '')
            ].join(',')
          );
          fileContent = [headers.join(','), ...rows].join('\n');
          mimeType = "text/csv";
          filename += ".csv";
        } else {
          throw new Error("Unsupported export format");
        }

        // Store the generated file in Convex File Storage
        const storageId = await ctx.storage.store(
          new Blob([fileContent], { type: mimeType }),
          {
            _name: filename,
            _size: new TextEncoder().encode(fileContent).length,
          }
        );

        // Optionally, save the storageId to a table to track exports,
        // or directly return a URL for immediate download.
        // For direct download, you'd typically return the storageId and client would construct a URL.
        // Or if you want to store a record of the export:
        // await ctx.runMutation(internal.exports.recordExport, { storageId, rosterId, format });

        // Returning the storageId allows the client to generate a temporary download URL.
        return storageId;
      },
    });

    // An internal mutation to record exports if desired (optional)
    export const recordExport = internalMutation({
      args: {
        storageId: v.id("_storage"),
        rosterId: v.id("rosters"),
        format: v.string(),
      },
      handler: async (ctx, args) => {
        await ctx.db.insert("exports", {
          storageId: args.storageId,
          rosterId: args.rosterId,
          format: args.format,
          exportedAt: Date.now(),
        });
      },
    });
    ```

### Frontend Integration (Next.js)

1.  **Convex Client Provider**:
    Wrap your `app/layout.tsx` with `ConvexClientProvider` and `ClerkProvider` as per Convex-Clerk integration guides.

    ```typescript
    // app/ConvexClientProvider.tsx (use client)
    "use client";
    import { ClerkProvider, useAuth } from "@clerk/nextjs";
    import { ConvexProviderWithClerk } from "convex/react-clerk";
    import { ConvexReactClient } from "convex/react";
    import { ReactNode } from "react";

    const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

    export default function ConvexClientProvider({ children }: { children: ReactNode }) {
      return (
        <ClerkProvider
          publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
        >
          <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
            {children}
          </ConvexProviderWithClerk>
        </ClerkProvider>
      );
    }

    // app/layout.tsx
    import { Inter } from "next/font/google";
    import "./globals.css";
    import ConvexClientProvider from "./ConvexClientProvider";

    const inter = Inter({ subsets: ["latin"] });

    export const metadata = {
      title: "Roster Manager",
      description: "Admin Custom Rosters powered by Convex",
    };

    export default function RootLayout({
      children,
    }: {
      children: ReactNode;
    }) {
      return (
        <html lang="en">
          <body className={inter.className}>
            <ConvexClientProvider>
              {children}
            </ConvexClientProvider>
          </body>
        </html>
      );
    }
    ```

2.  **Authentication Middleware**:
    Protect your admin routes using Clerk's `authMiddleware` in `middleware.ts`.

    ```typescript
    // middleware.ts
    import { authMiddleware } from "@clerk/nextjs";

    export default authMiddleware({
      // Public routes that don't require authentication
      publicRoutes: ["/", "/sign-in(.*)", "/sign-up(.*)"],
      // Routes that should be accessible to all users after authentication
      ignoredRoutes: [], // Add if needed
    });

    export const config = {
      // Protect all routes except those that start with /_next, /api, /static, /favicon.ico
      // and public routes.
      matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
    };
    ```

3.  **UI Components**:
    *   **Roster List**: Use `useQuery(api.rosters.getAdminRosters)` to display the list of custom rosters.
    *   **Roster Details/Editor**:
        *   Use `useQuery(api.rosters.getRosterData, { rosterId })` to fetch and display a specific roster's configuration and profiles.
        *   Use `useMutation(api.rosters.createRoster)`, `useMutation(api.rosters.updateRoster)`, `useMutation(api.rosters.deleteRoster)`, etc., for managing rosters.
        *   Form components for customizing name, filters, sorting, columns, color coding.
    *   **Export Button**: Use `useAction(api.rosterActions.exportRosterData)` to trigger the export. After receiving the `storageId`, you can construct a temporary download URL using `convex.get===Client().get=StorageUrl(storageId)`.

    ```typescript
    // app/dashboard/rosters/[rosterId]/page.tsx (example, use client)
    "use client";
    import { useQuery, useMutation, useAction } from "convex/react";
    import { api } from "../../../../convex/_generated/api";
    import { Id } from "../../../../convex/_generated/dataModel";
    import { useConvexAuth } from "convex/react";
    import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
    import { useRouter } from "next/navigation";
    import { useState, useEffect } from "react";

    export default function RosterDetailPage({
      params,
    }: {
      params: { rosterId: Id<"ro