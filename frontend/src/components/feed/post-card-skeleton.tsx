import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PostCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 rounded-[8px]" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3 rounded-[6px]" />
            <Skeleton className="h-3 w-1/2 rounded-[6px]" />
          </div>
          <Skeleton className="h-6 w-16 rounded-[6px]" />
        </div>
      </CardHeader>

      <Skeleton className="h-[320px] w-full rounded-none sm:h-[400px]" />

      <CardBody className="space-y-3 pt-3">
        <Skeleton className="h-3 w-1/3 rounded-[6px]" />
        <Skeleton className="h-20 w-full rounded-[6px]" />
        <Skeleton className="h-10 w-full rounded-[6px]" />
        <Skeleton className="h-14 w-full rounded-[6px]" />
      </CardBody>
    </Card>
  );
}
