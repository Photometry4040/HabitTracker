-- ============================================================================
-- Migration: 20251026_011_phase5_weekly_planner
-- Description: Phase 5.2 - Weekly Planner for Learning Mode
-- Dependencies: children, goals, weeks tables
-- ============================================================================

-- ============================================================================
-- Table: weekly_plans
-- Purpose: 주간 학습 계획 (goals와 habits 연결)
-- ============================================================================

CREATE TABLE IF NOT EXISTS weekly_plans (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  week_id UUID NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,

  -- 계획 메타데이터
  title TEXT NOT NULL CHECK (length(title) >= 3 AND length(title) <= 200),
  description TEXT,

  -- 목표 설정 (JSONB 배열)
  -- [{ goal_id: UUID, daily_target: number, unit: string, priority: number }]
  goal_targets JSONB DEFAULT '[]'::jsonb,

  -- 주간 피드백
  reflection TEXT,  -- 회고
  achievements TEXT,  -- 성취한 것들
  challenges TEXT,  -- 어려웠던 점
  next_week_focus TEXT,  -- 다음 주 집중할 것

  -- 상태
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',      -- 작성 중
    'active',     -- 진행 중
    'completed',  -- 완료
    'archived'    -- 보관
  )),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_child_week UNIQUE(child_id, week_id)
);

-- ============================================================================
-- Table: daily_plan_items
-- Purpose: 일일 계획 항목 (weekly_plans의 상세 실행 계획)
-- ============================================================================

