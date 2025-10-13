/**
 * Template System - Database Operations
 * Manages habit templates for quick week creation
 * Agent 3: Template System Developer
 */

import { supabase } from './supabase.js'

/**
 * Create a new habit template
 * @param {string} name - Template name (e.g., "학기 중 루틴")
 * @param {Array} habits - Array of habit objects [{id, name, times}, ...]
 * @param {string|null} childId - Optional child ID (null = shared template)
 * @param {string} description - Optional description
 * @param {boolean} isDefault - Whether this is the default template
 * @returns {Object|null} Created template
 */
export const createTemplate = async (name, habits, childId = null, description = '', isDefault = false) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('인증되지 않은 사용자입니다.')
    }

    // Transform habits to template format (remove times, keep only name)
    const templateHabits = habits.map((habit, index) => ({
      name: habit.name,
      display_order: index
    }))

    // If setting as default, unset other defaults first
    if (isDefault) {
      const { error: updateError } = await supabase
        .from('habit_templates')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('child_id', childId)

      if (updateError) {
        console.warn('Failed to unset other defaults:', updateError)
      }
    }

    // Insert new template
    const { data, error } = await supabase
      .from('habit_templates')
      .insert({
        user_id: user.id,
        child_id: childId,
        name,
        description,
        habits: templateHabits,
        is_default: isDefault
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating template:', error)
      throw error
    }

    console.log('Template created:', data)
    return data
  } catch (error) {
    console.error('Failed to create template:', error)
    throw error
  }
}

/**
 * Get all templates for current user
 * @param {string|null} childId - Optional filter by child ID
 * @returns {Array} Array of templates
 */
export const getTemplates = async (childId = null) => {
  try {
    console.log('🔍 [getTemplates] Starting with childId:', childId)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('🔍 [getTemplates] Auth error:', userError)
      throw new Error('인증되지 않은 사용자입니다.')
    }

    console.log('🔍 [getTemplates] User authenticated:', user.id)

    let query = supabase
      .from('habit_templates')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Filter by child_id if provided (null matches NULL in database)
    // Special value 'ALL' means no filtering
    if (childId !== undefined && childId !== 'ALL') {
      console.log('🔍 [getTemplates] Filtering by childId:', childId)
      if (childId === null) {
        // Use .is() for NULL checks in PostgreSQL
        query = query.is('child_id', null)
      } else {
        query = query.eq('child_id', childId)
      }
    } else {
      console.log('🔍 [getTemplates] No childId filter (showing all templates for user)')
    }

    const { data, error } = await query

    if (error) {
      console.error('🔍 [getTemplates] Query error:', error)
      throw error
    }

    console.log('🔍 [getTemplates] Found templates:', data?.length || 0, data)
    return data || []
  } catch (error) {
    console.error('🔍 [getTemplates] Failed to fetch templates:', error)
    return []
  }
}

/**
 * Get a specific template by ID
 * @param {string} templateId - Template UUID
 * @returns {Object|null} Template object
 */
export const getTemplate = async (templateId) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('인증되지 않은 사용자입니다.')
    }

    const { data, error } = await supabase
      .from('habit_templates')
      .select('*')
      .eq('id', templateId)
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Error fetching template:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Failed to fetch template:', error)
    return null
  }
}

/**
 * Update an existing template
 * @param {string} templateId - Template UUID
 * @param {Object} updates - Fields to update {name, description, habits, isDefault}
 * @returns {Object|null} Updated template
 */
export const updateTemplate = async (templateId, updates) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('인증되지 않은 사용자입니다.')
    }

    // Get current template to check child_id for default handling
    const currentTemplate = await getTemplate(templateId)
    if (!currentTemplate) {
      throw new Error('Template not found')
    }

    // If setting as default, unset other defaults first
    if (updates.is_default) {
      const { error: updateError } = await supabase
        .from('habit_templates')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('child_id', currentTemplate.child_id)
        .neq('id', templateId)

      if (updateError) {
        console.warn('Failed to unset other defaults:', updateError)
      }
    }

    // Transform habits if provided
    const updateData = { ...updates }
    if (updates.habits) {
      updateData.habits = updates.habits.map((habit, index) => ({
        name: habit.name,
        display_order: habit.display_order !== undefined ? habit.display_order : index
      }))
    }

    const { data, error } = await supabase
      .from('habit_templates')
      .update(updateData)
      .eq('id', templateId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating template:', error)
      throw error
    }

    console.log('Template updated:', data)
    return data
  } catch (error) {
    console.error('Failed to update template:', error)
    throw error
  }
}

/**
 * Delete a template
 * @param {string} templateId - Template UUID
 * @returns {boolean} Success status
 */
export const deleteTemplate = async (templateId) => {
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
      console.error('Error deleting template:', error)
      throw error
    }

    console.log('Template deleted:', templateId)
    return true
  } catch (error) {
    console.error('Failed to delete template:', error)
    throw error
  }
}

/**
 * Get the default template for user (optionally filtered by child)
 * @param {string|null} childId - Optional child ID
 * @returns {Object|null} Default template
 */
export const getDefaultTemplate = async (childId = null) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('인증되지 않은 사용자입니다.')
    }

    let query = supabase
      .from('habit_templates')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_default', true)

    // Handle null child_id with .is() instead of .eq()
    if (childId === null) {
      query = query.is('child_id', null)
    } else {
      query = query.eq('child_id', childId)
    }

    const { data, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No default template found (not an error)
        return null
      }
      console.error('Error fetching default template:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Failed to fetch default template:', error)
    return null
  }
}

/**
 * Apply a template to create habits array for a new week
 * Transforms template habits to the app's habit format
 * @param {Object} template - Template object
 * @returns {Array} Array of habits [{id, name, times: Array(7)}, ...]
 */
export const applyTemplate = (template) => {
  if (!template || !template.habits) {
    return []
  }

  // Sort habits by display_order
  const sortedHabits = [...template.habits].sort((a, b) =>
    (a.display_order || 0) - (b.display_order || 0)
  )

  // Transform to app format with empty times array
  return sortedHabits.map((habit, index) => ({
    id: Date.now() + index, // Generate unique ID
    name: habit.name,
    times: Array(7).fill('') // Empty 7-day array
  }))
}

/**
 * Save current week as a template
 * Convenience function that combines current state into a template
 * @param {string} name - Template name
 * @param {Array} habits - Current habits array
 * @param {string|null} childName - Child name (for finding child_id)
 * @param {string} description - Optional description
 * @param {boolean} isDefault - Whether this is the default template
 * @returns {Object|null} Created template
 */
export const saveWeekAsTemplate = async (name, habits, childName = null, description = '', isDefault = false) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('인증되지 않은 사용자입니다.')
    }

    // Find child_id if childName provided
    let childId = null
    if (childName) {
      const { data: child, error: childError } = await supabase
        .from('children')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', childName)
        .single()

      if (!childError && child) {
        childId = child.id
      }
    }

    return await createTemplate(name, habits, childId, description, isDefault)
  } catch (error) {
    console.error('Failed to save week as template:', error)
    throw error
  }
}
