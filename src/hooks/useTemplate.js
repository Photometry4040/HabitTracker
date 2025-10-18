/**
 * Template System - React Hooks
 * Custom hooks for template management
 * Agent 3: Template System Developer
 *
 * Note: Uses standard React hooks (no React Query dependency)
 */

import { useState, useEffect, useCallback } from 'react'
import {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getDefaultTemplate,
  applyTemplate,
  saveWeekAsTemplate
} from '@/lib/templates.js'

/**
 * Hook to fetch and manage templates list
 * @param {string|null} childId - Optional filter by child ID
 * @returns {Object} { templates, loading, error, refetch }
 */
export const useTemplates = (childId = null) => {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getTemplates(childId)
      setTemplates(data)
    } catch (err) {
      setError(err)
      console.error('Error fetching templates:', err)
    } finally {
      setLoading(false)
    }
  }, [childId])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  return {
    templates,
    loading,
    error,
    refetch: fetchTemplates
  }
}

/**
 * Hook to fetch a single template
 * @param {string} templateId - Template UUID
 * @returns {Object} { template, loading, error, refetch }
 */
export const useTemplate = (templateId) => {
  const [template, setTemplate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTemplate = useCallback(async () => {
    if (!templateId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await getTemplate(templateId)
      setTemplate(data)
    } catch (err) {
      setError(err)
      console.error('Error fetching template:', err)
    } finally {
      setLoading(false)
    }
  }, [templateId])

  useEffect(() => {
    fetchTemplate()
  }, [fetchTemplate])

  return {
    template,
    loading,
    error,
    refetch: fetchTemplate
  }
}

/**
 * Hook to manage template mutations (create, update, delete)
 * @returns {Object} Mutation functions and states
 */
export const useTemplateMutations = () => {
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

  const create = useCallback(async (name, habits, childId = null, description = '', isDefault = false) => {
    try {
      setCreating(true)
      setError(null)
      const result = await createTemplate(name, habits, childId, description, isDefault)
      return result
    } catch (err) {
      setError(err)
      console.error('Error creating template:', err)
      throw err
    } finally {
      setCreating(false)
    }
  }, [])

  const update = useCallback(async (templateId, updates) => {
    try {
      setUpdating(true)
      setError(null)
      const result = await updateTemplate(templateId, updates)
      return result
    } catch (err) {
      setError(err)
      console.error('Error updating template:', err)
      throw err
    } finally {
      setUpdating(false)
    }
  }, [])

  const remove = useCallback(async (templateId) => {
    try {
      setDeleting(true)
      setError(null)
      const result = await deleteTemplate(templateId)
      return result
    } catch (err) {
      setError(err)
      console.error('Error deleting template:', err)
      throw err
    } finally {
      setDeleting(false)
    }
  }, [])

  const saveAsTemplate = useCallback(async (name, habits, childName = null, description = '', isDefault = false) => {
    try {
      setCreating(true)
      setError(null)
      const result = await saveWeekAsTemplate(name, habits, childName, description, isDefault)
      return result
    } catch (err) {
      setError(err)
      console.error('Error saving as template:', err)
      throw err
    } finally {
      setCreating(false)
    }
  }, [])

  return {
    create,
    update,
    remove,
    saveAsTemplate,
    creating,
    updating,
    deleting,
    error
  }
}

/**
 * Hook to get default template
 * @param {string|null} childId - Optional child ID
 * @returns {Object} { defaultTemplate, loading, error, refetch }
 */
export const useDefaultTemplate = (childId = null) => {
  const [defaultTemplate, setDefaultTemplate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchDefault = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getDefaultTemplate(childId)
      setDefaultTemplate(data)
    } catch (err) {
      setError(err)
      console.error('Error fetching default template:', err)
    } finally {
      setLoading(false)
    }
  }, [childId])

  useEffect(() => {
    fetchDefault()
  }, [fetchDefault])

  return {
    defaultTemplate,
    loading,
    error,
    refetch: fetchDefault
  }
}

/**
 * Hook to apply a template (utility)
 * @returns {Function} Function to apply template and return habits array
 */
export const useApplyTemplate = () => {
  return useCallback((template) => {
    return applyTemplate(template)
  }, [])
}
