import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { RewardToast } from './RewardToast.jsx'
import { getNewRewards, markRewardsAsViewed } from '@/lib/learning-mode.js'

const RewardNotificationContext = createContext(null)

export function useRewardNotifications() {
  const context = useContext(RewardNotificationContext)
  if (!context) {
    throw new Error('useRewardNotifications must be used within RewardNotificationProvider')
  }
  return context
}

export function RewardNotificationProvider({ children, childName }) {
  const [notifications, setNotifications] = useState([])
  const [currentNotification, setCurrentNotification] = useState(null)

  const checkNewRewards = useCallback(async () => {
    if (!childName) return

    try {
      const newRewards = await getNewRewards(childName)

      if (newRewards.length > 0) {
        console.log(`✨ Found ${newRewards.length} new rewards!`)
        setNotifications(newRewards)

        // Show first notification
        if (!currentNotification) {
          setCurrentNotification(newRewards[0])
        }
      }
    } catch (error) {
      console.error('Failed to check new rewards:', error)
    }
  }, [childName, currentNotification])

  // Check for new rewards every 30 seconds
  useEffect(() => {
    if (!childName) return

    // Initial check
    checkNewRewards()

    // Set up interval
    const interval = setInterval(() => {
      checkNewRewards()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [childName, checkNewRewards])

  const handleCloseNotification = async () => {
    if (!currentNotification) return

    try {
      // Mark as viewed
      await markRewardsAsViewed([currentNotification.id])

      // Remove from notifications list
      const remaining = notifications.filter(n => n.id !== currentNotification.id)
      setNotifications(remaining)

      // Show next notification if available
      if (remaining.length > 0) {
        setTimeout(() => {
          setCurrentNotification(remaining[0])
        }, 500) // Small delay before showing next
      } else {
        setCurrentNotification(null)
      }
    } catch (error) {
      console.error('Failed to mark reward as viewed:', error)
      setCurrentNotification(null)
    }
  }

  const handleViewReward = (reward) => {
    console.log('View reward:', reward)
    // You can implement navigation to rewards page here
    // For now, just close the notification
  }

  return (
    <RewardNotificationContext.Provider value={{ checkNewRewards }}>
      {children}

      {/* Render current notification */}
      {currentNotification && (
        <RewardToast
          reward={currentNotification}
          onClose={handleCloseNotification}
          onView={handleViewReward}
        />
      )}
    </RewardNotificationContext.Provider>
  )
}
