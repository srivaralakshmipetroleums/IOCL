import { describe, expect, it } from "vitest";
import {
  irasDsrProductUiLabels,
  resolveIrasDsrProductUiLabel,
} from "@/lib/iras/dsr/dsr-form-automation";
import { monthYearDisplayValue, monthYearInputValue } from "@/lib/iras/dsr/batch-plan";

describe("irasDsrProductUiLabels", () => {
  it("maps diesel to HS in the IRAS dropdown", () => {
    expect(resolveIrasDsrProductUiLabel("HSD")).toBe("HS");
    expect(resolveIrasDsrProductUiLabel("MS")).toBe("MS");
    expect(irasDsrProductUiLabels("HSD")).toEqual(["HS", "HSD"]);
    expect(irasDsrProductUiLabels("MS")).toEqual(["MS"]);
  });
});

describe("monthYearDisplayValue", () => {
  it("uses full month name and year for the IRAS month picker", () => {
    expect(monthYearDisplayValue(1, 2026)).toBe("January 2026");
    expect(monthYearInputValue(1, 2026)).toBe("2026-01");
  });
});
