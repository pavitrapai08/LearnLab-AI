/**
 * Vivid animated ambient background — aurora blobs, twinkling stars,
 * shooting stars, floating shapes. Pure CSS, zero JS cost.
 * Pauses for prefers-reduced-motion. z-index:-10 sits behind all content.
 */

const STARS = [
  { top: '4%',  left: '12%', s: 5,  d: '0s',   dur: '2.8s', c: 'rgba(253,230,138,0.95)' },
  { top: '9%',  left: '78%', s: 4,  d: '1.2s', dur: '3.5s', c: 'rgba(255,255,255,0.95)' },
  { top: '18%', left: '35%', s: 6,  d: '0.5s', dur: '2.2s', c: 'rgba(196,181,253,0.95)' },
  { top: '25%', left: '91%', s: 4,  d: '2s',   dur: '4s',   c: 'rgba(110,231,183,0.95)' },
  { top: '35%', left: '6%',  s: 5,  d: '1.8s', dur: '3s',   c: 'rgba(253,230,138,0.9)'  },
  { top: '42%', left: '55%', s: 7,  d: '0.3s', dur: '2.5s', c: 'rgba(255,255,255,0.9)'  },
  { top: '52%', left: '18%', s: 4,  d: '3s',   dur: '3.8s', c: 'rgba(196,181,253,0.9)'  },
  { top: '58%', left: '88%', s: 5,  d: '1s',   dur: '2.6s', c: 'rgba(253,230,138,0.9)'  },
  { top: '68%', left: '42%', s: 6,  d: '2.5s', dur: '3.2s', c: 'rgba(110,231,183,0.9)'  },
  { top: '75%', left: '72%', s: 4,  d: '0.7s', dur: '4.2s', c: 'rgba(255,255,255,0.9)'  },
  { top: '82%', left: '22%', s: 5,  d: '1.5s', dur: '2.9s', c: 'rgba(253,230,138,0.9)'  },
  { top: '89%', left: '60%', s: 4,  d: '3.5s', dur: '3.6s', c: 'rgba(196,181,253,0.9)'  },
  { top: '14%', left: '50%', s: 6,  d: '2.2s', dur: '2.4s', c: 'rgba(110,231,183,0.95)' },
  { top: '47%', left: '75%', s: 4,  d: '0.9s', dur: '3.9s', c: 'rgba(253,230,138,0.9)'  },
  { top: '63%', left: '3%',  s: 5,  d: '4s',   dur: '2.7s', c: 'rgba(255,255,255,0.9)'  },
  { top: '30%', left: '65%', s: 7,  d: '1.6s', dur: '3.3s', c: 'rgba(196,181,253,0.95)' },
  { top: '92%', left: '38%', s: 4,  d: '2.8s', dur: '4.1s', c: 'rgba(110,231,183,0.9)'  },
  { top: '6%',  left: '94%', s: 5,  d: '0.2s', dur: '3s',   c: 'rgba(253,230,138,0.9)'  },
]

const SHAPES = [
  { top: '12%', left: '7%',  size: 24, c: 'rgba(139,92,246,0.65)',  br: '50%',  a: 'shape-float 9s ease-in-out infinite' },
  { top: '70%', left: '87%', size: 20, c: 'rgba(6,182,212,0.65)',   br: '50%',  a: 'shape-float 12s ease-in-out infinite 2s' },
  { top: '38%', left: '93%', size: 16, c: 'rgba(251,113,133,0.65)', br: '5px',  a: 'shape-float 10s ease-in-out infinite 1s' },
  { top: '85%', left: '42%', size: 22, c: 'rgba(52,211,153,0.65)',  br: '50%',  a: 'shape-float 14s ease-in-out infinite 3.5s' },
  { top: '22%', left: '82%', size: 18, c: 'rgba(251,191,36,0.65)',  br: '5px',  a: 'shape-float 11s ease-in-out infinite 4.5s' },
  { top: '58%', left: '28%', size: 14, c: 'rgba(139,92,246,0.6)',   br: '50%',  a: 'shape-float 8s ease-in-out infinite 1.5s' },
  { top: '3%',  left: '48%', size: 19, c: 'rgba(6,182,212,0.6)',    br: '50%',  a: 'shape-float 13s ease-in-out infinite 0.5s' },
  { top: '48%', left: '48%', size: 28, c: 'rgba(251,113,133,0.45)', br: '50%',  a: 'shape-float 16s ease-in-out infinite 6s' },
  { top: '78%', left: '12%', size: 17, c: 'rgba(251,191,36,0.6)',   br: '50%',  a: 'shape-float 10s ease-in-out infinite 2.5s' },
  { top: '32%', left: '22%', size: 13, c: 'rgba(52,211,153,0.6)',   br: '5px',  a: 'shape-float 7s ease-in-out infinite 3s' },
]

