The search results confirm my interpretation: "Custom API" in the prompt context very likely refers to the internal API built with Convex. There is no widely known external API named "Custom" that provides Instagram and TikTok post insights directly. The details in the feature description about "local API," "scraped data," "profiles table," and "performance_metrics" further reinforce that the data is internal to the SylcRoad platform, managed by Convex.

Therefore, the roadmap will be designed for building "Post Insights" using Convex for backend data storage and functions, Next.js for the frontend, and Clerk for authentication.

**Key Learnings from Search:**
*   **Convex + Next.js Integration:** The `ConvexReactClient` is used to maintain a connection to Convex from client components. Data fetching from Convex often uses hooks from the Convex React library. Server Components can pre-load data, but reactive UI generally requires Client Components.
*   **Convex + Clerk Authentication:** `ConvexProviderWithClerk` from `convex/react-clerk` is crucial for integrating Clerk with Convex. It requires setting `CLERK_PUBLISHABLE_KEY` and `CLERK_JWT_ISSUER_DOMAIN` environment variables. Authentication checks (`ctx.auth.getUserIdentity()`) should be performed within Convex functions. Middleware can enforce authentication for Server Components in Next.js.
*   **Convex Data Modeling & Queries:** Convex supports real-time data, ACID transactions, and TypeScript-native schema. It's important to use indexes for efficient queries rather than `.filter()` on large datasets. `ctx.db.query().withIndex()` is the recommended approach for filtered queries. Avoid `collect()` on large result sets.
*   **Convex Limitations & Pricing:** Convex has a free Starter plan with generous limits for prototypes and small apps, and a Professional plan with higher limits and priority support. Limits exist for tables, indexes, function execution time, and concurrent function executions.
*   **Data Ingestion for "Scraped Data":** The prompt mentions "scraped captions and usernames" and "performance_metrics". Getting this data *into* Convex is a critical, unaddressed part if it's not already there. Convex allows for data imports (e.g., `npx convex import`). For continuous scraping, Convex Actions could be used to fetch and store data periodically, or external scrapers could push data via Convex mutations.

Now, I can construct the roadmap based on this comprehensive understanding.

---
# Roadmap: Post Insights

## Context
- Stack: Next.js, Convex, Clerk
- Feature: Post Insights with internal data (scraped and stored in Convex)

## Implementation Steps

### 1. Manual Setup (User Required)
- [ ] Create Clerk account and application.
- [ ] Create Convex account and project.
- [ ] Configure Clerk dashboard:
    - [ ] Create a JWT template for Convex.
    - [ ] Note Clerk Publishable Key and Frontend API URL (Issuer Domain).
- [ ] Configure Convex for Clerk authentication:
    - [ ] Set `CLERK_JWT_ISSUER_DOMAIN` environment variable in Convex dashboard.
- [ ] Ensure `NEXT_PUBLIC_CONVEX_URL` is set in `.env.local` for Next.js.
- [ ] Ensure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set in `.env.local` for Next.js.

### 2. Dependencies & Environment
- [ ] Install: `convex`, `react`, `react-dom`, `next`, `@clerk/nextjs`, `convex-helpers`, `convex-auth`, `@convex-dev/react-clerk`
- [ ] Env vars: `NEXT_PUBLIC_CONVEX_URL`, `CLERK_SECRET_KEY` (for server-side Clerk checks), `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_JWT_ISSUER_DOMAIN`

### 3. Database Schema
- [ ] `profiles` table:
    - `clerkUserId`: `string` (indexed, unique)
    - `username`: `string` (indexed, for search)
    - `profileImageUrl`: `string`
    - `platformSpecificHandle`: `string` (e.g., Instagram handle, TikTok username)
    - ... other creator-specific profile data
- [ ] `posts` table:
    - `platform`: `string` (e.g., "Instagram", "TikTok", indexed)
    - `postUrl`: `string` (unique)
    - `thumbnailUrl`: `string`
    - `videoUrl`: `string` (optional, for video posts)
    - `caption`: `string` (search index for real-time search)
    - `hashtags`: `array(string)`
    - `postCreatedAt`: `number` (timestamp, indexed for date range filtering)
    - `creatorId`: `Id<'profiles'>` (indexed, foreign key to `profiles` table)
    - `performanceMetricsId`: `Id<'performance_metrics'>` (foreign key to `performance_metrics` table)
    - `approvalStatus`: `string` (e.g., "pending", "approved", "rejected")
    - `paymentStatus`: `string` (e.g., "pending", "paid")
