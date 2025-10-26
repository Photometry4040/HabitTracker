/**
 * Weekly Planner API
 * Phase 5.2: Weekly learning plan management
 *
 * Tables:
 * - weekly_plans: Main weekly plan container
 * - daily_plan_items: Individual daily tasks
 * - weekly_plan_templates: Reusable templates
 */

import { supabase } from './supabase.js';

// ============================================================================
// Weekly Plans CRUD
// ============================================================================

/**
 * Create a new weekly plan
 * @param {Object} planData - Plan data
 * @param {string} planData.childId - Child ID
 * @param {string} planData.weekId - Week ID
 * @param {string} planData.title - Plan title
 * @param {string} [planData.description] - Plan description
 * @param {Array} [planData.goalTargets] - Goal targets array
 * @returns {Promise<Object>} Created plan
 */
export async function createWeeklyPlan(planData) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('weekly_plans')
    .insert([{
      user_id: user.id,
      child_id: planData.childId,
      week_id: planData.weekId,
      title: planData.title,
      description: planData.description || null,
      goal_targets: planData.goalTargets || [],
      status: 'draft'
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get weekly plan for a specific week
 * @param {string} childId - Child ID
 * @param {string} weekId - Week ID
 * @returns {Promise<Object|null>} Weekly plan or null
 */
export async function getWeeklyPlan(childId, weekId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('weekly_plans')
    .select('*')
    .eq('user_id', user.id)
    .eq('child_id', childId)
    .eq('week_id', weekId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Get all weekly plans for a child
 * @param {string} childId - Child ID
 * @param {number} [limit=10] - Maximum number of plans to return
 * @returns {Promise<Array>} Array of weekly plans
 */
export async function getChildWeeklyPlans(childId, limit = 10) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('weekly_plans')
    .select('*')
    .eq('user_id', user.id)
    .eq('child_id', childId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Update weekly plan
 * @param {string} planId - Plan ID
 * @param {Object} updates - Plan updates
 * @returns {Promise<Object>} Updated plan
 */
export async function updateWeeklyPlan(planId, updates) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('weekly_plans')
    .update(updates)
    .eq('id', planId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete weekly plan
 * @param {string} planId - Plan ID
 * @returns {Promise<void>}
 */
export async function deleteWeeklyPlan(planId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('weekly_plans')
    .delete()
    .eq('id', planId)
    .eq('user_id', user.id);

  if (error) throw error;
}

/**
 * Complete weekly plan (with reflection)
 * @param {string} planId - Plan ID
 * @param {Object} completionData - Completion data
 * @param {string} [completionData.reflection] - Weekly reflection
 * @param {string} [completionData.achievements] - Achievements
 * @param {string} [completionData.challenges] - Challenges faced
 * @param {string} [completionData.nextWeekFocus] - Next week focus
 * @returns {Promise<Object>} Updated plan
 */
export async function completeWeeklyPlan(planId, completionData) {
  return updateWeeklyPlan(planId, {
    status: 'completed',
    reflection: completionData.reflection,
    achievements: completionData.achievements,
    challenges: completionData.challenges,
    next_week_focus: completionData.nextWeekFocus
  });
}

// ============================================================================
// Daily Plan Items CRUD
// ============================================================================

/**
 * Add daily task to weekly plan
 * @param {Object} taskData - Task data
 * @param {string} taskData.weeklyPlanId - Weekly plan ID
 * @param {string} taskData.plannedDate - Planned date (YYYY-MM-DD)
 * @param {string} taskData.taskTitle - Task title
 * @param {string} [taskData.taskDescription] - Task description
 * @param {number} [taskData.estimatedMinutes] - Estimated time in minutes
 * @param {number} [taskData.priority=3] - Priority (1-5)
 * @param {string} [taskData.goalId] - Related goal ID
 * @returns {Promise<Object>} Created task
 */
export async function addDailyTask(taskData) {
  const plannedDate = new Date(taskData.plannedDate);
  const dayOfWeek = plannedDate.getDay();

  const { data, error } = await supabase
    .from('daily_plan_items')
    .insert([{
      weekly_plan_id: taskData.weeklyPlanId,
      goal_id: taskData.goalId || null,
      planned_date: taskData.plannedDate,
      day_of_week: dayOfWeek,
      task_title: taskData.taskTitle,
      task_description: taskData.taskDescription || null,
      estimated_minutes: taskData.estimatedMinutes || null,
      priority: taskData.priority || 3
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get daily tasks for a weekly plan
 * @param {string} weeklyPlanId - Weekly plan ID
 * @param {string} [date] - Filter by specific date (YYYY-MM-DD)
 * @returns {Promise<Array>} Array of daily tasks
 */
export async function getDailyTasks(weeklyPlanId, date = null) {
  let query = supabase
    .from('daily_plan_items')
    .select('*')
    .eq('weekly_plan_id', weeklyPlanId)
    .order('planned_date', { ascending: true })
    .order('priority', { ascending: true });

  if (date) {
    query = query.eq('planned_date', date);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Update daily task
 * @param {string} taskId - Task ID
 * @param {Object} updates - Task updates
 * @returns {Promise<Object>} Updated task
 */
export async function updateDailyTask(taskId, updates) {
  const { data, error } = await supabase
    .from('daily_plan_items')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Mark task as completed
 * @param {string} taskId - Task ID
 * @param {Object} [completionData] - Completion data
 * @param {number} [completionData.actualMinutes] - Actual time spent
 * @param {number} [completionData.difficultyRating] - Difficulty rating (1-5)
 * @param {string} [completionData.notes] - Completion notes
 * @returns {Promise<Object>} Updated task
 */
export async function completeTask(taskId, completionData = {}) {
  return updateDailyTask(taskId, {
    completed: true,
    actual_minutes: completionData.actualMinutes || null,
    difficulty_rating: completionData.difficultyRating || null,
    notes: completionData.notes || null
  });
}

/**
 * Mark task as incomplete
 * @param {string} taskId - Task ID
 * @returns {Promise<Object>} Updated task
 */
export async function uncompleteTask(taskId) {
  return updateDailyTask(taskId, {
    completed: false,
    actual_minutes: null,
    difficulty_rating: null
  });
}

/**
 * Delete daily task
 * @param {string} taskId - Task ID
 * @returns {Promise<void>}
 */
export async function deleteDailyTask(taskId) {
  const { error } = await supabase
    .from('daily_plan_items')
    .delete()
    .eq('id', taskId);

  if (error) throw error;
}

// ============================================================================
// Weekly Plan Templates CRUD
// ============================================================================

/**
 * Create a weekly plan template
 * @param {Object} templateData - Template data
 * @param {string} templateData.name - Template name
 * @param {string} [templateData.description] - Template description
 * @param {string} [templateData.category] - Template category
 * @param {string} [templateData.childId] - Child ID (null for global)
 * @param {Object} templateData.templateData - Template structure
 * @returns {Promise<Object>} Created template
 */
export async function createWeeklyPlanTemplate(templateData) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('weekly_plan_templates')
    .insert([{
      user_id: user.id,
      child_id: templateData.childId || null,
      name: templateData.name,
      description: templateData.description || null,
      category: templateData.category || null,
      template_data: templateData.templateData
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get templates for user
 * @param {string} [childId] - Filter by child ID
 * @returns {Promise<Array>} Array of templates
 */
export async function getWeeklyPlanTemplates(childId = null) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  let query = supabase
    .from('weekly_plan_templates')
    .select('*')
    .eq('user_id', user.id)
    .order('usage_count', { ascending: false });

  if (childId) {
    query = query.or(`child_id.is.null,child_id.eq.${childId}`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Apply template to weekly plan
 * @param {string} templateId - Template ID
 * @param {string} weeklyPlanId - Weekly plan ID
 * @param {string} weekStartDate - Week start date (YYYY-MM-DD)
 * @returns {Promise<Array>} Created daily tasks
 */
export async function applyTemplate(templateId, weeklyPlanId, weekStartDate) {
  // Get template
  const { data: template, error: templateError } = await supabase
    .from('weekly_plan_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (templateError) throw templateError;

  // Increment usage count
  await supabase
    .from('weekly_plan_templates')
    .update({ usage_count: template.usage_count + 1 })
    .eq('id', templateId);

  // Create daily tasks from template
  const tasks = template.template_data.daily_tasks || [];
  const createdTasks = [];

  for (const task of tasks) {
    const taskDate = new Date(weekStartDate);
    taskDate.setDate(taskDate.getDate() + task.day);  // 0-6 (일-토)

    const createdTask = await addDailyTask({
      weeklyPlanId,
      plannedDate: taskDate.toISOString().split('T')[0],
      taskTitle: task.task_title,
      taskDescription: task.task_description || null,
      estimatedMinutes: task.estimated_minutes || null,
      priority: task.priority || 3
    });

    createdTasks.push(createdTask);
  }

  return createdTasks;
}

/**
 * Update template
 * @param {string} templateId - Template ID
 * @param {Object} updates - Template updates
 * @returns {Promise<Object>} Updated template
 */
export async function updateWeeklyPlanTemplate(templateId, updates) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('weekly_plan_templates')
    .update(updates)
    .eq('id', templateId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete template
 * @param {string} templateId - Template ID
 * @returns {Promise<void>}
 */
export async function deleteWeeklyPlanTemplate(templateId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('weekly_plan_templates')
    .delete()
    .eq('id', templateId)
    .eq('user_id', user.id);

  if (error) throw error;
}

// ============================================================================
// Analytics & Progress
// ============================================================================

/**
 * Get weekly plan progress
 * @param {string} weeklyPlanId - Weekly plan ID
 * @returns {Promise<Object>} Progress summary
 */
export async function getWeeklyPlanProgress(weeklyPlanId) {
  const { data, error } = await supabase
    .from('v_weekly_plan_progress')
    .select('*')
    .eq('weekly_plan_id', weeklyPlanId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Get daily tasks summary for a specific date
 * @param {string} childId - Child ID
 * @param {string} date - Date (YYYY-MM-DD)
 * @returns {Promise<Object>} Daily summary
 */
export async function getDailySummary(childId, date) {
  const { data, error } = await supabase
    .from('v_daily_tasks_summary')
    .select('*')
    .eq('child_id', childId)
    .eq('planned_date', date)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Get completion statistics for a child
 * @param {string} childId - Child ID
 * @param {number} [weeks=4] - Number of weeks to analyze
 * @returns {Promise<Object>} Statistics
 */
export async function getCompletionStats(childId, weeks = 4) {
  // Get recent weekly plans
  const plans = await getChildWeeklyPlans(childId, weeks);

  if (plans.length === 0) {
    return {
      totalPlans: 0,
      completedPlans: 0,
      avgCompletionRate: 0,
      totalTasks: 0,
      completedTasks: 0
    };
  }

  let totalTasks = 0;
  let completedTasks = 0;

  for (const plan of plans) {
    const progress = await getWeeklyPlanProgress(plan.id);
    if (progress) {
      totalTasks += progress.total_tasks;
      completedTasks += progress.completed_tasks;
    }
  }

  return {
    totalPlans: plans.length,
    completedPlans: plans.filter(p => p.status === 'completed').length,
    avgCompletionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    totalTasks,
    completedTasks
  };
}
