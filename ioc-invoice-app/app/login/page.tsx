"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ENABLE_SIGNUP } from "@/lib/auth/auth-config";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();

    if (ENABLE_SIGNUP && isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      setError("Check your email to confirm your account.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="ioc-login-bg pointer-events-none absolute inset-0" aria-hidden="true" />

      <header className="relative z-10 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-center gap-3 sm:gap-5">
          <Image
            src="/branding/Branded-logo.png"
            alt="Sri Varalakshmi Petroleums Narpala"
            width={220}
            height={140}
            className="h-16 w-auto shrink-0 sm:h-20"
            priority
          />
          <div className="min-w-0 border-l-2 border-ioc-orange pl-3 sm:pl-4">
            <p className="font-semibold text-ioc-navy text-sm sm:text-base">
              Sri Varalakshmi Petroleums
            </p>
            <p className="mt-0.5 text-xs text-ioc-muted sm:text-sm">
              IOC Invoice Management &amp; Reporting System
            </p>
          </div>
        </div>
      </header>

      <div className="relative z-10 flex flex-1 items-center justify-center p-6">
        <Card className="ioc-login-card w-full max-w-md border bg-transparent shadow-none">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 h-1 w-14 rounded-full bg-ioc-orange" />
            <CardTitle className="text-ioc-navy">Sign In</CardTitle>
            <CardDescription className="text-ioc-text/80">
              Access your invoice management workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  className="border-white/60 bg-white/85"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  className="border-white/60 bg-white/85"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              {error && (
                <p className={`text-sm ${error.includes("Check your email") ? "text-ioc-blue" : "text-ioc-error"}`}>
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Please wait..." : ENABLE_SIGNUP && isSignUp ? "Sign Up" : "Sign In"}
              </Button>
              {ENABLE_SIGNUP && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setIsSignUp(!isSignUp)}
                >
                  {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
