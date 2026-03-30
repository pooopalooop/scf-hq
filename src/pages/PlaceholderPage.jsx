export default function PlaceholderPage({ title, description }) {
  return (
    <div>
      <div className="flex items-start justify-between mb-6 pb-4 border-b border-border">
        <div>
          <h1 className="font-condensed text-[22px] font-bold tracking-tight text-txt leading-none mb-1">
            {title}
          </h1>
          <span className="text-[12px] text-txt2 font-mono">
            {description}
          </span>
        </div>
      </div>
      <div className="bg-surface border border-border rounded p-12 text-center">
        <div className="font-mono text-[11px] text-txt3 uppercase tracking-wider mb-2">
          Coming in Phase 2
        </div>
        <p className="text-txt2 text-[13px]">
          This feature will be built in an upcoming session.
        </p>
      </div>
    </div>
  )
}
