import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { X, Award } from 'lucide-react'

export function RewardToast({ reward, onClose, onView }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Fade in animation
    setTimeout(() => setIsVisible(true), 10)

    // Auto-close after 10 seconds
    const timer = setTimeout(() => {
      handleClose()
    }, 10000)

    return () => clearTimeout(timer)
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300) // Wait for fade-out animation
  }

  const handleViewClick = () => {
    onView?.(reward)
    handleClose()
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed bottom-4 right-4 z-50"
          style={{ maxWidth: '400px' }}
        >
          <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/30 dark:to-orange-900/30 border-2 border-yellow-400 shadow-2xl">
            <div className="p-4">
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header */}
              <div className="flex items-center gap-3 mb-3">
                <motion.div
                  className="bg-yellow-400 p-3 rounded-full"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 0.8, ease: 'easeInOut' }}
                >
                  <Award className="w-6 h-6 text-white" />
                </motion.div>
                <div>
                  <h3 className="font-bold font-display text-lg text-purple-900 dark:text-purple-200">보상 획득!</h3>
                  <p className="text-xs text-purple-700 dark:text-purple-400">새로운 보상을 받았어요</p>
                </div>
              </div>

              {/* Reward Info */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-3xl">{reward.reward?.icon || '🏆'}</span>
                  <div>
                    <h4 className="font-semibold text-purple-900 dark:text-purple-200">{reward.reward?.name}</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {reward.reward?.reward_type === 'badge' && '배지'}
                      {reward.reward?.reward_type === 'sticker' && '스티커'}
                      {reward.reward?.reward_type === 'achievement' && '업적'}
                    </p>
                  </div>
                </div>
                {reward.reward?.description && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{reward.reward.description}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={handleViewClick}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                  size="sm"
                >
                  보상 보기
                </Button>
                <Button
                  onClick={handleClose}
                  variant="outline"
                  size="sm"
                >
                  닫기
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
