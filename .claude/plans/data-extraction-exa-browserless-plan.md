# Implementation Plan: Data Extraction Service (Exa + Browserless)

## Overview
Build a unified data extraction service that uses Exa for discovery/search and Browserless + Playwright for detailed scraping of Instagram, TikTok, and websites.

## Context
- **App**: SylcRoad - Creator marketing platform
- **Tech Stack**: Next.js 15, Convex, Clerk, Playwright (already installed)
- **Use Case**: Discover influencers (Exa) → Get detailed metrics (Browserless + Playwright)
- **Reference**: Site Mirror implementation (convex/siteMirror.ts + app/api/crawl/route.ts)

---

## Phase 1: Database Schema (ALREADY EXISTS ✅)

Tables to use:
- `scraperJobs` - Track scraping jobs
- `scrapeResults` - Store scraped data
- `profiles` - Store influencer profiles
- `performance_metrics` - Store engagement data

---

## Phase 2: Backend (Convex Functions)

### File: `convex/dataExtraction.ts`

**Mutations:**
1. `createExtractionJob` - Create new extraction job
2. `updateJobStatus` - Update job progress
3. `updateDiscovery` - Store Exa discovery results
4. `storeScrapedData` - Store Playwright scraped data
5. `completeJob` - Mark job as complete
6. `failJob` - Mark job as failed

**Queries:**
1. `getJobById` - Get job details
2. `getUserJobs` - Get all jobs for user
3. `getProfileData` - Get scraped profile data

**Actions:**
1. `discoverInfluencers` - Use Exa for discovery
2. `startExtraction` - Orchestrate the full pipeline
3. `_scrapeProfile` - Internal action to scrape via API route

**Pattern to Follow:**
```typescript
// Same as siteMirror.ts:
- Progressive status updates (discovering → analyzing → scraping → completed)
- Auth checks in all mutations/queries
- Actions call Next.js API routes for heavy work
- Store results in Convex database
```

---

## Phase 3: API Route (Next.js)

### File: `app/api/extract/route.ts`

**Responsibilities:**
1. Connect to Browserless cloud browser
2. Run Playwright scripts to scrape Instagram/TikTok/websites
3. Extract structured data (followers, engagement, posts)
4. Return results to Convex via mutations

**Pattern to Follow:**
```typescript
// Same as app/api/crawl/route.ts:
- Use ConvexHttpClient to update job status
- Progressive updates during execution
- Proper error handling
- Clean up resources
- Return structured data
```

---

## Phase 4: Frontend Page

### File: `app/(protected)/data-extraction/page.tsx`

**UI Components:**
1. Search form (query input)
2. Job status display (real-time updates)
3. Discovery results (Exa findings)
4. Scraped data table (detailed metrics)
5. Export options

**Pattern to Follow:**
```typescript
// Same as site-mirror/page.tsx:
- useQuery for real-time job updates
- useMutation to create jobs
- useAction to trigger extraction
- Loading states
- Error handling
- Progress indicators
```

---

## Phase 5: Environment Variables

Add to Convex dashboard:
```
EXA_API_KEY=your_key
BROWSERLESS_TOKEN=your_token
```

Add to `.env.local`:
```
NEXT_PUBLIC_CONVEX_URL=your_url
```

---

## Implementation Steps

### Step 1: Install Dependencies
```bash
npm install exa-js puppeteer-core
```

### Step 2: Create Convex Functions
- Create `convex/dataExtraction.ts`
- Follow siteMirror.ts patterns
- Add proper auth checks
- Implement progressive status updates

### Step 3: Create API Route
- Create `app/api/extract/route.ts`
- Connect to Browserless
- Use Playwright for scraping
- Update Convex in real-time

### Step 4: Create Frontend
- Create `app/(protected)/data-extraction/page.tsx`
- Build UI with shadcn/ui
- Add real-time updates
- Display results

### Step 5: Test
- Test Exa discovery
- Test Instagram scraping
- Test TikTok scraping
- Test website scraping
- Test error handling

---

## API Endpoints

### Exa API
```typescript
// Discovery
exa.searchAndContents(query, { 
  type: "neural",
  numResults: 10 
});

// Extract content
exa.getContents(urls, {
  text: true,
  highlights: true
});
```

### Browserless
```typescript
// Connect
puppeteer.connect({
  browserWSEndpoint: `wss://chrome.browserless.io?token=${token}&stealth`
});

// Scrape with anti-detection
```

---

## Data Flow

```
User Input (query)
  ↓
Convex Action: discoverInfluencers (Exa)
  ↓
Found Instagram profiles
  ↓
Convex Action: startExtraction
  ↓
Next.js API Route (Browserless + Playwright)
  ↓
Scrape detailed metrics
  ↓
Store in Convex (mutations)
  ↓
Frontend displays results (real-time)
```

---

## Cost Estimation

- **Exa**: Free tier (1,000 searches/month)
- **Browserless**: $79/month (5,000 sessions)
- **Total**: $79/month for production-ready scraping

---

## Success Criteria

- ✅ Discover influencers with Exa (semantic search)
- ✅ Scrape Instagram profiles (followers, engagement)
- ✅ Scrape TikTok profiles (likes, views)
- ✅ Scrape websites (content extraction)
- ✅ Store all data in Convex
- ✅ Real-time progress updates
- ✅ Error handling and retries
- ✅ Auth protection

---

## Future Enhancements

1. Scheduled scraping (daily updates)
2. Batch processing (100+ profiles)
3. Historical tracking (trend analysis)
4. Advanced filters (engagement > X%)
5. Export to CSV/PDF

---

**Created**: 2025-11-16
**Status**: Ready to implement
**Reference**: Site Mirror implementation
