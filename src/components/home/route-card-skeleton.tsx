/** Placeholder matching RouteCard's footprint so the grid never shifts on load. */
export function RouteCardSkeleton() {
  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-card"
      aria-hidden
    >
      <div className="skeleton h-36 w-full rounded-none" />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="skeleton h-5 w-3/4" />
        <div className="skeleton h-3 w-1/2" />
        <div className="skeleton h-5 w-24 rounded-full" />
        <div className="mt-auto flex items-end justify-between pt-4">
          <div className="space-y-1.5">
            <div className="skeleton h-3 w-10" />
            <div className="skeleton h-6 w-20" />
          </div>
          <div className="skeleton h-9 w-28 rounded-md" />
        </div>
      </div>
    </div>
  );
}
