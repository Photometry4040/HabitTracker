import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 환경변수 디버깅
console.log('🔍 환경변수 확인:')
console.log('VITE_SUPABASE_URL:', supabaseUrl)
console.log('VITE_SUPABASE_ANON_KEY exists:', !!supabaseAnonKey)

// URL 유효성 검증
let isValidUrl = false
try {
  if (supabaseUrl) {
    new URL(supabaseUrl)
    isValidUrl = true
  }
} catch (error) {
  console.error('❌ 잘못된 Supabase URL:', supabaseUrl)
}

// Supabase 클라이언트 생성
let supabase

if (!supabaseUrl || !supabaseAnonKey || !isValidUrl) {
  console.error('❌ Supabase 환경변수 오류!')
  console.error('URL:', supabaseUrl)
  console.error('URL 유효성:', isValidUrl)
  console.error('Key 존재:', !!supabaseAnonKey)
  
  // 기본값으로 fallback (개발용)
  if (import.meta.env.DEV) {
    console.warn('⚠️ 개발 모드: 기본값 사용')
    const fallbackUrl = 'https://gqvyzqodyspvwlwfjmfg.supabase.co'
    const fallbackKey = 'your-anon-key-here'
    supabase = createClient(fallbackUrl, fallbackKey)
  } else {
    // 프로덕션에서는 오류 발생
    throw new Error('Supabase 환경변수가 올바르게 설정되지 않았습니다.')
  }
} else {
  console.log('✅ Supabase 환경변수 정상')
  supabase = createClient(supabaseUrl, supabaseAnonKey)
}

export { supabase } 