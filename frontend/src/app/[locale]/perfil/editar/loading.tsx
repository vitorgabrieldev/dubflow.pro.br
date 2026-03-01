import { Card, CardBody } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditProfileLoading() {
  return (
    <section className="mx-auto max-w-4xl space-y-4">
      <Card>
        <CardBody className="space-y-4 p-4">
          <Skeleton className="h-6 w-40" />

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldSkeleton />
              <FieldSkeleton />
              <FieldSkeleton />
              <FieldSkeleton />
            </div>

            <div className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-28 w-full" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <TagFieldSkeleton />
              <TagFieldSkeleton />
            </div>

            <div className="space-y-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-28 w-full" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <TagFieldSkeleton />
              <TagFieldSkeleton />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <ImageFieldSkeleton square />
              <ImageFieldSkeleton />
            </div>

            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-[4px]" />
              <Skeleton className="h-4 w-36" />
            </div>

            <Skeleton className="h-11 w-full rounded-[8px]" />
          </div>
        </CardBody>
      </Card>
    </section>
  );
}

function FieldSkeleton() {
  return (
    <div className="space-y-1">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full rounded-[8px]" />
    </div>
  );
}

function TagFieldSkeleton() {
  return (
    <div className="space-y-1">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-12 w-full rounded-[8px]" />
    </div>
  );
}

function ImageFieldSkeleton({ square = false }: { square?: boolean }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className={`rounded-[8px] ${square ? "h-28 w-28" : "h-28 w-full"}`} />
      <Skeleton className="h-10 w-full rounded-[8px]" />
    </div>
  );
}
