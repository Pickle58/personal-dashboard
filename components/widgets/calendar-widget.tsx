"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function CalendarWidget() {
  const [month, setMonth] = useState<Date | undefined>(undefined);

  useEffect(() => {
    setMonth(new Date());
  }, []);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="size-4 text-primary" />
          Calendar
        </CardTitle>
        <CardDescription>Current month with today highlighted</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        {month ? (
          <Calendar
            mode="single"
            month={month}
            onMonthChange={setMonth}
            selected={undefined}
            className="rounded-lg border border-border p-2"
            classNames={{
              today:
                "bg-highlight text-highlight-foreground rounded-md data-[selected=true]:rounded-md",
            }}
          />
        ) : (
          <Skeleton className="h-[280px] w-[280px] rounded-lg" />
        )}
      </CardContent>
    </Card>
  );
}
