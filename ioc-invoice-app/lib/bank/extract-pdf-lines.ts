import { readFileSync } from "fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export async function extractPdfLines(filePath: string): Promise<string[]> {
  const data = new Uint8Array(readFileSync(filePath));
  const pdf = await getDocument({
    data,
    disableWorker: true,
    isEvalSupported: false,
    verbosity: 0,
  }).promise;

  const lines: string[] = [];
  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex++) {
    const page = await pdf.getPage(pageIndex);
    const content = await page.getTextContent();
    const buckets = new Map<number, Array<{ x: number; str: string }>>();

    for (const item of content.items) {
      if (!("str" in item) || !item.str) continue;
      const y = Math.round((item.transform[5] as number) * 2) / 2;
      const x = item.transform[4] as number;
      const bucket = buckets.get(y) ?? [];
      bucket.push({ x, str: item.str });
      buckets.set(y, bucket);
    }

    const ys = [...buckets.keys()].sort((a, b) => b - a);
    for (const y of ys) {
      const parts = (buckets.get(y) ?? []).sort((a, b) => a.x - b.x);
      const line = parts
        .map((part) => part.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (line) lines.push(line);
    }
  }

  return lines;
}
