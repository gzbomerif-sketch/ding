import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

// ============================================================================
// MUTATIONS - Create and Update Scrape Jobs
// ============================================================================

export const createScrapeJob = mutation({
  args: {
    platform: v.union(v.literal("instagram"), v.literal("tiktok"), v.literal("website")),
    target: v.string(),
    jobType: v.union(
      v.literal("profile"),
      v.literal("posts"),
      v.literal("reels"),
      v.literal("stories")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated - please sign in");
    }

    // Validate target
    if (!args.target || args.target.trim().length === 0) {
      throw new Error("Target username/URL is required");
    }

    const jobId = await ctx.db.insert("socialScrapeJobs", {
      userId: identity.subject,
      platform: args.platform,
      target: args.target.trim(),
      jobType: args.jobType,
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return jobId;
  },
});

export const updateJobStatus = mutation({
  args: {
    jobId: v.id("socialScrapeJobs"),
    status: v.union(
      v.literal("pending"),
      v.literal("scraping"),
      v.literal("completed"),
      v.literal("failed")
    ),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: args.status,
      error: args.error,
      updatedAt: Date.now(),
    });
  },
});

export const storeResults = mutation({
  args: {
    jobId: v.id("socialScrapeJobs"),
    results: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "completed",
      results: args.results,
      updatedAt: Date.now(),
    });
  },
});

export const failJob = mutation({
  args: {
    jobId: v.id("socialScrapeJobs"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "failed",
      error: args.error,
      updatedAt: Date.now(),
    });
  },
});

// ============================================================================
// QUERIES - Fetch Scrape Jobs
// ============================================================================

export const getScrapeJob = query({
  args: {
    jobId: v.id("socialScrapeJobs"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const job = await ctx.db.get(args.jobId);
    if (!job || job.userId !== identity.subject) return null;

    return job;
  },
});

export const getUserScrapeJobs = query({
  args: {
    platform: v.optional(v.union(v.literal("instagram"), v.literal("tiktok"), v.literal("website"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    let query = ctx.db
      .query("socialScrapeJobs")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .order("desc");

    const jobs = await query.collect();

    // Filter by platform if specified
    let filtered = args.platform
      ? jobs.filter((j) => j.platform === args.platform)
      : jobs;

    // Limit results if specified
    if (args.limit) {
      filtered = filtered.slice(0, args.limit);
    }

    return filtered;
  },
});

export const getLatestJobs = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("socialScrapeJobs")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .take(args.limit || 10);
  },
});

// ============================================================================
// ACTION - Start Scrape Job
// ============================================================================

export const startScrape = action({
  args: {
    jobId: v.id("socialScrapeJobs"),
  },
  handler: async (ctx, args) => {
    try {
      // Get job details
      const job = await ctx.runQuery(api.socialScraper.getScrapeJob, {
        jobId: args.jobId,
      });

      if (!job) {
        throw new Error("Job not found");
      }

      // Update status to scraping
      await ctx.runMutation(api.socialScraper.updateJobStatus, {
        jobId: args.jobId,
        status: "scraping",
      });

      // Call Next.js API route to handle scraping
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      const response = await fetch(`${baseUrl}/api/scrape`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobId: args.jobId,
          platform: job.platform,
          target: job.target,
          jobType: job.jobType,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Scrape failed");
      }

      const result = await response.json();
      return result;
    } catch (error) {
      // Handle errors
      await ctx.runMutation(api.socialScraper.failJob, {
        jobId: args.jobId,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      });

      throw error;
    }
  },
});
