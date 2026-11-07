import { describe, expect, it } from "vitest";

import { secretsMatch } from "@/lib/dashboard-auth";

describe("secretsMatch", () => {
  it("matches only an exact non-empty secret", () => {
    expect(secretsMatch("correct-horse", "correct-horse")).toBe(true);
    expect(secretsMatch("correct-horse", "other-secret")).toBe(false);
    expect(secretsMatch("", "correct-horse")).toBe(false);
    expect(secretsMatch("correct-horse", "")).toBe(false);
    expect(secretsMatch("", "")).toBe(false);
  });

  it("accepts secrets of different lengths by comparing digests", () => {
    expect(secretsMatch("short", "a-much-longer-secret")).toBe(false);
  });
});
