import { readFileSync } from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import { createOAuth2Client } from "@/lib/gmail/gmail-service";
import { extractPlainTextBody } from "@/lib/gmail/gmail-rsp-service";
import { parseRspEmailBody } from "@/lib/pad/parse-rsp-email";

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
  const messageId = process.argv[2] || "17812b41beb370dc";

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: conn } = await supabase.from("gmail_connections").select("*").limit(1).single();
  if (!conn) throw new Error("No gmail connection");

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: conn.access_token,
    refresh_token: conn.refresh_token ?? undefined,
    expiry_date: conn.token_expiry ? new Date(conn.token_expiry).getTime() : undefined,
  });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  const msgRes = await gmail.users.messages.get({ userId: "me", id: messageId, format: "full" });
  const subject =
    msgRes.data.payload?.headers?.find((h) => h.name?.toLowerCase() === "subject")?.value ?? "";

  const body = extractPlainTextBody(msgRes.data);
  console.log("SUBJECT:", subject);
  console.log("BODY:", body);
  console.log("PARSED:", parseRspEmailBody(body, "330042"));
}

main().catch(console.error);
