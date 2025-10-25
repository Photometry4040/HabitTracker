/**
 * Phase 5: 학습 모드 TypeScript 타입 정의
 *
 * 목적: DB 스키마와 프론트엔드 타입 동기화
 * 위험도: 🟢 저위험 (실제 DB 연결 없음)
 */

// ============================================================================
// children 테이블 확장
// ============================================================================

export type AgeGroup =
  | 'elementary_low'    // 초등 저학년 (1~3)
  | 'elementary_high'   // 초등 고학년 (4~6)
  | 'middle'            // 중학생
  | 'high'              // 고등학생
  | 'adult';            // 성인

export interface ChildExtended {
  id: string;
  user_id: string;
  name: string;
  theme?: string;
  // Phase 5 신규 필드
  age_group?: AgeGroup;
  birthday?: string; // ISO date string
  learning_mode_enabled?: boolean;
  grade?: number; // 1~12
  school_name?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// goals 테이블
// ============================================================================

export type GoalLevel = 'identity' | 'long_term' | 'short_term' | 'weekly';
export type MetricType = 'boolean' | 'count' | 'time' | 'percentage';
export type GoalStatus = 'draft' | 'active' | 'completed' | 'failed' | 'paused';

export interface Goal {
  id: string;
  user_id: string;
  child_id: string;
  parent_goal_id?: string;
  depth: number; // 0~5
  title: string;
  description?: string;
  metric_type?: MetricType;
  target_value?: number;
  current_value: number;
  unit?: string;
  // ICE 우선순위 점수
  impact?: number; // 0~5
  confidence?: number; // 0~5
  ease?: number; // 0~5
  ice_score?: number; // 자동 계산 (0~15)
  start_date?: string;
  due_date?: string;
  status: GoalStatus;
  completed_at?: string;
  mandala_chart_id?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// mandala_charts 테이블
// ============================================================================

export type MandalaLevel = 'basic' | 'expanded_27';

export interface MandalaNode {
  position: number; // 1~8
  title: string;
  color?: string;
  emoji?: string;
  goal_id?: string;
  completed: boolean;
  completion_rate: number; // 0~100
  expanded: boolean;
}

export interface MandalaChart {
  id: string;
  user_id: string;
  child_id: string;
  goal_id?: string;
  chart_level: MandalaLevel;
  expansion_enabled: boolean; // false in MVP 5.1
  center_goal: string;
  center_goal_color: string;
  center_goal_emoji?: string;
  nodes: MandalaNode[]; // JSONB
  overall_completion_rate: number; // 0~100
  show_progress: boolean;
  show_emojis: boolean;
  color_scheme: string;
  is_active: boolean;
  archived_at?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// weaknesses 테이블
// ============================================================================

export type CauseType =
  | 'concept'     // 개념 이해 부족
  | 'procedure'   // 절차/방법 모름
  | 'attention'   // 집중력/주의분산
  | 'fatigue'     // 피로/컨디션
  | 'tool'        // 도구/환경 문제
  | 'time'        // 시간 부족
  | 'other';      // 기타

export type Emotion =
  | 'joy'
  | 'neutral'
  | 'frustration'
  | 'anxiety'
  | 'boredom'
  | 'anger'
  | 'confidence';

export type RetryScheduleSource = 'auto_48h' | 'manual' | 'parent_suggested';

export interface FailureContext {
  time_of_day?: 'morning' | 'afternoon' | 'evening';
  location?: 'home' | 'school' | 'library' | 'other';
  distraction?: boolean;
  previous_activity?: string;
}

export interface Weakness {
  id: string;
  user_id: string;
  child_id: string;
  habit_id?: string;
  goal_id?: string;
  record_date: string; // ISO date
  cause_type?: CauseType;
  weakness_note: string;
  self_question?: string;
  emotion?: Emotion;
  emotion_note?: string; // 30일 후 익명화
  failure_context: FailureContext; // JSONB
  improvement_plan?: string;
  retry_scheduled_at?: string;
  retry_schedule_source?: RetryScheduleSource;
  resolved: boolean;
  resolved_at?: string;
  resolution_note?: string;
  badge_earned_id?: string;
  is_anonymized: boolean;
  anonymized_at?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// 보상 시스템 (3개 테이블)
// ============================================================================

export type RewardType = 'badge' | 'sticker' | 'achievement' | 'theme' | 'level_up';
export type TriggerEvent =
  | 'goal_completed'
  | 'weakness_resolved'
  | 'retry_success'
  | 'streak_3'
  | 'streak_7'
  | 'streak_14'
  | 'first_goal'
  | 'first_mandala'
  | 'perfect_week';

export interface RewardDefinition {
  id: string;
  reward_type: RewardType;
  name: string;
  description?: string;
  icon?: string;
  color: string;
  trigger_event: TriggerEvent;
  is_active: boolean;
  created_at: string;
}

export interface ProgressEvent {
  id: string;
  user_id: string;
  child_id: string;
  event_type: TriggerEvent;
  payload: Record<string, any>; // JSONB
  reward_issued: boolean;
  occurred_at: string;
}

export interface RewardLedger {
  id: string;
  user_id: string;
  child_id: string;
  reward_id: string;
  source_event_id: string;
  earned_at: string;
  is_new: boolean;
  viewed_at?: string;
}

// ============================================================================
// 권한 관리 (2개 테이블)
// ============================================================================

export type ParentRole = 'parent' | 'mentor' | 'guardian';
export type LinkState = 'active' | 'inactive' | 'pending';
export type ShareScope =
  | 'read_goals'
  | 'read_weaknesses_summary'
  | 'read_mandala'
  | 'read_habits'
  | 'send_praise';

export interface ParentChildLink {
  id: string;
  parent_user_id: string;
  child_id: string;
  role: ParentRole;
  state: LinkState;
  created_at: string;
  updated_at: string;
}

export interface ShareScope {
  id: string;
  link_id: string;
  child_id: string;
  viewer_user_id: string;
  scope: ShareScope;
  is_active: boolean;
  granted_at: string;
}

// ============================================================================
// 칭찬 메시지
// ============================================================================

export type MessageType = 'praise' | 'encouragement' | 'advice';

export interface PraiseMessage {
  id: string;
  from_user_id: string;
  child_id: string;
  message_text: string;
  message_type: MessageType;
  template_id?: string;
  goal_id?: string;
  weakness_id?: string;
  read_at?: string;
  is_flagged: boolean;
  flagged_reason?: string;
  sent_at: string;
}

// ============================================================================
// 시간 최적화
// ============================================================================

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type TimeSlot = 'morning_focus' | 'morning_routine' | 'afternoon_routine' | 'afternoon_rest' | 'evening_reflection' | 'custom';
export type TaskType = 'deep_thinking' | 'decision' | 'routine' | 'creative' | 'reflection';

export interface TimeAllocation {
  id: string;
  user_id: string;
  child_id: string;
  habit_id?: string;
  goal_id?: string;
  day_of_week?: DayOfWeek;
  time_slot?: TimeSlot;
  task_type?: TaskType;
  priority?: number; // 1~5
  is_exam_week: boolean;
  optimal_start_time?: string; // HH:MM
  optimal_end_time?: string; // HH:MM
  duration_minutes?: number;
  actual_start_time?: string;
  actual_end_time?: string;
  effectiveness_score?: number; // 1~5
  created_at: string;
  updated_at: string;
}

// ============================================================================
// 부모용 요약 뷰 타입
// ============================================================================

export interface EmotionSummary {
  child_id: string;
  week_start: string;
  emotion: Emotion;
  emotion_count: number;
  resolved_count: number;
}

export interface WeaknessSummary {
  child_id: string;
  cause_type: CauseType;
  week_start: string;
  weakness_count: number;
  resolved_count: number;
  avg_resolution_days?: number;
}

export interface GoalProgressSummary {
  child_id: string;
  status: GoalStatus;
  goal_count: number;
  avg_completion_rate?: number;
}

export interface MandalaSummary {
  child_id: string;
  mandala_count: number;
  avg_completion_rate?: number;
  latest_mandala_date?: string;
}

// ============================================================================
// API 응답 타입
// ============================================================================

export interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================================================
// 폼 데이터 타입
// ============================================================================

export interface CreateGoalInput {
  child_id: string;
  parent_goal_id?: string;
  title: string;
  description?: string;
  metric_type?: MetricType;
  target_value?: number;
  unit?: string;
  impact?: number;
  confidence?: number;
  ease?: number;
  start_date?: string;
  due_date?: string;
}

export interface CreateMandalaInput {
  child_id: string;
  goal_id?: string;
  center_goal: string;
  center_goal_emoji?: string;
  nodes?: Partial<MandalaNode>[];
}

export interface CreateWeaknessInput {
  child_id: string;
  habit_id?: string;
  goal_id?: string;
  record_date: string;
  cause_type?: CauseType;
  weakness_note: string;
  emotion?: Emotion;
  emotion_note?: string;
  failure_context?: FailureContext;
  improvement_plan?: string;
}

export interface SendPraiseInput {
  child_id: string;
  message_text: string;
  message_type: MessageType;
  goal_id?: string;
  weakness_id?: string;
}
