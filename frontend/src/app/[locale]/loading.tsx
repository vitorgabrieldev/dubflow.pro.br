import { PostCardSkeleton } from "@/components/feed/post-card-skeleton";
import { Card, CardBody } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function LocaleLoading() {
  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <PostCardSkeleton />
        <PostCardSkeleton />
        <PostCardSkeleton />
      </div>

      <aside className="space-y-3">
        <Card>
          <CardBody className="space-y-3 p-4">
            <Skeleton className="h-4 w-44 rounded-[6px]" />
            <Skeleton className="h-11 w-full rounded-[6px]" />
            <Skeleton className="h-11 w-full rounded-[6px]" />
            <Skeleton className="h-11 w-full rounded-[6px]" />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-3 p-4">
            <Skeleton className="h-4 w-40 rounded-[6px]" />
            <Skeleton className="h-24 w-full rounded-[6px]" />
          </CardBody>
        </Card>
      </aside>
    </section>
  );
}
