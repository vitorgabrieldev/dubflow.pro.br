import { Card, CardBody } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function PublishLoadingPage() {
  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <Card>
          <CardBody className="space-y-4 p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-[10px]" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-40 rounded-[6px]" />
                <Skeleton className="h-3 w-52 rounded-[6px]" />
              </div>
            </div>
            <Skeleton className="h-4 w-full rounded-[6px]" />
            <Skeleton className="h-10 w-48 rounded-[8px]" />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4 p-4">
            <Skeleton className="h-5 w-40 rounded-[6px]" />
            <Skeleton className="h-12 w-full rounded-[8px]" />
            <Skeleton className="h-12 w-full rounded-[8px]" />
            <Skeleton className="h-36 w-full rounded-[8px]" />
            <Skeleton className="h-40 w-full rounded-[8px]" />
            <Skeleton className="h-12 w-full rounded-[8px]" />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-3 p-4">
            <Skeleton className="h-5 w-44 rounded-[6px]" />
            <Skeleton className="h-11 w-full rounded-[8px]" />
            <Skeleton className="h-11 w-full rounded-[8px]" />
            <Skeleton className="h-11 w-full rounded-[8px]" />
          </CardBody>
        </Card>
      </div>

      <aside className="space-y-5">
        <Card>
          <CardBody className="space-y-4 p-4">
            <Skeleton className="h-5 w-28 rounded-[6px]" />
            <Skeleton className="h-4 w-full rounded-[6px]" />
            <Skeleton className="h-10 w-48 rounded-[8px]" />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4 p-4">
            <Skeleton className="h-5 w-28 rounded-[6px]" />
            <Skeleton className="h-4 w-full rounded-[6px]" />
            <Skeleton className="h-10 w-44 rounded-[8px]" />
          </CardBody>
        </Card>
      </aside>
    </section>
  );
}
