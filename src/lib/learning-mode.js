/**
 * Learning Mode API - Phase 5
 * Database operations for learning mode features:
 * - Goals (목표 설정)
 * - Weaknesses (약점 관리)
 * - Rewards (보상 시스템)
 * - Mandala Charts (만다라트 차트)
 */

import { supabase } from './supabase.js'

// ============================================================================
// Children - Learning Mode Toggle
// ============================================================================

/**
 * Toggle learning mode for a child
 * @param {string} childName - Name of the child
 * @param {boolean} enabled - Enable/disable learning mode
 * @returns {Object|null} Updated child data
 */
export const toggleLearningMode = async (childName, enabled) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('인증되지 않은 사용자입니다.')
    }

    const { data: child, error: childError } = await supabase
      .from('children')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', childName)
      .maybeSingle()

    if (childError || !child) {
      throw new Error('아이를 찾을 수 없습니다.')
    }

    const { data, error } = await supabase
      .from('children')
      .update({ learning_mode_enabled: enabled })
      .eq('id', child.id)
      .select()
      .maybeSingle()

    if (error) throw error

    console.log(`✅ Learning mode ${enabled ? 'enabled' : 'disabled'} for ${childName}`)
    return data
  } catch (error) {
    console.error('학습 모드 토글 실패:', error)
    throw error
  }
}

/**
 * Get child learning mode status and settings
 * @param {string} childName - Name of the child
 * @returns {Object|null} Child learning settings
 */
export const getChildLearningSettings = async (childName) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('인증되지 않은 사용자입니다.')
    }

    const { data: child, error } = await supabase
      .from('children')
      .select('id, name, learning_mode_enabled, age_group, birthday, grade, school_name')
      .eq('user_id', user.id)
      .eq('name', childName)
      .maybeSingle()

    if (error) throw error
    return child
  } catch (error) {
    console.error('학습 설정 조회 실패:', error)
    throw error
  }
}

/**
 * Update child learning settings (age group, grade, school)
 * @param {string} childName - Name of the child
 * @param {Object} settings - Learning settings to update
 * @returns {Object|null} Updated child data
 */
export const updateChildLearningSettings = async (childName, settings) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('인증되지 않은 사용자입니다.')
    }

    const { data: child, error: childError } = await supabase
      .from('children')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', childName)
      .maybeSingle()

    if (childError || !child) {
      throw new Error('아이를 찾을 수 없습니다.')
    }

    // Only update allowed fields
    const allowedFields = ['birthday', 'grade', 'school_name']
    const updates = {}
    for (const field of allowedFields) {
      if (settings[field] !== undefined) {
        updates[field] = settings[field]
      }
    }

    const { data, error } = await supabase
      .from('children')
      .update(updates)
      .eq('id', child.id)
      .select()
      .maybeSingle()

    if (error) throw error

    console.log(`✅ Learning settings updated for ${childName}`)
    return data
  } catch (error) {
    console.error('학습 설정 업데이트 실패:', error)
    throw error
  }
}

// ============================================================================
// Goals - 목표 설정
// ============================================================================

/**
 * Create a new goal
 * @param {string} childName - Name of the child
 * @param {Object} goalData - Goal data (title, description, metric_type, target_value, etc.)
 * @returns {Object|null} Created goal
 */
export const createGoal = async (childName, goalData) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('인증되지 않은 사용자입니다.')
    }

    const { data: child, error: childError } = await supabase
      .from('children')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', childName)
      .maybeSingle()

    if (childError || !child) {
      throw new Error('아이를 찾을 수 없습니다.')
    }

    // Check if this is the first goal for this child
    const { data: existingGoals } = await supabase
      .from('goals')
      .select('id')
      .eq('child_id', child.id)
      .limit(1)

    const isFirstGoal = !existingGoals || existingGoals.length === 0

    const { data, error } = await supabase
      .from('goals')
      .insert({
        user_id: user.id,
        child_id: child.id,
        ...goalData
      })
      .select()
      .maybeSingle()

    if (error) throw error

    console.log(`✅ Goal created for ${childName}:`, goalData.title)

    // Trigger "first_goal" event if this is the first goal
    if (isFirstGoal) {
      await createProgressEvent(childName, 'first_goal', {
        goal_id: data.id,
        goal_title: goalData.title
      })
    }

    return data
  } catch (error) {
    console.error('목표 생성 실패:', error)
    throw error
  }
}

/**
 * Get all goals for a child
 * @param {string} childName - Name of the child
 * @param {Object} filters - Optional filters (status, parent_goal_id)
 * @returns {Array} List of goals
 */
export const getGoals = async (childName, filters = {}) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('인증되지 않은 사용자입니다.')
    }

    const { data: child, error: childError } = await supabase
      .from('children')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', childName)
      .maybeSingle()

    if (childError || !child) {
      throw new Error('아이를 찾을 수 없습니다.')
    }

    let query = supabase
      .from('goals')
      .select('*')
      .eq('child_id', child.id)

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    if (filters.parent_goal_id !== undefined) {
      if (filters.parent_goal_id === null) {
        query = query.is('parent_goal_id', null)
      } else {
        query = query.eq('parent_goal_id', filters.parent_goal_id)
      }
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('목표 조회 실패:', error)
    throw error
  }
}

/**
 * Update a goal
 * @param {string} goalId - Goal ID
 * @param {Object} updates - Fields to update
 * @returns {Object|null} Updated goal
 */
export const updateGoal = async (goalId, updates) => {
  try {
    const { data, error } = await supabase
      .from('goals')
      .update(updates)
      .eq('id', goalId)
      .select()
      .maybeSingle()

    if (error) throw error

    console.log(`✅ Goal updated:`, goalId)
    return data
  } catch (error) {
    console.error('목표 업데이트 실패:', error)
    throw error
  }
}

