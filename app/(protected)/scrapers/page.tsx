"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Instagram as InstagramIcon,
  Video as TikTokIcon,
  User,
  Users,
  Heart,
  MessageCircle,
  Eye,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ScrapersPage() {
  const [username, setUsername] = useState("");
  const [platform, setPlatform] = useState<"Instagram" | "TikTok">("Instagram");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Queries and mutations
  const allJobs = useQuery(api.scraperJobs.getAllJobs);
  const createJob = useMutation(api.scraperJobs.createScrapeJob);
  const triggerScrape = useAction(api.scraperJobs.triggerScrape);
  const deleteJob = useMutation(api.scraperJobs.deleteJob);

  const handleScrape = async () => {
    if (!username.trim()) {
      setError("Please enter a username");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      // Create job
      const jobId = await createJob({
        platform,
        username: username.trim(),
        jobType: "profile",
      });

      // Trigger scrape (async, don't await)
      triggerScrape({ jobId }).catch((err) => {
        console.error("Scrape failed:", err);
      });

      // Clear input
      setUsername("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create scrape job");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (jobId: string) => {
    if (!confirm("Delete this job?")) return;
    try {
      await deleteJob({ jobId: jobId as any });
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin" />;
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
      running: "secondary",
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

  const getPlatformIcon = (platform: string) => {
    return platform === "Instagram" ? (
      <InstagramIcon className="h-5 w-5" />
    ) : (
      <TikTokIcon className="h-5 w-5" />
    );
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Filter jobs
  const pendingJobs = allJobs?.filter((j) => j.status === "pending") || [];
  const runningJobs = allJobs?.filter((j) => j.status === "running") || [];
  const completedJobs = allJobs?.filter((j) => j.status === "completed") || [];
  const failedJobs = allJobs?.filter((j) => j.status === "failed") || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Extraction</h1>
          <p className="text-muted-foreground">
            Scrape Instagram and TikTok profiles to gather campaign data
          </p>
        </div>
      </div>

      {/* Scrape Form */}
      <Card>
        <CardHeader>
          <CardTitle>Scrape Profile</CardTitle>
          <CardDescription>
            Extract data from Instagram or TikTok profiles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Select
              value={platform}
              onValueChange={(val) => setPlatform(val as "Instagram" | "TikTok")}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Instagram">
                  <div className="flex items-center gap-2">
                    <InstagramIcon className="h-4 w-4" />
                    Instagram
                  </div>
                </SelectItem>
                <SelectItem value="TikTok">
                  <div className="flex items-center gap-2">
                    <TikTokIcon className="h-4 w-4" />
                    TikTok
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Username (without @)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleScrape()}
              disabled={isSubmitting}
              className="flex-1"
            />

            <Button onClick={handleScrape} disabled={isSubmitting || !username.trim()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Scrape Profile"
              )}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingJobs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Running</CardTitle>
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{runningJobs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedJobs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{failedJobs.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Jobs List */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All ({allJobs?.length || 0})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedJobs.length})</TabsTrigger>
          <TabsTrigger value="running">Running ({runningJobs.length})</TabsTrigger>
          <TabsTrigger value="failed">Failed ({failedJobs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {allJobs && allJobs.length > 0 ? (
            allJobs.map((job) => (
              <Card key={job._id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      {getPlatformIcon(job.platform)}
                      <div>
                        <CardTitle className="text-lg">{job.targetUrl}</CardTitle>
                        <CardDescription>{formatDate(job.createdAt)}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(job.status)}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(job._id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {job.results && job.status === "completed" && (
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {job.results.followers !== undefined && (
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Followers</p>
                            <p className="text-lg font-bold">
                              {formatNumber(job.results.followers)}
                            </p>
                          </div>
                        </div>
                      )}

                      {job.results.following !== undefined && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Following</p>
                            <p className="text-lg font-bold">
                              {formatNumber(job.results.following)}
                            </p>
                          </div>
                        </div>
                      )}

                      {job.results.posts !== undefined && (
                        <div className="flex items-center gap-2">
                          <MessageCircle className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Posts</p>
                            <p className="text-lg font-bold">
                              {formatNumber(job.results.posts)}
                            </p>
                          </div>
                        </div>
                      )}

                      {job.results.likes !== undefined && (
                        <div className="flex items-center gap-2">
                          <Heart className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Likes</p>
                            <p className="text-lg font-bold">
                              {formatNumber(job.results.likes)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {job.results.bio && (
                      <div className="mt-4 p-3 bg-muted rounded-md">
                        <p className="text-sm text-muted-foreground">Bio:</p>
                        <p className="text-sm">{job.results.bio}</p>
                      </div>
                    )}
                  </CardContent>
                )}

                {job.errorMessage && job.status === "failed" && (
                  <CardContent>
                    <Alert variant="destructive">
                      <AlertDescription>{job.errorMessage}</AlertDescription>
                    </Alert>
                  </CardContent>
                )}
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No scrape jobs yet. Create one above to get started!
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedJobs.length > 0 ? (
            completedJobs.map((job) => (
              <Card key={job._id}>
                {/* Same content as "all" tab */}
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      {getPlatformIcon(job.platform)}
                      <div>
                        <CardTitle className="text-lg">{job.targetUrl}</CardTitle>
                        <CardDescription>{formatDate(job.createdAt)}</CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(job.status)}
                  </div>
                </CardHeader>
                {job.results && (
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {job.results.followers !== undefined && (
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Followers</p>
                            <p className="text-lg font-bold">
                              {formatNumber(job.results.followers)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">No completed jobs yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="running" className="space-y-4">
          {runningJobs.length > 0 ? (
            runningJobs.map((job) => (
              <Card key={job._id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      {getPlatformIcon(job.platform)}
                      <div>
                        <CardTitle className="text-lg">{job.targetUrl}</CardTitle>
                        <CardDescription>Scraping in progress...</CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(job.status)}
                  </div>
                </CardHeader>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">No running jobs</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="failed" className="space-y-4">
          {failedJobs.length > 0 ? (
            failedJobs.map((job) => (
              <Card key={job._id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      {getPlatformIcon(job.platform)}
                      <div>
                        <CardTitle className="text-lg">{job.targetUrl}</CardTitle>
                        <CardDescription>{formatDate(job.createdAt)}</CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(job.status)}
                  </div>
                </CardHeader>
                {job.errorMessage && (
                  <CardContent>
                    <Alert variant="destructive">
                      <AlertDescription>{job.errorMessage}</AlertDescription>
                    </Alert>
                  </CardContent>
                )}
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">No failed jobs</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
