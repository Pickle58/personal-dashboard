import type { NewsArticle } from "@/lib/types";

type GuardianResponse = {
  response: {
    results: Array<{
      id: string;
      webTitle: string;
      webUrl: string;
      webPublicationDate: string;
      fields?: {
        trailText?: string;
      };
    }>;
  };
};

export async function fetchGuardianHeadlines(
  apiKey?: string
): Promise<NewsArticle[]> {
  if (apiKey) {
    try {
      return await fetchGuardianApi(apiKey);
    } catch {
      // Fall through to RSS if the key is invalid/expired
    }
  }

  return fetchGuardianRss();
}

async function fetchGuardianApi(apiKey: string): Promise<NewsArticle[]> {
  const url = new URL("https://content.guardianapis.com/search");
  url.searchParams.set("order-by", "newest");
  url.searchParams.set("page-size", "6");
  url.searchParams.set("show-fields", "trailText,thumbnail");
  url.searchParams.set("api-key", apiKey);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Guardian API failed with status ${res.status}`);
  }

  const data = (await res.json()) as GuardianResponse;

  return data.response.results.map((item) => ({
    id: item.id,
    title: item.webTitle,
    url: item.webUrl,
    publishedAt: item.webPublicationDate,
    trailText: item.fields?.trailText,
  }));
}

/** Keyless fallback using The Guardian world RSS feed */
async function fetchGuardianRss(): Promise<NewsArticle[]> {
  const res = await fetch("https://www.theguardian.com/world/rss", {
    cache: "no-store",
    headers: { "User-Agent": "personal-dashboard/1.0" },
  });

  if (!res.ok) {
    throw new Error(`Guardian RSS failed with status ${res.status}`);
  }

  const xml = await res.text();
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 6);

  return items.map((match, index) => {
    const block = match[1];
    const title = decodeXml(
      block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ??
        block.match(/<title>(.*?)<\/title>/)?.[1] ??
        "Untitled"
    );
    const url =
      block.match(/<link>(.*?)<\/link>/)?.[1]?.trim() ??
      "https://www.theguardian.com";
    const publishedAt =
      block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]?.trim() ??
      new Date().toISOString();
    const trailText = decodeXml(
      block.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] ??
        block.match(/<description>(.*?)<\/description>/)?.[1]
    );

    return {
      id: `rss-${index}-${url}`,
      title,
      url,
      publishedAt: new Date(publishedAt).toISOString(),
      trailText: trailText ? stripHtml(trailText).slice(0, 160) : undefined,
    };
  });
}

function decodeXml(value?: string): string {
  if (!value) return "";
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, "").trim();
}
