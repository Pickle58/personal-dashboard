"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Newspaper } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { NewsArticle } from "@/lib/types";

export function NewsWidget() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadNews();
  }, []);

  async function loadNews() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/news");
      const data = (await res.json()) as {
        articles?: NewsArticle[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || "Failed to load news");
      }
      setArticles(data.articles ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load news");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Newspaper className="size-4 text-primary" />
          News
        </CardTitle>
        <CardDescription>Latest headlines from The Guardian</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : articles.length === 0 ? (
          <p className="text-sm text-muted-foreground">No headlines found.</p>
        ) : (
          <ScrollArea className="h-64 pr-3">
            <ul className="space-y-3">
              {articles.map((article, index) => (
                <li key={article.id}>
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block space-y-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground group-hover:text-primary">
                        {article.title}
                      </p>
                      <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-muted-foreground group-hover:text-highlight" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      The Guardian · {formatDate(article.publishedAt)}
                    </p>
                  </a>
                  {index < articles.length - 1 ? (
                    <Separator className="mt-3" />
                  ) : null}
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
