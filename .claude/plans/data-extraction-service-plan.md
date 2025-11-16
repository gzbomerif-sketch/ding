# Data Extraction Service - Master Implementation Plan

**Created**: 2025-11-16
**Status**: Planning Phase
**Goal**: Build production-ready Instagram & TikTok scraping system using Modal.com + open source tools

---

## 🎯 Executive Summary

Build a serverless data extraction service that scrapes Instagram and TikTok profiles to power SylcRoad's campaign analytics. Use existing patterns (Site Mirror reference), leverage Modal.com for compute, and integrate with existing database schema.

**Key Decisions:**
- ✅ **Modal.com** for serverless compute (not VPS, not Vercel)
- ✅ **Playwright** for browser automation (already installed)
- ✅ **Existing schema** (`scraperJobs`, `profiles`, `scrapeResults`)
- ✅ **Webhook pattern** for async results (like Site Mirror)
- ✅ **Progressive status updates** (real-time UI feedback)

---

## 📊 Current State Analysis

### ✅ What Already Exists

#### **1. Database Schema** (convex/schema.ts)
```typescript
// Perfect for our use case:
- scraperJobs: Job tracking (status, platform, results)
- profiles: Influencer profiles (username, platform, bio)
- monitoredProfiles: Profiles to track regularly
- profileSnapshots: Historical data over time
- scrapeResults: Raw scraped data storage
- performance_metrics: Campaign metrics
```

#### **2. Proven Pattern** (Site Mirror)
```typescript
// Flow we'll replicate:
1. Frontend → Create job (mutation)
2. Convex → Start action (triggers external service)
3. External Service → Do heavy work (Modal.com)
4. External Service → Webhook back results
5. Convex → Store results (mutation)
6. Frontend → Real-time updates (subscription)
```

#### **3. Installed Dependencies**
```json
{
  "playwright": "^1.56.1",        // ✅ Browser automation
  "crawlee": "^3.15.3",           // ✅ Scraping framework
  "@anthropic-ai/sdk": "^0.69.0", // ✅ AI analysis
  "archiver": "^7.0.1",           // ✅ File compression
  "cheerio": "^1.1.2"             // ✅ HTML parsing
}
```

#### **4. Working Reference**
```typescript
// app/api/crawl/route.ts
// Shows how to:
- Use Playwright in Next.js API
- Update Convex from API route
- Handle errors properly
- Store results
```

### ❌ What's Missing

1. **Modal.com integration** (serverless compute)
2. **Instagram scraper** (profile data extraction)
3. **TikTok scraper** (profile data extraction)
4. **Scheduled monitoring** (daily checks)
5. **Frontend UI** (trigger scrapes, view results)
6. **Convex functions** (CRUD for scraper jobs)

---

## 🏗️ Architecture Design

### **System Overview**

```
┌─────────────────────────────────────────────────────────┐
│           SylcRoad Frontend (Next.js 15)                │
│         - Trigger scrapes                               │
│         - View results in real-time                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ 1. Create job
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Convex Backend                             │
│         - Job tracking (scraperJobs table)              │
│         - Store results (scrapeResults table)           │
│         - Real-time updates                             │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ 2. Trigger Modal function
                     ▼
┌─────────────────────────────────────────────────────────┐
│            Modal.com (Serverless Compute)               │
│                                                         │
│  ┌───────────────────────────────────────────────┐    │
│  │  Instagram Scraper Function                   │    │
│  │  - Launches Playwright browser                │    │
│  │  - Navigates to profile                       │    │
│  │  - Extracts: followers, posts, bio, etc.     │    │
│  │  - Returns structured data                    │    │
│  └───────────────────────────────────────────────┘    │
│                                                         │
│  ┌───────────────────────────────────────────────┐    │
│  │  TikTok Scraper Function                      │    │
│  │  - Launches Playwright browser                │    │
│  │  - Navigates to profile                       │    │
│  │  - Extracts: followers, likes, videos         │    │
│  │  - Returns structured data                    │    │
│  └───────────────────────────────────────────────┘    │
│                                                         │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ 3. Webhook callback
                     ▼
┌─────────────────────────────────────────────────────────┐
│         Convex HTTP Endpoint                            │
│         - Receives results                              │
│         - Stores in database                            │
│         - Triggers notifications                        │
└─────────────────────────────────────────────────────────┘
                     │
                     │ 4. Real-time update
                     ▼
┌─────────────────────────────────────────────────────────┐
│           Frontend (Auto-updates)                       │
└─────────────────────────────────────────────────────────┘
```

### **Why Modal.com?**

