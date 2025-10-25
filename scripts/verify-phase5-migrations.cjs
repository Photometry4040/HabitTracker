#!/usr/bin/env node
/**
 * Phase 5 마이그레이션 검증 스크립트
 *
 * 목적: 프로덕션 실행 전 마이그레이션 파일 안전성 검증
 * 위험도: 🟢 저위험 (읽기 전용, DB 연결 불필요)
 */

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '../supabase/migrations');
const PHASE5_PREFIX = '20251024';

// 검증 결과 저장
const results = {
  passed: [],
  warnings: [],
  errors: [],
  info: []
};

console.log('🔍 Phase 5 마이그레이션 검증 시작...\n');

// ============================================================================
// 1. 파일 존재 여부 확인
// ============================================================================

function checkFilesExist() {
  console.log('📂 1. 파일 존재 여부 확인');

  const expectedFiles = [
    '001_phase5_extend_children.sql',
    '002_phase5_create_goals.sql',
    '003_phase5_create_mandala_charts.sql',
    '004_phase5_create_weaknesses.sql',
    '005_phase5_create_reward_system.sql',
    '006_phase5_create_permission_system.sql',
    '007_phase5_create_remaining_tables.sql',
    '008_phase5_helper_functions.sql',
    '009_phase5_parent_rls_and_views.sql',
    '010_phase5_seed_data.sql'
  ];

  expectedFiles.forEach((filename, index) => {
    const fullPath = path.join(MIGRATIONS_DIR, `${PHASE5_PREFIX}_${filename}`);
    if (fs.existsSync(fullPath)) {
      results.passed.push(`✅ ${index + 1}. ${filename} 존재`);
    } else {
      results.errors.push(`❌ ${index + 1}. ${filename} 누락`);
    }
  });

  console.log(`  → ${expectedFiles.length}개 파일 중 ${results.passed.length}개 확인\n`);
}

// ============================================================================
// 2. SQL 문법 기본 검증
// ============================================================================

function validateSqlSyntax() {
  console.log('🔍 2. SQL 문법 기본 검증');

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.startsWith(PHASE5_PREFIX))
    .sort();

  files.forEach(filename => {
    const content = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf8');

    // 기본 문법 체크
    const checks = [
      { pattern: /CREATE TABLE IF NOT EXISTS/g, name: 'IF NOT EXISTS 사용' },
      { pattern: /ON DELETE CASCADE|ON DELETE SET NULL/g, name: 'FK 삭제 규칙' },
      { pattern: /CHECK \(/g, name: 'CHECK 제약 조건' },
      { pattern: /COMMENT ON/g, name: '테이블/컬럼 주석' }
    ];

    checks.forEach(check => {
      if (content.match(check.pattern)) {
        results.info.push(`  ℹ️  ${filename}: ${check.name} ✓`);
      }
    });

    // 위험한 패턴 체크
    const dangerousPatterns = [
      { pattern: /DROP TABLE (?!IF EXISTS)/g, msg: 'DROP TABLE without IF EXISTS' },
      { pattern: /TRUNCATE/g, msg: 'TRUNCATE 사용' },
      { pattern: /DELETE FROM.*WHERE\s*;/g, msg: 'DELETE without WHERE' }
    ];

    dangerousPatterns.forEach(danger => {
      if (content.match(danger.pattern)) {
        results.errors.push(`❌ ${filename}: ${danger.msg}`);
      }
    });
  });

  console.log(`  → ${files.length}개 파일 검증 완료\n`);
}

// ============================================================================
// 3. 의존성 순서 확인
// ============================================================================

function checkDependencyOrder() {
  console.log('🔗 3. 의존성 순서 확인');

  const dependencies = {
    '001': [], // children 확장 (기존 테이블)
    '002': ['001'], // goals (children 의존)
    '003': ['001', '002'], // mandala_charts (children, goals 의존)
    '004': ['001', '002'], // weaknesses (children, goals, habits 의존)
    '005': ['001', '002', '004'], // reward_system (children, goals, weaknesses 의존)
    '006': ['001'], // permission_system (children 의존)
    '007': ['001', '002', '004', '006'], // remaining (children, goals, weaknesses, share_scopes 의존)
    '008': ['004', '006'], // helper_functions (weaknesses, share_scopes 의존)
    '009': ['002', '003', '004', '008'], // parent_rls (goals, mandala, weaknesses, functions 의존)
    '010': ['005'] // seed_data (reward_definitions 의존)
  };

  let orderValid = true;

  Object.entries(dependencies).forEach(([fileNum, deps]) => {
    deps.forEach(depNum => {
      if (parseInt(depNum) >= parseInt(fileNum)) {
        results.errors.push(`❌ 의존성 순서 오류: ${fileNum} → ${depNum}`);
        orderValid = false;
      }
    });
  });

  if (orderValid) {
    results.passed.push('✅ 의존성 순서 올바름');
  }

  console.log(`  → 의존성 체크 ${orderValid ? '성공' : '실패'}\n`);
}

// ============================================================================
// 4. 테이블 이름 중복 체크
// ============================================================================

