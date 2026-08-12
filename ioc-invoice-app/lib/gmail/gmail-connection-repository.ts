import { createServiceClient } from "@/lib/supabase/server";

export interface GmailConnection {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  token_expiry: string | null;
  gmail_email: string | null;
}

export class GmailConnectionRepository {
  async getByUserId(userId: string): Promise<GmailConnection | null> {
    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from("gmail_connections")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  }

  async upsert(connection: {
    user_id: string;
    access_token: string;
    refresh_token?: string | null;
    token_expiry?: string | null;
    gmail_email?: string | null;
  }): Promise<void> {
    const supabase = await createServiceClient();
    const { error } = await supabase.from("gmail_connections").upsert(
      {
        user_id: connection.user_id,
        access_token: connection.access_token,
        refresh_token: connection.refresh_token ?? null,
        token_expiry: connection.token_expiry ?? null,
        gmail_email: connection.gmail_email ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) throw new Error(error.message);
  }

  async deleteByUserId(userId: string): Promise<void> {
    const supabase = await createServiceClient();
    const { error } = await supabase.from("gmail_connections").delete().eq("user_id", userId);
    if (error) throw new Error(error.message);
  }
}

export const gmailConnectionRepository = new GmailConnectionRepository();