/**
 * Delete a goal
 * @param {string} goalId - Goal ID
 * @returns {boolean} Success status
 */
export const deleteGoal = async (goalId) => {
  try {
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', goalId)

    if (error) throw error

    console.log(`✅ Goal deleted:`, goalId)
    return true
  } catch (error) {
    console.error('목표 삭제 실패:', error)
    throw error
  }
}

/**
 * Mark goal as completed
 * @param {string} goalId - Goal ID
 * @returns {Object|null} Updated goal
 */
export const completeGoal = async (goalId) => {
  try {
    // 1. Get goal details first to get child info
    const { data: goal, error: getError } = await supabase
      .from('goals')
      .select('*, children!inner(name)')
      .eq('id', goalId)
      .maybeSingle()

    if (getError || !goal) throw getError || new Error('목표를 찾을 수 없습니다.')

    // 2. Update goal status
    const { data, error } = await supabase
      .from('goals')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', goalId)
      .select()
      .maybeSingle()

    if (error) throw error

    console.log(`✅ Goal completed:`, goalId)

    // 3. Create progress event to trigger rewards
    const childName = goal.children.name
    await createProgressEvent(childName, 'goal_completed', {
      goal_id: goalId,
      goal_title: goal.title
    })

    return data
  } catch (error) {
    console.error('목표 완료 실패:', error)
    throw error
  }
}

// ============================================================================
// Progress Events - 보상 트리거
// ============================================================================

/**
 * Create a progress event (triggers rewards)
 * @param {string} childName - Name of the child
 * @param {string} eventType - Event type (goal_completed, streak_3, etc.)
 * @param {Object} payload - Event payload
 * @returns {Object|null} Created event
 */
export const createProgressEvent = async (childName, eventType, payload = {}) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('인증되지 않은 사용자입니다.')
    }

    const { data: child, error: childError } = await supabase
      .from('children')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', childName)
      .maybeSingle()

    if (childError || !child) {
      throw new Error('아이를 찾을 수 없습니다.')
    }

    const { data, error } = await supabase
      .from('progress_events')
      .insert({
        user_id: user.id,
        child_id: child.id,
        event_type: eventType,
        payload
      })
      .select()
      .maybeSingle()

    if (error) throw error

    console.log(`✅ Progress event created:`, eventType)
    return data
  } catch (error) {
    console.error('진행 이벤트 생성 실패:', error)
    throw error
  }
}

/**
 * Get unrewarded progress events
 * @param {string} childName - Name of the child
 * @returns {Array} List of unrewarded events
 */
export const getUnrewardedEvents = async (childName) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('인증되지 않은 사용자입니다.')
    }

    const { data: child, error: childError } = await supabase
      .from('children')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', childName)
      .maybeSingle()

    if (childError || !child) {
      throw new Error('아이를 찾을 수 없습니다.')
    }

    const { data, error } = await supabase
      .from('progress_events')
      .select('*')
      .eq('child_id', child.id)
      .eq('reward_issued', false)
      .order('occurred_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('미지급 이벤트 조회 실패:', error)
    throw error
  }
}

// ============================================================================
// Rewards - 보상 시스템
// ============================================================================

/**
 * Get all rewards for a child
 * @param {string} childName - Name of the child
 * @returns {Array} List of rewards with definitions
 */
export const getChildRewards = async (childName) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('인증되지 않은 사용자입니다.')
    }

    const { data: child, error: childError } = await supabase
      .from('children')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', childName)
      .maybeSingle()

    if (childError || !child) {
      throw new Error('아이를 찾을 수 없습니다.')
    }

    const { data, error } = await supabase
      .from('rewards_ledger')
      .select(`
        *,
        reward:reward_definitions(*)
      `)
      .eq('child_id', child.id)
      .order('earned_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('보상 조회 실패:', error)
    throw error
  }
}

/**
 * Get new (unviewed) rewards for a child
 * @param {string} childName - Name of the child
 * @returns {Array} List of new rewards
 */
export const getNewRewards = async (childName) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('인증되지 않은 사용자입니다.')
    }

    const { data: child, error: childError } = await supabase
      .from('children')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', childName)
      .maybeSingle()

    if (childError || !child) {
      throw new Error('아이를 찾을 수 없습니다.')
    }

    const { data, error } = await supabase
      .from('rewards_ledger')
      .select(`
        *,
        reward:reward_definitions(*)
      `)
      .eq('child_id', child.id)
      .eq('is_new', true)
      .order('earned_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('신규 보상 조회 실패:', error)
    throw error
  }
}

/**
 * Mark rewards as viewed
 * @param {Array} rewardIds - Array of reward ledger IDs
 * @returns {boolean} Success status
 */
export const markRewardsAsViewed = async (rewardIds) => {
  try {
    const { error } = await supabase
      .from('rewards_ledger')
      .update({
        is_new: false,
        viewed_at: new Date().toISOString()
      })
      .in('id', rewardIds)

    if (error) throw error

    console.log(`✅ ${rewardIds.length} rewards marked as viewed`)
    return true
  } catch (error) {
    console.error('보상 확인 실패:', error)
    throw error
  }
}

/**
 * Get all available reward definitions
 * @returns {Array} List of reward definitions
 */
export const getRewardDefinitions = async () => {
  try {
    const { data, error } = await supabase
      .from('reward_definitions')
      .select('*')
      .eq('is_active', true)
      .order('reward_type')

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('보상 정의 조회 실패:', error)
    throw error
  }
}
