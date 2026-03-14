import Sidebar from '@/components/Sidebar'
import { UserAccountButton } from '@/components/UserAccountButton'
import { useLocation } from 'wouter'
import { AnimatePresence, motion } from 'framer-motion'

interface PageWrapperProps {
  children: React.ReactNode
}

const contentVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1]
    }
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1]
    }
  }
};

export function PageWrapper({ children }: PageWrapperProps) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="relative z-10 flex min-h-screen w-full">
        {/* Sidebar - fixe, toujours visible */}
        <Sidebar />

        {/* Zone principale : bouton compte + contenu */}
        <div className="flex-1 min-w-0 flex flex-col">
          <UserAccountButton />
          <AnimatePresence mode="wait">
            <motion.div
              key={location}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={contentVariants}
              className="flex-1 p-4 pt-20 pl-14 md:p-6 md:pt-8 md:pl-0 lg:p-8"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

