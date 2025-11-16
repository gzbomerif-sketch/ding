---
name: agent-influencer-insights-convex
description: Implements Influencer Insights analytics using Convex for data storage and processing.
model: inherit
color: purple
---


# Agent: Influencer Insights Implementation with Convex

## Agent Overview
**Purpose**: This agent provides detailed instructions for implementing the "Influencer Insights" feature, focusing on collecting, storing, processing, and presenting analytics data derived from a local Playwright scraper. The core architecture leverages Convex for all backend data operations and business logic, with Next.js for the frontend and Clerk for authentication.
**Tech Stack**: Next.js, React, Convex, Clerk, Playwright (external data source).
**Source**: Convex Documentation, Clerk Documentation, Next.js Documentation.

## Critical Implementation Knowledge
### 1. Convex Best Practices & Latest Updates 🚨
Convex is a reactive, real-time backend. All backend logic should default to Convex functions:
*   **Convex Actions**: Ideal for computationally intensive tasks, complex data aggregation, calling external services (or in this case, processing data that *originates* externally to the Convex runtime, like scraper output), and any operations that might take longer than a mutation or query. Actions can also update the database via mutations.
*   **Convex Mutations**: Solely for modifying the database state. They are transactional and idempotent. Use them for writing the raw scraped data or aggregated results.
*   **Convex Queries**: For reading data from the database. They provide real-time updates to connected clients.
*   **Schema Definition**: Always define a robust Convex schema (`convex/schema.ts`) to ensure data integrity and leverage Convex's indexing capabilities for efficient queries.
*   **Transactions**: Mutations are transactional. Actions can execute multiple mutations transactionally if wrapped correctly.
*   **Serverless Environment**: Convex functions run in a serverless environment. Be mindful of execution limits (time, memory). For very long-running scraper processes, ensure the scraper orchestrates data pushing to Convex rather than Convex trying to run the scraper directly.

### 2. Common Pitfalls & Solutions 🚨
*   **Treating local scraper as an "external API"**: The "Custom API" is explicitly stated as a *local Playwright scraper*. This means you're not calling an external HTTP API with typical rate limits or documentation. Instead, you're *ingesting data* produced by this local scraper into Convex.
    *   **Solution**: The scraper should push data into Convex via **Convex Mutations**. If the scraper runs in a Node.js environment, it can use the Convex client to directly call mutations.
*   **Performing heavy computations in Queries**: Convex Queries are for reads and should be fast. Complex aggregations, calculations (like ROI or influencer comparisons), or report generation should not happen in queries.
    *   **Solution**: Offload all complex analytics and reporting logic to **Convex Actions**. Actions can fetch data via queries, perform computations, store results via mutations, and even trigger file generation.
*   **Lack of Schema**: Storing unstructured data can lead to bugs and inefficient queries.
    *   **Solution**: Define a comprehensive `convex/schema.ts` for all data types: `performance_metrics`, `crawl_history`, `campaign_analytics`, `creator_analytics`, `reports`, etc., with appropriate indexes.
*   **Direct database writes from frontend**: Never write directly to the Convex database from the frontend without a mutation.
    *   **Solution**: All database modifications must go through **Convex Mutations**.
*   **Authentication Mismatches**: Incorrectly handling Clerk user IDs between the frontend and Convex.
    *   **Solution**: Use `ctx.auth.getUserIdentity()` within Convex functions to securely retrieve the Clerk user ID and associated roles, matching frontend identity with backend permissions.

### 3. Best Practices 🚨
*   **Data Ingestion Strategy**: Design a clear pipeline for the Playwright scraper to push its data into Convex. This could be a batch process calling a `storeScrapedData` Convex mutation, or real-time updates as data is scraped.
*   **Normalized vs. Denormalized Data**: For analytics, consider denormalizing some data in separate tables to optimize read performance for common aggregations, especially for time-series data or comparisons.
*   **Indexed Fields**: Identify frequently queried fields (e.g., `creatorId`, `campaignId`, `timestamp`, `reportType`) and add indexes in `convex/schema.ts` for performance.
*   **Robust Error Handling**: Implement try/catch blocks in Convex Actions and Mutations, especially for data ingestion and complex processing, to log errors and prevent data corruption.
*   **Asynchronous Processing**: For generating large reports (CSV/Excel/PDF), use a Convex Action to trigger the generation asynchronously, potentially storing the report status in Convex and notifying the user when complete.
*   **Access Control**: Implement robust access control within Convex Queries, Mutations, and Actions using `ctx.auth.getUserIdentity()` to ensure only authorized users (e.g., admins) can access sensitive analytics or trigger reports.

## Implementation Steps

