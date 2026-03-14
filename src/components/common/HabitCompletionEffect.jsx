import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

const PARTICLE_COUNT = 7
const EMOJIS = ['⭐', '✨', '🌟', '💫', '🎉', '💚', '🌱']

function generateParticles() {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const angle = (i / PARTICLE_COUNT) * 360 + (Math.random() * 30 - 15)
    const distance = 28 + Math.random() * 20
    const rad = (angle * Math.PI) / 180
    return {
      id: i,
      tx: Math.cos(rad) * distance,
      ty: Math.sin(rad) * distance,
      emoji: EMOJIS[i % EMOJIS.length],
      delay: Math.random() * 0.1,
      scale: 0.7 + Math.random() * 0.5,
    }
  })
}

export function HabitCompletionEffect({ show, x, y, onComplete }) {
  const shouldReduceMotion = useReducedMotion()
  const [particles] = useState(() => generateParticles())

  useEffect(() => {
    if (!show) return
    const timer = setTimeout(() => onComplete?.(), 700)
    return () => clearTimeout(timer)
  }, [show, onComplete])

  if (!show) return null

  // Reduced motion: simple checkmark fade-in
  if (shouldReduceMotion) {
    return (
      <div
        className="fixed pointer-events-none z-50"
        style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
      >
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="text-2xl"
        >
          ✅
        </motion.span>
      </div>
    )
  }

  return (
    <AnimatePresence>
      <div
        className="fixed pointer-events-none z-50"
        style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
      >
        {particles.map((p) => (
          <motion.span
            key={p.id}
            initial={{ opacity: 1, x: 0, y: 0, scale: p.scale }}
            animate={{
              opacity: 0,
              x: p.tx,
              y: p.ty,
              scale: 0,
            }}
            transition={{
              duration: 0.6,
              delay: p.delay,
              ease: 'easeOut',
            }}
            className="absolute text-sm"
            style={{ left: 0, top: 0 }}
          >
            {p.emoji}
          </motion.span>
        ))}
        {/* Central pop */}
        <motion.span
          initial={{ opacity: 1, scale: 0 }}
          animate={{ opacity: 0, scale: 1.8 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="absolute text-xl"
          style={{ left: -10, top: -10 }}
        >
          💚
        </motion.span>
      </div>
    </AnimatePresence>
  )
}
