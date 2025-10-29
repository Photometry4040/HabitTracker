/**
 * Mandala Nodes API - Phase 5.4
 * New API for mandala_nodes table (81칸 support)
 * Uses normalized table structure instead of JSONB
 */

import { supabase } from './supabase.js'

// ============================================================================
// Core Node Operations
// ============================================================================

/**
 * Get all nodes for a mandala chart (hierarchical structure)
 * @param {string} chartId - Mandala chart ID
 * @param {number} maxLevel - Maximum level to fetch (1-3, default: 3)
 * @returns {Object} Hierarchical node structure
 */
export const getMandalaNodes = async (chartId, maxLevel = 3) => {
  try {
    const { data: nodes, error } = await supabase
      .from('mandala_nodes')
      .select(`
        *,
        goal:goals(*)
      `)
      .eq('mandala_chart_id', chartId)
      .lte('level', maxLevel)
      .eq('is_active', true)
      .order('level', { ascending: true })
      .order('position', { ascending: true })

    if (error) throw error

    // Build hierarchical structure
    const nodeMap = {}
    const rootNodes = []

    nodes.forEach(node => {
      nodeMap[node.id] = { ...node, children: [] }
    })

    nodes.forEach(node => {
      if (node.parent_node_id) {
        const parent = nodeMap[node.parent_node_id]
        if (parent) {
          parent.children.push(nodeMap[node.id])
        }
      } else {
        // Level 1 nodes (no parent)
        rootNodes.push(nodeMap[node.id])
      }
    })

    return {
      nodes: rootNodes,
      totalCount: nodes.length,
      levelCounts: {
        level1: nodes.filter(n => n.level === 1).length,
        level2: nodes.filter(n => n.level === 2).length,
        level3: nodes.filter(n => n.level === 3).length
      }
    }
  } catch (error) {
    console.error('노드 조회 실패:', error)
    throw error
  }
}

/**
 * Get nodes at a specific level
 * @param {string} chartId - Mandala chart ID
 * @param {number} level - Level (1, 2, or 3)
 * @param {string} parentNodeId - Parent node ID (optional, for level 2/3)
 * @returns {Array} List of nodes
 */
export const getNodesByLevel = async (chartId, level, parentNodeId = null) => {
  try {
    let query = supabase
      .from('mandala_nodes')
      .select(`
        *,
        goal:goals(*)
      `)
      .eq('mandala_chart_id', chartId)
      .eq('level', level)
      .eq('is_active', true)
      .order('position', { ascending: true })

    if (level === 1) {
      query = query.is('parent_node_id', null)
    } else if (parentNodeId) {
      query = query.eq('parent_node_id', parentNodeId)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('레벨별 노드 조회 실패:', error)
    throw error
  }
}

/**
 * Get a single node by ID
 * @param {string} nodeId - Node ID
 * @returns {Object} Node data
 */
export const getNode = async (nodeId) => {
  try {
    const { data, error } = await supabase
      .from('mandala_nodes')
      .select(`
        *,
        goal:goals(*),
        parent:mandala_nodes!parent_node_id(id, title, level, position)
      `)
      .eq('id', nodeId)
      .maybeSingle()

    if (error) throw error
    if (!data) throw new Error('노드를 찾을 수 없습니다.')

    return data
  } catch (error) {
    console.error('노드 조회 실패:', error)
    throw error
  }
}

/**
 * Get child nodes of a parent node
 * @param {string} parentNodeId - Parent node ID
 * @returns {Array} List of child nodes
 */
export const getChildNodes = async (parentNodeId) => {
  try {
    const { data, error } = await supabase
      .from('mandala_nodes')
      .select(`
        *,
        goal:goals(*)
      `)
      .eq('parent_node_id', parentNodeId)
      .eq('is_active', true)
      .order('position', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('자식 노드 조회 실패:', error)
    throw error
  }
}

// ============================================================================
// Node CRUD Operations
// ============================================================================

/**
 * Create a new node
 * @param {string} chartId - Mandala chart ID
 * @param {Object} nodeData - Node data
 * @returns {Object} Created node
 */
export const createNode = async (chartId, nodeData) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('인증되지 않은 사용자입니다.')
    }

    const {
      parent_node_id = null,
      level,
      position,
      title,
      description = null,
      color = '#3B82F6',
      emoji = null,
      goal_id = null
    } = nodeData

    // Validate
    if (!title || title.trim().length < 1) {
      throw new Error('노드 제목을 입력해주세요.')
    }

    if (!level || level < 1 || level > 3) {
      throw new Error('레벨은 1-3 사이여야 합니다.')
    }

    if (!position || position < 1 || position > 8) {
      throw new Error('위치는 1-8 사이여야 합니다.')
    }

    // Check if position is already taken
    const { data: existingNode } = await supabase
      .from('mandala_nodes')
      .select('id')
      .eq('mandala_chart_id', chartId)
      .eq('level', level)
      .eq('position', position)
      .is('parent_node_id', parent_node_id)
      .maybeSingle()

    if (existingNode) {
      throw new Error(`Position ${position}은(는) 이미 사용 중입니다.`)
    }

    const { data, error } = await supabase
      .from('mandala_nodes')
      .insert({
        user_id: user.id,
        mandala_chart_id: chartId,
        parent_node_id,
        level,
        position,
        title,
        description,
        color,
        emoji,
        goal_id,
        completed: false,
        completion_rate: 0,
        expanded: false
      })
      .select()
      .maybeSingle()

    if (error) throw error

    console.log(`✅ Node created: ${title} (level ${level}, position ${position})`)
    return data
  } catch (error) {
    console.error('노드 생성 실패:', error)
    throw error
  }
}

