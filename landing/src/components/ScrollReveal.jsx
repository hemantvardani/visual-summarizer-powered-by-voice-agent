import { motion } from 'framer-motion'

const MotionDiv = motion.div

const defaultVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
}

export function ScrollReveal({ children, className = '', delay = 0, ...props }) {
  return (
    <MotionDiv
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay }}
      variants={defaultVariants}
      className={className}
      {...props}
    >
      {children}
    </MotionDiv>
  )
}