| Feature | Modal.com | VPS | Next.js API | Apify |
|---------|-----------|-----|-------------|-------|
| **Setup Time** | 1 hour | 4 hours | 30 min | 30 min |
| **Maintenance** | Zero | High | Low | Zero |
| **Scaling** | Automatic | Manual | Limited | Automatic |
| **Timeout** | None | None | 60s (Pro) | None |
| **Cost (1K scrapes)** | $2-5 | $12 | Free | $30-100 |
| **Browser Support** | ✅ Full | ✅ Full | ⚠️ Limited | ✅ Full |
| **Code Control** | ✅ Full | ✅ Full | ✅ Full | ❌ Limited |

**Winner: Modal.com**
- ✅ Serverless (no VPS to manage)
- ✅ No timeouts (unlike Vercel)
- ✅ Pay per use (scales to zero)
- ✅ Full Playwright support
- ✅ Open source code (we own it)

---

## 💻 Technical Specifications

### **Modal.com Setup**

#### **1. Modal Functions Structure**
```python
# modal_scrapers/instagram.py

import modal
from playwright.async_api import async_playwright

stub = modal.Stub("sylcroad-scrapers")

# Docker image with Playwright
image = modal.Image.debian_slim().pip_install(
    "playwright==1.40.0",
    "anthropic==0.7.0"
).run_commands(
    "playwright install chromium",
    "playwright install-deps chromium"
)

@stub.function(
    image=image,
    timeout=300,  # 5 minutes max
    secrets=[modal.Secret.from_name("convex-webhook-url")]
)
async def scrape_instagram_profile(username: str, job_id: str, webhook_url: str):
    """
    Scrape Instagram profile and return structured data
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
        )
        page = await context.new_page()
        
        try:
            # Navigate to profile
            await page.goto(f"https://instagram.com/{username}/")
            await page.wait_for_selector("header", timeout=10000)
            
            # Extract data
            data = await page.evaluate("""
                () => {
                    const stats = Array.from(
                        document.querySelectorAll('header section ul li')
                    ).map(li => li.textContent.trim());
                    
                    const parseCount = (text) => {
                        const match = text.match(/[\\d,.]+[KMB]?/);
                        if (!match) return 0;
                        const num = match[0].replace(/,/g, '');
                        if (num.includes('K')) return parseFloat(num) * 1000;
                        if (num.includes('M')) return parseFloat(num) * 1000000;
                        if (num.includes('B')) return parseFloat(num) * 1000000000;
                        return parseInt(num);
                    };
                    
                    return {
                        username: document.querySelector('header h2')?.textContent || '',
                        followers: parseCount(stats[1] || '0'),
                        following: parseCount(stats[2] || '0'),
                        posts: parseCount(stats[0] || '0'),
                        bio: document.querySelector('header section div span')?.textContent || '',
                        isVerified: !!document.querySelector('svg[aria-label="Verified"]'),
                        isPrivate: !!document.querySelector('h2:has-text("Private")'),
                        profilePicUrl: document.querySelector('header img')?.src || '',
                    };
                }
            """)
            
            # Send results via webhook
            import httpx
            await httpx.AsyncClient().post(
                webhook_url,
                json={
                    "jobId": job_id,
                    "status": "completed",
                    "platform": "Instagram",
                    "data": data
                }
            )
            
            return data
            
        finally:
            await browser.close()
```

#### **2. TikTok Scraper**
```python
# modal_scrapers/tiktok.py

@stub.function(
    image=image,
    timeout=300,
    secrets=[modal.Secret.from_name("convex-webhook-url")]
)
async def scrape_tiktok_profile(username: str, job_id: str, webhook_url: str):
    """
    Scrape TikTok profile and return structured data
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        try:
            await page.goto(f"https://tiktok.com/@{username}")
            await page.wait_for_selector('[data-e2e="user-page"]', timeout=10000)
            
            data = await page.evaluate("""
                () => {
                    const getStatValue = (label) => {
                        const el = document.querySelector(`[title="${label}"]`);
                        return el?.textContent?.trim() || '0';
                    };
                    
                    return {
                        username: document.querySelector('[data-e2e="user-title"]')?.textContent || '',
                        bio: document.querySelector('[data-e2e="user-bio"]')?.textContent || '',
                        avatar: document.querySelector('[data-e2e="user-avatar"] img')?.src || '',
                        followers: getStatValue('Followers'),
                        following: getStatValue('Following'),
                        likes: getStatValue('Likes'),
                        verified: !!document.querySelector('[data-e2e="user-verified-badge"]'),
                    };
                }
            """)
            
            # Webhook callback
            import httpx
            await httpx.AsyncClient().post(
                webhook_url,
                json={
                    "jobId": job_id,
                    "status": "completed",
                    "platform": "TikTok",
                    "data": data
                }
            )
            
            return data
            
        finally:
            await browser.close()
```

