import { useMemo } from 'react'
import { motion } from 'framer-motion'

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--saffron-500))',
  'hsl(142 70% 40%)',
  'hsl(210 90% 55%)',
  'hsl(330 75% 55%)',
  'hsl(45 95% 55%)',
]

type Piece = {
  id: number
  x: number
  y: number
  rotate: number
  delay: number
  size: number
  color: string
  round: boolean
}

function buildPieces(count: number): Piece[] {
  return Array.from({ length: count }, (_, id) => {
    const angle = (Math.PI * 2 * id) / count + (Math.random() - 0.5) * 0.4
    const dist = 120 + Math.random() * 220
    return {
      id,
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist - 40,
      rotate: (Math.random() - 0.5) * 720,
      delay: Math.random() * 0.12,
      size: 6 + Math.random() * 8,
      color: COLORS[id % COLORS.length]!,
      round: Math.random() > 0.55,
    }
  })
}

/** Lightweight celebration burst — no extra dependency. */
export function OnboardingConfettiBurst({ active }: { active: boolean }) {
  const pieces = useMemo(() => (active ? buildPieces(48) : []), [active])

  if (!active) return null

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
      aria-hidden
    >
      <div className="absolute left-1/2 top-[38%] -translate-x-1/2">
        {pieces.map((p) => (
          <motion.span
            key={p.id}
            className="absolute block"
            style={{
              width: p.size,
              height: p.round ? p.size : p.size * 0.55,
              borderRadius: p.round ? 999 : 2,
              backgroundColor: p.color,
            }}
            initial={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
            animate={{
              opacity: [1, 1, 0],
              x: p.x,
              y: p.y + 80,
              scale: [1, 1.05, 0.7],
              rotate: p.rotate,
            }}
            transition={{
              duration: 1.35,
              delay: p.delay,
              ease: [0.16, 1, 0.3, 1],
            }}
          />
        ))}
      </div>
    </div>
  )
}
