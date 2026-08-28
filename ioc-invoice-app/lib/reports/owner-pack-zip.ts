import JSZip from "jszip";
import type { OwnerPackDataset } from "@/lib/reports/load-owner-pack";
import { generateOwnerPackExcel } from "@/lib/reports/owner-pack-excel";
import { generateOwnerPackPdf } from "@/lib/reports/owner-pack-pdf";

function safeLabel(label: string): string {
  return label.replace(/[^\w\s-]/g, "").trim() || "Owner_Pack";
}

export async function generateOwnerPackZip(data: OwnerPackDataset) {
  const [excel, pdf] = await Promise.all([
    generateOwnerPackExcel(data),
    generateOwnerPackPdf(data),
  ]);

  const zip = new JSZip();
  zip.file(excel.filename, excel.buffer);
  zip.file(pdf.filename, pdf.buffer);

  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  const slug = safeLabel(data.period.label).replace(/\s+/g, "_");

  return {
    buffer,
    filename: `Owner_Pack_${slug}.zip`,
  };
}
