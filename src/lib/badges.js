/**
 * Achievement Badge System
 * Manages badge definitions, checking, and awarding
 * Agent 2: Statistics Engineer
 */

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate consecutive days from habits
 * Returns the number of consecutive days with at least one green habit
 */
export const calculateConsecutiveDays = (habits) => {
  if (!habits || habits.length === 0) return 0

  let consecutiveDays = 0
  const daysCount = habits[0]?.times?.length || 7

  // Check each day from the most recent backwards
  for (let dayIndex = daysCount - 1; dayIndex >= 0; dayIndex--) {
    let hasGreen = false

    // Check if any habit is green on this day
    for (const habit of habits) {
      if (habit.times && habit.times[dayIndex] === 'green') {
        hasGreen = true
        break
      }
    }

    if (hasGreen) {
      consecutiveDays++
    } else {
      break // Stop counting when we hit a day without green
    }
  }

  return consecutiveDays
}

// ============================================================================
// Badge Definitions
// ============================================================================

export const BADGE_DEFINITIONS = {
  // Streak Badges (연속 달성)
  'first-step': {
    id: 'first-step',
    name: '첫걸음',
    nameEn: 'First Step',
    description: '멋진 시작이에요! 3일 연속 습관을 지켰어요!',
    icon: '🔥',
    color: '#CD7F32',
    category: 'streak',
    rarity: 'common'
  },
  'habit-star': {
    id: 'habit-star',
    name: '습관의 별',
    nameEn: 'Habit Star',
    description: '대단해요! 일주일 내내 습관을 지켰어요!',
    icon: '⭐',
    color: '#C0C0C0',
    category: 'streak',
    rarity: 'rare'
  },
  'super-star': {
    id: 'super-star',
    name: '슈퍼 스타',
    nameEn: 'Super Star',
    description: '놀라워요! 2주 연속 완벽한 습관!',
    icon: '🌟',
    color: '#FFD700',
    category: 'streak',
    rarity: 'epic'
  },
  'diamond': {
    id: 'diamond',
    name: '다이아몬드',
    nameEn: 'Diamond',
    description: '전설이에요! 한 달 동안 완벽해요!',
    icon: '💎',
    color: '#B9F2FF',
    category: 'streak',
    rarity: 'legendary'
  },

  // Perfectionist Badges (완벽주의자)
  'perfect-day': {
    id: 'perfect-day',
    name: '완벽한 하루',
    nameEn: 'Perfect Day',
    description: '오늘은 완벽했어요!',
    icon: '🎯',
    color: '#10B981',
    category: 'perfectionist',
    rarity: 'common'
  },
  'perfect-week': {
    id: 'perfect-week',
    name: '완벽한 주',
    nameEn: 'Perfect Week',
    description: '일주일 내내 완벽해요!',
    icon: '🏅',
    color: '#8B5CF6',
    category: 'perfectionist',
    rarity: 'epic'
  },
  'perfect-month': {
    id: 'perfect-month',
    name: '완벽한 달',
    nameEn: 'Perfect Month',
    description: '한 달 내내 완벽! 당신은 챔피언!',
    icon: '👑',
    color: '#4169E1',
    category: 'perfectionist',
    rarity: 'legendary'
  },

  // Growth Badges (성장)
  'growing-up': {
    id: 'growing-up',
    name: '성장왕',
    nameEn: 'Growing Up',
    description: '점점 더 나아지고 있어요!',
    icon: '📈',
    color: '#F59E0B',
    category: 'growth',
    rarity: 'rare'
  },
  'rocket-growth': {
    id: 'rocket-growth',
    name: '로켓 성장',
    nameEn: 'Rocket Growth',
    description: '엄청난 발전이에요!',
    icon: '🚀',
    color: '#EF4444',
    category: 'growth',
    rarity: 'epic'
  },

  // Special Badges (특별)
  'rainbow-week': {
    id: 'rainbow-week',
    name: '무지개 주간',
    nameEn: 'Rainbow Week',
    description: '모든 습관을 골고루 잘했어요!',
    icon: '🌈',
    color: 'linear-gradient(90deg, #FF0000, #FF7F00, #FFFF00, #00FF00, #0000FF, #4B0082, #9400D3)',
    category: 'special',
    rarity: 'rare'
  },
  'lightning-fast': {
    id: 'lightning-fast',
    name: '번개 달성',
    nameEn: 'Lightning Fast',
    description: '빠른 시작! 앞으로도 화이팅!',
    icon: '⚡',
    color: '#FBBF24',
    category: 'special',
    rarity: 'rare'
  },
  'surprise': {
    id: 'surprise',
    name: '서프라이즈',
    nameEn: 'Surprise',
    description: '와! 이번 주 최고의 반전이에요!',
    icon: '🎁',
    color: '#EC4899',
    category: 'special',
    rarity: 'epic'
  },
  'persistence': {
    id: 'persistence',
    name: '끈기왕',
    nameEn: 'Persistence',
    description: '포기하지 않았어요! 다시 일어났네요!',
    icon: '💪',
    color: '#3B82F6',
    category: 'special',
    rarity: 'epic'
  },

  // Collector Badges (컬렉터)
  'badge-collector': {
    id: 'badge-collector',
    name: '배지 컬렉터',
    nameEn: 'Badge Collector',
    description: '배지를 많이 모았어요!',
    icon: '🎪',
    color: '#7C3AED',
    category: 'collector',
    rarity: 'rare'
  },
  'legendary-collector': {
    id: 'legendary-collector',
    name: '전설의 컬렉터',
    nameEn: 'Legendary Collector',
    description: '모든 배지의 마스터!',
    icon: '🏆',
    color: '#FFD700',
    category: 'collector',
    rarity: 'legendary'
  }
}

