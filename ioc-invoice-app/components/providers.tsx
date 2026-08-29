"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { AuthSessionKeeper } from "@/components/auth/AuthSessionKeeper";
import { BrandedSplash } from "@/components/brand/BrandedSplash";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <AuthSessionKeeper />
      <BrandedSplash />
      {children}
    </QueryClientProvider>
  );
}
