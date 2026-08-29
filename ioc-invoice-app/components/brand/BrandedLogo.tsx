import Image from "next/image";
import { cn } from "@/lib/utils";

const SIZE_CLASS = {
  sm: "h-12",
  md: "h-20",
  lg: "h-28",
  xl: "h-36",
} as const;

interface BrandedLogoProps {
  size?: keyof typeof SIZE_CLASS;
  animated?: boolean;
  className?: string;
  priority?: boolean;
}

export function BrandedLogo({
  size = "md",
  animated = false,
  className,
  priority = false,
}: BrandedLogoProps) {
  return (
    <Image
      src="/branding/Branded-logo.png"
      alt="Sri Varalakshmi Petroleums"
      width={220}
      height={140}
      priority={priority}
      className={cn("w-auto", SIZE_CLASS[size], animated && "ioc-brand-pulse", className)}
    />
  );
}
