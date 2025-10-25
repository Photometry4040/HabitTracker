#!/usr/bin/env node
/**
 * Phase 5 마이그레이션 전 데이터베이스 백업 스크립트
 *
 * 목적: 프로덕션 마이그레이션 전 전체 데이터 백업
 * 위험도: 🟢 저위험 (읽기 전용)
 *
 * 사용법:
 *   node scripts/backup-database-phase5.cjs
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 환경 변수 로드
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 환경 변수 누락: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 백업 대상 테이블 (Phase 5 이전 기존 테이블)
const TABLES_TO_BACKUP = [
  'children',
  'weeks',
  'habits',
  'habit_records',
  'habit_templates',
  'notifications'
];

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(__dirname, '../backups');
const backupFile = path.join(backupDir, `pre-phase5-backup-${timestamp}.json`);

// ============================================================================
// 백업 실행
// ============================================================================

async function backupDatabase() {
  console.log('🔄 Phase 5 마이그레이션 전 데이터베이스 백업 시작...\n');

  const backup = {
    timestamp: new Date().toISOString(),
    version: 'pre-phase5',
    tables: {}
  };

  try {
    // 백업 디렉토리 생성
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // 각 테이블 백업
    for (const table of TABLES_TO_BACKUP) {
      console.log(`📦 ${table} 백업 중...`);

      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' });

      if (error) {
        console.error(`  ❌ 오류: ${error.message}`);
        backup.tables[table] = {
          error: error.message,
          rows: 0,
          data: []
        };
      } else {
        backup.tables[table] = {
          rows: count || 0,
          data: data || []
        };
        console.log(`  ✅ ${count || 0}개 행 백업 완료`);
      }
    }

    // 백업 파일 저장
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));

    // 결과 출력
    console.log('\n' + '='.repeat(60));
    console.log('📊 백업 결과 요약\n');

    let totalRows = 0;
    Object.entries(backup.tables).forEach(([table, info]) => {
      console.log(`  ${table}: ${info.rows}개 행`);
      totalRows += info.rows;
    });

    console.log(`\n  총 ${totalRows}개 행 백업 완료`);
    console.log(`\n💾 백업 파일: ${backupFile}`);

    // 파일 크기
    const stats = fs.statSync(backupFile);
    const fileSizeKB = (stats.size / 1024).toFixed(2);
    console.log(`  파일 크기: ${fileSizeKB} KB`);

    console.log('='.repeat(60));
    console.log('\n✅ 백업 성공!\n');

    // 복원 가이드
    console.log('📝 복원 방법:');
    console.log(`   1. 백업 파일 확인: ${backupFile}`);
    console.log('   2. 필요시 scripts/restore-database-phase5.cjs 실행');
    console.log('   3. 또는 Supabase 대시보드에서 수동 복원\n');

    return backup;
  } catch (error) {
    console.error('\n❌ 백업 실패:', error.message);
    process.exit(1);
  }
}

// ============================================================================
// 백업 검증
// ============================================================================

function validateBackup(backup) {
  console.log('🔍 백업 검증 중...\n');

  let isValid = true;

  // 1. 중요 테이블 체크
  const criticalTables = ['children', 'weeks', 'habits', 'habit_records'];
  criticalTables.forEach(table => {
    if (!backup.tables[table]) {
      console.error(`❌ 중요 테이블 누락: ${table}`);
      isValid = false;
    } else if (backup.tables[table].error) {
      console.error(`❌ 테이블 백업 오류: ${table} - ${backup.tables[table].error}`);
      isValid = false;
    }
  });

  // 2. 데이터 존재 여부 (경고만)
  Object.entries(backup.tables).forEach(([table, info]) => {
    if (info.rows === 0) {
      console.warn(`⚠️  ${table} 테이블이 비어 있습니다.`);
    }
  });

  if (isValid) {
    console.log('✅ 백업 검증 성공\n');
  } else {
    console.error('\n❌ 백업 검증 실패\n');
    process.exit(1);
  }

  return isValid;
}

// ============================================================================
// 실행
// ============================================================================

(async () => {
  const backup = await backupDatabase();
  validateBackup(backup);

  console.log('🎯 다음 단계:');
  console.log('   1. 백업 파일 확인');
  console.log('   2. Phase 5 마이그레이션 실행');
  console.log('   3. 마이그레이션 후 데이터 검증\n');

  process.exit(0);
})();