// ============================================================================
// Badge Storage (localStorage)
// ============================================================================

const STORAGE_KEY_PREFIX = 'badge-'

/**
 * Get all badges for a child
 */
export const getBadges = (childName) => {
  const key = `${STORAGE_KEY_PREFIX}${childName}`
  const stored = localStorage.getItem(key)
  return stored ? JSON.parse(stored) : []
}

/**
 * Save badges for a child
 */
export const saveBadges = (childName, badges) => {
  const key = `${STORAGE_KEY_PREFIX}${childName}`
  localStorage.setItem(key, JSON.stringify(badges))
}

/**
 * Award a badge to a child
 */
export const awardBadge = (childName, badgeId) => {
  const badges = getBadges(childName)

  // Check if already has this badge
  if (badges.find(b => b.id === badgeId)) {
    return null // Already has this badge
  }

  const newBadge = {
    id: badgeId,
    achievedAt: new Date().toISOString()
  }

  badges.push(newBadge)
  saveBadges(childName, badges)

  return BADGE_DEFINITIONS[badgeId]
}

/**
 * Check if child has a specific badge
 */
export const hasBadge = (childName, badgeId) => {
  const badges = getBadges(childName)
  return badges.some(b => b.id === badgeId)
}

// ============================================================================
// Badge Checking Logic
// ============================================================================

/**
 * Check for perfect day badge
 */
export const checkPerfectDay = (habits) => {
  if (!habits || habits.length === 0) return false

  // Count green marks for today (last day)
  const todayIndex = 6 // Sunday
  const greenCount = habits.filter(h => h.times[todayIndex] === 'green').length

  return greenCount === habits.length
}

/**
 * Check for perfect week badge
 */
export const checkPerfectWeek = (habits) => {
  if (!habits || habits.length === 0) return false

  for (let day = 0; day < 7; day++) {
    const greenCount = habits.filter(h => h.times[day] === 'green').length
    if (greenCount !== habits.length) return false
  }

  return true
}

/**
 * Check for streak badges (3, 7, 14, 30 days)
 */
export const checkStreak = (consecutiveDays) => {
  if (consecutiveDays >= 30) return 'diamond'
  if (consecutiveDays >= 14) return 'super-star'
  if (consecutiveDays >= 7) return 'habit-star'
  if (consecutiveDays >= 3) return 'first-step'
  return null
}

/**
 * Check for rainbow week (all habits have at least one green)
 */
export const checkRainbowWeek = (habits) => {
  if (!habits || habits.length === 0) return false

  return habits.every(habit =>
    habit.times.some(time => time === 'green')
  )
}

/**
 * Check for lightning fast (90%+ in first 3 days)
 */
export const checkLightningFast = (habits) => {
  if (!habits || habits.length === 0) return false

  let totalSlots = habits.length * 3 // First 3 days
  let greenCount = 0

  for (let day = 0; day < 3; day++) {
    greenCount += habits.filter(h => h.times[day] === 'green').length
  }

  const successRate = (greenCount / totalSlots) * 100
  return successRate >= 90
}

/**
 * Check for collector badges
 */
export const checkCollectorBadges = (childName) => {
  const badges = getBadges(childName)
  const count = badges.length

  if (count >= 10) return 'legendary-collector'
  if (count >= 5) return 'badge-collector'
  return null
}

/**
 * Check all possible badges for current habits
 */
export const checkAllBadges = (childName, habits, consecutiveDays = 0) => {
  const newBadges = []

  // Perfect day
  if (checkPerfectDay(habits)) {
    const badge = awardBadge(childName, 'perfect-day')
    if (badge) newBadges.push(badge)
  }

  // Perfect week
  if (checkPerfectWeek(habits)) {
    const badge = awardBadge(childName, 'perfect-week')
    if (badge) newBadges.push(badge)
  }

  // Streak badges
  const streakBadge = checkStreak(consecutiveDays)
  if (streakBadge) {
    const badge = awardBadge(childName, streakBadge)
    if (badge) newBadges.push(badge)
  }

  // Rainbow week
  if (checkRainbowWeek(habits)) {
    const badge = awardBadge(childName, 'rainbow-week')
    if (badge) newBadges.push(badge)
  }

  // Lightning fast
  if (checkLightningFast(habits)) {
    const badge = awardBadge(childName, 'lightning-fast')
    if (badge) newBadges.push(badge)
  }

  // Collector badges
  const collectorBadge = checkCollectorBadges(childName)
  if (collectorBadge) {
    const badge = awardBadge(childName, collectorBadge)
    if (badge) newBadges.push(badge)
  }

  return newBadges
}

/**
 * Get badge details with achievement info
 */
export const getBadgeDetails = (childName, badgeId) => {
  const definition = BADGE_DEFINITIONS[badgeId]
  if (!definition) return null

  const badges = getBadges(childName)
  const achievement = badges.find(b => b.id === badgeId)

  return {
    ...definition,
    achieved: !!achievement,
    achievedAt: achievement?.achievedAt || null
  }
}

/**
 * Get all badges with achievement status
 */
export const getAllBadgeDetails = (childName) => {
  return Object.keys(BADGE_DEFINITIONS).map(badgeId =>
    getBadgeDetails(childName, badgeId)
  )
}
