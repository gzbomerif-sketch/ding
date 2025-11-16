# Roadmap: Roster Manager

## Context
- Stack: Next.js, Convex, Clerk
- Feature: Roster Manager with Custom (Convex-based) API

## Implementation Steps

### 1. Manual Setup (User Required)
- [ ] Create Convex account and project.
- [ ] Create Clerk account and application.
- [ ] Configure Clerk JWT Template named `convex`.
- [ ] Copy Clerk Issuer URL (Frontend API URL) for Convex configuration.
- [ ] Configure Clerk API keys (Publishable Key) in `.env.local`.
- [ ] Configure Convex URL in `.env.local`.

### 2. Dependencies & Environment
- [ ] Install: `@clerk/nextjs`, `convex`, `convex/react`, `convex/react-clerk`
- [ ] Env vars: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CONVEX_URL`, `CLERK_JWT_ISSUER_DOMAIN` (for `auth.config.ts`).

### 3. Database Schema
- [ ] `profiles` table: `defineTable({ clerkId: v.string(), name: v.string(), instagramHandle: v.string(), tiktokHandle: v.string(), ...otherProfileData })`
- [ ] `posts` table: `defineTable({ creatorId: v.id("profiles"), platform: v.union(v.literal("instagram"), v.literal("tiktok")), postId: v.string(), mediaUrl: v.string(), ...otherPostData })`
- [ ] `performance_metrics` table: `defineTable({ postId: v.id("posts"), views: v.number(), likes: v.number(), followersAtPostTime: v.number(), engagementRate: v.number(), ...otherMetrics })`
- [ ] `rosters` table: `defineTable({ adminId: v.id("users"), name: v.string(), columns: v.array(v.union(v.literal("views"), v.literal("likes"), v.literal("followersAtPostTime"), v.literal("instagramHandle"), v.literal("tiktokHandle"), ...otherProfileFields)), filters: v.array(v.object({ field: v.string(), operator: v.string(), value: v.any() })), sorting: v.object({ field: v.string(), order: v.union(v.literal("asc"), v.literal("desc")) }), colorCodingRules: v.array(v.object({ condition: v.string(), color: v.string() })), isDefault: v.boolean() })`
- [ ] Indexes: Create appropriate Convex indexes on `profiles`, `posts`, `performance_metrics` (e.g., `profiles:by_clerkId`, `posts:by_creatorId`, `performance_metrics:by_postId`) and on `rosters` (e.g., `rosters:by_adminId_isDefault`, `rosters:by_adminId`).

### 4. Backend Functions (Convex)
- [ ] `auth.config.ts`: Configure Clerk JWT issuer domain for server-side validation.
- [ ] `rosters.ts` (Mutations):
    - `createRoster`: Creates a new roster document for an admin.
    - `editRoster`: Updates an existing roster document.
    - `deleteRoster`: Deletes a roster document.
    - `duplicateRoster`: Creates a copy of an existing roster.
    - `setDefaultRoster`: Sets a specific roster as default for an admin, unsetting previous default.
- [ ] `rosters.ts` (Queries):
    - `getAdminRosters`: Fetches all custom rosters for the authenticated admin.
    - `getFilteredCreatorData`: Fetches and joins data from `profiles`, `posts`, `performance_metrics` based on dynamic filters and sorting criteria provided by a selected roster. This function will dynamically construct Convex queries using `withIndex` for performance.
    - `getCreatorExportData` (Action): For exporting, gathers necessary data and formats it for CSV/JSON export. Avoids document read limits for large exports.
- [ ] `common.ts` (Internal Helpers):
    - `isAdmin`: Internal function to verify if the authenticated user has admin privileges based on Clerk `userId` or metadata.

### 5. Frontend
- [ ] `_app.tsx` / `layout.tsx`: Wrap the application with `ClerkProvider` and `ConvexProviderWithClerk`.
- [ ] `middleware.ts`: Implement Clerk middleware to protect admin routes (e.g., `/admin/rosters`).
- [ ] `RosterManagerPage` (Page/Component):
    - Displays a list of custom rosters for the admin.
    - UI for creating, editing, deleting, duplicating, and setting default rosters.
    - UI for displaying creator data based on the selected roster's configurations (columns, filters, sorting, color coding).
    - Trigger export functionality.
- [ ] `RosterForm` (Component):
    - Form for defining/editing a roster: name, selecting columns, configuring filters (field, operator, value), choosing sorting (field, order), and setting color coding rules.
- [ ] `CreatorTable` (Component):
    - Displays the list of creators with their performance metrics, dynamically configured by the active roster's `columns`, `filters`, `sorting`, and `colorCodingRules`.
    - Integrates `useQuery` from `convex/react` to fetch data from `getFilteredCreatorData`.

### 6. Error Prevention
- [ ] API errors: Implement robust error handling in frontend for Convex mutations and queries (e.g., try-catch blocks, displaying user-friendly messages).
- [ ] Validation: Frontend form validation for roster creation/editing. Backend validation in Convex mutations to ensure data integrity and security (e.g., roster name uniqueness per admin, valid filter fields/operators).
- [ ] Rate limiting: Monitor Convex usage and optimize queries/mutations to stay within limits. Implement client-side debounce for frequently changing filters if needed.
- [ ] Auth: Enforce admin-only access for all roster management Convex functions using `ctx.auth.getUserIdentity()` checks and the `isAdmin` helper. Use `useConvexAuth()` hook for client-side authentication checks before rendering protected content or making queries.
- [ ] Type safety: Leverage TypeScript for all Convex schema definitions, function arguments, and frontend state to prevent runtime errors.
- [ ] Boundaries: Implement pagination for `getFilteredCreatorData` to handle large datasets and prevent exceeding Convex document read limits.

### 7. Testing
- [ ] Unit tests for Convex mutations and queries (e.g., `createRoster`, `getFilteredCreatorData`).
- [ ] Integration tests for Clerk authentication and Convex authorization (e.g., ensure non-admins cannot create/edit rosters).
- [ ] End-to-end tests for Roster Manager CRUD operations and dynamic data display.
- [ ] Performance tests for `getFilteredCreatorData` with various filter/sort combinations and large datasets.

## Documentation Sources

This implementation plan was created using the following documentation sources:

1. convex.dev: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGr1xAnlEtR4BAHjsBZC33qBRbKfUtEYnOSevyUlL4iLfBcGIlqUBGn5iHz1EYbxt4Ikih8OBh6wemPHvwL_jivj0WvqdBEaDfBgR96UVoXCNQxoaXtqbDZBeHKd1plZg==
2. youtube.com: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGkpXoaT--26orWQlR0Qah9ycDQHkvo1zOiLZS2Whnd_APb3NZFvCV_-ZMKBmcK1CbUxx24BY-L_jK5aBYUMdUAhTN7brqOrA_dHZj_yrbPZojzL08-nX4xWU6DcYWzXD5L9q2JPA==
3. convex.dev: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHz1o3KEnIGwra5X1v-nk1xILkeXn0myCmd-xB7KRu41sT_bT7OTSDYSutclrElfwkJZDOT6AlhEOhx5tKsss_wn1hp1wfwjzKX6u6Wrm86jAupX4V4GyJEbqCet4mlrK2v
4. convex.dev: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQH6sgbQTBH7wom-xB6yHiZpPg4GhltrqtBk_DwwPWghrECL3mTpGnxm7KJy6KXzcTSOiRagoZqTVn2FZO0TBufGpaNLOv7OJYYGDkcFMY2Gq7Xp_ZRTj9_iezjyxOdGHr0sbCI74J-RdYF7X7c=
5. answeroverflow.com: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEB275Dn0mJxVdpg6lFjlXRGcfusvqLziG5E5ItvevBLGQxSvZZTusawaDxJ_GKxjBTM7yS0t8wl_yhNiVy6UASsMf84rPN3pNvdfOtJNXHKisSlmNsFg8a8CnyrB8Jf0zGoNbabvstb9ddDR9O7Q==
