import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// ============================================================================
// MUTATIONS - Add and Update Performance Metrics
// ============================================================================

export const addPerformanceMetric = mutation({
  args: {
    campaignId: v.id("campaigns"),
    platform: v.union(v.literal("TikTok"), v.literal("Instagram")),
    postId: v.string(),
    views: v.number(),
    likes: v.number(),
    comments: v.number(),
    shares: v.number(),
    engagementRate: v.number(),
    cpm: v.number(),
    isLivePost: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    // Verify user has access to this campaign
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    if (user.role !== "admin" && user.clientId !== campaign.clientId) {
      throw new Error("Unauthorized: Cannot add metrics to this campaign");
    }

    const metricId = await ctx.db.insert("performance_metrics", {
      campaignId: args.campaignId,
      timestamp: Date.now(),
      platform: args.platform,
      postId: args.postId,
      views: args.views,
      likes: args.likes,
      comments: args.comments,
      shares: args.shares,
      engagementRate: args.engagementRate,
      cpm: args.cpm,
      isLivePost: args.isLivePost,
      createdAt: Date.now(),
    });

    return metricId;
  },
});

export const updatePerformanceMetric = mutation({
  args: {
    metricId: v.id("performance_metrics"),
    views: v.optional(v.number()),
    likes: v.optional(v.number()),
    comments: v.optional(v.number()),
    shares: v.optional(v.number()),
    engagementRate: v.optional(v.number()),
    cpm: v.optional(v.number()),
    isLivePost: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const metric = await ctx.db.get(args.metricId);
    if (!metric) {
      throw new Error("Metric not found");
    }

    // Verify user has access to this campaign
    const campaign = await ctx.db.get(metric.campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    if (user.role !== "admin" && user.clientId !== campaign.clientId) {
      throw new Error("Unauthorized: Cannot update metrics for this campaign");
    }

    const { metricId, ...updates } = args;
    await ctx.db.patch(metricId, updates);

    return metricId;
  },
});

// ============================================================================
// QUERIES - Fetch and Aggregate Metrics
// ============================================================================

export const getCampaignPerformanceMetrics = query({
  args: {
    campaignId: v.id("campaigns"),
    startDate: v.number(),
    endDate: v.number(),
    platform: v.optional(v.union(v.literal("TikTok"), v.literal("Instagram"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Verify user has access to this campaign
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (!user) {
      return [];
    }

    if (user.role !== "admin" && user.clientId !== campaign.clientId) {
      return [];
    }

    // Fetch metrics with filtering
    let metricsQuery = ctx.db
      .query("performance_metrics")
      .withIndex("by_campaignId_timestamp", (q) =>
        q.eq("campaignId", args.campaignId).gte("timestamp", args.startDate).lte("timestamp", args.endDate)
      );

    const allMetrics = await metricsQuery.collect();

    // Filter by platform if specified
    if (args.platform) {
      return allMetrics.filter((m) => m.platform === args.platform);
    }

    return allMetrics;
  },
});

export const getAggregatedMetrics = query({
  args: {
    campaignId: v.id("campaigns"),
    startDate: v.number(),
    endDate: v.number(),
    platform: v.optional(v.union(v.literal("TikTok"), v.literal("Instagram"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    // Verify user has access to this campaign
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (!user) {
      return null;
    }

    if (user.role !== "admin" && user.clientId !== campaign.clientId) {
      return null;
    }

    // Fetch metrics
    let metricsQuery = ctx.db
      .query("performance_metrics")
      .withIndex("by_campaignId_timestamp", (q) =>
        q.eq("campaignId", args.campaignId).gte("timestamp", args.startDate).lte("timestamp", args.endDate)
      );

    const allMetrics = await metricsQuery.collect();

    // Filter by platform if specified
    const metrics = args.platform
      ? allMetrics.filter((m) => m.platform === args.platform)
      : allMetrics;

    // Calculate aggregates
    const totalViews = metrics.reduce((sum, m) => sum + m.views, 0);
    const totalLikes = metrics.reduce((sum, m) => sum + m.likes, 0);
    const totalComments = metrics.reduce((sum, m) => sum + m.comments, 0);
    const totalShares = metrics.reduce((sum, m) => sum + m.shares, 0);
    const totalLivePosts = metrics.filter((m) => m.isLivePost).length;
    const totalPosts = metrics.length;

    const avgEngagementRate =
      metrics.length > 0 ? metrics.reduce((sum, m) => sum + m.engagementRate, 0) / metrics.length : 0;

    const avgCpm = metrics.length > 0 ? metrics.reduce((sum, m) => sum + m.cpm, 0) / metrics.length : 0;

    return {
      totalViews,
      totalLikes,
      totalComments,
      totalShares,
      avgEngagementRate,
      avgCpm,
      totalLivePosts,
      totalPosts,
      dateRange: {
        startDate: args.startDate,
        endDate: args.endDate,
      },
      platform: args.platform ?? "All",
    };
  },
});

export const getMetricsOverTime = query({
  args: {
    campaignId: v.id("campaigns"),
    startDate: v.number(),
    endDate: v.number(),
    platform: v.optional(v.union(v.literal("TikTok"), v.literal("Instagram"))),
    interval: v.union(v.literal("day"), v.literal("week"), v.literal("month")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Verify user has access to this campaign
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (!user) {
      return [];
    }

    if (user.role !== "admin" && user.clientId !== campaign.clientId) {
      return [];
    }

    // Fetch metrics
    let metricsQuery = ctx.db
      .query("performance_metrics")
      .withIndex("by_campaignId_timestamp", (q) =>
        q.eq("campaignId", args.campaignId).gte("timestamp", args.startDate).lte("timestamp", args.endDate)
      );

    const allMetrics = await metricsQuery.collect();

    // Filter by platform if specified
    const metrics = args.platform
      ? allMetrics.filter((m) => m.platform === args.platform)
      : allMetrics;

    // Group by interval
    const intervalMs =
      args.interval === "day"
        ? 24 * 60 * 60 * 1000
        : args.interval === "week"
        ? 7 * 24 * 60 * 60 * 1000
        : 30 * 24 * 60 * 60 * 1000; // approximation for month

    const grouped = new Map<number, typeof metrics>();

    metrics.forEach((metric) => {
      const intervalKey = Math.floor(metric.timestamp / intervalMs) * intervalMs;
      const existing = grouped.get(intervalKey) || [];
      grouped.set(intervalKey, [...existing, metric]);
    });

    // Calculate aggregates for each interval
    const timeSeries = Array.from(grouped.entries())
      .map(([timestamp, intervalMetrics]) => ({
        timestamp,
        views: intervalMetrics.reduce((sum, m) => sum + m.views, 0),
        likes: intervalMetrics.reduce((sum, m) => sum + m.likes, 0),
        comments: intervalMetrics.reduce((sum, m) => sum + m.comments, 0),
        shares: intervalMetrics.reduce((sum, m) => sum + m.shares, 0),
        engagementRate:
          intervalMetrics.reduce((sum, m) => sum + m.engagementRate, 0) / intervalMetrics.length,
        cpm: intervalMetrics.reduce((sum, m) => sum + m.cpm, 0) / intervalMetrics.length,
        livePosts: intervalMetrics.filter((m) => m.isLivePost).length,
        totalPosts: intervalMetrics.length,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    return timeSeries;
  },
});

// ============================================================================
// HELPER QUERY - Get Campaign with Metrics Summary
// ============================================================================

export const getCampaignWithMetrics = query({
  args: {
    campaignId: v.id("campaigns"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    // Verify user has access to this campaign
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (!user) {
      return null;
    }

    if (user.role !== "admin" && user.clientId !== campaign.clientId) {
      return null;
    }

    // Use campaign date range if not specified
    const startDate = args.startDate ?? campaign.startDate;
    const endDate = args.endDate ?? campaign.endDate ?? Date.now();

    // Fetch recent metrics
    const metrics = await ctx.db
      .query("performance_metrics")
      .withIndex("by_campaignId_timestamp", (q) =>
        q.eq("campaignId", args.campaignId).gte("timestamp", startDate).lte("timestamp", endDate)
      )
      .collect();

    // Calculate quick stats
    const totalViews = metrics.reduce((sum, m) => sum + m.views, 0);
    const totalEngagement = metrics.reduce((sum, m) => sum + m.likes + m.comments + m.shares, 0);
    const avgEngagementRate =
      metrics.length > 0 ? metrics.reduce((sum, m) => sum + m.engagementRate, 0) / metrics.length : 0;

    return {
      ...campaign,
      metrics: {
        totalViews,
        totalEngagement,
        avgEngagementRate,
        totalPosts: metrics.length,
        livePosts: metrics.filter((m) => m.isLivePost).length,
      },
    };
  },
});
