import { motion, useReducedMotion } from 'framer-motion'

export function EmptyState({ emoji = '🌱', title, description }) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <motion.span
        className="text-5xl mb-3 block"
        initial={shouldReduceMotion ? {} : { scale: 0.5, opacity: 0 }}
        animate={shouldReduceMotion ? {} : { scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 12 }}
      >
        {emoji}
      </motion.span>
      <h3 className="font-display font-semibold text-lg text-gray-700 dark:text-gray-300 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">{description}</p>
    </div>
  )
}