/**
 * Update a node
 * @param {string} nodeId - Node ID
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated node
 */
export const updateNode = async (nodeId, updates) => {
  try {
    const allowedFields = [
      'title',
      'description',
      'color',
      'emoji',
      'completed',
      'completion_rate',
      'expanded',
      'goal_id',
      'is_active'
    ]

    const sanitizedUpdates = {}
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        sanitizedUpdates[key] = updates[key]
      }
    })

    const { data, error } = await supabase
      .from('mandala_nodes')
      .update(sanitizedUpdates)
      .eq('id', nodeId)
      .select()
      .maybeSingle()

    if (error) throw error

    console.log(`✅ Node updated: ${nodeId}`)
    return data
  } catch (error) {
    console.error('노드 업데이트 실패:', error)
    throw error
  }
}

/**
 * Delete a node (and all its descendants)
 * @param {string} nodeId - Node ID
 * @returns {boolean} Success status
 */
export const deleteNode = async (nodeId) => {
  try {
    // Soft delete (set is_active = false)
    const { error } = await supabase
      .from('mandala_nodes')
      .update({ is_active: false })
      .eq('id', nodeId)

    if (error) throw error

    // Also soft delete all descendants (CASCADE via trigger would handle this in real delete)
    // For soft delete, we need to do it manually
    const descendants = await getAllDescendants(nodeId)
    if (descendants.length > 0) {
      const descendantIds = descendants.map(d => d.id)
      await supabase
        .from('mandala_nodes')
        .update({ is_active: false })
        .in('id', descendantIds)
    }

    console.log(`✅ Node deleted (soft): ${nodeId} and ${descendants.length} descendants`)
    return true
  } catch (error) {
    console.error('노드 삭제 실패:', error)
    throw error
  }
}

/**
 * Expand a node (create 8 child nodes at next level)
 * @param {string} nodeId - Parent node ID
 * @param {Array} childrenData - Optional array of 8 child node titles
 * @returns {Array} Created child nodes
 */
