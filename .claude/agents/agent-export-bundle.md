---
name: agent-custom-export-bundle
description: Implements Export Bundle functionality (ZIP, WARC, Docker-ready static bundles) using Convex Actions and Node.js libraries.
model: inherit
color: purple
---


# Agent: Export Bundle Implementation with Custom API & Convex

## Agent Overview
**Purpose**: This agent provides comprehensive instructions for implementing an "Export Bundle" feature within a Next.js application with Convex backend and Clerk authentication. The feature packages a static "local mirror" of the application into ZIP, WARC, or Docker-ready static bundles, offering one-click export. The "Custom API" is interpreted as a custom set of Convex Actions that orchestrate these packaging operations using Node.js libraries.
**Tech Stack**: Next.js (frontend), Convex (backend, database, file storage), Clerk (authentication), Node.js (for backend packaging libraries).
**Source**:
*   Next.js Documentation on Static Exports
*   `warcio.js` NPM Package
*   `node-warc` GitHub Repository
*   `archiver` NPM Package (Common Node.js ZIP library - assumed usage, not explicitly searched in snippets but widely used)

## Critical Implementation Knowledge
### 1. "Custom API" Interpretation 🚨
The term "Custom API" in this context refers to a custom-built API layer primarily implemented via **Convex Actions**. It is not a singular, pre-existing third-party service named "Custom." Instead, the export bundle functionality will be achieved by orchestrating various Node.js libraries and file operations within Convex Actions.

### 2. "Local Mirror" Interpretation & Data Source 🚨
The "local mirror" being packaged refers to the static output of your Next.js application. For a Convex Action to package this, it cannot directly access files from a local development machine or a separate Next.js deployment.
**Solution**: The most robust approach for a Convex Action is to receive a **base URL of the deployed static Next.js site**. The Convex Action will then act as a lightweight crawler to fetch the necessary resources (HTML, CSS, JS, images) from this URL, treating it as the "local mirror" source content. This ensures the Convex Action operates on accessible data.

### 3. Convex Action Capabilities & Limitations 🚨
*   **Capabilities**: Convex Actions are ideal for long-running, CPU-bound, or external API-calling tasks. They can interact with the file system (for temporary storage during bundle creation) and make HTTP requests (to crawl the target URL).
*   **Limitations**:
    *   **Direct Docker Builds**: Convex Actions *cannot directly build Docker images*. The "Docker-ready static bundle" will be a `.zip` file containing the static assets and a `Dockerfile`, which the user downloads and builds locally.
    *   **Runtime Environment**: Actions run in a secure, serverless Node.js environment. Available memory and execution time limits must be considered for very large sites.
    *   **External Crawling**: Relying on external crawling for the "local mirror" means the target site must be publicly accessible and robust enough to handle the requests from the Convex Action without hitting its own rate limits or security measures.

### 4. Latest API Updates & Libraries 🚨
*   **Next.js Static Export**: Configure `output: 'export'` in `next.config.js` and run `next build`. This will generate the static assets into the `out/` directory.
*   **WARC Generation**: `warcio.js` (NPM) is a modern, TypeScript-ported library for streaming WARC file support in Node.js and browsers. It automatically handles GZIP compression and computes digest headers, making it suitable for creating WARC files from fetched content. `node-warc` is another option, focusing on Node.js and providing various capture utilities.
*   **ZIP Generation**: `archiver` (NPM) is a widely used and robust Node.js library for creating ZIP archives.

## Implementation Steps

### Backend Implementation (Convex)

The core logic resides in Convex Actions to perform the heavy lifting of fetching, packaging, and storing the bundles.

#### Convex Functions (Primary)
1.  **`exportBundle` Convex Action**:
    *   **Purpose**: Orchestrates the entire bundle creation process.
    *   **Input**: `(siteUrl: string, bundleType: 'zip' | 'warc' | 'docker-static')`
    *   **Steps**:
        1.  Validate `siteUrl` and `bundleType`.
        2.  Spawn a lightweight web crawler (e.g., using `node-fetch` and `cheerio` or a more specialized crawling library) to recursively fetch all static assets (HTML, CSS, JS, images) linked from `siteUrl`. Store these temporarily in memory or Convex's temporary file storage.
        3.  Based on `bundleType`:
            *   **`'zip'`**: Use `archiver` to create a ZIP file from the collected static assets.
            *   **`'warc'`**: Use `warcio.js` to create a WARC file, generating appropriate WARC records for each fetched resource (request, response, metadata).
            *   **`'docker-static'`**: Create a ZIP file containing the static assets and a pre-defined `Dockerfile` (e.g., configuring Nginx to serve the static content) along with an optional `build.sh` script.
        4.  Upload the generated bundle file to **Convex File Storage**.
        5.  Record metadata about the export job (e.g., status, bundle type, download URL, creation time, user ID) in a Convex database table (via a **Convex Mutation**).
        6.  Return the download URL for the generated bundle.