export default function PageBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
    >
      {/* ── Aurora blobs — large, vivid colour washes ── */}
      <div className="page-blob absolute" style={{
        top: '-25%', right: '-20%',
        width: 850, height: 850,
        borderRadius: '50%',
        background: 'rgba(139,92,246,0.48)',
        filter: 'blur(90px)',
        animation: 'blob-a 28s ease-in-out infinite',
      }} />
      <div className="page-blob absolute" style={{
        bottom: '-25%', left: '-20%',
        width: 750, height: 750,
        borderRadius: '50%',
        background: 'rgba(6,182,212,0.44)',
        filter: 'blur(90px)',
        animation: 'blob-b 34s ease-in-out infinite',
      }} />
      <div className="page-blob absolute" style={{
        top: '25%', left: '25%',
        width: 580, height: 580,
        borderRadius: '50%',
        background: 'rgba(251,113,133,0.38)',
        filter: 'blur(80px)',
        animation: 'blob-c 22s ease-in-out infinite 4s',
      }} />
      <div className="page-blob absolute" style={{
        bottom: '10%', right: '10%',
        width: 480, height: 480,
        borderRadius: '50%',
        background: 'rgba(52,211,153,0.4)',
        filter: 'blur(75px)',
        animation: 'blob-d 30s ease-in-out infinite 10s',
      }} />

      {/* ── Twinkling stars ── */}
      {STARS.map((s, i) => (
        <div
          key={`star-${i}`}
          className="page-blob absolute"
          style={{
            top: s.top, left: s.left,
            width: s.s, height: s.s,
            borderRadius: '50%',
            background: s.c,
            boxShadow: `0 0 ${s.s * 4}px ${s.c}`,
            animation: `twinkle ${s.dur} ease-in-out infinite ${s.d}`,
          }}
        />
      ))}

      {/* ── Floating shapes ── */}
      {SHAPES.map((sh, i) => (
        <div
          key={`shape-${i}`}
          className="page-blob absolute"
          style={{
            top: sh.top, left: sh.left,
            width: sh.size, height: sh.size,
            background: sh.c,
            borderRadius: sh.br,
            animation: sh.a,
            boxShadow: `0 0 ${sh.size * 2}px ${sh.c}`,
          }}
        />
      ))}

      {/* ── Shooting stars ── */}
      <div className="page-blob absolute" style={{
        top: '18%', left: '-10%',
        width: 180, height: 2,
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.95), rgba(253,230,138,0.8), transparent)',
        borderRadius: 2,
        animation: 'shoot 7s linear infinite 1s',
      }} />
      <div className="page-blob absolute" style={{
        top: '52%', left: '-10%',
        width: 140, height: 2,
        background: 'linear-gradient(90deg, transparent, rgba(196,181,253,0.95), rgba(255,255,255,0.9), transparent)',
        borderRadius: 2,
        animation: 'shoot 9s linear infinite 4.5s',
      }} />
      <div className="page-blob absolute" style={{
        top: '78%', left: '-10%',
        width: 110, height: 2,
        background: 'linear-gradient(90deg, transparent, rgba(110,231,183,0.95), rgba(255,255,255,0.85), transparent)',
        borderRadius: 2,
        animation: 'shoot 11s linear infinite 8s',
      }} />
    </div>
  )
}
