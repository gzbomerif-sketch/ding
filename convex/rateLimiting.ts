/**
 * Rate Limiting for Scraper Jobs
 * Prevents abuse and respects platform limits
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Rate limit constants
const LIMITS = {
  // Per-user limits
  JOBS_PER_MINUTE: 6,
  JOBS_PER_HOUR: 100,
  JOBS_PER_DAY: 1000,

  // Per-profile limits
  SAME_PROFILE_COOLDOWN_MS: 60 * 60 * 1000, // 1 hour
};

/**
 * Check if user can create a new scrape job
 * Returns: { allowed: boolean, reason?: string }
 */
export const checkRateLimit = query({
  args: {
    platform: v.union(v.literal("Instagram"), v.literal("TikTok")),
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { allowed: false, reason: "Unauthenticated" };
    }

    const userId = identity.subject;
    const now = Date.now();

    // Get user's recent jobs
    const allJobs = await ctx.db
      .query("scraperJobs")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    // Check per-minute limit
    const oneMinuteAgo = now - 60 * 1000;
    const jobsLastMinute = allJobs.filter((j) => j.createdAt >= oneMinuteAgo);
    if (jobsLastMinute.length >= LIMITS.JOBS_PER_MINUTE) {
      return {
        allowed: false,
        reason: `Rate limit: Max ${LIMITS.JOBS_PER_MINUTE} jobs per minute`,
      };
    }

    // Check per-hour limit
    const oneHourAgo = now - 60 * 60 * 1000;
    const jobsLastHour = allJobs.filter((j) => j.createdAt >= oneHourAgo);
    if (jobsLastHour.length >= LIMITS.JOBS_PER_HOUR) {
      return {
        allowed: false,
        reason: `Rate limit: Max ${LIMITS.JOBS_PER_HOUR} jobs per hour`,
      };
    }

    // Check per-day limit
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const jobsLastDay = allJobs.filter((j) => j.createdAt >= oneDayAgo);
    if (jobsLastDay.length >= LIMITS.JOBS_PER_DAY) {
      return {
        allowed: false,
        reason: `Rate limit: Max ${LIMITS.JOBS_PER_DAY} jobs per day`,
      };
    }

    // Check same profile cooldown
    const targetUrl = `https://${args.platform.toLowerCase()}.com/${args.username}`;
    const recentSameProfile = allJobs.find(
      (j) =>
        j.targetUrl === targetUrl &&
        j.createdAt >= now - LIMITS.SAME_PROFILE_COOLDOWN_MS
    );

    if (recentSameProfile) {
      const cooldownRemaining = Math.ceil(
        (recentSameProfile.createdAt +
          LIMITS.SAME_PROFILE_COOLDOWN_MS -
          now) /
          1000 /
          60
      );
      return {
        allowed: false,
        reason: `Cooldown: Wait ${cooldownRemaining} minutes before scraping @${args.username} again`,
      };
    }

    return { allowed: true };
  },
});

/**
 * Get rate limit stats for current user
 */
export const getRateLimitStats = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const userId = identity.subject;
    const now = Date.now();

    const allJobs = await ctx.db
      .query("scraperJobs")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const oneMinuteAgo = now - 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    return {
      lastMinute: allJobs.filter((j) => j.createdAt >= oneMinuteAgo).length,
      lastHour: allJobs.filter((j) => j.createdAt >= oneHourAgo).length,
      lastDay: allJobs.filter((j) => j.createdAt >= oneDayAgo).length,
      limits: {
        perMinute: LIMITS.JOBS_PER_MINUTE,
        perHour: LIMITS.JOBS_PER_HOUR,
        perDay: LIMITS.JOBS_PER_DAY,
      },
    };
  },
});
