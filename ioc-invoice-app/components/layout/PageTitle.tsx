import { cn } from "@/lib/utils";

export function PageTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-1", className)}>
      <h1 className="ioc-page-title">{children}</h1>
      <div className="ioc-page-title-accent" />
    </div>
  );
}
