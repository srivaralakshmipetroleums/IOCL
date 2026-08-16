import { describe, it, expect } from "vitest";
import { pricePerLitre } from "@/lib/dashboard/analytics/compute-analytics";

describe("analytics compute", () => {
  it("calculates weighted price per litre", () => {
    expect(pricePerLitre(1024074.15, 9000)).toBeCloseTo(113.786, 2);
    expect(pricePerLitre(0, 9000)).toBe(0);
    expect(pricePerLitre(100, 0)).toBeNull();
  });
});
