/**
 * Mandala Expansion API - Phase 5.4
 * Functions for 81칸 Mandala expansion using mandala_nodes table
 */

import { supabase } from './supabase.js'

// ============================================================================
// Node Expansion Functions
// ============================================================================

/**
 * Expand a mandala node (create 8 child nodes)
 * @param {string} parentNodeId - Parent node ID (UUID)
 * @param {Array} childrenTitles - Optional array of 8 titles for child nodes
 * @returns {Array} Created child nodes
 */
export const expandMandalaNode = async (parentNodeId, childrenTitles = []) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('인증되지 않은 사용자입니다.')
    }

    // Get parent node
    const { data: parentNode, error: parentError } = await supabase
      .from('mandala_nodes')
      .select('*')
      .eq('id', parentNodeId)
      .maybeSingle()

    if (parentError || !parentNode) {
      throw new Error('부모 노드를 찾을 수 없습니다.')
    }

    if (parentNode.level >= 3) {
      throw new Error('레벨 3 노드는 더 이상 확장할 수 없습니다.')
    }

    // Check if already has children (more reliable than expanded flag)
    const { data: existingChildren } = await supabase
      .from('mandala_nodes')
      .select('id')
      .eq('parent_node_id', parentNodeId)
      .eq('is_active', true)

    if (existingChildren && existingChildren.length > 0) {
      throw new Error('이미 확장된 노드입니다. 기존 자식 노드가 존재합니다.')
    }

    const childLevel = parentNode.level + 1
    const createdNodes = []

    // Create 8 child nodes
    for (let pos = 1; pos <= 8; pos++) {
      const title = childrenTitles[pos - 1] || `${parentNode.title} - ${pos}`

      const { data: childNode, error: insertError } = await supabase
        .from('mandala_nodes')
        .insert({
          user_id: user.id,
          mandala_chart_id: parentNode.mandala_chart_id,
          parent_node_id: parentNodeId,
          level: childLevel,
          node_position: pos,
          title,
          color: parentNode.color,
          emoji: null,
          completed: false,
          completion_rate: 0,
          expanded: false
        })
        .select()
        .maybeSingle()

      if (insertError) throw insertError
      createdNodes.push(childNode)
    }

    // Mark parent as expanded
    const { error: updateError } = await supabase
      .from('mandala_nodes')
      .update({ expanded: true })
      .eq('id', parentNodeId)

    if (updateError) throw updateError

    console.log(`✅ Node expanded: ${parentNode.title} → ${createdNodes.length} children`)
    return createdNodes
  } catch (error) {
    console.error('노드 확장 실패:', error)
    throw error
  }
}

/**
 * Get child nodes of a parent node
 * @param {string} parentNodeId - Parent node ID
 * @returns {Array} Child nodes
 */
export const getChildMandalaNodes = async (parentNodeId) => {
  try {
    const { data, error } = await supabase
      .from('mandala_nodes')
      .select(`
        *,
        goal:goals(*)
      `)
      .eq('parent_node_id', parentNodeId)
      .eq('is_active', true)
      .order('node_position', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('자식 노드 조회 실패:', error)
    throw error
  }
}

/**
 * Get all nodes for a chart (hierarchical)
 * @param {string} chartId - Mandala chart ID
 * @param {number} maxLevel - Maximum level to fetch (default: 3)
 * @returns {Object} { level1Nodes, level2Nodes, level3Nodes, allNodes }
 */
export const getMandalaNodesHierarchy = async (chartId, maxLevel = 3) => {
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
      .order('node_position', { ascending: true })

    if (error) throw error

    const level1Nodes = nodes.filter(n => n.level === 1)
    const level2Nodes = nodes.filter(n => n.level === 2)
    const level3Nodes = nodes.filter(n => n.level === 3)

    return {
      level1Nodes,
      level2Nodes,
      level3Nodes,
      allNodes: nodes,
      totalCount: nodes.length
    }
  } catch (error) {
    console.error('계층 노드 조회 실패:', error)
    throw error
  }
}

/**
 * Update a mandala node
 * @param {string} nodeId - Node ID
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated node
 */