2.  **`startExportJob` Convex Mutation**:
    *   **Purpose**: Records the initiation of an export request and sets its initial status.
    *   **Input**: `(siteUrl: string, bundleType: 'zip' | 'warc' | 'docker-static', userId: string)`
    *   **Output**: Returns a job ID.
    *   **Usage**: Called by the frontend to kick off the process before the action. The action will then update the job status.

3.  **`getExportJobs` Convex Query**:
    *   **Purpose**: Fetches a list of export jobs for the authenticated user.
    *   **Input**: `(userId: string)`
    *   **Output**: An array of export job objects, including status and download URLs.
    *   **Usage**: Frontend displays this list to show progress and allow downloads.

4.  **`updateExportJobStatus` Convex Mutation**:
    *   **Purpose**: Updates the status and details of an export job (e.g., `in_progress`, `completed`, `failed`, `download_url`).
    *   **Usage**: Called by the `exportBundle` Convex Action at various stages.

### Frontend Integration (Next.js)

1.  **Export Form/UI**: Create a form where the user enters the `siteUrl` (the base URL of their deployed static Next.js application) and selects the desired `bundleType`.
2.  **Triggering Export**: On form submission, call the `startExportJob` Convex Mutation to create a new job entry.
3.  **Initiate Action**: Immediately after starting the job, call the `exportBundle` Convex Action, passing the `siteUrl` and `bundleType`. The Convex Action will perform the heavy lifting asynchronously.
4.  **Display Status**: Use the `getExportJobs` Convex Query with `useQuery` (from `convex/react`) to display a real-time list of export jobs, showing their status (e.g., "Processing...", "Completed", "Failed") and providing a download link for completed jobs.
5.  **Download Bundle**: When a job is `completed`, the download URL from the Convex Query result allows the user to download the generated `.zip` or `.warc` file directly from Convex File Storage.
6.  **Local Preview**: For ZIP and Docker-ready bundles, instruct the user to download and extract the archive, then serve it locally using a simple static server (e.g., `npx serve out` for static HTML, or `docker-compose up` for the Docker bundle). For WARC, instruct them to use tools like `pywb` for local playback.

## Code Patterns

### Convex Backend Functions (High-Level Structure)