CREATE TABLE IF NOT EXISTS daily_plan_items (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  weekly_plan_id UUID NOT NULL REFERENCES weekly_plans(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,

  -- 일정
  planned_date DATE NOT NULL,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0=일요일

  -- 계획 내용
  task_title TEXT NOT NULL CHECK (length(task_title) >= 1 AND length(task_title) <= 200),
  task_description TEXT,
  estimated_minutes SMALLINT CHECK (estimated_minutes > 0 AND estimated_minutes <= 480),  -- 최대 8시간

  -- 우선순위 (1=최고, 5=최저)
  priority SMALLINT NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),

  -- 실행 결과
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  actual_minutes SMALLINT CHECK (actual_minutes > 0 AND actual_minutes <= 480),
  difficulty_rating SMALLINT CHECK (difficulty_rating BETWEEN 1 AND 5),  -- 실제 난이도
  notes TEXT,  -- 실행 후 메모

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Table: weekly_plan_templates
-- Purpose: 주간 계획 템플릿 (재사용 가능한 계획)
-- ============================================================================

CREATE TABLE IF NOT EXISTS weekly_plan_templates (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,  -- NULL이면 모든 자녀에게 사용 가능

  -- 템플릿 메타데이터
  name TEXT NOT NULL CHECK (length(name) >= 3 AND length(name) <= 100),
  description TEXT,
  category TEXT,  -- 예: "시험 대비", "방학", "평소"

  -- 템플릿 구조 (JSONB)
  -- { daily_tasks: [{ day: 0-6, task_title: string, estimated_minutes: number, priority: number }] }
  template_data JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- 사용 통계
  usage_count INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- weekly_plans indexes
CREATE INDEX idx_weekly_plans_user_id ON weekly_plans(user_id);
CREATE INDEX idx_weekly_plans_child_id ON weekly_plans(child_id);
CREATE INDEX idx_weekly_plans_week_id ON weekly_plans(week_id);
CREATE INDEX idx_weekly_plans_status ON weekly_plans(status);
CREATE INDEX idx_weekly_plans_created_at ON weekly_plans(created_at DESC);

-- daily_plan_items indexes
CREATE INDEX idx_daily_plan_items_weekly_plan_id ON daily_plan_items(weekly_plan_id);
CREATE INDEX idx_daily_plan_items_goal_id ON daily_plan_items(goal_id);
CREATE INDEX idx_daily_plan_items_planned_date ON daily_plan_items(planned_date);
CREATE INDEX idx_daily_plan_items_completed ON daily_plan_items(completed);
CREATE INDEX idx_daily_plan_items_priority ON daily_plan_items(priority);

-- weekly_plan_templates indexes
CREATE INDEX idx_weekly_plan_templates_user_id ON weekly_plan_templates(user_id);
CREATE INDEX idx_weekly_plan_templates_child_id ON weekly_plan_templates(child_id);
CREATE INDEX idx_weekly_plan_templates_is_default ON weekly_plan_templates(is_default);

-- ============================================================================
-- Row-Level Security (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_plan_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for weekly_plans
CREATE POLICY "Users can view their own weekly plans"
  ON weekly_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weekly plans"
  ON weekly_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly plans"
  ON weekly_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weekly plans"
  ON weekly_plans FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for daily_plan_items
CREATE POLICY "Users can view their own daily plan items"
  ON daily_plan_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM weekly_plans wp
      WHERE wp.id = daily_plan_items.weekly_plan_id
        AND wp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own daily plan items"
  ON daily_plan_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM weekly_plans wp
      WHERE wp.id = daily_plan_items.weekly_plan_id
        AND wp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own daily plan items"
  ON daily_plan_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM weekly_plans wp
      WHERE wp.id = daily_plan_items.weekly_plan_id
        AND wp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own daily plan items"
  ON daily_plan_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM weekly_plans wp
      WHERE wp.id = daily_plan_items.weekly_plan_id
        AND wp.user_id = auth.uid()
    )
  );

-- RLS Policies for weekly_plan_templates
CREATE POLICY "Users can view their own templates"
  ON weekly_plan_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own templates"
  ON weekly_plan_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON weekly_plan_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON weekly_plan_templates FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_weekly_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_weekly_plans_updated_at
  BEFORE UPDATE ON weekly_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_weekly_plans_updated_at();

CREATE TRIGGER trigger_daily_plan_items_updated_at
  BEFORE UPDATE ON daily_plan_items
  FOR EACH ROW
  EXECUTE FUNCTION update_weekly_plans_updated_at();

CREATE TRIGGER trigger_weekly_plan_templates_updated_at
  BEFORE UPDATE ON weekly_plan_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_weekly_plans_updated_at();

-- ============================================================================
-- Triggers for auto-completion
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_complete_daily_plan_item()
RETURNS TRIGGER AS $$
BEGIN
  -- 완료로 변경될 때 completed_at 자동 설정
  IF NEW.completed = TRUE AND OLD.completed = FALSE THEN
    NEW.completed_at = NOW();
  END IF;

  -- 미완료로 변경될 때 completed_at 제거
  IF NEW.completed = FALSE AND OLD.completed = TRUE THEN
    NEW.completed_at = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_complete_daily_plan_item
  BEFORE UPDATE ON daily_plan_items
  FOR EACH ROW
  WHEN (NEW.completed IS DISTINCT FROM OLD.completed)
  EXECUTE FUNCTION auto_complete_daily_plan_item();

-- ============================================================================
-- Helper Views
-- ============================================================================

-- View: 주간 계획 진행률
CREATE OR REPLACE VIEW v_weekly_plan_progress AS
SELECT
  wp.id AS weekly_plan_id,
  wp.child_id,
  wp.week_id,
  wp.title,
  wp.status,
  COUNT(dpi.id) AS total_tasks,
  COUNT(dpi.id) FILTER (WHERE dpi.completed = TRUE) AS completed_tasks,
  CASE
    WHEN COUNT(dpi.id) > 0 THEN
      ROUND((COUNT(dpi.id) FILTER (WHERE dpi.completed = TRUE)::NUMERIC / COUNT(dpi.id)::NUMERIC) * 100, 2)
    ELSE 0
  END AS completion_rate,
  SUM(dpi.estimated_minutes) AS total_estimated_minutes,
  SUM(dpi.actual_minutes) AS total_actual_minutes,
  ROUND(AVG(dpi.difficulty_rating), 2) AS avg_difficulty,
  wp.created_at,
  wp.updated_at
FROM weekly_plans wp
LEFT JOIN daily_plan_items dpi ON wp.id = dpi.weekly_plan_id
GROUP BY wp.id, wp.child_id, wp.week_id, wp.title, wp.status, wp.created_at, wp.updated_at;

COMMENT ON VIEW v_weekly_plan_progress IS 'Weekly plan progress summary with completion rates';

-- View: 일일 작업 요약 (특정 날짜)
CREATE OR REPLACE VIEW v_daily_tasks_summary AS
SELECT
  dpi.planned_date,
  dpi.weekly_plan_id,
  wp.child_id,
  COUNT(dpi.id) AS total_tasks,
  COUNT(dpi.id) FILTER (WHERE dpi.completed = TRUE) AS completed_tasks,
  COUNT(dpi.id) FILTER (WHERE dpi.priority = 1) AS high_priority_tasks,
  SUM(dpi.estimated_minutes) AS total_estimated_minutes,
  SUM(dpi.actual_minutes) AS total_actual_minutes,
  CASE
    WHEN COUNT(dpi.id) > 0 THEN
      ROUND((COUNT(dpi.id) FILTER (WHERE dpi.completed = TRUE)::NUMERIC / COUNT(dpi.id)::NUMERIC) * 100, 2)
    ELSE 0
  END AS completion_rate
FROM daily_plan_items dpi
JOIN weekly_plans wp ON dpi.weekly_plan_id = wp.id
GROUP BY dpi.planned_date, dpi.weekly_plan_id, wp.child_id;

COMMENT ON VIEW v_daily_tasks_summary IS 'Daily task summary with completion rates';

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE weekly_plans IS 'Phase 5.2: Weekly learning plans for children';
COMMENT ON TABLE daily_plan_items IS 'Phase 5.2: Daily task items within weekly plans';
COMMENT ON TABLE weekly_plan_templates IS 'Phase 5.2: Reusable weekly plan templates';

COMMENT ON COLUMN weekly_plans.goal_targets IS 'JSONB array of goal targets: [{ goal_id: UUID, daily_target: number, unit: string, priority: number }]';
COMMENT ON COLUMN weekly_plan_templates.template_data IS 'JSONB template structure: { daily_tasks: [{ day: 0-6, task_title: string, estimated_minutes: number, priority: number }] }';

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Verification query (run after migration):
-- SELECT table_name, table_type FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name LIKE 'weekly_plan%';
--
-- Expected result:
-- weekly_plans               | BASE TABLE
-- daily_plan_items           | BASE TABLE
-- weekly_plan_templates      | BASE TABLE
-- v_weekly_plan_progress     | VIEW
-- v_daily_tasks_summary      | VIEW
