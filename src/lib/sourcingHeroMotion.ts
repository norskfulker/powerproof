/** Shared framer-motion presets for sourcing hero (aligned with opportunity / B2B chips). */

export const SOURCING_PANEL_MOTION = {
  initial: { opacity: 0, y: 10, scale: 0.99 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] as const },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.99,
    transition: { duration: 0.18, ease: [0.4, 0, 0.2, 1] as const },
  },
}

export const SOURCING_GRID_STAGGER = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.045, delayChildren: 0.06 },
  },
}

/** History grids (esp. pending cards): batch is already loaded — reveal together, not one-by-one. */
export const SOURCING_GRID_SIMULTANEOUS = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0, delayChildren: 0 },
  },
}

export const SOURCING_ITEM_MOTION = {
  hidden: { opacity: 0, y: 10, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 460, damping: 30, mass: 0.75 },
  },
}