export const updateMandalaNodeData = async (nodeId, updates) => {
  try {
    const allowedFields = [
      'title',
      'description',
      'color',
      'emoji',
      'completed',
      'completion_rate',
      'goal_id'
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
 * Delete a mandala node (soft delete)
 * @param {string} nodeId - Node ID
 * @returns {boolean} Success
 */
export const deleteMandalaNodeData = async (nodeId) => {
  try {
    const { error } = await supabase
      .from('mandala_nodes')
      .update({ is_active: false })
      .eq('id', nodeId)

    if (error) throw error

    console.log(`✅ Node deleted (soft): ${nodeId}`)
    return true
  } catch (error) {
    console.error('노드 삭제 실패:', error)
    throw error
  }
}

/**
 * Check if node can be expanded
 * @param {string} nodeId - Node ID
 * @returns {Object} { canExpand: boolean, reason: string }
 */
export const canExpandNode = async (nodeId) => {
  try {
    const { data: node, error } = await supabase
      .from('mandala_nodes')
      .select('level')
      .eq('id', nodeId)
      .maybeSingle()

    if (error || !node) {
      return { canExpand: false, reason: '노드를 찾을 수 없습니다.' }
    }

    if (node.level >= 3) {
      return { canExpand: false, reason: '레벨 3 노드는 더 이상 확장할 수 없습니다.' }
    }

    // Check if already has children (more reliable than expanded flag)
    const { data: existingChildren } = await supabase
      .from('mandala_nodes')
      .select('id')
      .eq('parent_node_id', nodeId)
      .eq('is_active', true)

    if (existingChildren && existingChildren.length > 0) {
      return { canExpand: false, reason: '이미 확장된 노드입니다. 기존 자식 노드가 존재합니다.' }
    }

    return { canExpand: true, reason: '확장 가능' }
  } catch (error) {
    console.error('확장 가능 여부 확인 실패:', error)
    return { canExpand: false, reason: error.message }
  }
}

/**
 * Collapse a node (mark as not expanded, but keep children)
 * @param {string} nodeId - Node ID
 * @returns {boolean} Success
 */
export const collapseMandalaNode = async (nodeId) => {
  try {
    const { error } = await supabase
      .from('mandala_nodes')
      .update({ expanded: false })
      .eq('id', nodeId)

    if (error) throw error

    console.log(`✅ Node collapsed: ${nodeId}`)
    return true
  } catch (error) {
    console.error('노드 축소 실패:', error)
    throw error
  }
}

/**
 * Recalculate completion rate bottom-up
 * @param {string} chartId - Mandala chart ID
 * @returns {Object} Completion stats
 */
export const recalculateMandalaCompletion = async (chartId) => {
  try {
    const { data: nodes, error } = await supabase
      .from('mandala_nodes')
      .select('id, level, parent_node_id, completion_rate')
      .eq('mandala_chart_id', chartId)
      .eq('is_active', true)
      .order('level', { ascending: false }) // Start from deepest level

    if (error) throw error

    // Group by level
    const nodesByLevel = { 1: [], 2: [], 3: [] }
    nodes.forEach(node => {
      if (nodesByLevel[node.level]) {
        nodesByLevel[node.level].push(node)
      }
    })

    // Calculate from level 2 up to level 1
    for (let level = 2; level >= 1; level--) {
      const levelNodes = nodesByLevel[level]

      for (const node of levelNodes) {
        // Get children
        const children = nodes.filter(n => n.parent_node_id === node.id)

        if (children.length > 0) {
          const avgCompletion = Math.round(
            children.reduce((sum, child) => sum + (child.completion_rate || 0), 0) / children.length
          )

          // Update node completion
          await supabase
            .from('mandala_nodes')
            .update({
              completion_rate: avgCompletion,
              completed: avgCompletion >= 100
            })
            .eq('id', node.id)
        }
      }
    }

    // Update chart overall_completion_rate
    const level1Avg = nodesByLevel[1].length > 0
      ? Math.round(nodesByLevel[1].reduce((s, n) => s + (n.completion_rate || 0), 0) / nodesByLevel[1].length)
      : 0

    await supabase
      .from('mandala_charts')
      .update({ overall_completion_rate: level1Avg })
      .eq('id', chartId)

    console.log(`✅ Chart completion recalculated: ${level1Avg}%`)
    return {
      overall: level1Avg,
      level1Count: nodesByLevel[1].length,
      level2Count: nodesByLevel[2].length,
      level3Count: nodesByLevel[3].length
    }
  } catch (error) {
    console.error('진행률 재계산 실패:', error)
    throw error
  }
}
