/**
 * Templates Library
 * CRUD operations for habit_templates table
 * Agent 3: Template System Developer
 */

import { supabase } from './supabase.js'

/**
 * Get Supabase configuration for Edge Function calls
 */
function getSupabaseConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Supabase configuration not found')
  }

  return { url, anonKey }
}

/**
 * Create a new habit template
 *
 * @param {Object} templateData - Template data
 * @param {string} templateData.child_id - Child ID (UUID)
 * @param {string} templateData.name - Template name
 * @param {string} templateData.description - Template description (optional)
 * @param {Array} templateData.habits - Array of habit objects [{name, time_period, display_order}]
 * @param {boolean} templateData.is_default - Whether this is the default template
 * @returns {Object} Created template
 */
export async function createTemplate(templateData) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('인증되지 않은 사용자입니다.')
    }

    // Validate required fields
    if (!templateData.name) {
      throw new Error('템플릿 이름은 필수입니다.')
    }

    if (!Array.isArray(templateData.habits)) {
      throw new Error('습관 데이터는 배열이어야 합니다.')
    }

    // Insert template
    const { data, error } = await supabase
      .from('habit_templates')
      .insert({
        user_id: user.id,
        child_id: templateData.child_id || null,
        name: templateData.name,
        description: templateData.description || null,
        habits: templateData.habits,
        is_default: templateData.is_default || false
      })
      .select()
      .single()

    if (error) {
      console.error('템플릿 생성 오류:', error)
      throw error
    }

    console.log('템플릿 생성 성공:', data)
    return data
  } catch (error) {
    console.error('createTemplate 오류:', error)
    throw error
  }
}

/**
 * Load habit templates with optional filters
 *
 * @param {Object} filters - Filter options
 * @param {string} filters.child_id - Filter by child ID (optional)
 * @param {boolean} filters.is_default - Filter by default templates only (optional)
 * @returns {Array} Array of templates
 */
export async function loadTemplates(filters = {}) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('인증되지 않은 사용자입니다.')
    }

    let query = supabase
      .from('habit_templates')
      .select('*, children(id, name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters.child_id) {
      query = query.eq('child_id', filters.child_id)
    }

    if (filters.is_default !== undefined) {
      query = query.eq('is_default', filters.is_default)
    }

    const { data, error } = await query

    if (error) {
      console.error('템플릿 조회 오류:', error)
      throw error
    }

    console.log(`템플릿 ${data?.length || 0}개 조회 완료`)
    return data || []
  } catch (error) {
    console.error('loadTemplates 오류:', error)
    throw error
  }
}

/**
 * Load a single template by ID
 *
 * @param {string} templateId - Template ID (UUID)
 * @returns {Object|null} Template data
 */
export async function loadTemplate(templateId) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('인증되지 않은 사용자입니다.')
    }

    const { data, error } = await supabase
      .from('habit_templates')
      .select('*, children(id, name)')
      .eq('id', templateId)
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('템플릿 단일 조회 오류:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('loadTemplate 오류:', error)
    return null
  }
}

/**
 * Update an existing template
 *
 * @param {string} templateId - Template ID (UUID)
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated template
 */
export async function updateTemplate(templateId, updates) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('인증되지 않은 사용자입니다.')
    }

    // Ensure we only update allowed fields
    const allowedFields = ['name', 'description', 'habits', 'is_default']
    const filteredUpdates = {}

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key]
      }
    })

    filteredUpdates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('habit_templates')
      .update(filteredUpdates)
      .eq('id', templateId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('템플릿 업데이트 오류:', error)
      throw error
    }

    console.log('템플릿 업데이트 성공:', data)
    return data
  } catch (error) {
    console.error('updateTemplate 오류:', error)
    throw error
  }
}

/**
 * Delete a template
 *
 * @param {string} templateId - Template ID (UUID)
 * @returns {boolean} Success status
 */
export async function deleteTemplate(templateId) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('인증되지 않은 사용자입니다.')
    }

    const { error } = await supabase
      .from('habit_templates')
      .delete()
      .eq('id', templateId)
      .eq('user_id', user.id)

    if (error) {
      console.error('템플릿 삭제 오류:', error)
      throw error
    }

    console.log('템플릿 삭제 성공:', templateId)
    return true
  } catch (error) {
    console.error('deleteTemplate 오류:', error)
    throw error
  }
}

/**
 * Create a new week from a template using Edge Function
 *
 * @param {string} templateId - Template ID (UUID)
 * @param {string} childName - Child name
 * @param {string} weekStartDate - Week start date (YYYY-MM-DD)
 * @returns {Object} Created week data
 */
export async function createWeekFromTemplate(templateId, childName, weekStartDate) {
  try {
    // Load template
    const template = await loadTemplate(templateId)
    if (!template) {
      throw new Error('템플릿을 찾을 수 없습니다.')
    }

    // Get Supabase config
    const { url, anonKey } = getSupabaseConfig()

    // Call Edge Function (dual-write-habit)
    const weekData = {
      childName: childName,
      weekStartDate: weekStartDate,
      theme: template.description || '',
      habits: template.habits
    }

    const response = await fetch(`${url}/functions/v1/dual-write-habit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `template_${templateId}_${weekStartDate}`
      },
      body: JSON.stringify({
        action: 'create_week',
        data: weekData
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('주차 생성 실패:', errorText)
      throw new Error(`주차 생성 실패: ${response.status}`)
    }

    const result = await response.json()
    console.log('템플릿으로 주차 생성 성공:', result)
    return result
  } catch (error) {
    console.error('createWeekFromTemplate 오류:', error)
    throw error
  }
}

/**
 * Convert current week habits to template format
 * Useful for saving current week as a template
 *
 * @param {Array} habits - Array of habit objects from week data
 * @returns {Array} Template-compatible habits array
 */
export function convertHabitsToTemplate(habits) {
  return habits.map((habit, index) => ({
    name: habit.name,
    time_period: extractTimePeriod(habit.name),
    display_order: index
  }))
}

/**
 * Extract time period from habit name
 * Example: "아침 (6-9시) 스스로 일어나기" -> "아침 (6-9시)"
 *
 * @param {string} habitName - Full habit name
 * @returns {string} Time period or empty string
 */
function extractTimePeriod(habitName) {
  const match = habitName.match(/^(.+?\([^)]+\))/)
  return match ? match[1] : ''
}
