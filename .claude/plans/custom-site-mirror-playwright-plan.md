# Roadmap: Intelligent Site Mirror with AI-Driven Context Analysis

## Context
- Stack: Next.js 15, Convex, Clerk, Playwright, Crawlee, OpenAI/Anthropic API
- Feature: **Context-Aware Site Mirror** - Intelligent website analysis before crawling
- Goal: Enable users to mirror websites efficiently by first analyzing structure, then executing smart, targeted crawls
- Approach: Multi-phase AI-driven process that gathers context, plans strategy, executes crawl, and adapts dynamically

## Innovation: Context-First Approach

Unlike traditional crawlers that blindly scrape all pages, this system:
1. **Analyzes First**: Uses LLM to understand site structure, navigation patterns, and content types
2. **Plans Strategy**: Generates optimized crawl plan based on analysis
3. **Executes Smartly**: Crawls only relevant pages with targeted extraction
4. **Adapts Dynamically**: Gathers more context during crawl and adjusts strategy in real-time
5. **Learns Continuously**: Improves extraction patterns based on what it discovers

## Architecture Overview

### Key Components
1. **Frontend (Next.js 15)**: User interface for submitting URLs and viewing mirror jobs with real-time phase updates
2. **Backend (Convex)**: Database, job management, and orchestration
3. **AI Analysis Service**: LLM-powered site structure analysis (OpenAI GPT-4 or Claude)
4. **Crawler Service**: Playwright/Crawlee with intelligent targeting based on AI insights
5. **Storage**: Cloudflare R2 or local filesystem for storing mirrored sites and ZIPs
6. **Context Store**: Vector database or structured storage for learned patterns

### Multi-Phase Data Flow
```
Phase 1: Initial Analysis
User submits URL → AI analyzes homepage → Identifies nav structure, content types, page patterns →
Generates sitemap/crawl plan → Stores context

Phase 2: Strategic Crawl
Crawler executes plan → Downloads priority pages first → Extracts key content →
AI validates completeness → Identifies gaps

Phase 3: Adaptive Refinement
Discovers new patterns → Updates crawl strategy → Fills gaps → Re-analyzes if needed →
Validates against initial goals

Phase 4: Finalization
Compiles all assets → Generates ZIP → Stores metadata → Returns download URL
```

## AI-Driven Context Analysis System

### Phase 0: Pre-Crawl Intelligence

#### 0.1 Initial Site Analysis (LLM-Powered)
**Goal**: Understand the website before crawling a single page

**Process**:
1. Fetch homepage HTML
2. Extract key elements:
   - Navigation structure (header, footer, sidebar links)
   - Content sections (hero, features, blog, products)
   - Page templates (blog post, product page, landing page)
   - Tech stack indicators (React, Vue, static HTML)
   - Asset patterns (image CDNs, font URLs, CSS frameworks)

3. Send to LLM with prompt:
```
Analyze this website homepage and provide:
1. Site type (e-commerce, blog, SaaS, portfolio, documentation, etc.)
2. Navigation structure and primary sections
3. Estimated total pages and page types
4. Priority pages to crawl (most important first)
5. Asset loading patterns (lazy load, CDN, inline)
6. Recommended crawl strategy (depth-first, breadth-first, priority-based)
7. Potential challenges (SPAs, infinite scroll, auth walls)
```

**Output**: Structured crawl plan with priorities

#### 0.2 Intelligent Sitemap Generation
**Goal**: Create a smart crawl map before touching other pages

**Process**:
1. Parse navigation links from homepage
2. Check for `/sitemap.xml` or `/robots.txt`
3. If exists, parse and merge with discovered links
4. If not, use LLM to predict likely URL patterns based on site type:
   - Blog: `/blog/:slug`, `/category/:name`, `/author/:id`
   - E-commerce: `/products/:id`, `/category/:slug`, `/cart`, `/checkout`
   - Docs: `/docs/:section/:page`, `/api/:endpoint`

5. Generate prioritized URL list:
   - Priority 1: Homepage, main landing pages
   - Priority 2: Content pages (blog posts, products)
   - Priority 3: Support pages (about, contact, terms)
   - Priority 4: Assets (CSS, JS, images)

**Output**: Prioritized URL queue with metadata

#### 0.3 Context Gathering During Crawl
**Goal**: Learn and adapt as crawling progresses

