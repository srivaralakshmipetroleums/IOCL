import { readFileSync } from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { importAllBankStatements } from "@/lib/bank/import-all";

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

  const results = await importAllBankStatements(createClient(url, key));
  for (const row of results) {
    if (row.skipped) {
      console.log(`  SKIP ${row.filename}: ${row.skipped}`);
      continue;
    }
    console.log(
      `  ${row.filename} / ${row.sheet} ${row.fyLabel}: ${row.transactionCount} txns`
    );
  }
  const imported = results.filter((row) => !row.skipped);
  const txns = imported.reduce((sum, row) => sum + row.transactionCount, 0);
  console.log(`Imported ${imported.length} statements (${txns} transactions)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
