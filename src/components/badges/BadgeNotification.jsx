/**
 * BadgeNotification Component
 * Modal that shows when a new badge is earned
 * Agent 2: Statistics Engineer
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { X, Sparkles } from 'lucide-react'

/**
 * BadgeNotification Component
 * @param {Object} props
 * @param {Object} props.badge - Badge that was earned
 * @param {Function} props.onClose - Close callback
 */
export const BadgeNotification = ({ badge, onClose }) => {
  if (!badge) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="bg-white max-w-md w-full animate-bounce-in relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-purple-800 flex items-center justify-center gap-2">
            <Sparkles className="w-6 h-6 text-yellow-500" />
            축하합니다!
            <Sparkles className="w-6 h-6 text-yellow-500" />
          </CardTitle>
        </CardHeader>

        <CardContent className="text-center space-y-4">
          {/* Confetti Effect */}
          <div className="text-4xl mb-4">🎉</div>

          {/* Badge Icon */}
          <div className="text-8xl animate-pulse">
            {badge.icon}
          </div>

          {/* Badge Name */}
          <h2 className="text-3xl font-bold text-gray-900">
            {badge.name}
          </h2>

          {/* Badge Description */}
          <p className="text-lg text-gray-600 px-4">
            {badge.description}
          </p>

          {/* Rarity Badge */}
          <div className="flex justify-center">
            <span className={`
              px-4 py-1 rounded-full text-sm font-semibold
              ${badge.rarity === 'legendary' ? 'bg-yellow-100 text-yellow-800' : ''}
              ${badge.rarity === 'epic' ? 'bg-purple-100 text-purple-800' : ''}
              ${badge.rarity === 'rare' ? 'bg-blue-100 text-blue-800' : ''}
              ${badge.rarity === 'common' ? 'bg-gray-100 text-gray-800' : ''}
            `}>
              {badge.rarity === 'legendary' && '전설'}
              {badge.rarity === 'epic' && '에픽'}
              {badge.rarity === 'rare' && '레어'}
              {badge.rarity === 'common' && '일반'}
            </span>
          </div>

          {/* Close Button */}
          <Button
            onClick={onClose}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 text-lg"
          >
            확인
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// Add animation styles via inline style tag or Tailwind config
// For now, using existing Tailwind animations
