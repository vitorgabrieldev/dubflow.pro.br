import { CommunityCardSkeleton } from "@/components/community/community-card-skeleton";
import { Card, CardBody } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function CommunitiesLoading() {
  return (
    <section className="space-y-4">
      <Card>
        <CardBody className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-10 min-w-[220px] flex-1 rounded-[8px]" />
            <Skeleton className="h-10 w-40 rounded-[8px]" />
            <Skeleton className="h-10 w-24 rounded-[8px]" />
          </div>
        </CardBody>
      </Card>

      <div className="space-y-3">
        <CommunityCardSkeleton />
        <CommunityCardSkeleton />
        <CommunityCardSkeleton />
      </div>
    </section>
  );
}
