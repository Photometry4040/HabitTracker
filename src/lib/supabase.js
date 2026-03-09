import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

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
    // 프로덕션에서는 더 안전한 처리
    console.error('❌ 프로덕션 환경변수 오류!')
    console.error('URL:', supabaseUrl)
    console.error('Key exists:', !!supabaseAnonKey)
    
    // 빈 클라이언트 생성 (오류 방지)
    const dummyUrl = 'https://dummy.supabase.co'
    const dummyKey = 'dummy-key'
    supabase = createClient(dummyUrl, dummyKey)
    
    // 사용자에게 오류 표시를 위해 전역 플래그 설정
    window.SUPABASE_CONFIG_ERROR = true
  }
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
}

export { supabase } 