**Process**:
1. After each page crawl, extract:
   - New links discovered
   - Page template type (matches predicted or new?)
   - Content extraction success rate
   - Asset references (CSS, JS, images, fonts)

2. Every N pages (e.g., 10), pause and re-analyze:
```
LLM Prompt:
I've crawled 10 pages so far. Here's what I found:
- Page types: [list]
- New URL patterns: [list]
- Extraction challenges: [list]

Should I:
1. Continue with current strategy?
2. Adjust priorities?
3. Skip certain sections?
4. Focus on specific content types?
```

3. Update crawl queue based on LLM recommendations

**Output**: Adaptive crawl strategy that improves over time

#### 0.4 Completeness Validation
**Goal**: Ensure nothing important was missed

**Process**:
1. After crawl completes, generate summary:
   - Total pages crawled
   - Page types distribution
   - Assets downloaded
   - Broken links or errors

2. Send to LLM:
```
I crawled this website and here's what I got:
[summary]

Based on the initial analysis, did I miss anything important?
Are there sections I should re-crawl?
Is this a complete mirror?
```

3. If LLM identifies gaps, add missing URLs to queue and re-crawl

**Output**: Validated, complete site mirror

## Implementation Steps

### Phase 1: Foundation & Setup

#### 1.1 Install Dependencies
```bash
npm install crawlee playwright archiver
npm install --save-dev @types/archiver
```

**Required Packages:**
- `crawlee` - Web crawling framework with Playwright support
- `playwright` - Browser automation (Chromium, Firefox, WebKit)
- `archiver` - ZIP file generation
- `openai` - OpenAI API client for GPT-4 analysis
- `cheerio` - HTML parsing for initial analysis
- `@aws-sdk/client-s3` (optional) - For Cloudflare R2 storage

#### 1.2 Environment Variables
Add to `.env.local` and Convex Dashboard:
```env
# AI Analysis Service
OPENAI_API_KEY=your_openai_api_key           # For GPT-4 site analysis
# OR
ANTHROPIC_API_KEY=your_anthropic_api_key     # For Claude analysis (alternative)

# Cloudflare R2 Storage (optional - or use local storage)
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret
R2_BUCKET_NAME=site-mirrors

# App Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000  # For webhooks in production
MAX_CRAWL_DEPTH=3                            # Limit crawl depth
MAX_PAGES_PER_CRAWL=100                      # Limit pages per site
CRAWL_TIMEOUT_MS=600000                      # 10 minutes max per job (increased for AI analysis)
AI_ANALYSIS_INTERVAL=10                      # Re-analyze every N pages
AI_MODEL=gpt-4-turbo                         # or claude-3-5-sonnet-20241022
```

### Phase 2: Database Schema (Convex)

#### 2.1 Mirror Jobs Table
File: `convex/schema.ts`

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  mirrorJobs: defineTable({
    userId: v.string(),                    // Clerk user ID
    url: v.string(),                       // Original URL to mirror
    status: v.union(
      v.literal("pending"),
      v.literal("analyzing"),              // AI analyzing site structure
      v.literal("planning"),               // Generating crawl plan
      v.literal("crawling"),               // Executing crawl
      v.literal("processing"),             // Creating ZIP
      v.literal("completed"),
      v.literal("failed")
    ),
    currentPhase: v.optional(v.string()),  // Human-readable phase description
    downloadUrl: v.optional(v.string()),   // R2 or local URL to ZIP file
    errorMessage: v.optional(v.string()),  // Error details if failed

    // AI Analysis Context
    analysis: v.optional(v.object({
      siteType: v.string(),                // "e-commerce", "blog", "docs", etc.
      estimatedPages: v.number(),          // AI's estimate of total pages
      navigationStructure: v.array(v.string()), // Main nav links
      priorityPages: v.array(v.string()),  // URLs to crawl first
      crawlStrategy: v.string(),           // "depth-first", "breadth-first", "priority"
      challenges: v.array(v.string()),     // Potential issues (SPA, auth, etc.)
      techStack: v.optional(v.array(v.string())), // Detected technologies
    })),

    // Crawl Plan
    crawlPlan: v.optional(v.object({
      priorityQueue: v.array(v.object({
        url: v.string(),
        priority: v.number(),              // 1-5, 1 being highest
        pageType: v.string(),              // "landing", "content", "asset"
      })),
      urlPatterns: v.array(v.string()),    // Discovered URL patterns
      totalPlannedPages: v.number(),
    })),

    // Real-time Stats
    stats: v.optional(v.object({
      pagesDownloaded: v.number(),
      totalAssets: v.number(),
      totalSize: v.number(),               // Bytes
      duration: v.number(),                // Milliseconds
      aiAnalyses: v.number(),              // Number of AI re-analyses performed
      adaptations: v.number(),             // Times strategy was adjusted
    })),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_status", ["status"])
    .index("by_createdAt", ["createdAt"]),
});
```

### Phase 3: Crawler Service Implementation

#### 3.1 Architecture Decision
**Option A: Next.js API Route** (Recommended for MVP)
- Pros: Simple, no additional infrastructure, works with Vercel
- Cons: Limited by serverless timeout (10s Vercel, 60s+ Pro), needs background job handling
- Best for: Small sites, quick POC

**Option B: Separate Node.js Service on VPS**
- Pros: No timeout limits, full control, can handle large crawls
- Cons: Additional infrastructure cost and complexity
- Best for: Production, large sites, heavy usage

**Decision for MVP: Use Option A with Convex Actions for long-running tasks**

#### 3.2 Crawler Service (Convex Action)
File: `convex/siteMirror.ts`

```typescript
import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { PlaywrightCrawler } from "crawlee";
import { chromium } from "playwright";
import archiver from "archiver";
import fs from "fs";
import path from "path";

