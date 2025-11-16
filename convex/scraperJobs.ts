import { v } from "convex/values";
import { mutation, query, action, internalQuery } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";

// ============================================================================
// MUTATIONS - Create, Update, Delete Scraper Jobs
// ============================================================================

export const createScrapeJob = mutation({
  args: {
    platform: v.union(v.literal("Instagram"), v.literal("TikTok")),
    username: v.string(),
    jobType: v.optional(v.string()), // "profile", "post", "hashtag"
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    // Rate limiting check
    const userId = identity.subject;
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;

    const recentJobs = await ctx.db
      .query("scraperJobs")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    // Check per-minute limit (6 jobs)
    const jobsLastMinute = recentJobs.filter((j) => j.createdAt >= oneMinuteAgo);
    if (jobsLastMinute.length >= 6) {
      throw new Error("Rate limit: Max 6 jobs per minute");
    }

    // Check per-hour limit (100 jobs)
    const jobsLastHour = recentJobs.filter((j) => j.createdAt >= oneHourAgo);
    if (jobsLastHour.length >= 100) {
      throw new Error("Rate limit: Max 100 jobs per hour");
    }

    // Check same profile cooldown (1 hour)
    const targetUrl = `https://${args.platform.toLowerCase()}.com/${args.username}`;
    const recentSameProfile = recentJobs.find(
      (j) =>
        j.targetUrl === targetUrl &&
        j.createdAt >= now - 60 * 60 * 1000
    );

    if (recentSameProfile) {
      throw new Error(
        `Cooldown active: Wait 1 hour before scraping @${args.username} again`
      );
    }

    const jobId = await ctx.db.insert("scraperJobs", {
      userId: identity.subject,
      targetUrl,
      status: "pending",
      jobType: args.jobType || "profile",
      platform: args.platform,
      createdAt: Date.now(),
    });

    return jobId;
  },
});

export const updateJobStatus = mutation({
  args: {
    jobId: v.id("scraperJobs"),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    ),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { jobId, ...updates } = args;
    await ctx.db.patch(jobId, updates);
  },
});

export const storeResults = mutation({
  args: {
    jobId: v.id("scraperJobs"),
    results: v.any(),
    platform: v.union(v.literal("Instagram"), v.literal("TikTok")),
  },
  handler: async (ctx, args) => {
    // Update job with results
    await ctx.db.patch(args.jobId, {
      status: "completed",
      completedAt: Date.now(),
      results: args.results,
    });

    // Store in scrapeResults table
    await ctx.db.insert("scrapeResults", {
      jobId: args.jobId,
      dataType: "profile",
      platform: args.platform,
      data: args.results,
      scrapedAt: Date.now(),
    });
  },
});

export const deleteJob = mutation({
  args: {
    jobId: v.id("scraperJobs"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const job = await ctx.db.get(args.jobId);
    if (!job) {
      throw new Error("Job not found");
    }

    // Only owner can delete
    if (job.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.jobId);
    return { success: true };
  },
});

// ============================================================================
// QUERIES - Fetch Scraper Jobs
// ============================================================================

export const getJobById = query({
  args: {
    jobId: v.id("scraperJobs"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const job = await ctx.db.get(args.jobId);
    if (!job || job.userId !== identity.subject) return null;

    return job;
  },
});

export const getUserJobs = query({
  args: {
    platform: v.optional(v.union(v.literal("Instagram"), v.literal("TikTok"))),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("running"),
        v.literal("completed"),
        v.literal("failed")
      )
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    let query = ctx.db
      .query("scraperJobs")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .order("desc");

    const jobs = await query.collect();

    // Filter by platform if specified
    let filtered = jobs;
    if (args.platform) {
      filtered = filtered.filter((j) => j.platform === args.platform);
    }

    // Filter by status if specified
    if (args.status) {
      filtered = filtered.filter((j) => j.status === args.status);
    }

    return filtered;
  },
});

export const getAllJobs = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("scraperJobs")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .take(50); // Limit to 50 most recent
  },
});

// Internal query for use in actions
export const _getJobById = internalQuery({
  args: {
    jobId: v.id("scraperJobs"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId);
  },
});

// ============================================================================
// ACTIONS - Trigger Scraping via Modal
// ============================================================================

