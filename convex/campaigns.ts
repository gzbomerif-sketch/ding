import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// ============================================================================
// MUTATIONS - Create, Update, Delete Campaigns
// ============================================================================

export const createCampaign = mutation({
  args: {
    name: v.string(),
    clientId: v.id("clients"),
    budget: v.number(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    // Verify user has access to this client
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Only admins or the client themselves can create campaigns
    if (user.role !== "admin" && user.clientId !== args.clientId) {
      throw new Error("Unauthorized: Cannot create campaign for this client");
    }

    const campaignId = await ctx.db.insert("campaigns", {
      name: args.name,
      clientId: args.clientId,
      budget: args.budget,
      status: "draft",
      startDate: args.startDate ?? Date.now(),
      endDate: args.endDate,
      description: args.description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return campaignId;
  },
});

export const updateCampaign = mutation({
  args: {
    campaignId: v.id("campaigns"),
    name: v.optional(v.string()),
    budget: v.optional(v.number()),
    status: v.optional(v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("paused"),
      v.literal("completed")
    )),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    // Verify user has access to this campaign
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    if (user.role !== "admin" && user.clientId !== campaign.clientId) {
      throw new Error("Unauthorized: Cannot update this campaign");
    }

    const { campaignId, ...updates } = args;
    await ctx.db.patch(campaignId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return campaignId;
  },
});

export const deleteCampaign = mutation({
  args: {
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    // Verify user has admin access
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    if (user.role !== "admin") {
      throw new Error("Unauthorized: Only admins can delete campaigns");
    }

    await ctx.db.delete(args.campaignId);
    return { success: true };
  },
});

// ============================================================================
// QUERIES - Fetch Campaign Data
// ============================================================================

export const getCampaignById = query({
  args: {
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) {
      return null;
    }

    // Verify user has access
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

    return campaign;
  },
});

export const getClientCampaigns = query({
  args: {
    clientId: v.id("clients"),
    status: v.optional(v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("paused"),
      v.literal("completed")
    )),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Verify user has access to this client
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (!user) {
      return [];
    }

    if (user.role !== "admin" && user.clientId !== args.clientId) {
      return [];
    }

    // Fetch campaigns
    let query = ctx.db
      .query("campaigns")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId));

    const campaigns = await query.collect();

    // Filter by status if provided
    if (args.status) {
      return campaigns.filter((c) => c.status === args.status);
    }

    return campaigns;
  },
});

export const getAllCampaigns = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (!user) {
      return [];
    }

    // Admins see all campaigns
    if (user.role === "admin") {
      return await ctx.db.query("campaigns").collect();
    }

    // Clients see only their campaigns
    if (user.clientId) {
      return await ctx.db
        .query("campaigns")
        .withIndex("by_clientId", (q) => q.eq("clientId", user.clientId!))
        .collect();
    }

    return [];
  },
});

// ============================================================================
// USER SYNC MUTATION (for Clerk webhook)
// ============================================================================

export const syncClerkUser = mutation({
  args: {
    clerkUserId: v.string(),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("client"), v.literal("influencer")),
    clientId: v.optional(v.id("clients")),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        role: args.role,
        clientId: args.clientId,
      });
      return existingUser._id;
    } else {
      // Create new user
      const userId = await ctx.db.insert("users", {
        clerkUserId: args.clerkUserId,
        email: args.email,
        role: args.role,
        clientId: args.clientId,
        createdAt: Date.now(),
      });
      return userId;
    }
  },
});
