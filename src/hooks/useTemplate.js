/**
 * Template Hooks
 * React Query hooks for habit template operations
 * Agent 3: Template System Developer
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  loadTemplates,
  loadTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  createWeekFromTemplate
} from '@/lib/templates'

/**
 * Query hook to load all templates with optional filters
 *
 * @param {Object} filters - Filter options
 * @param {string} filters.child_id - Filter by child ID
 * @param {boolean} filters.is_default - Filter by default templates only
 * @returns {Object} React Query result
 */
export function useTemplates(filters = {}) {
  return useQuery({
    queryKey: ['templates', filters],
    queryFn: () => loadTemplates(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  })
}

/**
 * Query hook to load a single template by ID
 *
 * @param {string} templateId - Template ID
 * @returns {Object} React Query result
 */
export function useTemplate(templateId) {
  return useQuery({
    queryKey: ['template', templateId],
    queryFn: () => loadTemplate(templateId),
    staleTime: 5 * 60 * 1000,
    enabled: !!templateId,
    retry: 1
  })
}

/**
 * Mutation hook to create a new template
 *
 * @returns {Object} React Query mutation result
 */
export function useCreateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createTemplate,
    onSuccess: () => {
      // Invalidate all template queries to refetch
      queryClient.invalidateQueries({ queryKey: ['templates'] })
    },
    onError: (error) => {
      console.error('템플릿 생성 실패:', error)
    }
  })
}

/**
 * Mutation hook to update an existing template
 *
 * @returns {Object} React Query mutation result
 */
export function useUpdateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }) => updateTemplate(id, updates),
    onSuccess: (data) => {
      // Invalidate queries for this specific template and all templates
      queryClient.invalidateQueries({ queryKey: ['template', data.id] })
      queryClient.invalidateQueries({ queryKey: ['templates'] })
    },
    onError: (error) => {
      console.error('템플릿 업데이트 실패:', error)
    }
  })
}

/**
 * Mutation hook to delete a template
 *
 * @returns {Object} React Query mutation result
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      // Invalidate all template queries to refetch
      queryClient.invalidateQueries({ queryKey: ['templates'] })
    },
    onError: (error) => {
      console.error('템플릿 삭제 실패:', error)
    }
  })
}

/**
 * Mutation hook to create a week from a template
 *
 * @returns {Object} React Query mutation result
 */
export function useCreateWeekFromTemplate() {
  return useMutation({
    mutationFn: ({ templateId, childName, weekStartDate }) =>
      createWeekFromTemplate(templateId, childName, weekStartDate),
    onError: (error) => {
      console.error('템플릿으로 주차 생성 실패:', error)
    }
  })
}
