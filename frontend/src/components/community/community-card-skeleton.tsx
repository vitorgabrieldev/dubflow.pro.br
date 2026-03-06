import { Card, CardBody } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function CommunityCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardBody className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
          <div className="flex min-w-0 items-center gap-4 sm:flex-1 sm:gap-5">
            <Skeleton className="h-[76px] w-[76px] shrink-0 rounded-full sm:h-[104px] sm:w-[104px]" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-44 rounded-[6px] sm:h-6 sm:w-56" />
              <Skeleton className="h-3.5 w-40 rounded-[6px] sm:h-4 sm:w-52" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-full rounded-[6px]" />
                <Skeleton className="h-3.5 w-5/6 rounded-[6px]" />
              </div>
            </div>
          </div>
          <Skeleton className="h-10 w-full rounded-full sm:w-32 sm:shrink-0" />
        </div>
      </CardBody>
    </Card>
  );
}
