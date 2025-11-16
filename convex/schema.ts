import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// The schema is entirely optional.
// You can delete this file (schema.ts) and the
// app will continue to work.
// The schema provides more precise TypeScript types.
export default defineSchema({
  numbers: defineTable({
    value: v.number(),
  }),
  todos: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("completed")),
    userId: v.string(),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  // Site Mirror Jobs
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
    downloadUrl: v.optional(v.string()),   // URL to ZIP file
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

  // Campaign Analytics - Users
  users: defineTable({
    clerkUserId: v.string(),              // Clerk user ID
    email: v.string(),
    name: v.optional(v.string()),
    role: v.union(
      v.literal("admin"),
      v.literal("client"),
      v.literal("influencer")
    ),
    clientId: v.optional(v.id("clients")),
    createdAt: v.number(),
  })
    .index("by_clerkUserId", ["clerkUserId"])
    .index("by_role", ["role"])
    .index("by_clientId", ["clientId"]),

  // Campaign Analytics - Clients
  clients: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    company: v.optional(v.string()),
    createdAt: v.number(),
  }),

  // Campaign Analytics - Campaigns
  campaigns: defineTable({
    name: v.string(),
    clientId: v.id("clients"),
    budget: v.number(),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("paused"),
      v.literal("completed")
    ),
    startDate: v.number(),
    endDate: v.optional(v.number()),
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clientId", ["clientId"])
    .index("by_status", ["status"])
    .index("by_startDate", ["startDate"]),

  // Campaign Analytics - Performance Metrics
  performance_metrics: defineTable({
    campaignId: v.id("campaigns"),
    platform: v.union(v.literal("TikTok"), v.literal("Instagram")),
    timestamp: v.number(),                // Unix timestamp in milliseconds
    postId: v.string(),                   // Unique post identifier
    views: v.number(),
    likes: v.number(),
    comments: v.number(),
    shares: v.number(),
    engagementRate: v.number(),           // Decimal (e.g., 0.05 = 5%)
    cpm: v.number(),                      // Cost per mille (1000 impressions)
    isLivePost: v.boolean(),
    postUrl: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_campaignId", ["campaignId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_campaignId_timestamp", ["campaignId", "timestamp"])
    .index("by_campaignId_platform_timestamp", ["campaignId", "platform", "timestamp"])
    .index("by_platform_timestamp", ["platform", "timestamp"])
    .index("by_postId", ["postId"]),

  // Influencer Rankings - Profiles
  profiles: defineTable({
    clerkUserId: v.string(),
    username: v.string(),
    profilePictureUrl: v.string(),
    paymentPerVideo: v.number(),
    email: v.optional(v.string()),
    platform: v.union(v.literal("TikTok"), v.literal("Instagram")),
    bio: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_clerkUserId", ["clerkUserId"])
    .index("by_platform", ["platform"]),

  // Influencer Rankings - Posts
  posts: defineTable({
    profileId: v.id("profiles"),
    campaignId: v.id("campaigns"),
    videoUrl: v.string(),
    postedAt: v.number(),                 // Unix timestamp
    platform: v.union(v.literal("TikTok"), v.literal("Instagram")),
    postId: v.string(),                   // Unique post identifier
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_profileId_postedAt", ["profileId", "postedAt"])
    .index("by_campaignId_postedAt", ["campaignId", "postedAt"])
    .index("by_postId", ["postId"]),

  // Notification Center
  notifications: defineTable({
    userId: v.string(),                   // Clerk user ID
    type: v.union(
      v.literal("campaign"),
      v.literal("post"),
      v.literal("system"),
      v.literal("alert")
    ),
    title: v.string(),
    message: v.string(),
    isRead: v.boolean(),
    actionUrl: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_isRead", ["userId", "isRead"])
    .index("by_createdAt", ["createdAt"])
    .searchIndex("search_notifications", {
      searchField: "message",
      filterFields: ["userId", "type", "isRead"],
    }),

  // Roster Manager - Rosters
  rosters: defineTable({
    userId: v.string(),                   // Owner's Clerk ID
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),        // Hex color for UI
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"]),

  // Roster Manager - Roster Members
  rosterMembers: defineTable({
    rosterId: v.id("rosters"),
    profileId: v.id("profiles"),
    role: v.optional(v.string()),         // "influencer", "manager", etc.
    notes: v.optional(v.string()),
    addedAt: v.number(),
  })
    .index("by_rosterId", ["rosterId"])
    .index("by_profileId", ["profileId"])
    .index("by_rosterId_profileId", ["rosterId", "profileId"]),

  // Scraper Sentinel - Scraper Jobs
  scraperJobs: defineTable({
    userId: v.string(),
    targetUrl: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    ),
    jobType: v.string(),                  // "profile", "post", "hashtag"
    platform: v.union(v.literal("TikTok"), v.literal("Instagram")),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    results: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_status", ["status"])
    .index("by_platform", ["platform"]),

  // Selector Sentinel - CSS Selectors
  cssSelectors: defineTable({
    platform: v.union(v.literal("TikTok"), v.literal("Instagram")),
    elementType: v.string(),              // "username", "likes", "comments", etc.
    selector: v.string(),                 // CSS selector string
    isActive: v.boolean(),
    lastVerified: v.optional(v.number()),
    failureCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_platform", ["platform"])
    .index("by_platform_elementType", ["platform", "elementType"])
    .index("by_isActive", ["isActive"]),

  // Profile Monitor - Monitored Profiles
  monitoredProfiles: defineTable({
    userId: v.string(),                   // Who's monitoring
    profileUrl: v.string(),
    platform: v.union(v.literal("TikTok"), v.literal("Instagram")),
    username: v.string(),
    checkInterval: v.number(),            // Minutes
    lastChecked: v.optional(v.number()),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_isActive", ["isActive"])
    .index("by_platform", ["platform"]),

  // Profile Monitor - Profile Snapshots
  profileSnapshots: defineTable({
    monitoredProfileId: v.id("monitoredProfiles"),
    followerCount: v.number(),
    followingCount: v.number(),
    postCount: v.number(),
    bio: v.optional(v.string()),
    profilePictureUrl: v.optional(v.string()),
    capturedAt: v.number(),
  })
    .index("by_monitoredProfileId", ["monitoredProfileId"])
    .index("by_capturedAt", ["capturedAt"]),

  // Export Bundle - Export Jobs
  exportJobs: defineTable({
    userId: v.string(),
    exportType: v.union(
      v.literal("zip"),
      v.literal("warc"),
      v.literal("docker")
    ),
    sourceJobId: v.optional(v.id("mirrorJobs")),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    downloadUrl: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_status", ["status"]),

  // Video Workflow - Video Jobs
  videoJobs: defineTable({
    userId: v.string(),
    sourceUrl: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("downloading"),
      v.literal("processing"),
      v.literal("uploading"),
      v.literal("completed"),
      v.literal("failed")
    ),
    workflow: v.string(),                 // "download", "transcode", "extract-audio"
    outputUrl: v.optional(v.string()),
    metadata: v.optional(v.any()),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_status", ["status"]),

  // Influencer Insights - Engagement Metrics
  engagementMetrics: defineTable({
    profileId: v.id("profiles"),
    postId: v.optional(v.id("posts")),
    platform: v.union(v.literal("TikTok"), v.literal("Instagram")),
    date: v.number(),                     // Daily aggregated metrics
    views: v.number(),
    likes: v.number(),
    comments: v.number(),
    shares: v.number(),
    saves: v.optional(v.number()),
    engagementRate: v.number(),
    reachRate: v.optional(v.number()),
    viralityScore: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_profileId_date", ["profileId", "date"])
    .index("by_platform_date", ["platform", "date"])
    .index("by_postId", ["postId"]),

  // Influencer Insights - Growth Tracking
  growthMetrics: defineTable({
    profileId: v.id("profiles"),
    platform: v.union(v.literal("TikTok"), v.literal("Instagram")),
    date: v.number(),
    followerCount: v.number(),
    followingCount: v.number(),
    postCount: v.number(),
    followerGrowth: v.number(),           // Daily change
    engagementTrend: v.number(),          // 7-day moving average
    createdAt: v.number(),
  })
    .index("by_profileId_date", ["profileId", "date"])
    .index("by_platform_date", ["platform", "date"]),

  // Post Insights - Detailed Analytics
  postAnalytics: defineTable({
    postId: v.id("posts"),
    platform: v.union(v.literal("TikTok"), v.literal("Instagram")),
    peakViewTime: v.optional(v.number()),
    averageWatchTime: v.optional(v.number()),
    completionRate: v.optional(v.number()),
    clickThroughRate: v.optional(v.number()),
    shareToViewRatio: v.number(),
    commentToLikeRatio: v.number(),
    viralityIndex: v.number(),
    sentimentScore: v.optional(v.number()),
    topKeywords: v.optional(v.array(v.string())),
    audienceDemographics: v.optional(v.any()),
    performanceRank: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_postId", ["postId"])
    .index("by_viralityIndex", ["viralityIndex"])
    .index("by_performanceRank", ["performanceRank"]),

  // Creator Insights - Audience Data
  audienceInsights: defineTable({
    profileId: v.id("profiles"),
    platform: v.union(v.literal("TikTok"), v.literal("Instagram")),
    date: v.number(),
    ageRange: v.optional(v.any()),        // {"18-24": 0.35, "25-34": 0.45, ...}
    genderSplit: v.optional(v.any()),     // {"male": 0.45, "female": 0.55}
    topLocations: v.optional(v.array(v.string())),
    peakActivityHours: v.optional(v.array(v.number())),
    deviceTypes: v.optional(v.any()),
    averageEngagement: v.number(),
    loyaltyScore: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_profileId_date", ["profileId", "date"])
    .index("by_platform_date", ["platform", "date"]),

  // Creator Insights - Content Performance
  contentPerformance: defineTable({
    profileId: v.id("profiles"),
    contentType: v.string(),              // "video", "image", "carousel", "reel"
    hashtag: v.optional(v.string()),
    avgViews: v.number(),
    avgEngagement: v.number(),
    avgReach: v.number(),
    bestPostTime: v.optional(v.string()),
    topPerformingFormat: v.optional(v.string()),
    contentTheme: v.optional(v.string()),
    performanceScore: v.number(),
    postCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_profileId", ["profileId"])
    .index("by_contentType", ["contentType"])
    .index("by_performanceScore", ["performanceScore"]),

  // Performance Dashboard - KPIs
  dashboardKpis: defineTable({
    userId: v.string(),
    scope: v.union(
      v.literal("global"),
      v.literal("campaign"),
      v.literal("profile")
    ),
    scopeId: v.optional(v.string()),      // Campaign or Profile ID
    kpiType: v.string(),                  // "roi", "engagement", "reach", "conversion"
    value: v.number(),
    target: v.optional(v.number()),
    trend: v.number(),                    // % change
    period: v.string(),                   // "daily", "weekly", "monthly"
    date: v.number(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_userId_scope", ["userId", "scope"])
    .index("by_kpiType_date", ["kpiType", "date"])
    .index("by_scopeId", ["scopeId"]),

  // Performance Dashboard - Custom Reports
  customReports: defineTable({
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    reportType: v.string(),               // "campaign", "influencer", "content", "roi"
    filters: v.any(),                     // JSON filters
    metrics: v.array(v.string()),         // Which metrics to include
    visualization: v.string(),            // "table", "chart", "graph"
    schedule: v.optional(v.string()),     // "daily", "weekly", "monthly"
    lastGenerated: v.optional(v.number()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_isActive", ["isActive"]),

  // Crawler Dashboard - Crawler Status
  crawlerStatus: defineTable({
    crawlerId: v.string(),
    name: v.string(),
    platform: v.union(v.literal("TikTok"), v.literal("Instagram")),
    status: v.union(
      v.literal("idle"),
      v.literal("running"),
      v.literal("paused"),
      v.literal("error")
    ),
    currentJob: v.optional(v.id("scraperJobs")),
    queueLength: v.number(),
    successRate: v.number(),
    averageTime: v.number(),              // Seconds per job
    lastActivity: v.number(),
    errorCount: v.number(),
    totalJobsProcessed: v.number(),
    uptime: v.number(),                   // Seconds
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_platform", ["platform"])
    .index("by_crawlerId", ["crawlerId"]),

  // Social Scraper - Scrape Results
  scrapeResults: defineTable({
    jobId: v.id("scraperJobs"),
    dataType: v.string(),                 // "profile", "post", "comments", "hashtag"
    platform: v.union(v.literal("TikTok"), v.literal("Instagram")),
    data: v.any(),                        // Scraped data
    metadata: v.optional(v.any()),
    quality: v.optional(v.number()),      // Data quality score 0-1
    isProcessed: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_jobId", ["jobId"])
    .index("by_dataType", ["dataType"])
    .index("by_platform", ["platform"])
    .index("by_isProcessed", ["isProcessed"]),

  // Social Sentinel - Alerts
  socialAlerts: defineTable({
    userId: v.string(),
    alertType: v.union(
      v.literal("engagement_spike"),
      v.literal("follower_drop"),
      v.literal("viral_content"),
      v.literal("competitor_activity"),
      v.literal("mention"),
      v.literal("trend")
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical")
    ),
    title: v.string(),
    message: v.string(),
    sourceType: v.string(),               // "profile", "post", "campaign"
    sourceId: v.string(),
    actionUrl: v.optional(v.string()),
    isRead: v.boolean(),
    isResolved: v.boolean(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_alertType", ["alertType"])
    .index("by_priority", ["priority"])
    .index("by_isRead", ["isRead"])
    .index("by_isResolved", ["isResolved"]),

  // Social Sentinel - Trend Tracking
  trendTracking: defineTable({
    platform: v.union(v.literal("TikTok"), v.literal("Instagram")),
    trendType: v.string(),                // "hashtag", "sound", "challenge", "topic"
    identifier: v.string(),               // Hashtag name, sound ID, etc.
    category: v.optional(v.string()),
    popularity: v.number(),               // 0-100
    growthRate: v.number(),               // % change
    peakTime: v.optional(v.number()),
    estimatedReach: v.number(),
    relatedTrends: v.optional(v.array(v.string())),
    sentiment: v.optional(v.string()),    // "positive", "neutral", "negative"
    isActive: v.boolean(),
    firstSeen: v.number(),
    lastUpdated: v.number(),
  })
    .index("by_platform", ["platform"])
    .index("by_trendType", ["trendType"])
    .index("by_popularity", ["popularity"])
    .index("by_isActive", ["isActive"])
    .searchIndex("search_trends", {
      searchField: "identifier",
      filterFields: ["platform", "trendType", "isActive"],
    }),

  // Command Center - System Health
  systemHealth: defineTable({
    component: v.string(),                // "api", "scraper", "database", "storage"
    status: v.union(
      v.literal("healthy"),
      v.literal("degraded"),
      v.literal("down")
    ),
    responseTime: v.optional(v.number()),
    errorRate: v.optional(v.number()),
    throughput: v.optional(v.number()),
    lastCheck: v.number(),
    uptime: v.number(),                   // Percentage
    alerts: v.optional(v.array(v.string())),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_component", ["component"])
    .index("by_status", ["status"])
    .index("by_lastCheck", ["lastCheck"]),

  // Command Center - Quick Actions Log
  actionLogs: defineTable({
    userId: v.string(),
    actionType: v.string(),               // "pause_campaign", "restart_crawler", etc.
    targetType: v.string(),               // "campaign", "scraper", "profile"
    targetId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed")
    ),
    result: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    executedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_actionType", ["actionType"])
    .index("by_status", ["status"])
    .index("by_executedAt", ["executedAt"]),
});
