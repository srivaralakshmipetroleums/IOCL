import { cn } from "@/lib/utils";

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning"
  | "processing"
  | "duplicate";

function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: BadgeVariant }) {
  const variants: Record<BadgeVariant, string> = {
    default: "bg-ioc-processing-light text-ioc-blue",
    secondary: "bg-ioc-section text-ioc-muted",
    destructive: "bg-ioc-error-light text-ioc-error",
    outline: "border border-ioc-border text-ioc-muted",
    success: "bg-ioc-success-light text-ioc-success",
    warning: "bg-ioc-warning-light text-ioc-warning",
    processing: "bg-ioc-processing-light text-ioc-blue",
    duplicate: "bg-ioc-warning-light text-[#C77700]",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
