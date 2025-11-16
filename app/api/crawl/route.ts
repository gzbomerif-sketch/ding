import { NextRequest, NextResponse } from "next";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Anthropic from "@anthropic-ai/sdk";
import { PlaywrightCrawler } from "crawlee";
import archiver from "archiver";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Helper: Analyze website with AI
async function analyzeWebsite(url: string) {
  try {
    // Fetch homepage
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SiteMirrorBot/1.0)",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();

    // Extract basic info
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : "Untitled";

    // Extract links
    const linkMatches = html.matchAll(/href=["']([^"']+)["']/gi);
    const links: string[] = [];
    for (const match of linkMatches) {
      try {
        const linkUrl = new URL(match[1], url).href;
        links.push(linkUrl);
      } catch {
        // Invalid URL, skip
      }
    }
    const uniqueLinks = Array.from(new Set(links)).slice(0, 50);

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Create AI analysis prompt
    const prompt = `Analyze this website and provide a structured analysis for intelligent web crawling.

URL: ${url}
Title: ${title}
Sample Links Found: ${uniqueLinks.slice(0, 20).join(", ")}

Provide a JSON response with:
1. siteType: (blog, documentation, e-commerce, portfolio, corporate, news, etc.)
2. estimatedPages: (rough estimate of total pages)
3. navigationStructure: (array of main navigation URLs)
4. priorityPages: (array of most important URLs to crawl first)
5. crawlStrategy: (description of recommended approach)
6. challenges: (array of potential crawling challenges)
7. techStack: (array of detected technologies)

Respond ONLY with valid JSON, no other text.`;

    const message = await anthropic.messages.create({
      model: process.env.AI_MODEL || "claude-3-5-sonnet-20241022",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Parse AI response
    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from AI");
    }

    const analysis = JSON.parse(content.text);
    return analysis;
  } catch (error) {
    console.error("Analysis error:", error);
    throw new Error(
      `Failed to analyze website: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

// Helper: Crawl website with Playwright
async function crawlWebsite(
  url: string,
  priorityPages: string[],
  maxPages: number
) {
  const outputDir = path.join(os.tmpdir(), `mirror-${Date.now()}`);
  fs.mkdirSync(outputDir, { recursive: true });

  const stats = {
    pagesDownloaded: 0,
    totalAssets: 0,
    totalSize: 0,
    startTime: Date.now(),
  };

  const visitedUrls = new Set<string>();
  const baseUrl = new URL(url);

  const crawler = new PlaywrightCrawler({
    maxRequestsPerCrawl: maxPages,
    maxConcurrency: 2,
    async requestHandler({ page, request, enqueueLinks }) {
      const currentUrl = request.url;

      // Skip if already visited
      if (visitedUrls.has(currentUrl)) return;
      visitedUrls.add(currentUrl);

      console.log(`Crawling: ${currentUrl}`);

      try {
        // Wait for page load
        await page.waitForLoadState("networkidle", { timeout: 15000 });

        // Get page content
        const html = await page.content();
        const urlPath = new URL(currentUrl).pathname;
        const fileName =
          urlPath === "/" ? "index.html" : urlPath.replace(/\//g, "_") + ".html";
        const filePath = path.join(outputDir, fileName);

        // Save HTML
        fs.writeFileSync(filePath, html);
        stats.pagesDownloaded++;
        stats.totalSize += html.length;

        // Download CSS files
        const cssLinks = await page.$$eval('link[rel="stylesheet"]', (links) =>
          links.map((link) => (link as HTMLLinkElement).href)
        );

        for (const cssUrl of cssLinks.slice(0, 5)) {
          try {
            const response = await page.context().request.get(cssUrl);
            const cssContent = await response.text();
            const cssFileName = path.basename(new URL(cssUrl).pathname) || "style.css";
            fs.writeFileSync(path.join(outputDir, cssFileName), cssContent);
            stats.totalAssets++;
            stats.totalSize += cssContent.length;
          } catch (e) {
            console.log(`Failed to download CSS: ${cssUrl}`);
          }
        }

        // Download images
        const images = await page.$$eval("img[src]", (imgs) =>
          imgs.map((img) => (img as HTMLImageElement).src)
        );

        for (const imgUrl of images.slice(0, 10)) {
          try {
            const response = await page.context().request.get(imgUrl);
            const buffer = await response.body();
            const imgFileName = path.basename(new URL(imgUrl).pathname) || "image.jpg";
            fs.writeFileSync(path.join(outputDir, imgFileName), buffer);
            stats.totalAssets++;
            stats.totalSize += buffer.length;
          } catch (e) {
            console.log(`Failed to download image: ${imgUrl}`);
          }
        }

        // Enqueue same-domain links
        await enqueueLinks({
          globs: [`${baseUrl.origin}/**`],
          exclude: [/\.(pdf|zip|exe|dmg)$/],
        });
      } catch (error) {
        console.error(`Error crawling ${currentUrl}:`, error);
      }
    },
  });

  // Add priority pages to queue
  for (const pageUrl of priorityPages.slice(0, 5)) {
    await crawler.addRequests([pageUrl]);
  }

  // Run crawler
  await crawler.run();

  stats.totalSize = Math.round(stats.totalSize / 1024); // Convert to KB

  return { outputDir, stats };
}

// Helper: Create ZIP archive
async function createArchive(sourceDir: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("data", (chunk: Buffer) => chunks.push(chunk));
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", reject);

    // Add all files from directory
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

export async function POST(request: NextRequest) {
  try {
    const { jobId, url } = await request.json();

    console.log(`Starting crawl for job ${jobId}: ${url}`);

    // Update status to analyzing
    await convex.mutation(api.siteMirror.updateJobStatus, {
      jobId: jobId as Id<"mirrorJobs">,
      status: "analyzing",
      currentPhase: "AI analyzing website structure...",
    });

    // Call AI analysis service
    const analysis = await analyzeWebsite(url);

    await convex.mutation(api.siteMirror.updateAnalysis, {
      jobId: jobId as Id<"mirrorJobs">,
      analysis: analysis,
    });

    // Update status to planning
    await convex.mutation(api.siteMirror.updateJobStatus, {
      jobId: jobId as Id<"mirrorJobs">,
      status: "planning",
      currentPhase: "Generating intelligent crawl plan...",
    });

    // Generate crawl plan based on analysis
    const crawlPlan = {
      priorityQueue: analysis.priorityPages.map((pageUrl: string, index: number) => ({
        url: pageUrl,
        priority: index + 1,
        pageType: index === 0 ? "landing" : "content",
      })),
      urlPatterns: analysis.navigationStructure,
      totalPlannedPages: analysis.estimatedPages,
    };

    await convex.mutation(api.siteMirror.updateCrawlPlan, {
      jobId: jobId as Id<"mirrorJobs">,
      crawlPlan: crawlPlan,
    });

    // Update status to crawling
    await convex.mutation(api.siteMirror.updateJobStatus, {
      jobId: jobId as Id<"mirrorJobs">,
      status: "crawling",
      currentPhase: "Crawling website with Playwright...",
    });

    // Execute actual crawl
    const maxPages = parseInt(process.env.MAX_PAGES_PER_CRAWL || "50");

    const { outputDir, stats: crawlStats } = await crawlWebsite(
      url,
      analysis.priorityPages,
      maxPages
    );

    const duration = Date.now() - crawlStats.startTime;

    // Update crawl statistics
    await convex.mutation(api.siteMirror.updateStats, {
      jobId: jobId as Id<"mirrorJobs">,
      stats: {
        pagesDownloaded: crawlStats.pagesDownloaded,
        totalAssets: crawlStats.totalAssets,
        totalSize: crawlStats.totalSize,
        duration: duration,
        aiAnalyses: 1,
        adaptations: 0,
      },
    });

    // Update status to processing
    await convex.mutation(api.siteMirror.updateJobStatus, {
      jobId: jobId as Id<"mirrorJobs">,
      status: "processing",
      currentPhase: "Creating ZIP file...",
    });

    // Create ZIP and save to public directory for download
    const zipBuffer = await createArchive(outputDir);

    // Save ZIP to public/downloads directory
    const publicDir = path.join(process.cwd(), "public", "downloads");
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const zipFileName = `mirror-${jobId}-${Date.now()}.zip`;
    const zipPath = path.join(publicDir, zipFileName);
    fs.writeFileSync(zipPath, zipBuffer);

    const downloadUrl = `/downloads/${zipFileName}`;

    // Clean up temporary directory
    fs.rmSync(outputDir, { recursive: true, force: true });

    // Complete the job
    await convex.mutation(api.siteMirror.completeJob, {
      jobId: jobId as Id<"mirrorJobs">,
      downloadUrl: downloadUrl,
      stats: {
        pagesDownloaded: crawlStats.pagesDownloaded,
        totalAssets: crawlStats.totalAssets,
        totalSize: crawlStats.totalSize,
        duration: duration,
        aiAnalyses: 1,
        adaptations: 0,
      },
    });

    console.log(`Crawl completed for job ${jobId}`);

    return NextResponse.json({
      success: true,
      jobId,
      stats: crawlStats,
    });
  } catch (error) {
    console.error("Crawl error:", error);

    // Try to update job status to failed
    try {
      const { jobId } = await request.json();
      await convex.mutation(api.siteMirror.failJob, {
        jobId: jobId as Id<"mirrorJobs">,
        errorMessage:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    } catch (updateError) {
      console.error("Failed to update job status:", updateError);
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
