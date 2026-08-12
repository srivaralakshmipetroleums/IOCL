"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut } from "lucide-react";

export function SettingsPage() {
  const [email, setEmail] = useState("");
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email || "");
    });
  }, []);

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
