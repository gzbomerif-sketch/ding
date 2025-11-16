"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface PerformanceChartProps {
  data: Array<{
    timestamp: number;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    engagementRate: number;
    cpm: number;
    livePosts: number;
    totalPosts: number;
  }>;
  interval: "day" | "week" | "month";
}

export function PerformanceChart({ data, interval }: PerformanceChartProps) {
  const [selectedMetrics, setSelectedMetrics] = useState({
    views: true,
    likes: true,
    comments: false,
    shares: false,
    engagementRate: true,
  });

  const formatXAxis = (timestamp: number) => {
    const date = new Date(timestamp);
    switch (interval) {
      case "day":
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      case "week":
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      case "month":
        return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      default:
        return date.toLocaleDateString();
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toFixed(0);
  };

  const toggleMetric = (metric: keyof typeof selectedMetrics) => {
    setSelectedMetrics((prev) => ({
      ...prev,
      [metric]: !prev[metric],
    }));
  };

  const chartData = data.map((item) => ({
    timestamp: item.timestamp,
    date: formatXAxis(item.timestamp),
    views: item.views,
    likes: item.likes,
    comments: item.comments,
    shares: item.shares,
    engagementRate: item.engagementRate,
  }));

  return (
    <div className="space-y-4">
      {/* Metric Toggles */}
      <div className="flex flex-wrap gap-4 p-4 border rounded-lg bg-muted/50">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="views"
            checked={selectedMetrics.views}
            onCheckedChange={() => toggleMetric("views")}
          />
          <Label htmlFor="views" className="cursor-pointer flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            Views
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="likes"
            checked={selectedMetrics.likes}
            onCheckedChange={() => toggleMetric("likes")}
          />
          <Label htmlFor="likes" className="cursor-pointer flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            Likes
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="comments"
            checked={selectedMetrics.comments}
            onCheckedChange={() => toggleMetric("comments")}
          />
          <Label htmlFor="comments" className="cursor-pointer flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            Comments
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="shares"
            checked={selectedMetrics.shares}
            onCheckedChange={() => toggleMetric("shares")}
          />
          <Label htmlFor="shares" className="cursor-pointer flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            Shares
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="engagementRate"
            checked={selectedMetrics.engagementRate}
            onCheckedChange={() => toggleMetric("engagementRate")}
          />
          <Label htmlFor="engagementRate" className="cursor-pointer flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-pink-500" />
            Engagement Rate
          </Label>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            className="text-xs"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            yAxisId="left"
            className="text-xs"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={formatNumber}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            className="text-xs"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(value) => value.toFixed(1) + "%"}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
            formatter={(value: any, name: string) => {
              if (name === "engagementRate") {
                return [value.toFixed(2) + "%", "Engagement Rate"];
              }
              return [formatNumber(value), name.charAt(0).toUpperCase() + name.slice(1)];
            }}
          />
          <Legend />

          {selectedMetrics.views && (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="views"
              stroke="rgb(59, 130, 246)"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              name="Views"
            />
          )}

          {selectedMetrics.likes && (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="likes"
              stroke="rgb(34, 197, 94)"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              name="Likes"
            />
          )}

          {selectedMetrics.comments && (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="comments"
              stroke="rgb(249, 115, 22)"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              name="Comments"
            />
          )}

          {selectedMetrics.shares && (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="shares"
              stroke="rgb(168, 85, 247)"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              name="Shares"
            />
          )}

          {selectedMetrics.engagementRate && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="engagementRate"
              stroke="rgb(236, 72, 153)"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              name="Engagement Rate"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
