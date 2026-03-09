import { describe, it, expect } from "vitest";
import {
  isValidKuralId,
  isValidChapter,
  isValidBook,
  isValidPushSubscription,
} from "@/lib/validate";

describe("isValidKuralId", () => {
  it("accepts 1", () => expect(isValidKuralId(1)).toBe(true));
  it("accepts 1330", () => expect(isValidKuralId(1330)).toBe(true));
  it("rejects 0", () => expect(isValidKuralId(0)).toBe(false));
  it("rejects 1331", () => expect(isValidKuralId(1331)).toBe(false));
  it("rejects NaN", () => expect(isValidKuralId(NaN)).toBe(false));
  it("rejects floats", () => expect(isValidKuralId(1.5)).toBe(false));
});

describe("isValidChapter", () => {
  it("accepts 1", () => expect(isValidChapter(1)).toBe(true));
  it("accepts 133", () => expect(isValidChapter(133)).toBe(true));
  it("rejects 0", () => expect(isValidChapter(0)).toBe(false));
  it("rejects 134", () => expect(isValidChapter(134)).toBe(false));
});

describe("isValidBook", () => {
  it("accepts 1, 2, 3", () => {
    expect(isValidBook(1)).toBe(true);
    expect(isValidBook(2)).toBe(true);
    expect(isValidBook(3)).toBe(true);
  });
  it("rejects 0 and 4", () => {
    expect(isValidBook(0)).toBe(false);
    expect(isValidBook(4)).toBe(false);
  });
});

describe("isValidPushSubscription", () => {
  const validSub = {
    endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
    keys: { p256dh: "BNcRd...", auth: "tBHI..." },
  };

  it("accepts a valid subscription", () => {
    expect(isValidPushSubscription(validSub)).toBe(true);
  });
  it("rejects null", () => expect(isValidPushSubscription(null)).toBe(false));
  it("rejects missing endpoint", () => {
    expect(isValidPushSubscription({ keys: validSub.keys })).toBe(false);
  });
  it("rejects http endpoint (not https)", () => {
    expect(
      isValidPushSubscription({ ...validSub, endpoint: "http://example.com" })
    ).toBe(false);
  });
  it("rejects missing keys", () => {
    expect(isValidPushSubscription({ endpoint: validSub.endpoint })).toBe(false);
  });
});
