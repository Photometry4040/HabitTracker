/**
 * BadgeCard Component
 * Displays a single achievement badge
 * Agent 2: Statistics Engineer
 */

import { Card, CardContent } from '@/components/ui/card.jsx'

/**
 * BadgeCard Component
 * @param {Object} props
 * @param {Object} props.badge - Badge definition
 * @param {boolean} props.achieved - Whether badge is achieved
 * @param {string} props.achievedAt - ISO timestamp of achievement
 * @param {boolean} props.showDate - Show achievement date
 */
export const BadgeCard = ({
  badge,
  achieved = false,
  achievedAt = null,
  showDate = true
}) => {
  const { icon, name, description, color, rarity } = badge

  // Rarity border styles
  const rarityStyles = {
    common: 'border-gray-300',
    rare: 'border-blue-400',
    epic: 'border-purple-500',
    legendary: 'border-yellow-400'
  }

  const bgOpacity = achieved ? 'bg-white' : 'bg-gray-100 opacity-50'
  const borderStyle = rarityStyles[rarity] || rarityStyles.common

  return (
    <Card className={`${bgOpacity} border-2 ${borderStyle} transition-all hover:scale-105`}>
      <CardContent className="p-4">
        <div className="text-center">
          {/* Icon */}
          <div className="text-5xl mb-2 filter" style={{ filter: achieved ? 'none' : 'grayscale(100%)' }}>
            {icon}
          </div>

          {/* Name */}
          <h3 className="font-bold text-lg text-gray-900 mb-1">
            {name}
          </h3>

          {/* Description */}
          <p className="text-sm text-gray-600 mb-2">
            {description}
          </p>

          {/* Achievement Date */}
          {achieved && showDate && achievedAt && (
            <div className="text-xs text-gray-500 mt-2">
              {new Date(achievedAt).toLocaleDateString('ko-KR')} 달성
            </div>
          )}

          {/* Not Achieved */}
          {!achieved && (
            <div className="text-xs text-gray-400 mt-2">
              미획득
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