### Backend Implementation (Convex)
1.  **Define Convex Schema**: Create `convex/schema.ts` to define tables for `performance_metrics`, `crawl_history`, `campaign_analytics`, `creator_analytics`, and `reports`.
2.  **Data Ingestion Mutation**: Implement a **Convex Mutation** (`storeScrapedMetrics.ts`) that the Playwright scraper can call to push raw performance metrics and crawl history into Convex.
3.  **Analytics Aggregation Actions**: Develop **Convex Actions** (e.g., `calculateCampaignROI.ts`, `aggregateCreatorPerformance.ts`, `generateComparisonData.ts`) to perform complex calculations and aggregations based on the raw scraped data. These actions will read data via queries and store aggregated results via mutations.
4.  **Reporting & Export Actions**: Create **Convex Actions** (e.g., `generateCSVReport.ts`, `generatePDFReport.ts`) to generate exportable files (CSV/Excel/PDF). These actions will use Convex's file storage API to upload the generated files and store references in the database.
5.  **Data Query Functions**: Implement **Convex Queries** (e.g., `getCampaignAnalytics.ts`, `getCreatorPerformance.ts`, `getReports.ts`) to fetch the aggregated and raw data for display on the frontend.
6.  **Authentication Integration**: Use `ctx.auth.getUserIdentity()` in all relevant Convex functions to enforce access control based on Clerk user roles.

### Frontend Integration (Next.js)
1.  **Clerk Provider**: Wrap your Next.js application with `ClerkProvider`.
2.  **Convex Provider**: Wrap your application with `ConvexProviderWithClerk` for seamless authentication integration.
3.  **Data Fetching**: Use `useQuery` hooks from `convex/react` to display real-time analytics data.
4.  **Data Interaction**: Use `useMutation` for any direct user interactions that modify data (e.g., marking a report as read).
5.  **Complex Operations**: Use `useAction` hooks to trigger complex backend analytics calculations or report generation.
6.  **Report Download**: Create UI to call `generateReport` action and then download the file from Convex file storage URL.
7.  **Authentication Guards**: Protect routes and components using Clerk's `SignedOut`, `SignedIn`, `useUser` and `useAuth` hooks.

## Code Patterns

### Convex Backend Functions

1.  **`convex/schema.ts` (Example Snippet)**:
    ```typescript
    import { defineSchema, defineTable } from "convex/server";
    import { v } from "convex/values";

    export default defineSchema({
      performance_metrics: defineTable({
        creatorId: v.id("creators"), // Link to creator
        platform: v.string(), // "instagram" | "tiktok"
        postId: v.string(),
        timestamp: v.number(), // Unix timestamp
        views: v.number(),
        likes: v.number(),
        comments: v.number(),
        shares: v.number(),
        url: v.string(),
        crawlId: v.id("crawl_history"),
      }).index("by_creator_platform_timestamp", ["creatorId", "platform", "timestamp"])
        .index("by_crawlId", ["crawlId"]),

      crawl_history: defineTable({
        startTime: v.number(),
        endTime: v.number(),
        status: v.string(), // "success" | "failure"
        scrapedCount: v.number(),
        errorMessage: v.optional(v.string()),
      }).index("by_startTime", ["startTime"]),

      campaign_analytics: defineTable({
        campaignId: v.id("campaigns"),
        metricType: v.string(), // "roi", "views_over_time"
        data: v.any(), // JSON data for the specific metric
        lastUpdated: v.number(),
      }).index("by_campaign_metric", ["campaignId", "metricType"]),

      reports: defineTable({
        userId: v.id("users"), // Clerk user ID mapped to Convex user ID
        reportType: v.string(), // "csv_campaign_summary", "pdf_creator_detail"
        status: v.string(), // "pending", "generating", "completed", "failed"
        fileId: v.optional(v.id("_files")), // Reference to Convex file storage
        fileName: v.optional(v.string()),
        createdAt: v.number(),
        generatedAt: v.optional(v.number()),
        // Add filters used for generation
        startDate: v.optional(v.number()),
        endDate: v.optional(v.number()),
        creatorIds: v.optional(v.array(v.id("creators"))),
      }).index("by_userId_createdAt", ["userId", "createdAt"]),
    });
    ```

