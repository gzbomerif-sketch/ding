"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MetricCards } from "./MetricCards";
import { PerformanceChart } from "./PerformanceChart";
import { DateRangePicker } from "./DateRangePicker";

interface CampaignDashboardProps {
  campaignId: Id<"campaigns">;
}

type DateRange = {
  from: Date;
  to: Date;
};

export function CampaignDashboard({ campaignId }: CampaignDashboardProps) {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    to: new Date(),
  });

  const [platform, setPlatform] = useState<"All" | "TikTok" | "Instagram">("All");
  const [interval, setInterval] = useState<"day" | "week" | "month">("day");

  const campaign = useQuery(api.campaigns.getCampaignById, { campaignId });

  const aggregatedMetrics = useQuery(
    api.metrics.getAggregatedMetrics,
    {
      campaignId,
      startDate: dateRange.from.getTime(),
      endDate: dateRange.to.getTime(),
      platform: platform === "All" ? undefined : platform,
    }
  );

  const metricsOverTime = useQuery(
    api.metrics.getMetricsOverTime,
    {
      campaignId,
      startDate: dateRange.from.getTime(),
      endDate: dateRange.to.getTime(),
      platform: platform === "All" ? undefined : platform,
      interval,
    }
  );

  if (!campaign) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading campaign...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Campaign Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{campaign.name}</CardTitle>
          <CardDescription>
            {campaign.description || "Campaign analytics and performance metrics"}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <DateRangePicker dateRange={dateRange} setDateRange={setDateRange} />

            <Select value={platform} onValueChange={(value: any) => setPlatform(value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Platforms</SelectItem>
                <SelectItem value="TikTok">TikTok</SelectItem>
                <SelectItem value="Instagram">Instagram</SelectItem>
              </SelectContent>
            </Select>

            <Select value={interval} onValueChange={(value: any) => setInterval(value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Interval" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Daily</SelectItem>
                <SelectItem value="week">Weekly</SelectItem>
                <SelectItem value="month">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Metric Cards */}
      {aggregatedMetrics && <MetricCards metrics={aggregatedMetrics} />}

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Over Time</CardTitle>
          <CardDescription>
            Track key metrics across your selected date range
          </CardDescription>
        </CardHeader>
        <CardContent>
          {metricsOverTime && metricsOverTime.length > 0 ? (
            <PerformanceChart data={metricsOverTime} interval={interval} />
          ) : (
            <div className="flex items-center justify-center h-[400px] text-muted-foreground">
              <p>No performance data available for this date range</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Insights */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Platform Breakdown</CardTitle>
            <CardDescription>Performance by platform</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Viewing: {platform === "All" ? "All platforms" : platform}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Campaign Status</CardTitle>
            <CardDescription>Current campaign information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status:</span>
              <span className="font-medium capitalize">{campaign.status}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Budget:</span>
              <span className="font-medium">
                ${campaign.budget.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Start Date:</span>
              <span className="font-medium">
                {new Date(campaign.startDate).toLocaleDateString()}
              </span>
            </div>
            {campaign.endDate && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">End Date:</span>
                <span className="font-medium">
                  {new Date(campaign.endDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
