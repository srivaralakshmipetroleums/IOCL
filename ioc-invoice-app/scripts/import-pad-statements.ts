import { readFileSync, readdirSync } from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { importPadStatement } from "@/lib/pad/pad-repository";
import { parsePadStatementHtml } from "@/lib/pad/parse-pad-statement";

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

async function main() {
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const padDir = path.resolve(process.cwd(), "..", "Docs", "PAD");
  const files = readdirSync(padDir)
    .filter((name) => /\.xls$/i.test(name))
    .sort();

  if (!files.length) {
    console.error(`No PAD files found in ${padDir}`);
    process.exit(1);
  }

  const supabase = createClient(url, key);

  for (const filename of files) {
    const filePath = path.join(padDir, filename);
    const html = readFileSync(filePath, "utf8");
    const parsed = parsePadStatementHtml(html, filename);

    const result = await importPadStatement(supabase, parsed, filename);
    console.log(
      `${parsed.fyLabel} (${parsed.periodFrom} → ${parsed.periodTo}): ` +
        `${result.transactionCount} transactions imported`
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