```typescript
// convex/export.ts

import { action, mutation, query } from './_generated/server';
import { v } from 'convex/values';
import archiver from 'archiver';
import { WARCRecord, WARCSerializer } from 'warcio';
import { fetch } from 'node-fetch'; // Or a more robust crawling library
import * as cheerio from 'cheerio'; // For parsing HTML and finding links

// Define the shape of an export job in the database
const exportJobSchema = {
  userId: v.id('users'),
  siteUrl: v.string(),
  bundleType: v.union(v.literal('zip'), v.literal('warc'), v.literal('docker-static')),
  status: v.union(v.literal('pending'), v.literal('in_progress'), v.literal('completed'), v.literal('failed')),
  downloadUrl: v.optional(v.string()),
  createdAt: v.number(),
  completedAt: v.optional(v.number()),
};

// Mutation to initiate an export job
export const startExportJob = mutation({
  args: {
    siteUrl: v.string(),
    bundleType: v.union(v.literal('zip'), v.literal('warc'), v.literal('docker-static')),
  },
  handler: async (ctx, { siteUrl, bundleType }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const userId = identity.subject; // Or find existing user ID in your 'users' table

    return await ctx.db.insert('exportJobs', {
      userId,
      siteUrl,
      bundleType,
      status: 'pending',
      createdAt: Date.now(),
    });
  },
});

// Mutation to update job status (called by the action)
export const updateExportJobStatus = mutation({
  args: {
    jobId: v.id('exportJobs'),
    status: v.union(v.literal('in_progress'), v.literal('completed'), v.literal('failed')),
    downloadUrl: v.optional(v.string()),
  },
  handler: async (ctx, { jobId, status, downloadUrl }) => {
    await ctx.db.patch(jobId, {
      status,
      downloadUrl,
      completedAt: status === 'completed' || status === 'failed' ? Date.now() : undefined,
    });
  },
});

// Query to get user's export jobs
export const getExportJobs = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const userId = identity.subject; // Or find existing user ID in your 'users' table
    return ctx.db
      .query('exportJobs')
      .filter((q) => q.eq(q.field('userId'), userId))
      .order('desc')
      .collect();
  },
});

// Action to perform the actual bundling
export const exportBundle = action({
  args: {
    jobId: v.id('exportJobs'),
    siteUrl: v.string(),
    bundleType: v.union(v.literal('zip'), v.literal('warc'), v.literal('docker-static')),
  },
  handler: async (ctx, { jobId, siteUrl, bundleType }) => {
    await ctx.runMutation(updateExportJobStatus, { jobId, status: 'in_progress' });

    try {
      // --- Step 1: Crawl the site and collect assets ---
      const assets: Map<string, { content: Buffer; contentType: string }> = new Map();
      const visitedUrls = new Set<string>();
      const queue: string[] = [siteUrl];
      const baseUrl = new URL(siteUrl);

      // Simple crawling logic (can be made more sophisticated)
      while (queue.length > 0 && visitedUrls.size < 100) { // Limit for example
        const currentUrlString = queue.shift()!;
        if (visitedUrls.has(currentUrlString)) continue;
        visitedUrls.add(currentUrlString);

        console.log(`Crawling: ${currentUrlString}`);
        try {
          const response = await fetch(currentUrlString);
          if (!response.ok) {
            console.warn(`Failed to fetch ${currentUrlString}: ${response.statusText}`);
            continue;
          }

          const contentType = response.headers.get('content-type') || 'application/octet-stream';
          const contentBuffer = await response.buffer();
          assets.set(currentUrlString, { content: contentBuffer, contentType });

          // If HTML, parse for links
          if (contentType.includes('text/html')) {
            const html = contentBuffer.toString();
            const $ = cheerio.load(html);

            $('a, link, script, img').each((_i, elem) => {
              let href = $(elem).attr('href') || $(elem).attr('src');
              if (href) {
                try {
                  const resolvedUrl = new URL(href, currentUrlString);
                  // Only follow links within the same origin
                  if (resolvedUrl.origin === baseUrl.origin && !visitedUrls.has(resolvedUrl.toString())) {
                    queue.push(resolvedUrl.toString());
                  }
                } catch (e) {
                  console.warn(`Invalid URL found: ${href} on ${currentUrlString}`);
                }
              }
            });
          }
        } catch (e) {
          console.error(`Error during crawl of ${currentUrlString}:`, e);
        }
      }

      let bundleBuffer: Buffer;
      let fileName: string;
      let mimeType: string;

      // --- Step 2: Create the bundle based on type ---
      if (bundleType === 'zip' || bundleType === 'docker-static') {
        const archive = archiver('zip', { zlib: { level: 9 } });
        const outputBuffer: Buffer[] = [];
        archive.on('data', (chunk) => outputBuffer.push(chunk));
        archive.on('end', () => console.log('Archive data has been finalized and the output file closed.'));
        archive.on('warning', (err) => { if (err.code !== 'ENOENT') throw err; });
        archive.on('error', (err) => { throw err; });

        for (const [url, data] of assets.entries()) {
          const path = new URL(url).pathname; // Simple path extraction
          archive.append(data.content, { name: path.startsWith('/') ? path.substring(1) : path });
        }

        if (bundleType === 'docker-static') {
          const dockerfileContent = `