function checkDuplicateTables() {
  console.log('📋 4. 테이블 이름 중복 체크');

  const tables = new Set();
  const duplicates = [];

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.startsWith(PHASE5_PREFIX))
    .sort();

  files.forEach(filename => {
    const content = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf8');
    const matches = content.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/g);

    for (const match of matches) {
      const tableName = match[1];
      if (tables.has(tableName)) {
        duplicates.push(tableName);
        results.errors.push(`❌ 중복 테이블: ${tableName} (${filename})`);
      } else {
        tables.add(tableName);
      }
    }
  });

  if (duplicates.length === 0) {
    results.passed.push(`✅ ${tables.size}개 테이블 중복 없음`);
  }

  console.log(`  → ${tables.size}개 테이블 확인 (중복: ${duplicates.length})\n`);
  console.log(`  테이블 목록: ${Array.from(tables).join(', ')}\n`);
}

// ============================================================================
// 5. RLS 정책 확인
// ============================================================================

function checkRlsPolicies() {
  console.log('🔒 5. RLS 정책 확인');

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.startsWith(PHASE5_PREFIX))
    .sort();

  const rlsStats = {
    tablesWithRls: 0,
    tablesWithoutRls: [],
    totalPolicies: 0
  };

  files.forEach(filename => {
    const content = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf8');

    const tables = [...content.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/g)].map(m => m[1]);
    const rlsEnabled = [...content.matchAll(/ALTER TABLE (\w+) ENABLE ROW LEVEL SECURITY/g)].map(m => m[1]);
    const policies = content.match(/CREATE POLICY/g) || [];

    rlsStats.totalPolicies += policies.length;

    tables.forEach(table => {
      if (rlsEnabled.includes(table)) {
        rlsStats.tablesWithRls++;
      } else {
        // children은 기존 테이블이므로 제외
        if (table !== 'children') {
          rlsStats.tablesWithoutRls.push(table);
        }
      }
    });
  });

  if (rlsStats.tablesWithoutRls.length === 0) {
    results.passed.push(`✅ 모든 신규 테이블에 RLS 활성화 (${rlsStats.tablesWithRls}개)`);
  } else {
    results.warnings.push(`⚠️  RLS 미활성화 테이블: ${rlsStats.tablesWithoutRls.join(', ')}`);
  }

  console.log(`  → RLS 활성화: ${rlsStats.tablesWithRls}개`);
  console.log(`  → 정책 수: ${rlsStats.totalPolicies}개\n`);
}

// ============================================================================
// 6. 주요 컬럼 존재 여부 확인
// ============================================================================

function checkKeyColumns() {
  console.log('🔑 6. 주요 컬럼 존재 여부 확인');

  const requiredColumns = {
    'goals': ['id', 'user_id', 'child_id', 'title', 'ice_score', 'depth'],
    'mandala_charts': ['id', 'user_id', 'child_id', 'center_goal', 'nodes', 'expansion_enabled'],
    'weaknesses': ['id', 'user_id', 'child_id', 'emotion', 'is_anonymized'],
    'rewards_ledger': ['id', 'user_id', 'child_id', 'reward_id', 'source_event_id']
  };

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.startsWith(PHASE5_PREFIX))
    .sort();

  let allColumnsPresent = true;

  Object.entries(requiredColumns).forEach(([table, columns]) => {
    const file = files.find(f => {
      const content = fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8');
      return content.includes(`CREATE TABLE IF NOT EXISTS ${table}`);
    });

    if (file) {
      const content = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      columns.forEach(col => {
        if (!content.includes(col)) {
          results.warnings.push(`⚠️  ${table}.${col} 컬럼 누락 가능`);
          allColumnsPresent = false;
        }
      });
    }
  });

  if (allColumnsPresent) {
    results.passed.push('✅ 주요 컬럼 모두 존재');
  }

  console.log(`  → 주요 컬럼 체크 ${allColumnsPresent ? '성공' : '경고 있음'}\n`);
}

// ============================================================================
// 실행 및 결과 출력
// ============================================================================

checkFilesExist();
validateSqlSyntax();
checkDependencyOrder();
checkDuplicateTables();
checkRlsPolicies();
checkKeyColumns();

console.log('='.repeat(60));
console.log('📊 검증 결과 요약\n');

console.log(`✅ 통과: ${results.passed.length}개`);
results.passed.forEach(msg => console.log(`  ${msg}`));
console.log('');

if (results.warnings.length > 0) {
  console.log(`⚠️  경고: ${results.warnings.length}개`);
  results.warnings.forEach(msg => console.log(`  ${msg}`));
  console.log('');
}

if (results.errors.length > 0) {
  console.log(`❌ 오류: ${results.errors.length}개`);
  results.errors.forEach(msg => console.log(`  ${msg}`));
  console.log('');
}

console.log('='.repeat(60));

// 최종 판정
if (results.errors.length === 0) {
  console.log('\n✅ 검증 성공! 마이그레이션 실행 가능합니다.\n');
  process.exit(0);
} else {
  console.log('\n❌ 검증 실패! 오류를 수정 후 다시 실행하세요.\n');
  process.exit(1);
}