2.  **`convex/storeScrapedMetrics.ts` (Convex Mutation)**:
    This mutation will receive data from the Playwright scraper.
    ```typescript
    import { mutation } from "./_generated/server";
    import { v } from "convex/values";

    export const storeScrapedMetrics = mutation({
      args: {
        creatorId: v.id("creators"),
        platform: v.string(),
        postId: v.string(),
        timestamp: v.number(),
        views: v.number(),
        likes: v.number(),
        comments: v.number(),
        shares: v.number(),
        url: v.string(),
        crawlDetails: v.object({
          startTime: v.number(),
          endTime: v.number(),
          status: v.string(),
          scrapedCount: v.number(),
          errorMessage: v.optional(v.string()),
        }),
      },
      handler: async (ctx, args) => {
        // First, ensure crawl history entry exists or create it
        let crawlId;
        const existingCrawl = await ctx.db
          .query("crawl_history")
          .filter(q => q.eq(q.field("startTime"), args.crawlDetails.startTime))
          .unique();

        if (existingCrawl) {
          crawlId = existingCrawl._id;
        } else {
          crawlId = await ctx.db.insert("crawl_history", args.crawlDetails);
        }

        // Then insert the performance metric
        await ctx.db.insert("performance_metrics", {
          creatorId: args.creatorId,
          platform: args.platform,
          postId: args.postId,
          timestamp: args.timestamp,
          views: args.views,
          likes: args.likes,
          comments: args.comments,
          shares: args.shares,
          url: args.url,
          crawlId,
        });

        console.log(`Stored metric for post ${args.postId} by creator ${args.creatorId}`);
        return { success: true, crawlId };
      },
    });
    ```

3.  **`convex/calculateCampaignROI.ts` (Convex Action)**:
    This action would perform complex calculations.
    ```typescript
    import { action } from "./_generated/server";
    import { v } from "convex/values";
    import { api } from "./_generated/api";

    export const calculateCampaignROI = action({
      args: { campaignId: v.id("campaigns"), budget: v.number() },
      handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity || !identity.tokenIdentifier.startsWith("clerk|")) {
          throw new Error("Not authenticated");
        }
        // Example: Only admins can trigger this action
        // In a real app, you'd check roles against identity.customClaims
        // if (!identity.customClaims?.['https://my-app.com/roles']?.includes('admin')) {
        //   throw new Error("Unauthorized");
        // }

        const metrics = await ctx.runQuery(api.getters.getMetricsForCampaign, {
          campaignId: args.campaignId,
        });

        let totalViews = 0;
        let totalEngagement = 0; // likes + comments + shares
        for (const metric of metrics) {
          totalViews += metric.views;
          totalEngagement += metric.likes + metric.comments + metric.shares;
        }

        // Simple ROI calculation: (Total Views / Budget) * 100
        const roi = args.budget > 0 ? (totalViews / args.budget) * 100 : 0;

        await ctx.runMutation(api.setters.updateCampaignAnalytics, {
          campaignId: args.campaignId,
          metricType: "roi",
          data: { roi, totalViews, totalEngagement, budget: args.budget },
          lastUpdated: Date.now(),
        });

        return { roi, totalViews, totalEngagement };
      },
    });
    ```

4.  **`convex/generateCSVReport.ts` (Convex Action with File Storage)**:
    ```typescript
    import { action } from "./_generated/server";
    import { v } from "convex/values";
    import { api } from "./_generated/api";

    export const generateCSVReport = action({
      args: {
        reportType: v.string(), // e.g., "campaign_summary"
        campaignId: v.optional(v.id("campaigns")),
        creatorIds: v.optional(v.array(v.id("creators"))),
        startDate: v.optional(v.number()),
        endDate: v.optional(v.number()),
      },
      handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity || !identity.tokenIdentifier.startsWith("clerk|")) {
          throw new Error("Not authenticated");
        }
        const userId = identity.subject; // Clerk user ID

        // 1. Create a pending report entry
        const reportId = await ctx.runMutation(api.reports.createPendingReport, {
          userId,
          reportType: args.reportType,
          startDate: args.startDate,
          endDate: args.endDate,
          campaignId: args.campaignId,
          creatorIds: args.creatorIds,
        });

        try {
          // 2. Fetch data (this would be a complex query or aggregation)
          const dataToExport = await ctx.runQuery(api.getters.getReportData, {
            campaignId: args.campaignId,
            creatorIds: args.creatorIds,
            startDate: args.startDate,
            endDate: args.endDate,
          });

          // 3. Generate CSV content (simplified example)
          let csvContent = "Metric,Value\n";
          if (dataToExport && Array.isArray(dataToExport)) {
              dataToExport.forEach((item: any) => {
                  csvContent += `${item.metric},${item.value}\n`;
              });
          } else {
            csvContent += "No data available,\n";
          }
          const blob = new Blob([csvContent], { type: "text/csv" });

          // 4. Upload to Convex file storage
          const fileId = await ctx.storage.store(blob);
          const fileName = `${args.reportType}_${Date.now()}.csv`;

          // 5. Update report status to completed with file details
          await ctx.runMutation(api.reports.updateReportStatus, {
            reportId,
            status: "completed",
            fileId,
            fileName,
            generatedAt: Date.now(),
          });

          return { reportId, fileId, fileName };
        } catch (error) {
          console.error("Report generation failed:", error);
          await ctx.runMutation(api.reports.updateReportStatus, {
            reportId,
            status: "failed",
            errorMessage: (error as Error).message,
          });
          throw error;
        }
      },
    });
    ```

