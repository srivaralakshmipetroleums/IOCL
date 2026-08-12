"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, Sparkles, RefreshCw } from "lucide-react";

const EXTRACTION_MODE_KEY = "ioc-extraction-mode";

interface ExtractionConfig {
  claudeConfigured: boolean;
  defaultMode: "claude" | "local";
  providerLabel: string;
  serviceRoleConfigured: boolean;
}

export function SettingsPage() {
  const [email, setEmail] = useState("");
  const [useAiExtraction, setUseAiExtraction] = useState(true);
  const router = useRouter();

  const { data: extractionConfig, refetch } = useQuery<ExtractionConfig>({
    queryKey: ["extraction-config"],
    queryFn: () => fetch("/api/settings/extraction").then((r) => r.json()),
  });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email || "");
    });

    const saved = localStorage.getItem(EXTRACTION_MODE_KEY);
    if (saved === "claude" || saved === "local") {
      setUseAiExtraction(saved === "claude");
    }
  }, []);

  function handleExtractionToggle(checked: boolean) {
    setUseAiExtraction(checked);
    localStorage.setItem(EXTRACTION_MODE_KEY, checked ? "claude" : "local");
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Account and application settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Extraction
          </CardTitle>
          <CardDescription>Configure automatic PDF data extraction</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Claude API</span>
              {extractionConfig?.claudeConfigured ? (
                <Badge variant="success">Configured</Badge>
              ) : (
                <Badge variant="warning">Not detected</Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Supabase Service Role</span>
              {extractionConfig?.serviceRoleConfigured ? (
                <Badge variant="success">Configured</Badge>
              ) : (
                <Badge variant="warning">Not detected</Badge>
              )}
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={useAiExtraction}
              onChange={(e) => handleExtractionToggle(e.target.checked)}
              disabled={!extractionConfig?.claudeConfigured}
              className="h-4 w-4 rounded"
            />
            <span className="text-sm font-medium">Default to Claude AI extraction on upload</span>
          </label>

          {!extractionConfig?.claudeConfigured && (
            <p className="text-sm text-muted-foreground">
              Add <code className="rounded bg-muted px-1">ANTHROPIC_API_KEY</code> to{" "}
              <code className="rounded bg-muted px-1">.env.local</code> and restart the dev server.
            </p>
          )}

          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh status
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Account</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{email || "—"}</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>About</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            IOC Invoice Management & Reporting System v1.0
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
