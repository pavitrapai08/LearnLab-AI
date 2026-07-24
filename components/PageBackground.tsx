/**
 * Slow-drifting ambient blobs — pure CSS, zero JS cost.
 * Renders behind all page content via position:fixed / z-index:-10.
 * Animation pauses automatically for prefers-reduced-motion.
 */
export default function PageBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
    >
      {/* Primary blue — top-right */}
      <div
        className="page-blob absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{
          background: 'rgba(79,142,247,0.08)',
          animation: 'blob-a 26s ease-in-out infinite',
        }}
      />
      {/* Emerald — bottom-left */}
      <div
        className="page-blob absolute -bottom-40 -left-40 h-[440px] w-[440px] rounded-full blur-3xl"
        style={{
          background: 'rgba(16,185,129,0.07)',
          animation: 'blob-b 32s ease-in-out infinite',
        }}
      />
      {/* Amber — mid-right */}
      <div
        className="page-blob absolute right-1/4 top-1/2 h-[340px] w-[340px] -translate-y-1/2 rounded-full blur-3xl"
        style={{
          background: 'rgba(245,158,11,0.055)',
          animation: 'blob-c 22s ease-in-out infinite 5s',
        }}
      />
    </div>
  )
}
