export function SkeletonLine({ width = '100%', height = '14px' }) {
  return (
    <div
      className="bg-surface3 rounded animate-pulse"
      style={{ width, height }}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-surface border border-border rounded p-4 space-y-3">
      <SkeletonLine width="60%" height="16px" />
      <SkeletonLine width="40%" height="12px" />
      <SkeletonLine height="12px" />
    </div>
  )
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className="bg-surface border border-border rounded overflow-hidden">
      <div className="border-b border-border px-3 py-2 flex gap-4">
        {[80, 40, 60, 50].map((w, i) => (
          <SkeletonLine key={i} width={`${w}px`} height="10px" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border-b border-border last:border-0 px-3 py-2.5 flex gap-4 items-center">
          {[120, 40, 60, 50].map((w, j) => (
            <SkeletonLine key={j} width={`${w}px`} height="12px" />
          ))}
        </div>
      ))}
    </div>
  )
}