### **Convex Integration**

#### **1. Scraper Jobs Functions** (convex/scraperJobs.ts)
```typescript
// CREATE JOB
export const createScrapeJob = mutation({
  args: {
    platform: v.union(v.literal("Instagram"), v.literal("TikTok")),
    username: v.string(),
    jobType: v.string(), // "profile", "post", "hashtag"
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const jobId = await ctx.db.insert("scraperJobs", {
      userId: identity.subject,
      targetUrl: `https://${args.platform.toLowerCase()}.com/${args.username}`,
      status: "pending",
      jobType: args.jobType,
      platform: args.platform,
      createdAt: Date.now(),
    });

    return jobId;
  },
});

// TRIGGER SCRAPE (Action)
export const triggerScrape = action({
  args: {
    jobId: v.id("scraperJobs"),
  },
  handler: async (ctx, args) => {
    const job = await ctx.runQuery(internal.scraperJobs.getJob, {
      jobId: args.jobId,
    });

    if (!job) throw new Error("Job not found");

    // Update status
    await ctx.runMutation(api.scraperJobs.updateStatus, {
      jobId: args.jobId,
      status: "running",
      startedAt: Date.now(),
    });

    // Call Modal function
    const modalEndpoint = process.env.MODAL_WEBHOOK_URL!;
    const convexWebhook = process.env.CONVEX_SITE_URL + "/scrapers/webhook";

    try {
      const response = await fetch(modalEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: job.platform,
          username: extractUsername(job.targetUrl),
          jobId: args.jobId,
          webhookUrl: convexWebhook,
        }),
      });

      if (!response.ok) {
        throw new Error(`Modal API error: ${response.status}`);
      }

      return { success: true };

    } catch (error) {
      await ctx.runMutation(api.scraperJobs.updateStatus, {
        jobId: args.jobId,
        status: "failed",
        errorMessage: error.message,
      });
      throw error;
    }
  },
});

// WEBHOOK HANDLER
export const handleWebhook = mutation({
  args: {
    jobId: v.id("scraperJobs"),
    status: v.string(),
    platform: v.union(v.literal("Instagram"), v.literal("TikTok")),
    data: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Update job
    await ctx.db.patch(args.jobId, {
      status: args.status === "completed" ? "completed" : "failed",
      completedAt: Date.now(),
      results: args.data,
    });

    // Store in scrapeResults
    if (args.data) {
      await ctx.db.insert("scrapeResults", {
        jobId: args.jobId,
        dataType: "profile",
        platform: args.platform,
        data: args.data,
        scrapedAt: Date.now(),
      });
    }
  },
});
```

#### **2. HTTP Webhook Endpoint** (convex/http.ts)
```typescript
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/scrapers/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const { jobId, status, platform, data } = await request.json();

    await ctx.runMutation(api.scraperJobs.handleWebhook, {
      jobId,
      status,
      platform,
      data,
    });

    return new Response(JSON.stringify({ success: true }));
  }),
});

