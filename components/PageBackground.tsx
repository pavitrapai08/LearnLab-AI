/**
 * Animated ambient background — large colour blobs + floating dots.
 * Pure CSS animations, zero JS cost. Pauses for prefers-reduced-motion.
 * Sits behind all content via position:fixed / z-index:-10.
 */

const DOTS = [
  { top: '8%',  left: '7%',  size: 13, color: 'rgba(79,142,247,0.55)',  anim: 'dot-float 9s ease-in-out infinite',        br: '50%' },
  { top: '22%', left: '89%', size: 10, color: 'rgba(16,185,129,0.55)',  anim: 'dot-float 11s ease-in-out infinite 1s',    br: '50%' },
  { top: '48%', left: '5%',  size: 17, color: 'rgba(245,158,11,0.5)',   anim: 'dot-float 13s ease-in-out infinite 2s',    br: '5px' },
  { top: '66%', left: '83%', size: 11, color: 'rgba(79,142,247,0.5)',   anim: 'dot-float 10s ease-in-out infinite 3s',    br: '50%' },
  { top: '12%', left: '53%', size: 9,  color: 'rgba(16,185,129,0.6)',   anim: 'dot-float 7s ease-in-out infinite 0.5s',   br: '50%' },
  { top: '79%', left: '38%', size: 15, color: 'rgba(245,158,11,0.45)',  anim: 'dot-float 14s ease-in-out infinite 4s',    br: '5px' },
  { top: '38%', left: '95%', size: 9,  color: 'rgba(79,142,247,0.55)',  anim: 'dot-float 8s ease-in-out infinite 2.5s',   br: '50%' },
  { top: '86%', left: '11%', size: 11, color: 'rgba(16,185,129,0.5)',   anim: 'dot-float 12s ease-in-out infinite 1.5s',  br: '50%' },
  { top: '55%', left: '64%', size: 9,  color: 'rgba(245,158,11,0.55)',  anim: 'dot-float 9s ease-in-out infinite 3.5s',   br: '50%' },
  { top: '31%', left: '27%', size: 7,  color: 'rgba(79,142,247,0.5)',   anim: 'dot-float 11s ease-in-out infinite 5s',    br: '50%' },
  { top: '70%', left: '58%', size: 12, color: 'rgba(16,185,129,0.45)',  anim: 'dot-spin  16s linear infinite 1s',         br: '3px' },
  { top: '18%', left: '72%', size: 8,  color: 'rgba(245,158,11,0.55)',  anim: 'dot-spin  20s linear infinite 3s',         br: '50%' },
]

export default function PageBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
    >
      {/* ── Large colour blobs ── */}
      <div
        className="page-blob absolute -right-52 -top-52 h-[650px] w-[650px] rounded-full"
        style={{
          background: 'rgba(79,142,247,0.22)',
          filter: 'blur(72px)',
          animation: 'blob-a 26s ease-in-out infinite',
        }}
      />
      <div
        className="page-blob absolute -bottom-52 -left-52 h-[560px] w-[560px] rounded-full"
        style={{
          background: 'rgba(16,185,129,0.2)',
          filter: 'blur(72px)',
          animation: 'blob-b 32s ease-in-out infinite',
        }}
      />
      <div
        className="page-blob absolute right-[18%] top-[42%] h-[420px] w-[420px] -translate-y-1/2 rounded-full"
        style={{
          background: 'rgba(245,158,11,0.16)',
          filter: 'blur(72px)',
          animation: 'blob-c 22s ease-in-out infinite 5s',
        }}
      />

      {/* ── Floating dots / shapes ── */}
      {DOTS.map((d, i) => (
        <div
          key={i}
          className="page-blob absolute"
          style={{
            top: d.top,
            left: d.left,
            width: d.size,
            height: d.size,
            background: d.color,
            borderRadius: d.br,
            animation: d.anim,
            boxShadow: `0 0 ${d.size * 2}px ${d.color}`,
          }}
        />
      ))}
    </div>
  )
}
