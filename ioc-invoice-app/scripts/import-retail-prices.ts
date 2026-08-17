import { readFileSync, readdirSync } from "fs";
import path from "path";
import ExcelJS from "exceljs";
import { createClient } from "@supabase/supabase-js";
import { parseRspFileRows, type RspFileRow } from "@/lib/pad/parse-rsp-file";
import { upsertRetailPrices } from "@/lib/pad/retail-price-repository";

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

async function readRspWorkbook(filePath: string): Promise<RspFileRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const rows: RspFileRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    rows.push({
      product: String(row.getCell(1).value ?? ""),
      partNum: row.getCell(2).value as string | number | null,
      price: row.getCell(3).value,
      effectiveFrom: row.getCell(5).value,
    });
  });
  return rows;
}

async function main() {
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const rspDir = path.resolve(process.cwd(), "..", "Docs", "RSP");
  const files = readdirSync(rspDir)
    .filter((name) => /\.xlsx$/i.test(name) && !name.startsWith("~$"))
    .sort();

  if (!files.length) {
    console.error(`No RSP xlsx files found in ${rspDir}`);
    process.exit(1);
  }

  const supabase = createClient(url, key);
  let total = 0;

  for (const filename of files) {
    const filePath = path.join(rspDir, filename);
    const rawRows = await readRspWorkbook(filePath);
    const rows = parseRspFileRows(rawRows, filename);

    if (!rows.length) {
      console.error(`${filename}: no MS/HSD rows parsed`);
      continue;
    }

    const count = await upsertRetailPrices(supabase, rows);
    total += count;
    const from = rows[0].effective_from;
    const to = rows[rows.length - 1].effective_from;
    const ms = rows.filter((r) => r.product === "MS").length;
    const hsd = rows.filter((r) => r.product === "HSD").length;
    console.log(`${filename}: ${count} rows (${ms} MS, ${hsd} HSD) ${from} → ${to}`);
  }

  console.log(`Imported ${total} retail price rows from ${files.length} RSP files`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
