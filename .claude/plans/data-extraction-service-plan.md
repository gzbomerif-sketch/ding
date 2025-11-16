# Data Extraction Service Implementation Plan

**Created**: 2025-11-16
**Status**: In Progress
**Tech Stack**: Next.js 15, Convex, Modal.com, Playwright, Crawlee

---

## Overview

Build a unified data extraction service for Instagram, TikTok, and generic websites following the site mirror pattern.

## Architecture

```
Frontend (Next.js)
    ↓
Convex (Job Management + Real-time Updates)
    ↓
Modal.com (Serverless Scrapers) ← Primary
    OR
Next.js API (Fallback for simple scrapes)
    ↓
Store Results in Convex
    ↓
Real-time UI Updates
```

## Phase 1: Database Schema (30 min)

**Add to convex/schema.ts:**

```typescript
// Social Profile Scraping Jobs
socialScrapeJobs: defineTable({
  userId: v.string(),
  platform: v.union(v.literal("instagram"), v.literal("tiktok")),
  target: v.string(), // username or URL
  jobType: v.union(
    v.literal("profile"),
    v.literal("posts"),
    v.literal("reels"),
    v.literal("stories")
  ),
  status: v.union(
    v.literal("pending"),
    v.literal("scraping"),
    v.literal("completed"),
    v.literal("failed")
  ),
  results: v.optional(v.any()),
  error: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_userId", ["userId"])
  .index("by_status", ["status"])
  .index("by_platform", ["platform"]);
```

## Phase 2: Convex Functions (1 hour)

**Create convex/socialScraper.ts:**

- `createScrapeJob` - mutation to create job
- `updateJobStatus` - mutation to update progress
- `storeResults` - mutation to save scrape data
- `getScrapeJob` - query to get job by ID
- `getUserScrapeJobs` - query to get user's jobs
- `startScrape` - action to trigger scraper

## Phase 3: Modal.com Scraper (2 hours)

**Create modal/scrapers.py:**

Modal.com advantages:
- Serverless (pay per use)
- Auto-scales to zero
- No server management
- Built-in scheduling
- GPU support if needed
- Python + Playwright works great

```python
import modal
from playwright.async_api import async_playwright

app = modal.App("sylcroad-scrapers")
image = modal.Image.debian_slim().pip_install("playwright", "httpx")

@app.function(image=image, timeout=300)
async def scrape_instagram_profile(username: str, webhook_url: str):
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        
        await page.goto(f"https://instagram.com/{username}/")
        # Extract data
        data = await page.evaluate("""() => {
            // JS to extract profile data
        }""")
        
        # Send results to webhook
        await browser.close()
        return data
```

## Phase 4: Next.js API Fallback (1 hour)

**Create app/api/scrape/route.ts:**

For simple, fast scrapes that don't need Modal:
- Static HTML scraping
- RSS feeds
- Public APIs

## Phase 5: Frontend UI (1 hour)

**Create app/(protected)/data-extraction/page.tsx:**

Following campaigns page pattern:
- Job creation form
- Real-time job status
- Results display
- Error handling

## Implementation Order

1. ✅ Database schema
2. ✅ Convex functions
3. ✅ Modal.com scraper
4. ✅ Next.js API fallback
5. ✅ Frontend UI
6. ✅ Testing

## Cost Estimate

- Modal.com: FREE tier (30 hours/month)
- After free: ~$0.0001/second ($0.006/minute)
- Example: 1000 scrapes × 30 seconds = $3/month
- WAY cheaper than Apify/Browserless!

## Notes

- Follow site mirror pattern exactly
- Use progressive status updates
- Real-time UI feedback
- Proper auth on everything
- Error handling at every step
