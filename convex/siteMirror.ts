import { v } from "convex/values";
import { action, internalQuery, mutation, query } from "./_generated/server";
import { api, internal } from "./_generated/api";

/**
 * Site Mirror Feature - Simplified Implementation
 *
 * NOTE: This is a simplified version due to Convex limitations.
 * Full implementation with Playwright/Crawlee requires:
 * - Separate Node.js service (VPS, Railway, etc.)
 * - Or Next.js API routes with server-side rendering
 * - File system access for temporary storage
 * - ZIP generation with archiver library
 *
 * Current implementation provides:
 * - AI analysis of website structure
 * - Basic page fetching
 * - Database tracking and status updates
 * - Mock crawler for demonstration
 */

// Mutation: Create a new mirror job
export const createMirrorJob = mutation({
  args: {
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated - please sign in to mirror sites");
    }

    // Validate URL format
    try {
      new URL(args.url);
    } catch {
      throw new Error("Invalid URL format");
    }

    const jobId = await ctx.db.insert("mirrorJobs", {
      userId: identity.subject,
      url: args.url,
      status: "pending",
      currentPhase: "Initializing mirror job...",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return jobId;
  },
});

// Mutation: Update job status
export const updateJobStatus = mutation({
  args: {
    jobId: v.id("mirrorJobs"),
    status: v.union(
      v.literal("pending"),
      v.literal("analyzing"),
      v.literal("planning"),
      v.literal("crawling"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    currentPhase: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: args.status,
      currentPhase: args.currentPhase,
      updatedAt: Date.now(),
    });
  },
});

// Mutation: Update AI analysis results
export const updateAnalysis = mutation({
  args: {
    jobId: v.id("mirrorJobs"),
    analysis: v.object({
      siteType: v.string(),
      estimatedPages: v.number(),
      navigationStructure: v.array(v.string()),
      priorityPages: v.array(v.string()),
      crawlStrategy: v.string(),
      challenges: v.array(v.string()),
      techStack: v.optional(v.array(v.string())),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      analysis: args.analysis,
      updatedAt: Date.now(),
    });
  },
});

// Mutation: Update crawl plan
export const updateCrawlPlan = mutation({
  args: {
    jobId: v.id("mirrorJobs"),
    crawlPlan: v.object({
      priorityQueue: v.array(
        v.object({
          url: v.string(),
          priority: v.number(),
          pageType: v.string(),
        })
      ),
      urlPatterns: v.array(v.string()),
      totalPlannedPages: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      crawlPlan: args.crawlPlan,
      updatedAt: Date.now(),
    });
  },
});

// Mutation: Update crawl statistics
export const updateStats = mutation({
  args: {
    jobId: v.id("mirrorJobs"),
    stats: v.object({
      pagesDownloaded: v.number(),
      totalAssets: v.number(),
      totalSize: v.number(),
      duration: v.number(),
      aiAnalyses: v.number(),
      adaptations: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      stats: args.stats,
      updatedAt: Date.now(),
    });
  },
});

// Mutation: Mark job as completed
export const completeJob = mutation({
  args: {
    jobId: v.id("mirrorJobs"),
    downloadUrl: v.string(),
    stats: v.object({
      pagesDownloaded: v.number(),
      totalAssets: v.number(),
      totalSize: v.number(),
      duration: v.number(),
      aiAnalyses: v.number(),
      adaptations: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "completed",
      currentPhase: "Mirror completed successfully!",
      downloadUrl: args.downloadUrl,
      stats: args.stats,
      updatedAt: Date.now(),
    });
  },
});

// Mutation: Mark job as failed
export const failJob = mutation({
  args: {
    jobId: v.id("mirrorJobs"),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "failed",
      currentPhase: "Mirror failed",
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

    // Only return job if it belongs to the authenticated user
    if (!job || job.userId !== identity.subject) return null;

    return job;
  },
});

// Query: Get all jobs for current user
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

// Mutation: Store file in Convex storage
// Note: This needs to be called from an action, not directly
// The API route will handle storage differently

// Internal Query: Get job by ID (for use in actions)
export const _getJobById = internalQuery({
  args: {
    jobId: v.id("mirrorJobs"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId);
  },
});

// Action: Start the mirror crawl process
export const startMirrorCrawl = action({
  args: {
    jobId: v.id("mirrorJobs"),
  },
  handler: async (ctx, args): Promise<any> => {
    try {
      // Get the job details
      const job: any = await ctx.runQuery((internal as any).siteMirror._getJobById, {
        jobId: args.jobId,
      });

      if (!job) {
        throw new Error("Job not found");
      }

      // Call the Next.js API route to handle the crawl
      // This runs the Playwright crawler in the Next.js server environment
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      const response: Response = await fetch(`${baseUrl}/api/crawl`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobId: args.jobId,
          url: job.url,
        }),
      });

      if (!response.ok) {
        const error: any = await response.json();
        throw new Error(error.error || "Crawl failed");
      }

      const result: any = await response.json();
      return result;
    } catch (error) {
      // Handle errors
      await ctx.runMutation(api.siteMirror.failJob, {
        jobId: args.jobId,
        errorMessage:
          error instanceof Error ? error.message : "Unknown error occurred",
      });

      throw error;
    }
  },
});