### Frontend Integration
```tsx
// pages/admin/dashboard.tsx (example)
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { useState } from "react";

export default function AdminDashboard() {
  const { isLoaded, userId } = useAuth();
  const campaignAnalytics = useQuery(api.getters.getCampaignAnalytics, { campaignId: "your-campaign-id" });
  const generateReport = useAction(api.generateCSVReport.generateCSVReport);
  const [reportGenerating, setReportGenerating] = useState(false);

  if (!isLoaded) return <div>Loading auth...</div>;
  if (!userId) return <div>Please sign in.</div>; // Or redirect

  const handleGenerateReport = async () => {
    setReportGenerating(true);
    try {
      const { fileId, fileName } = await generateReport({
        reportType: "campaign_summary",
        campaignId: "your-campaign-id",
        startDate: Date.now() - 30 * 24 * 60 * 60 * 1000, // last 30 days
        endDate: Date.now(),
      });
      // Optionally poll for report status or get download URL directly
      const downloadUrl = await generateReport.getUrl(fileId);
      window.open(downloadUrl, '_blank');
      alert(`Report "${fileName}" generated successfully!`);
    } catch (error) {
      console.error("Error generating report:", error);
      alert("Failed to generate report.");
    } finally {
      setReportGenerating(false);
    }
  };

  return (
    <div>
      <h1>Admin Influencer Insights</h1>
      {campaignAnalytics ? (
        <pre>{JSON.stringify(campaignAnalytics, null, 2)}</pre>
      ) : (
        <div>Loading campaign analytics...</div>
      )}

      <button onClick={handleGenerateReport} disabled={reportGenerating}>
        {reportGenerating ? "Generating Report..." : "Generate Campaign Summary CSV"}
      </button>

      {/* Display a list of generated reports with download links */}
      {/* This would involve another useQuery for reports table */}
    </div>
  );
}
```

## Testing & Debugging
*   **Convex Dashboard**: Use the Convex dashboard (`https://dashboard.convex.dev/`) to inspect database tables, view function logs, and test mutations/queries directly.
*   **Convex Dev CLI**: Run `npx convex dev` locally to see real-time logs from your Convex functions and inspect database state.
*   **Unit/Integration Tests**: Write tests for your Convex functions. You can use a testing utility like `@convex-dev/testing` to mock `ctx` and other Convex environment specifics.
*   **Authentication Flow**: Verify that `ctx.auth.getUserIdentity()` correctly returns the Clerk user information and that your access control logic works as expected.
*   **Data Ingestion**: Monitor the `performance_metrics` and `crawl_history` tables in the Convex dashboard after your scraper runs to ensure data is being stored correctly.
*   **Action Execution**: For long-running actions (like report generation), check the Convex dashboard logs for progress and any errors.

## Environment Variables
*   `.env.local` for Next.js:
    ```dotenv
    NEXT_PUBLIC_CONVEX_URL="YOUR_CONVEX_DEPLOYMENT_URL"
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="YOUR_CLERK_PUBLISHABLE_KEY"
    CLERK_SECRET_KEY="YOUR_CLERK_SECRET_KEY"
    ```
*   Convex Deployment:
    Convex handles its own deployment URLs automatically. Ensure Clerk environment variables are securely configured in your Convex deployment settings if you're using `convex deploy` and accessing them via `process.env`.
    For Convex function environment variables, use `npx convex env set <KEY>=<VALUE>`.
    ```bash
    npx convex env set CLERK_WEBHOOK_SECRET="YOUR_CLERK_WEBHOOK_SECRET" # If you handle Clerk webhooks
    ```

## Success Metrics
*   **Scraped Data Ingestion**: Raw `performance_metrics` and `crawl_history` records are successfully inserted into Convex by the Playwright scraper.
*   **Real-time Analytics**: Frontend components using `useQuery` display campaign and creator analytics data that updates in real-time when underlying data changes.
*   **Complex Analytics Accuracy**: `calculateCampaignROI` and similar **Convex Actions** correctly compute and store aggregated insights (e.g., ROI, comparison data) based on business logic.
*   **Reporting Functionality**: **Convex Actions** successfully generate CSV/Excel/PDF reports with custom date ranges and filters, and these files are stored in Convex file storage and downloadable from the frontend.
*   **Authentication & Authorization**: Only authenticated and authorized users (e.g., admins) can access analytics dashboards, trigger reports, or view sensitive data, enforced by `ctx.auth.getUserIdentity()` in Convex functions.
*   **Performance**: Analytics queries and report generation actions complete within acceptable timeframes, leveraging Convex indexes.
*   **Schema Adherence**: All data stored in Convex conforms to the defined `convex/schema.ts`.