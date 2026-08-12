import Anthropic from "@anthropic-ai/sdk";
import type { InvoiceExtractor, InvoiceInput, ExtractedInvoice } from "./types";
import { extractedInvoiceSchema } from "@/lib/validation/invoice-schema";

const EXTRACTION_PROMPT = `You are an invoice data extraction system. Extract structured data from this IOC invoice PDF.

Return ONLY valid JSON matching this structure:
{
  "invoice": {
    "invoice_number": "string",
    "invoice_date": "YYYY-MM-DD",
    "supplier_name": "string",
    "supplier_code": "string or null",
    "consignee_name": "string or null",
    "payer_name": "string or null",
    "delivery_number": "string or null",
    "sales_order_number": "string or null",
    "po_reference": "string or null",
    "sap_entry_number": "string or null",
    "transport_number": "string or null",
    "invoice_total": number or null,
    "rounding_difference": number or null
  },
  "line_items": [
    {
      "material_code": "string or null",
      "product": "string",
      "quantity": number,
      "unit": "string (e.g. KL)",
      "rate": number or null,
      "hsn_code": "string or null",
      "invoice_value": number
    }
  ]
}

Extract all line items. Do not perform unit conversions.`;

export class ClaudeInvoiceExtractor implements InvoiceExtractor {
  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY });
  }

  async extract(input: InvoiceInput): Promise<ExtractedInvoice> {
    const base64 = input.pdfBuffer.toString("base64");

    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            },
            { type: "text", text: EXTRACTION_PROMPT },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from Claude");
    }

    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in Claude response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const validated = extractedInvoiceSchema.parse(parsed);

    return { ...validated, raw_response: parsed };
  }
}