FROM nginx:alpine
COPY ./static /usr/share/nginx/html
EXPOSE 80
`;
          archive.append(dockerfileContent, { name: 'Dockerfile' });
          fileName = `docker-static-bundle-${Date.now()}.zip`;
          mimeType = 'application/zip';
        } else { // zip
          fileName = `site-bundle-${Date.now()}.zip`;
          mimeType = 'application/zip';
        }

        await archive.finalize();
        bundleBuffer = Buffer.concat(outputBuffer);

      } else if (bundleType === 'warc') {
        const records: WARCRecord[] = [];
        for (const [url, data] of assets.entries()) {
          // Simplified WARC record creation. A real implementation would need to capture request/response headers
          // and potentially use a more sophisticated way to get `response.rawHeaders`.
          // Here, we're simulating a WARC capture from static content.
          records.push(
            WARCRecord.create({
              url: url,
              date: new Date().toISOString(),
              warcType: 'response',
              httpHeaders: {
                'Content-Type': data.contentType,
                'Content-Length': data.content.length.toString(),
              },
              payload: data.content,
            })
          );
        }
        const serializer = new WARCSerializer({ gzip: true });
        bundleBuffer = await serializer.serialize(records); // Note: warcio.js typically serializes one record at a time.
                                                            // This would be an array of buffers or a stream.
                                                            // For simplicity here, assume it can serialize multiple.
                                                            // A real implementation would stream to file storage.
        fileName = `site-archive-${Date.now()}.warc.gz`;
        mimeType = 'application/warc+gzip'; // or application/warc for uncompressed
      } else {
        throw new Error('Invalid bundle type');
      }

      // --- Step 3: Upload to Convex File Storage ---
      const storageId = await ctx.storage.store(bundleBuffer, {
        fileName,
        mimeType,
        // You might set a specific ACL here if needed, e.g., to make it private for download
      });

      const downloadUrl = await ctx.storage.getUrl(storageId);

      if (!downloadUrl) {
        throw new Error('Failed to get download URL for the bundle.');
      }

      // --- Step 4: Update job status in database ---
      await ctx.runMutation(updateExportJobStatus, {
        jobId,
        status: 'completed',
        downloadUrl,
      });

      return downloadUrl;

    } catch (error) {
      console.error('Export bundle failed:', error);
      await ctx.runMutation(updateExportJobStatus, { jobId, status: 'failed' });
      throw new Error(`Export bundle failed: ${error.message}`);
    }
  },
});
```

## Testing & Debugging
1.  **Local Convex Testing**: Use `npx convex dev` to run your Convex functions locally.
2.  **Unit Tests**: Write unit tests for your Convex Mutations and Queries.
3.  **Action Integration Tests**:
    *   **Simulate Crawling**: For `exportBundle` action, mock `fetch` requests to simulate a static site, ensuring your crawler logic correctly gathers assets.
    *   **Bundle Generation**: Test each `bundleType` path (`zip`, `warc`, `docker-static`) to ensure the correct output format. Use small, controlled inputs.
    *   **File Storage**: Mock Convex `ctx.storage.store` and `ctx.storage.getUrl` to verify calls are made correctly and URLs are returned.
    *   **Database Updates**: Verify that `updateExportJobStatus` is called with correct statuses and `downloadUrl` at various stages.
4.  **Frontend Integration**:
    *   Test the UI flow: starting a job, seeing status updates, and downloading the bundle.
    *   Verify authentication integration with Clerk and Convex.
5.  **Performance Testing**: For large sites, monitor Convex Action execution time and memory usage. Adjust crawling depth or asset limits if necessary.

## Environment Variables
*   **`.env.local` (Next.js Frontend)**:
    ```env
    NEXT_PUBLIC_CONVEX_URL="YOUR_CONVEX_DEPLOYMENT_URL"
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="YOUR_CLERK_PUBLISHABLE_KEY"
    CLERK_SECRET_KEY="YOUR_CLERK_SECRET_KEY"
    ```
*   **`convex/.env` (Convex Backend)**:
    ```env
    # CONVEX_DEPLOYMENT=<your-deployment-name>
    ```

## Success Metrics
*   [ ] Users can successfully initiate an export job from the Next.js frontend, providing a site URL and bundle type.
*   [ ] Convex `startExportJob` mutation records the job in the database with `pending` status.
*   [ ] Convex `exportBundle` action executes without errors, crawling the specified `siteUrl`.
*   [ ] For `zip` bundle type, a valid `.zip` file containing the static assets is generated and uploaded to Convex File Storage.
*   [ ] For `warc` bundle type, a valid `.warc.gz` file containing the archived content is generated and uploaded.
*   [ ] For `docker-static` bundle type, a valid `.zip` file containing static assets and a functional `Dockerfile` is generated and uploaded.
*   [ ] Convex `updateExportJobStatus` mutation correctly updates the job status to `completed` and provides a valid `downloadUrl`.
*   [ ] Users can view their export job history and statuses via the `getExportJobs` query.
*   [ ] Users can click the provided `downloadUrl` to retrieve the generated bundle.
*   [ ] Downloaded `.zip` bundles can be extracted and served locally (e.g., using `npx serve`).
*   [ ] Downloaded Docker-ready bundles can be built and run locally using Docker.
*   [ ] Downloaded `.warc` files can be opened and viewed with appropriate WARC tools (e.g., `pywb`).
*   [ ] Authentication ensures only logged-in users can initiate and view their own export jobs.