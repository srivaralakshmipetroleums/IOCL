import type { ExtractedLineItem } from "@/lib/validation/invoice-schema";

export interface ConvertedLineItem extends ExtractedLineItem {
  output_quantity: number;
  output_measure: string;
}

export function convertQuantity(quantity: number, unit: string): { output_quantity: number; output_measure: string } {
  const normalizedUnit = unit.trim().toUpperCase();

  if (normalizedUnit === "KL") {
    return { output_quantity: quantity * 1000, output_measure: "Litres" };
  }

  if (normalizedUnit === "L" || normalizedUnit === "LITRE" || normalizedUnit === "LITRES") {
    return { output_quantity: quantity, output_measure: "Litres" };
  }

  return { output_quantity: quantity, output_measure: unit };
}

export function convertLineItems(lineItems: ExtractedLineItem[]): ConvertedLineItem[] {
  return lineItems.map((item) => {
    const converted = convertQuantity(item.quantity, item.unit);
    return { ...item, ...converted };
  });
}
