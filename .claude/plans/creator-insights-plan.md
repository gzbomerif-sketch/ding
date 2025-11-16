# Roadmap: Creator Insights

## Context
- Stack: Next.js, Convex, Clerk
- Feature: Creator Insights using custom-built API functionality within SylcRoad, integrating with Instagram Graph API and TikTok for Developers API (where feasible for public data/insights).

## Implementation Steps

### 1. Manual Setup (User Required)
- [ ] Create Instagram Developer account
- [ ] Create TikTok Developer account (if public data access for ranking/inspiration is available and permitted by TikTok API, otherwise consider alternative data sources for public post metrics if scraping is disallowed/unreliable)
- [ ] Create or link Instagram Business/Creator accounts for influencer authentication and owned data access.
- [ ] Register SylcRoad as an application on Instagram Developer Console.
- [ ] Obtain Instagram App ID and App Secret.
- [ ] Configure Instagram webhooks for real-time data updates (e.g., media insights changes, if applicable).
- [ ] Create Clerk account and configure application.
- [ ] Create Convex account and configure project.

### 2. Dependencies & Environment
- [ ] Install: `next`, `react`, `react-dom`, `@clerk/nextjs`, `convex`, `@convex-dev/react`, `axios` (for external API calls)
- [ ] Env vars:
    - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
    - `CLERK_SECRET_KEY`
    - `CONVEX_DEPLOYMENT`
    - `INSTAGRAM_APP_ID`
    - `INSTAGRAM_APP_SECRET`
    - `NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI` (for OAuth flow)
    - `TIKTOK_CLIENT_KEY` (if using TikTok API)
    - `TIKTOK_CLIENT_SECRET` (if using TikTok API)
    - `NEXT_PUBLIC_TIKTOK_REDIRECT_URI` (for OAuth flow, if using TikTok API)

### 3. Database Schema
- [ ] Structure:
    - `users` (Clerk-synced): `clerkUserId: string`, `instagramUserId: string?`, `tiktokUserId: string?`
    - `influencers`: `_id: Id<'influencers'>`, `userId: Id<'users'>`, `instagramAccountId: string?`, `tiktokAccountId: string?`, `instagramAccessToken: string?`, `tiktokAccessToken: string?`, `profilePictureUrl: string`, `username: string`, `platform: 'instagram' | 'tiktok'`, `followersCount: number`, `avgEngagementRate: number?`
    - `campaigns`: `_id: Id<'campaigns'>`, `brandId: Id<'brands'>`, `name: string`, `budget: number`, `assignedInfluencers: Id<'influencers'>[]`
    - `posts`: `_id: Id<'posts'>`, `influencerId: Id<'influencers'>`, `campaignId: Id<'campaigns'>?`, `platform: 'instagram' | 'tiktok'`, `postId: string`, `mediaUrl: string`, `postCreatedAt: number` (timestamp), `caption: string?`, `videoDuration: number?`
    - `performance_metrics`: `_id: Id<'performance_metrics'>`, `postId: Id<'posts'>`, `views: number?`, `likes: number?`, `comments: number?`, `shares: number?`, `saves: number?`, `engagementRate: number?`, `fetchDate: number` (timestamp)

### 4. Backend Functions
- [ ] Functions (Convex):
    - `instagramAuth.generateAuthUrl()`: Returns Instagram OAuth URL.
    - `instagramAuth.handleCallback(code: string)`: Exchanges OAuth code for access token, fetches Instagram User ID, stores in `influencers` table.
    - `tiktokAuth.generateAuthUrl()`: Returns TikTok OAuth URL.
    - `tiktokAuth.handleCallback(code: string)`: Exchanges OAuth code for access token, fetches TikTok User ID, stores in `influencers` table.
    - `socialMedia.fetchCreatorInsights(influencerId: Id<'influencers'>, platform: string)`: Fetches profile-level insights (followers, overall engagement) from Instagram/TikTok API and updates `influencers` table.
    - `socialMedia.fetchPostMetrics(postId: Id<'posts'>, platform: string)`: Fetches detailed metrics (views, likes, comments, etc.) for a specific post from Instagram/TikTok API and updates `performance_metrics` table.
    - `socialMedia.syncInfluencerPosts(influencerId: Id<'influencers'>, platform: string)`: Fetches recent posts for an influencer from Instagram/TikTok API, creates/updates `posts` entries.
    - `campaigns.getCampaignRankings(campaignId: Id<'campaigns'>)`: Joins `posts` and `performance_metrics` to calculate and return sorted creator rankings by views, engagement, video count.
    - `campaigns.getCampaignInspiration(campaignId: Id<'campaigns'>)`: Queries `posts` and `performance_metrics` for highest views/engagement/most recent posts within a campaign.
    - `influencers.getOverallBestPerformingVideo(influencerId: Id<'influencers'>)`: Queries `posts` and `performance_metrics` for an influencer's overall best video.
    - `dataProcessing.calculateEngagementRate(likes: number, comments: number, shares: number, saves: number, views: number, followers: number)`: Utility function for engagement rate.
    - `admin.triggerDataSync(influencerId: Id<'influencers'>, platform: string)`: Admin-only function to manually trigger data sync for an influencer.

### 5. Frontend
- [ ] Components:
    - `CreatorConnectButton`: Initiates OAuth flow for Instagram/TikTok.
    - `CampaignRankingsTable`: Displays paginated and sortable list of creators with their rankings, views, engagement, video count (animated transitions).
    - `InspirationFeed`: Displays a grid of best-performing videos with filters (views, engagement, recent).
    - `BestVideoHighlightCard`: Detailed card displaying max views, scraped metrics, and success factors for a highlighted video.
    - `ContentStrategyBriefEditor`: Rich text editor for campaign content strategy brief.
- [ ] State:
    - React Query or SWR for efficient data fetching and caching of Convex queries.
    - Local component state for sorting, pagination, and filter selections.
    - Zustand or Jotai for global state management where necessary (e.g., selected campaign, current influencer).

### 6. Error Prevention
- [ ] API errors: Implement robust `try-catch` blocks in Convex functions for external API calls, return meaningful error messages to the frontend.
- [ ] Validation: Validate input parameters for all Convex functions and Next.js API routes (e.g., valid `campaignId`, `influencerId`).
- [ ] Rate limiting: Implement client-side and server-side (Convex) checks/retries for social media API rate limits. Cache frequently accessed public data in Convex to reduce external API calls.
- [ ] Auth: Enforce Clerk authentication and authorization for all sensitive Convex functions (e.g., only campaign managers can view campaign insights, influencers can only see their own data).
- [ ] Type safety: Use TypeScript throughout frontend and backend (Convex) for type checking and reducing runtime errors.
- [ ] Boundaries: Implement pagination for large data sets (rankings, inspiration feed) to prevent overwhelming the client or server.

### 7. Testing
- [ ] Test scenarios:
    - Successful connection and data sync for new Instagram/TikTok influencer.
    - Correct calculation and display of creator rankings (views, engagement, video count).
    - Proper sorting of rankings table.
    - Filtering and display of inspiration feed (highest views, highest engagement, most recent).
    - Display of overall and per-campaign best-performing video details.
    - Handling of social media API rate limit errors with graceful fallback/retry.
    - Handling of invalid or expired social media access tokens.
    - Authorization checks preventing unauthorized access to campaign/influencer data.
    - UI responsiveness and animated transitions.
    - Empty states when no data is available for rankings or inspiration.