import { Card, CardBody } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function CommunityCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardBody className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-14 w-14 rounded-[8px]" />
          <div className="flex-1 space-y-2.5">
            <Skeleton className="h-4 w-44 rounded-[6px]" />
            <Skeleton className="h-3 w-28 rounded-[6px]" />
          </div>
          <Skeleton className="h-9 w-24 rounded-[6px]" />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-6 w-full rounded-[6px]" />
          <Skeleton className="h-6 w-full rounded-[6px]" />
          <Skeleton className="h-6 w-full rounded-[6px]" />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-3 w-full rounded-[6px]" />
          <Skeleton className="h-3 w-4/5 rounded-[6px]" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-11 w-40 rounded-[6px]" />
          <Skeleton className="h-10 w-28 rounded-[6px]" />
        </div>
      </CardBody>
    </Card>
  );
}