export default http;
```

### **Frontend UI**

#### **Page Structure** (app/(protected)/scrapers/page.tsx)
```typescript
"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function ScrapersPage() {
  const [username, setUsername] = useState("");
  const [platform, setPlatform] = useState<"Instagram" | "TikTok">("Instagram");
  
  const jobs = useQuery(api.scraperJobs.getUserJobs);
  const createJob = useMutation(api.scraperJobs.createScrapeJob);
  const triggerScrape = useAction(api.scraperJobs.triggerScrape);

  const handleScrape = async () => {
    // Create job
    const jobId = await createJob({
      platform,
      username,
      jobType: "profile",
    });

    // Trigger scrape (async)
    triggerScrape({ jobId }).catch(console.error);
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold">Data Extraction</h1>
      
      {/* Scrape Form */}
      <Card>
        <CardHeader>
          <CardTitle>Scrape Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={platform} onValueChange={setPlatform}>
              <SelectItem value="Instagram">Instagram</SelectItem>
              <SelectItem value="TikTok">TikTok</SelectItem>
            </Select>
            
            <Input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            
            <Button onClick={handleScrape}>
              Scrape Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Jobs List */}
      <div className="mt-6 space-y-4">
        {jobs?.map((job) => (
          <Card key={job._id}>
            <CardHeader>
              <div className="flex justify-between">
                <CardTitle>{job.platform} - {job.targetUrl}</CardTitle>
                <Badge>{job.status}</Badge>
              </div>
            </CardHeader>
            {job.results && (
              <CardContent>
                <pre>{JSON.stringify(job.results, null, 2)}</pre>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
```

---

## 💰 Cost Analysis

### **Modal.com Pricing**
```
Free Tier:
- $30 credits/month
- ~600-1,500 scrapes (depending on complexity)

Paid:
- $0.02-0.05 per scrape (avg $0.03)
- 1,000 scrapes = $30/month
- 10,000 scrapes = $300/month
- Scales to zero when not in use

Compare to:
- VPS: $12/mo (unlimited but maintenance)
- Apify: $0.03-0.10 per scrape
- Browserless: $79/mo (5,000 sessions)
```

**Recommendation**: Start with free tier, scale as needed

---

## 📅 Implementation Timeline

### **Phase 1: Core Setup** (Day 1)
- [ ] Set up Modal.com account
- [ ] Create Modal functions (Instagram + TikTok)
- [ ] Deploy Modal functions
- [ ] Test functions manually

### **Phase 2: Convex Integration** (Day 2)
- [ ] Create `convex/scraperJobs.ts`
- [ ] Add HTTP webhook endpoint
- [ ] Test webhook flow
- [ ] Verify data storage

### **Phase 3: Frontend** (Day 3)
- [ ] Create `/scrapers` page
- [ ] Build scrape trigger UI
- [ ] Display job status
- [ ] Show results

### **Phase 4: Enhancement** (Day 4-5)
- [ ] Add scheduled monitoring
- [ ] Add bulk scraping
- [ ] Add retry logic
- [ ] Add rate limiting

### **Phase 5: Production** (Day 6-7)
- [ ] Add error handling
- [ ] Add monitoring/alerts
- [ ] Load testing
- [ ] Documentation

**Total: 1 week to production**

---

## 🚀 Getting Started

### **Prerequisites**
1. Modal.com account (free tier)
2. Python 3.9+ installed
3. Convex deployed
4. Environment variables set

### **Setup Steps**
```bash
# 1. Install Modal CLI
pip install modal

# 2. Authenticate
modal setup

# 3. Create Modal functions directory
mkdir modal_scrapers
cd modal_scrapers

# 4. Create functions (see code above)
touch instagram.py
touch tiktok.py

# 5. Deploy to Modal
modal deploy instagram.py
modal deploy tiktok.py

# 6. Get webhook URLs
# Modal will output: https://xxx.modal.run/scrape_instagram_profile

# 7. Add to Convex env vars
# MODAL_WEBHOOK_URL=https://xxx.modal.run/...

# 8. Implement Convex functions
# (see code above)

# 9. Test!
```

---

## ✅ Success Criteria

### **MVP Complete When:**
- [ ] Can scrape Instagram profile
- [ ] Can scrape TikTok profile
- [ ] Results stored in Convex
- [ ] Real-time UI updates
- [ ] Error handling works
- [ ] Costs < $50/month

### **Production Ready When:**
- [ ] 99%+ success rate
- [ ] <30 second scrape time
- [ ] Scheduled monitoring works
- [ ] Rate limiting prevents bans
- [ ] Monitoring/alerts active
- [ ] Documentation complete

---

## 🔒 Security & Compliance

### **Data Privacy**
- Only scrape public data
- Store minimal PII
- Respect robots.txt
- Honor rate limits

### **Rate Limiting**
```typescript
// Implement in Convex
- Max 10 scrapes per minute
- Max 100 scrapes per hour
- Max 1,000 scrapes per day
- Queue excess requests
```

### **Error Handling**
```typescript
// Retry strategy
- Attempt 1: Immediate
- Attempt 2: 30s delay
- Attempt 3: 5min delay
- After 3 failures: Mark as failed
```

---

## 📚 References

- **Modal.com Docs**: https://modal.com/docs
- **Playwright Docs**: https://playwright.dev
- **Convex Docs**: https://docs.convex.dev
- **Your Site Mirror**: /workspace/app/api/crawl/route.ts

---

## 🎯 Next Steps

1. ✅ **Review this plan** (YOU ARE HERE)
2. ⏳ **Approve architecture**
3. ⏳ **Set up Modal.com account**
4. ⏳ **Begin Phase 1 implementation**

---

**Plan Status**: ✅ COMPLETE - Ready for approval
**Estimated Time**: 1 week to MVP
**Estimated Cost**: $30-50/month
**Risk Level**: LOW (proven patterns, existing schema)