- [ ] `performance_metrics` table:
    - `views`: `number` (indexed for sorting)
    - `likes`: `number` (indexed for sorting)
    - `comments`: `number` (indexed for sorting)
    - `shares`: `number` (indexed for sorting)
    - `engagementRate`: `number` (indexed for sorting)
    - `cpm`: `number` (indexed for sorting and range filtering)
    - `postId`: `Id<'posts'>` (indexed, unique, foreign key to `posts` table)

### 4. Backend Functions (Convex)
- [ ] `posts.getPaginatedPosts`: Query function for fetching posts.
    - [ ] Arguments: `platform` (optional), `creatorId` (optional), `startDate` (optional), `endDate` (optional), `minCpm` (optional), `maxCpm` (optional), `searchQuery` (optional), `sortBy` (optional), `sortOrder` (optional), `paginationOpts` (e.g., `cursor`, `numItems`).
    - [ ] Logic:
        - Use `ctx.auth.getUserIdentity()` for authentication and role-based access control.
        - Construct dynamic queries using `db.query('posts')`, `withIndex`, and `withSearchIndex` (for caption search).
        - Join with `profiles` and `performance_metrics` tables using `ctx.db.get` or batched lookups.
        - Implement sorting logic based on `sortBy` and `sortOrder` parameters (requires appropriate indexes).
        - Implement pagination.
- [ ] `posts.getPostDetails`: Query function for fetching a single post's detailed data.
    - [ ] Arguments: `postId: Id<'posts'>`.
    - [ ] Logic: Authenticate, fetch post, join with creator profile and performance metrics.
- [ ] `posts.getCreatorHandles`: Query function to fetch a list of unique creator handles for filter dropdown.
    - [ ] Logic: Authenticate, query `profiles` table, return `username` values.
- [ ] `posts.seedData` (Action, if initial data import is needed for "scraped data"):
    - [ ] Logic: Ingest initial "scraped data" into `posts`, `profiles`, and `performance_metrics` tables.

### 5. Frontend
- [ ] `src/app/ConvexClientProvider.tsx`: Client Component to wrap the app with `ClerkProvider` and `ConvexProviderWithClerk`.
- [ ] `src/components/PostInsightsDashboard.tsx`: Main component for displaying post insights.
    - [ ] Uses `useQuery` hooks to call Convex `posts.getPaginatedPosts`.
    - [ ] Manages local state for filters (platform, creator, date range, CPM range), search query, and sort options.
    - [ ] Implements grid and list view toggling.
    - [ ] Renders `PostGrid` and `PostList` components.
    - [ ] Renders `PostFilters` and `PostSearchSort` components.
    - [ ] Handles pagination updates.
- [ ] `src/components/PostFilters.tsx`:
    - [ ] Platform filter (dropdown).
    - [ ] Creator filter (dropdown, populated by `posts.getCreatorHandles`).
    - [ ] Date range picker.
    - [ ] CPM range input fields.
    - [ ] "Clear Filters" button to reset all filters.
- [ ] `src/components/PostSearchSort.tsx`:
    - [ ] Real-time search input (debounced).
    - [ ] Sort by dropdown (views, likes, comments, shares, engagement rate, CPM).
    - [ ] Sort order toggle (ASC/DESC).
- [ ] `src/components/PostGrid.tsx`: Displays posts as a grid of thumbnails.
    - [ ] Maps through paginated posts.
    - [ ] Displays `thumbnailUrl`, platform indicator, `postCreatedAt`, `username`, `views`, `likes`, `comments`, `caption` with hashtags.
    - [ ] Triggers `PostDetailModal` on click.
- [ ] `src/components/PostList.tsx`: Displays posts as a list.
    - [ ] Adds `sound info`, `engagementRate`, `shares`, `cpm` per post to grid view info.
    - [ ] Triggers `PostDetailModal` on click.
