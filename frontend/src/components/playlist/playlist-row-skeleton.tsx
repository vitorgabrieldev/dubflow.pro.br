import { Card, CardBody } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PlaylistRowSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardBody className="p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-24 w-32 rounded-[6px]" />
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-4 w-2/3 rounded-[6px]" />
              <Skeleton className="h-8 w-28 rounded-[6px]" />
            </div>
            <Skeleton className="h-3 w-1/2 rounded-[6px]" />
            <Skeleton className="h-7 w-full rounded-[6px]" />

            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-6 w-full rounded-[6px]" />
              <Skeleton className="h-6 w-full rounded-[6px]" />
              <Skeleton className="h-6 w-full rounded-[6px]" />
            </div>

            <Skeleton className="h-10 w-52 rounded-[6px]" />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
