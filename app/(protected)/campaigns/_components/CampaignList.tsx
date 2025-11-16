"use client";

import { Doc, Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BarChart, Calendar, DollarSign } from "lucide-react";

interface CampaignListProps {
  campaigns: Doc<"campaigns">[];
  onSelectCampaign: (campaignId: Id<"campaigns">) => void;
  selectedCampaignId: Id<"campaigns"> | null;
}

export function CampaignList({ campaigns, onSelectCampaign, selectedCampaignId }: CampaignListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/10 text-green-500 hover:bg-green-500/20";
      case "draft":
        return "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20";
      case "paused":
        return "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20";
      case "completed":
        return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20";
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-2">
      {campaigns.map((campaign) => (
        <button
          key={campaign._id}
          onClick={() => onSelectCampaign(campaign._id)}
          className={cn(
            "w-full text-left p-4 rounded-lg border transition-colors",
            selectedCampaignId === campaign._id
              ? "border-primary bg-primary/5"
              : "border-border hover:bg-accent"
          )}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-base truncate">{campaign.name}</h3>
                <Badge className={getStatusColor(campaign.status)}>{campaign.status}</Badge>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5" />
                  <span>{formatCurrency(campaign.budget)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{formatDate(campaign.startDate)}</span>
                  {campaign.endDate && <span>- {formatDate(campaign.endDate)}</span>}
                </div>
              </div>

              {campaign.description && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-1">{campaign.description}</p>
              )}
            </div>

            <Button variant="ghost" size="icon" className="ml-2">
              <BarChart className="h-4 w-4" />
            </Button>
          </div>
        </button>
      ))}
    </div>
  );
}
