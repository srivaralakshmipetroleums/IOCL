"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface IndianOilLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { box: "h-8 w-8", text: "text-[10px]" },
  md: { box: "h-10 w-10", text: "text-xs" },
  lg: { box: "h-12 w-12", text: "text-sm" },
};

/**
 * Loads official logo from /branding/indianoil-logo.png when available.
 * Falls back to a neutral branded mark — replace with approved asset.
 */
export function IndianOilLogo({ className, size = "md" }: IndianOilLogoProps) {
  const [imgError, setImgError] = useState(false);
  const s = sizes[size];

  if (!imgError) {
    return (
      <div className={cn("relative shrink-0", s.box, className)}>
        <Image
          src="/branding/indianoil-logo.png"
          alt="IndianOil"
          fill
          className="object-contain"
          onError={() => setImgError(true)}
          priority
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-ioc-orange font-bold text-white",
        s.box,
        s.text,
        className
      )}
      aria-label="IndianOil"
    >
      IOCL
    </div>
  );
}
