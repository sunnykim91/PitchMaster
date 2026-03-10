import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type PageSkeletonProps = {
  /** Number of skeleton cards to show */
  cards?: number;
  /** Show a header bar skeleton */
  showHeader?: boolean;
  /** Grid layout: "single" | "two-col" | "three-col" */
  layout?: "single" | "two-col" | "three-col";
};

export default function PageSkeleton({
  cards = 3,
  showHeader = true,
  layout = "single",
}: PageSkeletonProps) {
  const gridClass =
    layout === "three-col"
      ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3"
      : layout === "two-col"
      ? "grid gap-4 md:grid-cols-2"
      : "space-y-4";

  return (
    <div className="space-y-4 animate-fade-in">
      {showHeader && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-48" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-24 rounded-md" />
                <Skeleton className="h-8 w-24 rounded-md" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className={gridClass}>
        {Array.from({ length: cards }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
