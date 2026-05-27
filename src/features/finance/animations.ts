export const springTransition = {
  type: 'spring',
  stiffness: 420,
  damping: 32,
  mass: 0.8,
} as const

export const pageMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
} as const

export const listMotion = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.045,
    },
  },
} as const

export const itemMotion = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
} as const

export const tapMotion = {
  whileHover: { y: -1 },
  whileTap: { scale: 0.98 },
  transition: springTransition,
} as const
