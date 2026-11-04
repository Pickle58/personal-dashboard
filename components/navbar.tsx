"use client";

import { useEffect, useState } from "react";

export function Navbar() {
  const [today, setToday] = useState("");

  useEffect(() => {
    setToday(
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    );
  }, []);

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="inline-block size-[0.78125rem] rounded-full bg-highlight" />
          <h1 className="text-[1.40625rem] font-semibold tracking-tight text-foreground">
            James <span className="text-primary">Dashboard</span>
          </h1>
        </div>
        <p className="min-h-[1.5625rem] text-[1.09375rem] text-muted-foreground">
          {today}
        </p>
      </div>
    </header>
  );
}