- [ ] `src/components/PostDetailModal.tsx`: Modal for full post details.
    - [ ] Uses `useQuery` to call Convex `posts.getPostDetails` with `postId`.
    - [ ] Displays `video preview`, `full caption` (with clickable hashtags), `creator info` (from `profiles` table), `platform link` (`postUrl`).
    - [ ] Tabs for "Performance" (all metrics from `performance_metrics`) and "Additional Details" (approval/payment status).

### 6. Error Prevention
- [ ] API errors: Implement `try-catch` blocks in Convex functions and handle errors in `useQuery` hooks (e.g., display error messages in UI).
- [ ] Validation:
    - [ ] Input validation for filter parameters (e.g., date ranges, CPM ranges) on both frontend and Convex functions.
    - [ ] Schema validation in Convex (`defineSchema`).
- [ ] Rate limiting: Monitor Convex usage in the dashboard; optimize queries and indexing to stay within limits. Implement client-side debouncing for search input.
- [ ] Auth:
    - [ ] All sensitive Convex functions must check `ctx.auth.getUserIdentity()`.
    - [ ] Implement robust user identity checks in Convex queries to ensure users only see data they are authorized to see (e.g., client-specific insights).
    - [ ] Protect routes using Clerk middleware where appropriate.
- [ ] Type safety: Leverage Convex's TypeScript-first nature and generated types for robust code.
- [ ] Boundaries: Implement pagination for all list views to prevent fetching excessive data.

### 7. Testing
- [ ] Unit tests for Convex functions (queries, mutations).
- [ ] Integration tests for data fetching from Next.js components to Convex backend.
- [ ] UI tests for filter interactions, search, sorting, and modal display.
- [ ] Authentication tests: Verify access control for different user roles (e.g., brand client vs. Social Sculp team member).
- [ ] Performance tests: Evaluate query times with large datasets, especially for search and complex filters.

## Documentation Sources

This implementation plan was created using the following documentation sources:

1. convex.dev: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFwdd_EjdyKyCLl38CfwooGI973UZDCSzMluNE5gVV0Xux-DhXy352MCkZWk_NS7gENMNZgb3KIb7rEpu1DEnifk4I2HEXjaktvfpebV8Slub4xnvyqynW1gKp1yqFC5kjv0NHL145HHQXLpes=
2. convex.dev: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEEZEEhSAHIezddVq89eYjNHcjnWtvMvX21FMuVALe8Ga9OXPLBYvK_jXHz6-yz7M4FwY6Q26N2v6G-mqheQefZUg5DR242E5SzkMaYdjg1fXqU6lWBRPzr8iubNVyX-jPVwgQVymMZz-889FX_6gaMs6p-Luqe6-mi_hKElrE22pJUNTXwaDViRA==
3. medium.com: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQE3Yecj-wYRqJP9oDRX6LHne5CjFYdQ8CikZRzb4LS0Ez6Id60bdOtzeug2-oHCxQUCRirzMiy1jSSvGXthuZchUdth-V8bibMNFo8WxIWJYuRq9QRZHuagePXxW0-VTur4wl54axLBRSaGEu_jdejBK0DGzKI4YgxQf1w9CeDhcOoRJPe4fXUd_iYDVtICgxq3vbEL2Pvqqw==
4. nextjs.org: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHlIt3-M7DlteVul9P4Z3J-iG0u0qn3vtS2zCqIyPWZUWGBXiqw1-UzZnKk9GFv_6rWwFso-6wsk6S0LaUzrMn0f-AYCphlX5Hdt_t6J4EraGbzilEL-BwTqIUWTYm-ap6knzOw72KQS9jYcJN-CBU0rnytAWYn5HutkLnEeTBX1Ycg6cajMeNLqrw=
5. convex.dev: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGlT0Vc9FHOE0C5I7NsAs-znnnRm6jDjpHf0ZZvuO3nJ1qySjt8QFe5JMt0WimcJdAMyFft6xYFpN9utgjErYA_RSK3QGINViF_pIYgI530A9v2AB5lNUdBrMtG7yzjj0ivyUTe77h1oijeWZ0q8wxK
6. convex.dev: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGrJfxZt4eLWuLVUi6ENSE5vzZTrjCQTOp-eFPbbanl55gv3xBY0vmKib8rbM72lEIB8jn1zh8-wEey2HRmNY06RecyP78uVfO9JVeHFtp35pwBXR-crMMza6vXhGeZo__guvIicZGvFJFf6uY=
