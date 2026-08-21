import { describe, expect, it } from "vitest";
import {
  formatChartCrores,
  formatCrores,
  formatMoneyKpi,
  fuelSpreadPerLitre,
  roundRatePerLitre,
  truncateToDecimals,
} from "@/lib/dashboard/format";

describe("dashboard money format", () => {
  it("truncates crores display instead of rounding up", () => {
    expect(formatCrores(15_650_236)).toBe("₹1.56 Cr");
    expect(formatCrores(15_650_000)).toBe("₹1.56 Cr");
    expect(formatCrores(15_699_999)).toBe("₹1.56 Cr");
    expect(formatCrores(15_700_000)).toBe("₹1.57 Cr");
  });

  it("includes full INR below crore KPI headline", () => {
    const display = formatMoneyKpi(15_650_236);
    expect(display.primary).toBe("₹1.56 Cr");
    expect(display.fullAmount).toBe("₹1,56,50,236.00");
  });

  it("truncates chart crore labels", () => {
    expect(formatChartCrores(1.5650236)).toBe("₹1.56 Cr");
  });
});

describe("fuel spread rounding", () => {
  it("rounds spread to 2 decimals using standard rules", () => {
    expect(roundRatePerLitre(2.5854)).toBe(2.59);
    expect(roundRatePerLitre(2.5844)).toBe(2.58);
    expect(truncateToDecimals(1.5650236, 2)).toBe(1.56);
  });

  it("computes spread from retail and purchase rates", () => {
    expect(fuelSpreadPerLitre(97.67, 95.08456347826086)).toBe(2.59);
  });

  it("matches margin to rounded spread times litres", () => {
    const spread = fuelSpreadPerLitre(97.67, 95.08456347826086)!;
    expect(spread * 46_000).toBe(119_140);
  });
});
