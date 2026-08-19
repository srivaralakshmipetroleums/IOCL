import { readFileSync } from "fs";
import path from "path";
import { runWeeklyGmailSync } from "@/lib/gmail/run-weekly-gmail-sync";

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

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  console.log("Starting weekly Gmail sync (invoices + RSP)...");
  const result = await runWeeklyGmailSync();

  console.log(`User: ${result.userId}`);
  console.log(`Range: ${result.dateFrom} → ${result.dateToInclusive}`);
  console.log(
    `Invoices: found ${result.invoices.emailsFound}, completed ${result.invoices.invoicesCompleted}, skipped ${result.invoices.skipped}, failed ${result.invoices.failed}`
  );
  console.log(
    `RSP: found ${result.rsp.emailsFound}, upserted ${result.rsp.pricesUpserted}, skipped ${result.rsp.skipped}, failed ${result.rsp.failed}`
  );

  if (result.invoices.failed > 0 || result.rsp.failed > 0) {
    const errors = [...result.invoices.errors, ...result.rsp.errors];
    if (errors.length > 0) {
      console.error("Errors:");
      errors.forEach((e) => console.error(`  - ${e}`));
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
