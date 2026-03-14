export function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse rounded-md bg-gray-200 dark:bg-gray-700 ${className}`} />
  )
}

export function HabitTableSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="border rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-12" />
          </div>
          <div className="flex justify-between">
            {[1, 2, 3, 4, 5, 6, 7].map(d => (
              <Skeleton key={d} className="w-9 h-9 rounded-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="border rounded-lg p-4 space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  )
}

export function MandalaSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3 max-w-2xl mx-auto p-4">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
        <Skeleton key={i} className="aspect-square rounded-lg" />
      ))}
    </div>
  )
}
