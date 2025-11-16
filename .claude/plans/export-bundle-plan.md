# Roadmap: Export Bundle

## Context
- Stack: Next.js, Convex, Clerk
- Feature: Export Bundle (ZIP, WARC, Docker-ready static bundle, local preview)
- Interpretation of "Custom API": This feature will be implemented as a custom server-side process within the SylcRoad application, triggered via a Convex Action, leveraging Node.js capabilities and Next.js static export features. There is no external "Custom API" product for this functionality.
- "Local Mirror": For MVP, refers to the static frontend (HTML, CSS, JS, assets) of the Next.js application. Dynamic data from Convex will either be pre-fetched at build time or the static bundle would connect to a live Convex deployment if dynamic content is required in the preview. The "Docker-ready static bundle" implies a self-contained frontend. WARC generation will focus on archiving the static assets, acknowledging its typical use for live web archiving.

## Implementation Steps

### 1. Manual Setup (User Required)
- [ ] Create Clerk account
- [ ] Configure Clerk application
- [ ] Generate Clerk API keys
- [ ] Configure Clerk webhooks (if needed for advanced auth flows)
- [ ] Create Convex account
- [ ] Configure Convex project
- [ ] Set up Convex environment variables (e.g., `CONVEX_DEPLOYMENT_URL`)
- [ ] Configure Docker environment (local Docker Desktop for testing)

### 2. Dependencies & Environment
- [ ] Install: `archiver` (for ZIP), `node-warc` (for WARC - advanced/optional), `http-server` (for local preview), `@convex-dev/auth` (for Clerk integration with Convex).
- [ ] Env vars:
    - `NEXT_PUBLIC_CONVEX_URL`: Convex deployment URL for client-side queries.
    - `CONVEX_DEPLOYMENT_URL`: Convex deployment URL for server-side Convex actions.
    - `CLERK_SECRET_KEY`: Clerk secret key for server-side operations.
    - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk publishable key for client-side authentication.
    - `CLERK_JWT_ISSUER_DOMAIN`: Clerk JWT issuer domain.

### 3. Database Schema
- [ ] `exportBundles` table:
    - `_id: Id<'exportBundles'>`
    - `userId: Id<'users'>` (Link to Clerk user)
    - `type: 'ZIP' | 'WARC' | 'Docker'`
    - `status: 'pending' | 'generating' | 'completed' | 'failed'`
    - `filePath: string` (S3 URL or path to generated bundle)
    - `createdAt: number`
    - `completedAt: number | undefined`
    - `errorMessage: string | undefined`
    - `previewUrl: string | undefined` (URL for local preview server)

### 4. Backend Functions
- [ ] **`convex/export.ts`**:
    - `createExportBundle: mutation`
        - Purpose: Initiates an export request, creates a record in `exportBundles` with status 'pending'.
        - Input: `type: 'ZIP' | 'WARC' | 'Docker'`
        - Output: `exportBundleId: Id<'exportBundles'>`
    - `processExportBundle: action`
        - Purpose: Orchestrates the export process. Called by `createExportBundle` or a Convex HTTP Action.
        - Steps:
            1.  Update `exportBundles` status to 'generating'.
            2.  Execute Next.js static export (`next build` with `output: 'export'`).
            3.  Based on `type`:
                *   **ZIP:** Use `archiver` to zip the `out` directory.
                *   **WARC (MVP):** Use `node-warc` to create a WARC of the `out` directory's static assets (simplified, not a live crawl).
                *   **Docker:** Generate a `Dockerfile` and associated Nginx config for serving the `out` directory.
            4.  Store the generated bundle (or Dockerfile/instructions) in a persistent storage (e.g., S3).
            5.  Update `exportBundles` status to 'completed' and save `filePath` and `previewUrl` (if applicable).
            6.  Handle errors and update `exportBundles` status to 'failed' with `errorMessage`.
        - Authentication: Require authenticated user (Clerk integration).
    - `getExportBundles: query`
        - Purpose: Fetches a user's export history.
        - Input: `userId: Id<'users'>`
        - Output: List of `exportBundles` records.
    - `getExportBundleDetails: query`
        - Purpose: Fetches details for a specific export bundle.
        - Input: `exportBundleId: Id<'exportBundles'>`
        - Output: Single `exportBundles` record.
    - `serveExportBundle: httpAction` (Optional, for direct download via Convex)
        - Purpose: Serves the generated export bundle file for download. Requires secure access.

### 5. Frontend
- [ ] **`components/ExportButton.tsx`**:
    - Purpose: UI button to trigger an export.
    - State: Displays loading, success, or error states.
    - Interaction: Calls `createExportBundle` mutation on click.
- [ ] **`components/ExportHistory.tsx`**:
    - Purpose: Displays a list of user's past export bundles.
    - State: Fetches data using `getExportBundles` query.
    - Interaction: Provides links to download `filePath` and access `previewUrl` or view `errorMessage`.
- [ ] **`app/export/[id]/page.tsx`**:
    - Purpose: Dedicated page to show detailed status and download links for a specific export bundle.
    - State: Fetches data using `getExportBundleDetails` query.
- [ ] **`next.config.js`**:
    - Configure `output: 'export'` for static HTML export.
    - Ensure dynamic routes are properly handled for static export (e.g., using `generateStaticParams`).

### 6. Error Prevention
- [ ] API errors: Robust try/catch blocks in Convex actions.
- [ ] Validation: Validate input parameters for Convex mutations/actions.
- [ ] Rate limiting: Implement rate limiting on export requests in Convex actions to prevent abuse (e.g., using Convex's built-in capabilities or a custom counter).
- [ ] Auth: Enforce Clerk authentication for all backend export-related operations. Verify `userId` matches the requesting user.
- [ ] Type safety: Use TypeScript for all Convex functions and frontend components.
- [ ] Boundaries:
    - File size limits for generated bundles.
    - Timeouts for export generation processes.
    - Secure storage for generated files (e.g., signed URLs for S3 downloads).
    - Clean up temporary build artifacts.

### 7. Testing
- [ ] **Unit Tests**:
    - Convex mutations/queries: Test `createExportBundle`, `getExportBundles`, `getExportBundleDetails`.
    - Utility functions for ZIP, WARC (simplified), Dockerfile generation.
- [ ] **Integration Tests**:
    - Simulate frontend triggering `createExportBundle`.
    - Test `processExportBundle` action with mock file system operations.
    - Verify generated ZIP, WARC, and Docker artifacts are correctly structured and contain expected content.
    - Test download of bundles via generated links.
- [ ] **End-to-End Tests**:
    - User flow: Login with Clerk, navigate to export feature, initiate export for different types, monitor status, download bundle, launch local preview.
    - Authentication checks: Ensure unauthorized users cannot trigger exports or access others' bundles.
- [ ] **Performance Tests**:
    - Measure time taken for bundle generation (especially for large apps).
    - Test concurrent export requests.
