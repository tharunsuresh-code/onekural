import { describe, it, expect } from "vitest";
import { getDailyKuralId, getTodayLocal } from "@/lib/kurals";

describe("getDailyKuralId", () => {
  it("returns a number between 1 and 1330 inclusive", () => {
    const id = getDailyKuralId("2025-01-01");
    expect(id).toBeGreaterThanOrEqual(1);
    expect(id).toBeLessThanOrEqual(1330);
  });

  it("is deterministic — same date always returns the same kural", () => {
    const a = getDailyKuralId("2025-06-15");
    const b = getDailyKuralId("2025-06-15");
    expect(a).toBe(b);
  });

  it("returns different kurals for consecutive dates", () => {
    const a = getDailyKuralId("2025-01-01");
    const b = getDailyKuralId("2025-01-02");
    expect(a).not.toBe(b);
  });

  it("cycles — same day 1330 days later maps to same kural", () => {
    const a = getDailyKuralId("2025-01-01");
    // 1330 days after 2025-01-01 = 2028-08-23 (day 1330 from epoch; 1330 % 1330 = 0)
    const b = getDailyKuralId("2028-08-23");
    expect(a).toBe(b);
  });

  it("handles dates before the epoch (negative daysSinceEpoch)", () => {
    const id = getDailyKuralId("2024-12-31");
    expect(id).toBeGreaterThanOrEqual(1);
    expect(id).toBeLessThanOrEqual(1330);
  });
});

describe("getTodayLocal", () => {
  it("returns a YYYY-MM-DD formatted string", () => {
    const today = getTodayLocal();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
