"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Loader2, Globe, Brain, FileArchive, CheckCircle2, XCircle, Clock } from "lucide-react";

export default function SiteMirrorPage() {
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const jobs = useQuery(api.siteMirror.getUserJobs);
  const createJob = useMutation(api.siteMirror.createMirrorJob);
  const startCrawl = useAction(api.siteMirror.startMirrorCrawl);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setError("");
    setIsSubmitting(true);

    try {
      // Validate URL format
      new URL(url);

      // Create the job
      const jobId = await createJob({ url });

      // Start the crawl process in the background (don't await)
      startCrawl({ jobId }).catch((err) => {
        console.error("Crawl failed:", err);
      });

      // Clear the input
      setUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create mirror job");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "analyzing":
        return <Brain className="h-4 w-4 animate-pulse" />;
      case "planning":
      case "crawling":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "processing":
        return <FileArchive className="h-4 w-4 animate-pulse" />;
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      analyzing: "secondary",
      planning: "secondary",
      crawling: "secondary",
      processing: "secondary",
      completed: "default",
      failed: "destructive",
    };

    return (
      <Badge variant={variants[status] || "secondary"} className="flex items-center gap-1">
        {getStatusIcon(status)}
        <span className="capitalize">{status}</span>
      </Badge>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <Globe className="h-10 w-10" />
          Site Mirror
        </h1>
        <p className="text-muted-foreground text-lg">
          Intelligent website mirroring with AI-powered analysis
        </p>
      </div>

      {/* URL Input Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Create New Mirror</CardTitle>
          <CardDescription>
            Enter a website URL to create an intelligent mirror with AI analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-3">
              <Input
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                className="flex-1"
                disabled={isSubmitting}
              />
              <Button type="submit" disabled={isSubmitting} className="min-w-32">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Brain className="mr-2 h-4 w-4" />
                    Mirror Site
                  </>
                )}
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium">How it works:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>AI analyzes the website structure and content</li>
                <li>Generates an intelligent crawl strategy</li>
                <li>Downloads pages and assets with smart prioritization</li>
                <li>Creates a browsable ZIP archive</li>
              </ul>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Jobs List */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Your Mirror Jobs</h2>

        {jobs === undefined ? (
          <Card>
            <CardContent className="py-8">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading jobs...</span>
              </div>
            </CardContent>
          </Card>
        ) : jobs.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No mirror jobs yet</p>
                <p className="text-sm">Create your first site mirror above</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {jobs.map((job) => (
              <Card key={job._id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{job.url}</CardTitle>
                      <CardDescription className="mt-1">
                        Created {new Date(job.createdAt).toLocaleString()}
                      </CardDescription>
                    </div>
                    {getStatusBadge(job.status)}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Current Phase */}
                  {job.currentPhase && (
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                      {job.currentPhase}
                    </div>
                  )}

                  {/* AI Analysis Results */}
                  {job.analysis && (
                    <div className="p-3 bg-muted rounded-lg space-y-2 text-sm">
                      <div className="font-medium flex items-center gap-2">
                        <Brain className="h-4 w-4" />
                        AI Analysis
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                        <div>Site Type: <span className="text-foreground">{job.analysis.siteType}</span></div>
                        <div>Est. Pages: <span className="text-foreground">{job.analysis.estimatedPages}</span></div>
                        <div>Strategy: <span className="text-foreground capitalize">{job.analysis.crawlStrategy}</span></div>
                        {job.analysis.techStack && job.analysis.techStack.length > 0 && (
                          <div className="col-span-2">
                            Tech: <span className="text-foreground">{job.analysis.techStack.join(", ")}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Statistics */}
                  {job.stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="font-semibold">{job.stats.pagesDownloaded}</div>
                        <div className="text-muted-foreground text-xs">Pages</div>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="font-semibold">{job.stats.totalAssets}</div>
                        <div className="text-muted-foreground text-xs">Assets</div>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="font-semibold">{formatFileSize(job.stats.totalSize)}</div>
                        <div className="text-muted-foreground text-xs">Size</div>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="font-semibold">{formatDuration(job.stats.duration)}</div>
                        <div className="text-muted-foreground text-xs">Duration</div>
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {job.errorMessage && (
                    <Alert variant="destructive">
                      <AlertDescription>{job.errorMessage}</AlertDescription>
                    </Alert>
                  )}

                  {/* Download Button */}
                  {job.status === "completed" && job.downloadUrl && (
                    <Button asChild className="w-full">
                      <a href={job.downloadUrl} download>
                        <Download className="mr-2 h-4 w-4" />
                        Download Mirror (ZIP)
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
