import { describe, it, expect } from "vitest";
import { MAX_KURAL_ID, MAX_CHAPTER, MAX_BOOK } from "@/lib/constants";

describe("domain constants", () => {
  it("MAX_KURAL_ID is 1330", () => expect(MAX_KURAL_ID).toBe(1330));
  it("MAX_CHAPTER is 133", () => expect(MAX_CHAPTER).toBe(133));
  it("MAX_BOOK is 3", () => expect(MAX_BOOK).toBe(3));
});
