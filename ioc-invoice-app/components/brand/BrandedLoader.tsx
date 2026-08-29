import { BrandedLogo } from "@/components/brand/BrandedLogo";

interface BrandedLoaderProps {
  label?: string;
}

export function BrandedLoader({ label }: BrandedLoaderProps) {
  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-4 py-12"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <BrandedLogo size="lg" animated />
      <p className="text-sm text-ioc-muted">{label ? `${label}…` : "Loading…"}</p>
    </div>
  );
}
