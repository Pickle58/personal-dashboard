import { describe, expect, it } from "vitest";

import { validateLocation } from "@/lib/location";

describe("validateLocation", () => {
  it("accepts in-range coordinates and an optional label", () => {
    expect(validateLocation({ lat: 47.6, lon: -122.3, label: "Seattle" })).toEqual(
      {
        lat: 47.6,
        lon: -122.3,
        label: "Seattle",
      }
    );
    expect(validateLocation({ lat: 0, lon: 0 })).toEqual({ lat: 0, lon: 0 });
  });

  it("rejects out-of-range, non-finite, and over-long labels", () => {
    expect(validateLocation({ lat: 91, lon: 0 })).toBeNull();
    expect(validateLocation({ lat: 0, lon: 181 })).toBeNull();
    expect(validateLocation({ lat: Number.NaN, lon: 0 })).toBeNull();
    expect(validateLocation({ lat: 1, lon: 2, label: "x".repeat(201) })).toBeNull();
  });
});
