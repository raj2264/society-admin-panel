export function DashboardStatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="h-3.5 w-20 bg-muted rounded-md animate-pulse" />
            <div className="h-9 w-9 bg-muted rounded-lg animate-pulse" />
          </div>
          <div className="h-8 w-14 bg-muted rounded-md animate-pulse mb-1.5" />
          <div className="h-3 w-24 bg-muted rounded-md animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export function AnnouncementsSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="p-6 pb-3">
        <div className="h-5 w-48 bg-muted rounded-md animate-pulse" />
      </div>
      <div className="p-6 pt-3 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="h-4 w-36 bg-muted rounded-md animate-pulse" />
              <div className="h-3 w-12 bg-muted rounded-md animate-pulse" />
            </div>
            <div className="h-3 w-full bg-muted rounded-md animate-pulse" />
            <div className="h-3 w-2/3 bg-muted rounded-md animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
