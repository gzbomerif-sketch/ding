import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const http = httpRouter();

// Download endpoint for mirror jobs
http.route({
  path: "/download",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    // Get jobId from query params
    const url = new URL(request.url);
    const jobId = url.searchParams.get("jobId");

    if (!jobId) {
      return new Response("Missing jobId parameter", { status: 400 });
    }

    try {
      // Get the job from database
      const job = await ctx.runQuery(api.siteMirror.getJobById, {
        jobId: jobId as Id<"mirrorJobs">,
      });

      if (!job) {
        return new Response("Job not found", { status: 404 });
      }

      if (job.status !== "completed") {
        return new Response("Job not completed yet", { status: 400 });
      }

      if (!job.downloadUrl) {
        return new Response("Download URL not available", { status: 404 });
      }

      // Get file from storage (downloadUrl is the storage ID)
      const blob = await ctx.storage.get(job.downloadUrl as Id<"_storage">);

      if (!blob) {
        return new Response("File not found in storage", { status: 404 });
      }

      // Return the ZIP file
      return new Response(blob, {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="mirror-${jobId}.zip"`,
        },
      });
    } catch (error) {
      console.error("Download error:", error);
      return new Response(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        { status: 500 }
      );
    }
  }),
});

export default http;
