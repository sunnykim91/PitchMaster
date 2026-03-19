import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-md bg-white/4", className)}
      style={{ animation: "skeleton-pulse 2s ease-in-out infinite" }}
      {...props}
    />
  );
}

export { Skeleton };