export const expandNode = async (nodeId, childrenData = []) => {
  try {
    const parentNode = await getNode(nodeId)

    if (parentNode.level >= 3) {
      throw new Error('레벨 3 노드는 더 이상 확장할 수 없습니다.')
    }

    if (parentNode.expanded) {
      throw new Error('이미 확장된 노드입니다.')
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('인증되지 않은 사용자입니다.')
    }

    const childLevel = parentNode.level + 1
    const createdNodes = []

    // Create 8 child nodes
    for (let position = 1; position <= 8; position++) {
      const childData = childrenData[position - 1] || {}

      const { data, error } = await supabase
        .from('mandala_nodes')
        .insert({
          user_id: user.id,
          mandala_chart_id: parentNode.mandala_chart_id,
          parent_node_id: nodeId,
          level: childLevel,
          position,
          title: childData.title || `${parentNode.title} - ${position}`,
          description: childData.description || null,
          color: childData.color || parentNode.color,
          emoji: childData.emoji || null,
          goal_id: childData.goal_id || null,
          completed: false,
          completion_rate: 0,
          expanded: false
        })
        .select()
        .maybeSingle()

      if (error) throw error
      createdNodes.push(data)
    }

    // Mark parent as expanded
    await updateNode(nodeId, { expanded: true })

    console.log(`✅ Node expanded: ${nodeId} → ${createdNodes.length} children created`)
    return createdNodes
  } catch (error) {
    console.error('노드 확장 실패:', error)
    throw error
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all descendants of a node (recursive)
 * @param {string} nodeId - Parent node ID
 * @returns {Array} All descendant nodes
 */
export const getAllDescendants = async (nodeId) => {
  try {
    const { data, error } = await supabase
      .rpc('get_all_descendants', { node_id: nodeId })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('하위 노드 조회 실패:', error)
    // Fallback to manual recursive query
    return await getAllDescendantsManual(nodeId)
  }
}

/**
 * Manual recursive descendant query (fallback)
 * @param {string} nodeId - Parent node ID
 * @returns {Array} All descendant nodes
 */
const getAllDescendantsManual = async (nodeId) => {
  const descendants = []
  const queue = [nodeId]

  while (queue.length > 0) {
    const currentId = queue.shift()
    const children = await getChildNodes(currentId)

    descendants.push(...children)
    queue.push(...children.map(c => c.id))
  }

  return descendants
}

/**
 * Find node by goal ID
 * @param {string} goalId - Goal ID
 * @returns {Object|null} Node with matching goal_id
 */
export const findNodeByGoalId = async (goalId) => {
  try {
    const { data, error } = await supabase
      .from('mandala_nodes')
      .select(`
        *,
        mandala_chart:mandala_charts(id, center_goal, child_id)
      `)
      .eq('goal_id', goalId)
      .eq('is_active', true)
      .maybeSingle()

    if (error) throw error
    return data
  } catch (error) {
    console.error('목표별 노드 찾기 실패:', error)
    return null
  }
}

/**
 * Calculate node completion rate based on children
 * @param {string} nodeId - Node ID
 * @returns {number} Calculated completion rate (0-100)
 */
export const calculateNodeCompletion = async (nodeId) => {
  try {
    const children = await getChildNodes(nodeId)

    if (children.length === 0) {
      // Leaf node - return own completion rate
      const node = await getNode(nodeId)
      return node.completion_rate || 0
    }

    // Calculate average of children
    const totalCompletion = children.reduce((sum, child) => {
      return sum + (child.completion_rate || 0)
    }, 0)

    const averageCompletion = Math.round(totalCompletion / children.length)

    // Update own completion rate
    await updateNode(nodeId, {
      completion_rate: averageCompletion,
      completed: averageCompletion >= 100
    })

    return averageCompletion
  } catch (error) {
    console.error('노드 진행률 계산 실패:', error)
    throw error
  }
}

/**
 * Recalculate completion for entire chart (bottom-up)
 * @param {string} chartId - Mandala chart ID
 * @returns {Object} Completion statistics
 */
export const recalculateChartCompletion = async (chartId) => {
  try {
    // Get all nodes for this chart, ordered by level DESC (bottom-up)
    const { data: nodes, error } = await supabase
      .from('mandala_nodes')
      .select('id, level, parent_node_id, completion_rate')
      .eq('mandala_chart_id', chartId)
      .eq('is_active', true)
      .order('level', { ascending: false }) // Start from deepest level

    if (error) throw error

    const nodesByLevel = {
      1: [],
      2: [],
      3: []
    }

    nodes.forEach(node => {
      nodesByLevel[node.level].push(node)
    })

    // Process level 3 first, then 2, then 1
    for (let level = 3; level >= 1; level--) {
      const levelNodes = nodesByLevel[level]

      for (const node of levelNodes) {
        if (level === 3) {
          // Leaf nodes - no children, keep their own rate
          continue
        } else {
          // Calculate based on children
          await calculateNodeCompletion(node.id)
        }
      }
    }

    // Calculate overall chart completion
    const level1Nodes = nodesByLevel[1]
    if (level1Nodes.length > 0) {
      const { data: updatedLevel1 } = await supabase
        .from('mandala_nodes')
        .select('completion_rate')
        .in('id', level1Nodes.map(n => n.id))

      const totalCompletion = updatedLevel1.reduce((sum, n) => sum + (n.completion_rate || 0), 0)
      const overallRate = Math.round(totalCompletion / level1Nodes.length)

      // Update chart
      await supabase
        .from('mandala_charts')
        .update({ overall_completion_rate: overallRate })
        .eq('id', chartId)

      console.log(`✅ Chart completion recalculated: ${overallRate}%`)

      return {
        overall: overallRate,
        level1Avg: overallRate,
        level2Avg: nodesByLevel[2].length > 0
          ? Math.round(nodesByLevel[2].reduce((s, n) => s + (n.completion_rate || 0), 0) / nodesByLevel[2].length)
          : 0,
        level3Avg: nodesByLevel[3].length > 0
          ? Math.round(nodesByLevel[3].reduce((s, n) => s + (n.completion_rate || 0), 0) / nodesByLevel[3].length)
          : 0
      }
    }

    return { overall: 0, level1Avg: 0, level2Avg: 0, level3Avg: 0 }
  } catch (error) {
    console.error('차트 진행률 재계산 실패:', error)
    throw error
  }
}

// ============================================================================
// Goal Integration
// ============================================================================

/**
 * Link a goal to a node
 * @param {string} nodeId - Node ID
 * @param {string} goalId - Goal ID
 * @returns {Object} Updated node
 */
export const linkGoalToNode = async (nodeId, goalId) => {
  try {
    const { data, error } = await supabase
      .from('mandala_nodes')
      .update({ goal_id: goalId })
      .eq('id', nodeId)
      .select()
      .maybeSingle()

    if (error) throw error

    console.log(`✅ Goal linked to node: ${goalId} → ${nodeId}`)
    return data
  } catch (error) {
    console.error('목표 연결 실패:', error)
    throw error
  }
}

/**
 * Sync goal progress to node completion
 * @param {string} goalId - Goal ID
 * @returns {Object|null} Updated node
 */
export const syncGoalProgressToNode = async (goalId) => {
  try {
    const node = await findNodeByGoalId(goalId)
    if (!node) {
      console.warn(`No node found for goal: ${goalId}`)
      return null
    }

    // Get goal details
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .maybeSingle()

    if (goalError || !goal) {
      console.warn(`Goal not found: ${goalId}`)
      return null
    }

    // Calculate completion rate
    let completionRate = 0
    let completed = false

    if (goal.status === 'completed') {
      completionRate = 100
      completed = true
    } else if (goal.metric_type === 'boolean') {
      completionRate = 0
      completed = false
    } else if (goal.target_value && goal.target_value > 0) {
      completionRate = Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
      completed = completionRate >= 100
    }

    // Update node
    const updatedNode = await updateNode(node.id, {
      completion_rate: completionRate,
      completed
    })

    // Recalculate parent nodes up the tree
    if (node.parent_node_id) {
      await calculateNodeCompletion(node.parent_node_id)

      // If parent has parent, continue up
      const parent = await getNode(node.parent_node_id)
      if (parent.parent_node_id) {
        await calculateNodeCompletion(parent.parent_node_id)
      }
    }

    console.log(`✅ Goal synced to node: ${goalId} → ${completionRate}%`)
    return updatedNode
  } catch (error) {
    console.error('목표 동기화 실패:', error)
    throw error
  }
}