// Mutation: Create mirror job
export const createMirrorJob = mutation({
  args: {
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const jobId = await ctx.db.insert("mirrorJobs", {
      userId: identity.subject,
      url: args.url,
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return jobId;
  },
});

// Action: Start crawling (long-running)
export const startCrawl = action({
  args: {
    jobId: v.id("mirrorJobs"),
  },
  handler: async (ctx, args) => {
    // Update status to crawling
    await ctx.runMutation(api.siteMirror.updateJobStatus, {
      jobId: args.jobId,
      status: "crawling",
    });

    try {
      const job = await ctx.runQuery(api.siteMirror.getJobById, {
        jobId: args.jobId,
      });

      if (!job) throw new Error("Job not found");

      // Create temporary directory for this crawl
      const outputDir = path.join("/tmp", `mirror-${args.jobId}`);
      fs.mkdirSync(outputDir, { recursive: true });

      let pagesDownloaded = 0;
      let totalAssets = 0;

      // Configure Crawlee crawler
      const crawler = new PlaywrightCrawler({
        maxRequestsPerCrawl: parseInt(process.env.MAX_PAGES_PER_CRAWL || "100"),
        maxConcurrency: 3,
        requestHandlerTimeoutSecs: 60,

        async requestHandler({ request, page, enqueueLinks }) {
          pagesDownloaded++;

          // Save HTML
          const html = await page.content();
          const urlPath = new URL(request.url).pathname;
          const fileName = urlPath === "/" ? "index.html" : urlPath.replace(/^\//, "");
          const filePath = path.join(outputDir, fileName);

          fs.mkdirSync(path.dirname(filePath), { recursive: true });
          fs.writeFileSync(filePath, html);

          // Download CSS, JS, images
          const resources = await page.$$eval(
            "link[href], script[src], img[src]",
            (elements) =>
              elements.map((el) => ({
                type: el.tagName.toLowerCase(),
                url: el.getAttribute("href") || el.getAttribute("src"),
              }))
          );

          for (const resource of resources) {
            if (resource.url) {
              try {
                const response = await page.goto(resource.url, {
                  waitUntil: "domcontentloaded",
                  timeout: 10000,
                });
                if (response) {
                  const buffer = await response.body();
                  const resourcePath = path.join(outputDir, new URL(resource.url).pathname);
                  fs.mkdirSync(path.dirname(resourcePath), { recursive: true });
                  fs.writeFileSync(resourcePath, buffer);
                  totalAssets++;
                }
              } catch (err) {
                console.warn(`Failed to download resource: ${resource.url}`);
              }
            }
          }

          // Enqueue links for recursive crawling
          await enqueueLinks({
            globs: [`${new URL(job.url).origin}/**`],
            limit: parseInt(process.env.MAX_CRAWL_DEPTH || "3"),
          });
        },

        failedRequestHandler({ request }) {
          console.error(`Failed: ${request.url}`);
        },
      });

      // Start crawling
      await crawler.run([job.url]);

      // Update status to processing (creating ZIP)
      await ctx.runMutation(api.siteMirror.updateJobStatus, {
        jobId: args.jobId,
        status: "processing",
      });

      // Create ZIP file
      const zipPath = path.join("/tmp", `${args.jobId}.zip`);
      await createZip(outputDir, zipPath);

      const zipSize = fs.statSync(zipPath).size;

      // Upload to R2 or serve locally
      const downloadUrl = await uploadToStorage(zipPath, args.jobId);

      // Cleanup temp files
      fs.rmSync(outputDir, { recursive: true, force: true });
      fs.unlinkSync(zipPath);

      // Update job with completion
      await ctx.runMutation(api.siteMirror.completeJob, {
        jobId: args.jobId,
        downloadUrl,
        stats: {
          pagesDownloaded,
          totalAssets,
          totalSize: zipSize,
          duration: Date.now() - job.createdAt,
        },
      });

    } catch (error) {
      await ctx.runMutation(api.siteMirror.failJob, {
        jobId: args.jobId,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

// Helper: Create ZIP
async function createZip(sourceDir: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", resolve);
    archive.on("error", reject);

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

// Helper: Upload to storage (implement based on R2 or local)
async function uploadToStorage(filePath: string, jobId: string): Promise<string> {
  // TODO: Implement R2 upload or local file serving
  // For now, return a placeholder
  return `/api/download/${jobId}`;
}

// Mutation: Update job status
export const updateJobStatus = mutation({
  args: {
    jobId: v.id("mirrorJobs"),
    status: v.union(
      v.literal("pending"),
      v.literal("crawling"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

// Mutation: Complete job
export const completeJob = mutation({
  args: {
    jobId: v.id("mirrorJobs"),
    downloadUrl: v.string(),
    stats: v.object({
      pagesDownloaded: v.number(),
      totalAssets: v.number(),
      totalSize: v.number(),
      duration: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "completed",
      downloadUrl: args.downloadUrl,
      stats: args.stats,
      updatedAt: Date.now(),
    });
  },
});

// Mutation: Fail job
export const failJob = mutation({
  args: {
    jobId: v.id("mirrorJobs"),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "failed",
      errorMessage: args.errorMessage,
      updatedAt: Date.now(),
    });
  },
});

// Query: Get job by ID
export const getJobById = query({
  args: {
    jobId: v.id("mirrorJobs"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const job = await ctx.db.get(args.jobId);
    if (!job || job.userId !== identity.subject) return null;

    return job;
  },
});

// Query: Get all jobs for user
export const getUserJobs = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("mirrorJobs")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();
  },
});
```

### Phase 4: Frontend Implementation

#### 4.1 Site Mirror Page
File: `app/(protected)/site-mirror/page.tsx`

```typescript
"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SiteMirrorPage() {
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const jobs = useQuery(api.siteMirror.getUserJobs);
  const createJob = useMutation(api.siteMirror.createMirrorJob);
  const startCrawl = useAction(api.siteMirror.startCrawl);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsSubmitting(true);
    try {
      const jobId = await createJob({ url });
      await startCrawl({ jobId });
      setUrl("");
    } catch (error) {
      console.error("Failed to create mirror job:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Site Mirror</h1>

      {/* Form */}
      <Card className="p-6 mb-8">
        <form onSubmit={handleSubmit} className="flex gap-4">
          <Input
            type="url"
            placeholder="Enter website URL (e.g., https://example.com)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            className="flex-1"
          />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Mirror Site"}
          </Button>
        </form>
      </Card>

      {/* Jobs List */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Your Mirror Jobs</h2>
        {jobs?.map((job) => (
          <Card key={job._id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium">{job.url}</p>
                <p className="text-sm text-muted-foreground">
                  Created: {new Date(job.createdAt).toLocaleString()}
                </p>
                {job.stats && (
                  <p className="text-sm text-muted-foreground">
                    {job.stats.pagesDownloaded} pages, {job.stats.totalAssets} assets,{" "}
                    {(job.stats.totalSize / 1024 / 1024).toFixed(2)} MB
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4">
                <Badge
                  variant={
                    job.status === "completed"
                      ? "default"
                      : job.status === "failed"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {job.status}
                </Badge>
                {job.status === "completed" && job.downloadUrl && (
                  <Button asChild size="sm">
                    <a href={job.downloadUrl} download>
                      Download
                    </a>
                  </Button>
                )}
              </div>
            </div>
            {job.errorMessage && (
              <p className="text-sm text-red-500 mt-2">{job.errorMessage}</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
```

### Phase 5: Storage Implementation

#### 5.1 Option A: Cloudflare R2 Storage
File: `lib/storage.ts`

```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function uploadToR2(
  filePath: string,
  key: string
): Promise<string> {
  const fileBuffer = fs.readFileSync(filePath);

  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: fileBuffer,
      ContentType: "application/zip",
    })
  );

  return `https://your-r2-domain.com/${key}`;
}
```

#### 5.2 Option B: Local File Storage
File: `app/api/download/[jobId]/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const filePath = path.join("/tmp", `${params.jobId}.zip`);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const file = fs.readFileSync(filePath);

  return new NextResponse(file, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="site-mirror-${params.jobId}.zip"`,
    },
  });
}
```

### Phase 6: Error Handling & Optimization

#### 6.1 Error Prevention
- URL validation (format, reachability)
- Rate limiting per user (max N jobs per hour)
- Crawl depth and page limits
- Timeout handling
- Disk space management

#### 6.2 Security
- Clerk authentication on all endpoints
- User can only access their own jobs
- URL whitelist/blacklist (prevent crawling internal IPs, localhost)
- File size limits
- CORS configuration

#### 6.3 Performance Optimization
- Concurrent crawling (up to 3 pages simultaneously)
- Resource caching (avoid re-downloading identical assets)
- Efficient ZIP compression
- Background job processing
- Queue system for managing multiple concurrent crawls

### Phase 7: Testing

#### 7.1 Test Scenarios
- [ ] Submit valid URL (small site < 10 pages)
- [ ] Submit invalid URL (404, malformed)
- [ ] Submit large site (100+ pages) - verify limits work
- [ ] Multiple concurrent jobs by same user
- [ ] Job status updates in real-time
- [ ] Download completed ZIP
- [ ] Attempt to access another user's job (should fail)
- [ ] Handle network failures gracefully
- [ ] Handle timeout scenarios
- [ ] Verify ZIP contains correct files

#### 7.2 Performance Benchmarks
- Time to mirror 10-page site: < 30 seconds
- Time to mirror 100-page site: < 5 minutes
- ZIP file size: < 50MB for typical sites
- Memory usage: < 500MB per crawl
- Concurrent jobs: Support 3-5 simultaneously

## Deployment Considerations

### Development
- Use local storage (Option B)
- Playwright runs in Next.js dev mode
- Test with small sites only

### Production
**Option 1: Vercel + Separate Crawler Service**
- Deploy Next.js to Vercel
- Deploy crawler as separate Node.js service on VPS (DigitalOcean, AWS, Railway)
- Use R2 for storage
- Convex manages job queue and webhooks

**Option 2: VPS Only**
- Deploy entire stack to VPS
- More control, no serverless timeout limits
- Use PM2 for process management

## Cost Estimates

### Self-Hosted (VPS)
- VPS: $5-20/month (DigitalOcean, Hetzner)
- Cloudflare R2: $0.015/GB storage + $0.36/million Class A operations
- Estimated: $10-30/month for 100-500 mirror jobs

### vs Third-Party (Apify)
- Apify: $49-499/month for meaningful usage
- Crawlee self-hosted: ~10x cheaper

## Success Criteria

- [ ] Users can submit URLs and receive ZIP downloads
- [ ] Jobs update status in real-time
- [ ] ZIP contains browsable offline copy of site
- [ ] Authentication prevents cross-user access
- [ ] System handles failures gracefully
- [ ] Performance meets benchmarks
- [ ] Cost stays under $30/month for MVP usage

## Future Enhancements

1. **Advanced Crawling**
   - Custom selectors for specific content extraction
   - JavaScript-heavy SPA support with full rendering
   - PDF generation of pages

2. **Analytics**
   - Page load time analysis
   - SEO metrics extraction
   - Technology stack detection

3. **Scheduled Mirrors**
   - Periodic re-crawling for change detection
   - Diff view between versions

4. **Collaboration**
   - Share mirrors with team members
   - Annotations and notes on mirrored pages

5. **Integration**
   - Export to design tools (Figma, Sketch)
   - API for programmatic access