export const triggerScrape = action({
  args: {
    jobId: v.id("scraperJobs"),
    retryCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const maxRetries = 3;
    const retryCount = args.retryCount || 0;

    // Get job details
    const job = await ctx.runQuery(internal.scraperJobs._getJobById, {
      jobId: args.jobId,
    });

    if (!job) {
      throw new Error("Job not found");
    }

    // Update status to running
    await ctx.runMutation(api.scraperJobs.updateJobStatus, {
      jobId: args.jobId,
      status: "running",
      startedAt: Date.now(),
    });

    // Extract username from URL
    const username = job.targetUrl.split("/").pop() || "";

    // Determine Modal webhook URL based on platform
    const modalWebhook =
      job.platform === "Instagram"
        ? process.env.MODAL_INSTAGRAM_WEBHOOK
        : process.env.MODAL_TIKTOK_WEBHOOK;

    if (!modalWebhook) {
      await ctx.runMutation(api.scraperJobs.updateJobStatus, {
        jobId: args.jobId,
        status: "failed",
        completedAt: Date.now(),
        errorMessage: `Modal webhook not configured for ${job.platform}`,
      });
      throw new Error(`Modal webhook not configured for ${job.platform}`);
    }

    // Construct Convex webhook URL
    const convexWebhook = process.env.CONVEX_SITE_URL + "/scrapers/webhook";

    try {
      // Call Modal function with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      const response = await fetch(modalWebhook, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          job_id: args.jobId,
          webhook_url: convexWebhook,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Modal API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log("Modal function triggered:", result);

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      // Retry logic
      if (retryCount < maxRetries) {
        console.log(
          `Scrape failed (attempt ${retryCount + 1}/${maxRetries}), retrying...`
        );

        // Exponential backoff: 2s, 4s, 8s
        const backoffMs = Math.pow(2, retryCount) * 2000;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));

        // Retry
        return await ctx.runAction(api.scraperJobs.triggerScrape, {
          jobId: args.jobId,
          retryCount: retryCount + 1,
        });
      }

      // Max retries exceeded, mark as failed
      await ctx.runMutation(api.scraperJobs.updateJobStatus, {
        jobId: args.jobId,
        status: "failed",
        completedAt: Date.now(),
        errorMessage: `Failed after ${maxRetries} retries: ${errorMessage}`,
      });

      throw error;
    }
  },
});

// ============================================================================
// WEBHOOK HANDLER (called from convex/http.ts)
// ============================================================================

export const handleWebhook = mutation({
  args: {
    jobId: v.id("scraperJobs"),
    status: v.string(),
    platform: v.union(v.literal("Instagram"), v.literal("TikTok")),
    data: v.optional(v.any()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.status === "completed" && args.data) {
      // Store successful results
      await ctx.runMutation(api.scraperJobs.storeResults, {
        jobId: args.jobId,
        results: args.data,
        platform: args.platform,
      });

      console.log(`Job ${args.jobId} completed successfully`);
    } else {
      // Handle failure
      await ctx.db.patch(args.jobId, {
        status: "failed",
        completedAt: Date.now(),
        errorMessage: args.error || "Unknown error",
      });

      console.log(`Job ${args.jobId} failed: ${args.error}`);
    }
  },
});

// ============================================================================
// HELPER QUERIES - Get Scrape Results
// ============================================================================

export const getResultsByJobId = query({
  args: {
    jobId: v.id("scraperJobs"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Verify user owns the job
    const job = await ctx.db.get(args.jobId);
    if (!job || job.userId !== identity.subject) return [];

    return await ctx.db
      .query("scrapeResults")
      .filter((q) => q.eq(q.field("jobId"), args.jobId))
      .collect();
  },
});

export const getRecentResults = query({
  args: {
    platform: v.optional(v.union(v.literal("Instagram"), v.literal("TikTok"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Get user's jobs
    const userJobs = await ctx.db
      .query("scraperJobs")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .collect();

    const jobIds = new Set(userJobs.map((j) => j._id));

    // Get results for user's jobs
    let results = await ctx.db
      .query("scrapeResults")
      .order("desc")
      .take(args.limit || 20);

    // Filter to only user's jobs
    results = results.filter((r) => jobIds.has(r.jobId));

    // Filter by platform if specified
    if (args.platform) {
      results = results.filter((r) => r.platform === args.platform);
    }

    return results;
  },
});
