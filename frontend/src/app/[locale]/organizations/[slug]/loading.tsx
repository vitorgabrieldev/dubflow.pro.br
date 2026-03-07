import { PostCardSkeleton } from "@/components/feed/post-card-skeleton";
import { Card, CardBody } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrganizationDetailsLoading() {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-3 w-10 rounded-[6px]" />
        <Skeleton className="h-3 w-24 rounded-[6px]" />
        <Skeleton className="h-3 w-32 rounded-[6px]" />
      </div>

      <Card>
        <div className="relative h-32 w-full overflow-hidden sm:h-40 md:h-48">
          <Skeleton className="h-full w-full rounded-none" />
        </div>

        <CardBody className="space-y-4 p-4">
          <div className="-mt-10 flex flex-col gap-3 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 flex-col items-start gap-2">
              <Skeleton className="h-20 w-20 rounded-[10px] border-2 border-white bg-white shadow-lg sm:h-24 sm:w-24" />
              <div className="space-y-2">
                <Skeleton className="h-7 w-56 rounded-[6px] sm:h-8 sm:w-72" />
                <Skeleton className="h-3 w-36 rounded-[6px]" />
              </div>
            </div>

            <div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto">
              <Skeleton className="h-9 w-28 rounded-[8px]" />
              <Skeleton className="h-9 w-28 rounded-[8px]" />
            </div>
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-full rounded-[6px]" />
            <Skeleton className="h-4 w-4/5 rounded-[6px]" />
          </div>

          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-10 w-36 rounded-[8px]" />
            <Skeleton className="h-10 w-36 rounded-[8px]" />
            <Skeleton className="h-10 w-36 rounded-[8px]" />
          </div>

          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-10 w-40 rounded-[8px]" />
            <Skeleton className="h-10 w-32 rounded-[8px]" />
            <Skeleton className="h-10 w-32 rounded-[8px]" />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-5 w-44 rounded-[6px]" />
            <Skeleton className="h-4 w-14 rounded-[6px]" />
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2 rounded-[8px] border border-black/10 bg-white px-3 py-2">
              <Skeleton className="h-4 w-4/5 rounded-[6px]" />
              <Skeleton className="h-3 w-3/5 rounded-[6px]" />
            </div>
            <div className="space-y-2 rounded-[8px] border border-black/10 bg-white px-3 py-2">
              <Skeleton className="h-4 w-3/4 rounded-[6px]" />
              <Skeleton className="h-3 w-2/3 rounded-[6px]" />
            </div>
            <div className="space-y-2 rounded-[8px] border border-black/10 bg-white px-3 py-2">
              <Skeleton className="h-4 w-5/6 rounded-[6px]" />
              <Skeleton className="h-3 w-1/2 rounded-[6px]" />
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3 p-4">
          <Skeleton className="h-5 w-40 rounded-[6px]" />

          <div className="space-y-2">
            <div className="space-y-2 rounded-[10px] border border-black/10 bg-white p-3">
              <Skeleton className="h-4 w-48 rounded-[6px]" />
              <Skeleton className="h-3 w-full rounded-[6px]" />
              <Skeleton className="h-3 w-4/5 rounded-[6px]" />
              <div className="flex flex-wrap gap-2 pt-1">
                <Skeleton className="h-8 w-24 rounded-[8px]" />
                <Skeleton className="h-8 w-24 rounded-[8px]" />
              </div>
            </div>

            <div className="space-y-2 rounded-[10px] border border-black/10 bg-white p-3">
              <Skeleton className="h-4 w-40 rounded-[6px]" />
              <Skeleton className="h-3 w-full rounded-[6px]" />
              <Skeleton className="h-3 w-3/4 rounded-[6px]" />
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3 p-4">
          <Skeleton className="h-5 w-36 rounded-[6px]" />
          <div className="space-y-4">
            <PostCardSkeleton />
            <PostCardSkeleton />
          </div>
        </CardBody>
      </Card>
    </section>
  );
}
