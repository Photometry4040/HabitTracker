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
  const errorMsg = '❌ Supabase 환경변수가 설정되지 않았습니다. .env 파일을 확인하세요.'
  if (import.meta.env.DEV) {
    throw new Error(errorMsg + ' (.env.example을 참고하세요)')
  }
  window.SUPABASE_CONFIG_ERROR = true
  supabase = null
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
}

export { supabase } 