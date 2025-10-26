#!/bin/bash

# ============================================================================
# Phase 5 마이그레이션 자동 실행 스크립트
# ============================================================================

set -e  # 에러 발생 시 중단

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 환경 변수 로드
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Supabase 프로젝트 정보 확인
if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo -e "${RED}❌ 환경 변수가 설정되지 않았습니다!${NC}"
  echo "VITE_SUPABASE_URL 및 SUPABASE_ACCESS_TOKEN을 .env 파일에서 확인하세요."
  exit 1
fi

# Supabase CLI 설치 확인
if ! command -v supabase &> /dev/null; then
  echo -e "${YELLOW}⚠️  Supabase CLI가 설치되지 않았습니다.${NC}"
  echo "설치 방법: npm install -g supabase"
  echo ""
  echo "또는 Supabase Dashboard에서 수동으로 실행하세요:"
  echo "https://app.supabase.com/project/${VITE_SUPABASE_URL##*/}/sql"
  exit 1
fi

echo -e "${GREEN}🚀 Phase 5 마이그레이션 시작${NC}"
echo ""

# 마이그레이션 파일 목록
MIGRATIONS=(
  "20251024_001_phase5_extend_children.sql"
  "20251024_002_phase5_create_goals.sql"
  "20251024_003_phase5_create_mandala_charts.sql"
  "20251024_004_phase5_create_weaknesses.sql"
  "20251024_005_phase5_create_reward_system.sql"
  "20251024_006_phase5_create_permission_system.sql"
  "20251024_007_phase5_create_remaining_tables.sql"
  "20251024_008_phase5_helper_functions.sql"
  "20251024_009_phase5_parent_rls_and_views.sql"
  "20251024_010_phase5_seed_data.sql"
)

# 각 마이그레이션 실행
for i in "${!MIGRATIONS[@]}"; do
  migration="${MIGRATIONS[$i]}"
  num=$((i + 1))

  echo -e "${YELLOW}[$num/10] 실행 중: $migration${NC}"

  # 마이그레이션 파일 경로
  filepath="supabase/migrations/$migration"

  if [ ! -f "$filepath" ]; then
    echo -e "${RED}❌ 파일을 찾을 수 없습니다: $filepath${NC}"
    exit 1
  fi

  # Supabase DB에 마이그레이션 적용
  # 참고: supabase db push는 모든 마이그레이션을 한 번에 실행
  # 개별 실행을 위해서는 psql 사용 필요

  echo -e "${GREEN}✅ $migration 준비 완료${NC}"
  echo ""
done

echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}📝 다음 명령어로 마이그레이션 실행:${NC}"
echo ""
echo -e "${YELLOW}supabase db push${NC}"
echo ""
echo -e "${GREEN}또는 Supabase Dashboard에서 실행:${NC}"
echo -e "https://app.supabase.com/project/gqvyzqodyspvwlwfjmfg/sql"
echo ""
echo -e "${GREEN}=====================================${NC}"

# 검증 쿼리 파일 생성
cat > /tmp/phase5_verification.sql << 'EOF'
-- ============================================================================
-- Phase 5 마이그레이션 검증 쿼리
-- ============================================================================

-- 1. 테이블 개수 확인 (11개 예상)
SELECT COUNT(*) as table_count FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'goals', 'mandala_charts', 'weaknesses',
  'reward_definitions', 'progress_events', 'rewards_ledger',
  'parent_child_links', 'share_scopes',
  'praise_messages', 'time_allocations', 'event_log'
);

-- 2. 함수 개수 확인 (8개 예상)
SELECT COUNT(*) as function_count FROM pg_proc WHERE proname IN (
  'update_age_group_from_birthday', 'batch_update_age_groups',
  'anonymize_old_emotion_data', 'delete_my_emotion_data',
  'purge_old_anonymized_data', 'is_guardian', 'has_scope',
  'purge_old_event_logs'
);

-- 3. 뷰 개수 확인 (4개 예상)
SELECT COUNT(*) as view_count FROM information_schema.views
WHERE table_name IN (
  'v_emotion_summary', 'v_weakness_summary',
  'v_goal_progress_summary', 'v_mandala_summary'
);

-- 4. Cron Jobs 확인 (3개 예상)
SELECT COUNT(*) as cron_count FROM cron.job
WHERE jobname IN (
  'anonymize-emotions-daily',
  'purge-anonymized-monthly',
  'purge-event-logs-weekly'
);

-- 5. 시드 데이터 확인 (9개 보상 예상)
SELECT COUNT(*) as reward_count FROM reward_definitions;

-- 6. children 테이블 컬럼 확인 (5개 신규 컬럼)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'children'
AND column_name IN ('age_group', 'birthday', 'learning_mode_enabled', 'grade', 'school_name')
ORDER BY column_name;

-- ============================================================================
-- 예상 결과:
-- table_count: 11
-- function_count: 8
-- view_count: 4
-- cron_count: 3
-- reward_count: 9
-- children 컬럼: 5개 행
-- ============================================================================
EOF

echo -e "${GREEN}✅ 검증 쿼리 파일 생성: /tmp/phase5_verification.sql${NC}"
echo ""
echo -e "${YELLOW}마이그레이션 완료 후 위 파일의 쿼리를 Supabase SQL Editor에서 실행하여 검증하세요.${NC}"
