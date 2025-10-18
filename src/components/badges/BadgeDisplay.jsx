/**
 * Badge Display Component for Dashboard
 * Shows earned badges for a child
 * Agent 3: Template System Developer
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { BadgeCard } from '@/components/badges/BadgeCard.jsx'
import { Trophy } from 'lucide-react'
import { getBadges, BADGE_DEFINITIONS } from '@/lib/badges.js'

/**
 * BadgeDisplay Component
 * @param {Object} props
 * @param {string} props.childName - Child's name to display badges for
 */
export const BadgeDisplay = ({ childName }) => {
  if (!childName) return null

  // Get all badges for this child
  const earnedBadges = getBadges(childName)

  // Convert badge definitions to array with earned status
  const allBadges = Object.entries(BADGE_DEFINITIONS).map(([id, badge]) => {
    const earnedBadge = earnedBadges.find(b => b.id === id)
    return {
      id,
      ...badge,
      achieved: !!earnedBadge,
      achievedAt: earnedBadge?.achievedAt
    }
  })

  // Sort: earned first, then by rarity
  const rarityOrder = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 }
  const sortedBadges = allBadges.sort((a, b) => {
    if (a.achieved !== b.achieved) {
      return a.achieved ? -1 : 1
    }
    return rarityOrder[a.rarity] - rarityOrder[b.rarity]
  })

  const earnedCount = earnedBadges.length
  const totalCount = Object.keys(BADGE_DEFINITIONS).length

  return (
    <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-600" />
            <CardTitle className="text-xl font-bold text-gray-900">
              성취 배지
            </CardTitle>
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-bold text-purple-600">{earnedCount}</span>
            <span className="text-gray-400"> / {totalCount}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {earnedCount === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Trophy className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>아직 획득한 배지가 없습니다</p>
            <p className="text-sm mt-1">습관을 기록하고 배지를 모아보세요!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {sortedBadges.map(badge => (
              <BadgeCard
                key={badge.id}
                badge={badge}
                achieved={badge.achieved}
                achievedAt={badge.achievedAt}
                showDate={false}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
