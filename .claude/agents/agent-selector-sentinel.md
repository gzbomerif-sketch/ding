---
name: agent-Convex-SelectorSentinel
description: Implements Selector Sentinel for dynamic CSS selector management using Convex actions, mutations, and scheduled functions.
model: inherit
color: purple
---


# Agent: Selector Sentinel Implementation with Convex

## Agent Overview
**Purpose**: This agent provides comprehensive instructions for implementing the Selector Sentinel feature. Selector Sentinel is designed to automatically detect changes in website HTML (e.g., Instagram/TikTok), find new working CSS selectors, test them, and manage rollbacks. The implementation leverages Convex as the primary backend, utilizing its actions for external interactions and complex logic, mutations for state changes and data persistence, and scheduled functions/cron jobs for automated monitoring and retry mechanisms.
**Tech Stack**: Next.js, React, TypeScript, Convex, Clerk (Authentication)
**Source**:
*   [Convex Developer Hub: Calling External Services](https://docs.convex.dev/how-to/external-apis)
*   [Convex Developer Hub: Best Practices](https://docs.convex.dev/best-practices)
*   [Convex Developer Hub: Scheduled Functions](https://docs.convex.dev/platform/scheduling/scheduled-functions)
*   [Convex Developer Hub: Cron Jobs](https://docs.convex.dev/platform/scheduling/cron-jobs)
*   [Convex Developer Hub: File Storage](https://docs.convex.dev/platform/storage/file-storage)
*   [Developer Nation: Best Practices for Integrating External Data APIs](https://www.developernation.net/blog/best-practices-for-integrating-external-data-apis-into-your-application)

## Critical Implementation Knowledge

### 1. Convex Latest Updates 🚨
*   **Actions for External Calls**: Convex strongly emphasizes using `action` functions for any external API calls or non-deterministic logic. `query` and `mutation` functions are transactional and deterministic and *cannot* directly make `fetch` calls to external services.
*   **Scheduled Functions & Cron Jobs**: Convex offers robust `scheduled functions` for one-time future execution and `cron jobs` for recurring tasks. These are durable and resilient to downtime, crucial for monitoring and retry logic.
*   **`internal` Functions**: For backend-to-backend communication within Convex, or for functions triggered by scheduled jobs, always use `internalQuery`, `internalMutation`, or `internalAction` to prevent unauthorized client access.
*   **File Storage**: Convex provides integrated file storage, useful for storing HTML snapshots, screenshots, or any data generated during the Selector Sentinel process that exceeds typical document size limits. Files can be uploaded via generated URLs or HTTP actions.

### 2. Common Pitfalls & Solutions 🚨
*   **Direct External Calls from Mutations/Queries**: Attempting `fetch` from a `mutation` or `query` will fail.
    *   **Solution**: Always wrap external API interactions within `action` functions. The `action` can then call `mutation`s to write results to the database.
*   **Missing Access Control**: Public Convex functions without proper authentication or authorization checks can be abused.
    *   **Solution**: Implement robust access control using `ctx.auth.getUserIdentity()` for all public functions. For internal functions, use `internalAction`/`internalMutation` and only call them from other trusted Convex functions.
*   **Ignoring External API Rate Limits**: Rapidly hitting an external scraping service without respecting its rate limits can lead to IP bans or throttling.
    *   **Solution**: Implement exponential backoff and retry logic within Convex Actions, and consider using a queueing system (like Convex Workpool component, if high scale is needed) to manage outbound requests.
*   **Non-Idempotent Retries**: Retrying operations that aren't idempotent can lead to duplicate data or incorrect state if the initial attempt partially succeeded.
    *   **Solution**: Design `mutation`s and `action`s to be idempotent where possible. For instance, ensure updates are based on the current state or include unique transaction IDs.

### 3. Best Practices 🚨
*   **Modularize Backend Logic**: Organize Convex functions logically. For Selector Sentinel, this might mean separate actions for "initiate crawl," "analyze HTML," "test selector candidates," and mutations for "store selector," "log crawl result."
*   **Use `internal` Functions for Chaining**: When an `action` needs to trigger a `mutation` or another `action` (e.g., an HTML analysis action schedules a selector testing action), use `ctx.runMutation` or `ctx.runAction` with `internal` functions.
*   **Transactional State Updates**: Ensure that any database writes (e.g., updating a selector's status, storing crawl results) are done in `mutation`s to maintain transactional integrity.
*   **Error Handling and Logging**: Implement comprehensive error handling and log failures in Convex actions. This is critical for debugging selector failures and understanding why a sentinel process might not work.
*   **Environment Variables for Secrets**: Store API keys for external scraping services, or any other sensitive configuration, as Convex environment variables, accessible only within backend functions. Never hardcode them.
*   **Awaiting Promises**: Always `await` all promises within Convex functions to ensure correct execution order and proper error handling.
*   **Optimized Queries with Indexes**: For efficient retrieval of selector history or crawl results, define appropriate indexes on your Convex tables. Avoid client-side filtering on large datasets.

## Implementation Steps

### Backend Implementation
The Selector Sentinel logic will primarily reside in Convex functions.

#### Convex Functions (Primary)
1.  **`selectorRecords` Table (Convex DB)**: Store current and historical CSS selectors, including `targetUrl`, `metricType` (e.g., "InstagramFeed", "TikTokProfile"), `currentSelector`, `previousSelectors` (array of last 3 working versions), `status` (active, testing, failed), `lastUpdated`, `failCount`.
2.  **`crawlResults` Table (Convex DB)**: Store outcomes of individual crawls, including `selectorId`, `timestamp`, `success`, `dataExtracted` (optional payload), `errorMessage` (if failed), `htmlSnapshotId` (Convex File Storage ID), `screenshotId` (Convex File Storage ID).
3.  **`startSelectorSentinel` (Convex `internalAction`)**:
    *   Triggered by a cron job or manual override.
    *   Fetches active `selectorRecords` that need monitoring.
    *   For each record, schedules `monitorSelector` action.
4.  **`monitorSelector` (Convex `internalAction`)**:
    *   Takes `selectorId` as argument.
    *   Calls an external scraping service (via `fetch`) to crawl the `targetUrl` using the `currentSelector`.
    *   **Failure Detection**:
        *   Checks if selector returns null.
        *   Compares screenshot/HTML content for drastic differences (requires image/HTML diffing service or logic).
    *   Stores `crawlResult` (success/failure) in the `crawlResults` table via an `internalMutation`.
    *   If failure conditions met:
        *   Increments `failCount` in `selectorRecords` via `internalMutation`.
        *   If `failCount` >= 3, schedules `initiateSelectorUpdate` action for this `selectorId`.
    *   If success, resets `failCount`.
5.  **`initiateSelectorUpdate` (Convex `internalAction`)**:
    *   Takes `selectorId` as argument.
    *   Acquires a distributed lock for the `metricType` (e.g., using a dedicated Convex table for locks with a `mutation` that attempts to insert a lock record).
    *   If lock acquired, schedules `findNewSelector` action.
    *   If lock not acquired, retries later using `ctx.scheduler.runAfter`.
6.  **`findNewSelector` (Convex `internalAction`)**:
    *   Takes `selectorId` as argument.
    *   Calls an external AI/HTML analysis service (via `fetch`) with the recent failed HTML snapshot (from `crawlResults`).
    *   Generates 5-10 new selector candidates (prioritizing data attributes, aria labels, CSS classes, XPath).
    *   Schedules `testSelectorCandidates` action with the candidates.
7.  **`testSelectorCandidates` (Convex `internalAction`)**:
    *   Takes `selectorId` and `candidates` (array of strings) as arguments.
    *   For each candidate, performs 3 "recent successful crawls" (using previous working HTML snapshots, or by hitting the live site with the *old* selector if it's not entirely broken for other data points). This needs careful design.
    *   Records success/failure rate for each candidate.
    *   Picks the best candidate based on highest success rate.
    *   Schedules `runTrialCrawls` with the chosen candidate.
8.  **`runTrialCrawls` (Convex `internalAction`)**:
    *   Takes `selectorId` and `newCandidate` as arguments.
    *   Runs 10 trial crawls with the `newCandidate` against the live `targetUrl` (via external scraping service).
    *   Calculates success rate.
    *   If 80%+ success:
        *   Updates `selectorRecords` via `internalMutation`: `currentSelector` becomes `newCandidate`, `previousSelectors` updated (rolling off oldest), `status` to active, `failCount` reset.
        *   Schedules `retryFailedCrawl` for the original failed crawl.
    *   If under 50% success:
        *   Rolls back `currentSelector` to the most recent `previousSelector` via `internalMutation`.
        *   Logs severe error, potentially alerts administrator.
    *   If between 50-80%, may require human intervention or further testing. For this instruction, assume 80%+ or <50% decision.
9.  **`retryFailedCrawl` (Convex `internalAction`)**:
    *   Takes `crawlId` and `attemptCount` as arguments.
    *   Re-attempts the failed crawl using the *newly updated* `currentSelector`.
    *   Updates `crawlResults` for this `crawlId`.
    *   If still fails and `attemptCount` < 3, reschedules itself with `attemptCount + 1`.
10. **`releaseLock` (Convex `internalMutation`)**:
    *   Deletes the lock record for a given `metricType`. Called by `runTrialCrawls` or error handling in `initiateSelectorUpdate`.
11. **`storeFile` (Convex `internalMutation`)**:
    *   Receives a `storageId` from `internalAction` after file upload.
    *   Inserts or updates a document linking a `crawlResult` to its `htmlSnapshotId` or `screenshotId`.
12. **`generateUploadUrl` (Convex `mutation`)**:
    *   Generates a short-lived URL for clients to upload files (e.g., initial screenshots for analysis, if a manual trigger is implemented).
13. **`serveFile` (Convex `query`)**:
    *   Retrieves a file URL from Convex storage based on `storageId`.

#### Cron Jobs
*   **`convex/crons.ts`**:
    *   Define a cron job to call `api.internal.startSelectorSentinel` on a regular interval (e.g., every 15 minutes, hourly) to initiate monitoring.

### Frontend Integration
*   **Admin Dashboard**: A Next.js page where administrators can view `selectorRecords` statuses, `crawlResults` history, manually trigger a sentinel run, or review/approve selector updates.
*   **`useQuery` Hooks**: Use `useQuery(api.selectorRecords.list)` to display all selector configurations.
*   **`useMutation` Hooks**: Use `useMutation(api.selectorSentinel.triggerManualRun)` for manual overrides, or `useMutation(api.selectorRecords.updateStatus)` for administrative actions.
*   **`useAction` Hooks**: Potentially `useAction` for complex, non-database operations that might be triggered directly from the UI, but most heavy lifting should be `internalAction`s scheduled by other Convex functions.
*   **Clerk Integration**: Use `useAuth()` hook in Next.js for user session, and `ctx.auth.getUserIdentity()` in Convex functions for backend authorization.

## Code Patterns

### Convex Backend Functions
*   **`convex/selectorSentinel.ts`**: Contains `internalAction`s like `startSelectorSentinel`, `monitorSelector`, `initiateSelectorUpdate`, `findNewSelector`, `testSelectorCandidates`, `runTrialCrawls`, `retryFailedCrawl`.
*   **`convex/selectorRecords.ts`**: Contains `mutation`s for `create`, `update`, `delete` selector records, and `query`s for `list` and `getById`. Also `internalMutation` for lock management (`acquireLock`, `releaseLock`).
*   **`convex/crawlResults.ts`**: Contains `internalMutation` for `insertCrawlResult` and `query` for `listBySelectorId`.
*   **`convex/files.ts`**: Contains `mutation` to `generateUploadUrl` and `internalMutation` to `storeFileRecord`. A `query` to `getFileUrl`.

## Testing & Debugging
*   **Convex Dashboard Logs**: Monitor Convex deployment logs for `action` execution, errors, and scheduled function statuses.
*   **Unit Tests**: Write unit tests for individual Convex `mutation`s and `query`s using the Convex testing utilities.
*   **Integration Tests (Simulated External API)**: For `action` functions that call external APIs, mock the external `fetch` calls during local testing to simulate various responses (success, failure, rate limits).
*   **Local Convex `dev`**: Run `npx convex dev` to test functions locally with hot reloading and a local database.
*   **Scheduled Function State**: In the Convex dashboard, review the "Schedules" tab to see pending, in-progress, failed, or successful scheduled functions and cron job runs.
*   **Rollback Scenarios**: Manually trigger selector failures in a test environment to ensure the rollback mechanism works as expected.

## Environment Variables
*   **`NEXT_PUBLIC_CONVEX_URL`**: Your Convex deployment URL (publicly accessible for frontend API calls).
*   **`CLERK_SECRET_KEY`**: Clerk secret key for backend auth.
*   **`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`**: Clerk publishable key for frontend auth.
*   **`SCRAPING_SERVICE_API_KEY`**: API key for your external web scraping service.
*   **`HTML_ANALYSIS_SERVICE_API_KEY`**: API key for an external AI/HTML analysis service (if used).

## Success Metrics
*   **Automated Selector Updates**: Selector Sentinel successfully identifies HTML changes and updates selectors automatically (verified via Convex logs and `selectorRecords` table).
*   **High Success Rate of Crawls**: New selectors maintain an 80%+ success rate during trial crawls.
*   **Effective Rollbacks**: In case of severe issues, the system successfully rolls back to a previous working selector version.
*   **Distributed Lock Integrity**: Only one selector update process runs per `metricType` at a time (verified by checking lock records).
*   **Reliable Retries**: Failed crawls are automatically retried up to 3 times with updated selectors.
*   **Real-time Monitoring**: The admin dashboard accurately reflects the current status of selectors and recent crawl results.
*   **Secure Authentication**: All sensitive operations are protected by Clerk authentication and Convex's access control.