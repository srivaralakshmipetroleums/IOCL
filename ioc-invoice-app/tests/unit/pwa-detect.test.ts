import { describe, expect, it } from "vitest";
import {
  canShowInstallPrompt,
  isIosDevice,
  isMobileDevice,
  isStandalonePwa,
} from "@/lib/pwa/detect";

describe("pwa detect", () => {
  it("returns false in non-browser environment", () => {
    expect(isStandalonePwa()).toBe(false);
    expect(isIosDevice()).toBe(false);
    expect(isMobileDevice()).toBe(false);
    expect(canShowInstallPrompt()).toBe(false);
  });
});
