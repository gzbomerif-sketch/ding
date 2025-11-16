"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { useState } from "react";

interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangePickerProps {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
}

export function DateRangePicker({ dateRange, setDateRange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formatDate = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  const formatDisplayDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const setPresetRange = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    setDateRange({ from, to });
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        className="w-full sm:w-[280px] justify-start text-left font-normal"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Calendar className="mr-2 h-4 w-4" />
        <span>
          {formatDisplayDate(dateRange.from)} - {formatDisplayDate(dateRange.to)}
        </span>
      </Button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full sm:w-[320px] rounded-md border bg-popover p-4 shadow-md">
          <div className="space-y-4">
            {/* Preset Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPresetRange(7)}
                className="text-xs"
              >
                Last 7 Days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPresetRange(14)}
                className="text-xs"
              >
                Last 14 Days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPresetRange(30)}
                className="text-xs"
              >
                Last 30 Days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPresetRange(90)}
                className="text-xs"
              >
                Last 90 Days
              </Button>
            </div>

            {/* Custom Date Inputs */}
            <div className="space-y-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">From</label>
                <input
                  type="date"
                  value={formatDate(dateRange.from)}
                  onChange={(e) => {
                    const newFrom = new Date(e.target.value);
                    if (!isNaN(newFrom.getTime())) {
                      setDateRange({ ...dateRange, from: newFrom });
                    }
                  }}
                  className="w-full mt-1 px-3 py-2 text-sm rounded-md border border-input bg-background"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">To</label>
                <input
                  type="date"
                  value={formatDate(dateRange.to)}
                  onChange={(e) => {
                    const newTo = new Date(e.target.value);
                    if (!isNaN(newTo.getTime())) {
                      setDateRange({ ...dateRange, to: newTo });
                    }
                  }}
                  className="w-full mt-1 px-3 py-2 text-sm rounded-md border border-input bg-background"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => setIsOpen(false)}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
