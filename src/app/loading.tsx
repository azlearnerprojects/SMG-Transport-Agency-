import { Skeleton } from '@/components/ui/misc';

export default function Loading() {
  return (
    <div className="container-page py-12">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="mt-4 h-5 w-96" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
