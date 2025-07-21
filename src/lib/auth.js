import { supabase } from './supabase.js'

// 로그인 상태 관리
export const signIn = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) throw error
    return data
  } catch (error) {
    console.error('로그인 오류:', error)
    throw error
  }
}

// 회원가입
export const signUp = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    })
    if (error) throw error
    return data
  } catch (error) {
    console.error('회원가입 오류:', error)
    throw error
  }
}

// 로그아웃
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  } catch (error) {
    console.error('로그아웃 오류:', error)
    throw error
  }
}

// 현재 사용자 가져오기
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      // 세션이 없는 경우는 정상적인 상황이므로 오류로 처리하지 않음
      if (error.message.includes('Auth session missing')) {
        return null
      }
      throw error
    }
    return user
  } catch (error) {
    // 세션이 없는 경우는 정상적인 상황
    if (error.message.includes('Auth session missing')) {
      return null
    }
    console.error('사용자 정보 가져오기 오류:', error)
    return null
  }
}

// 인증 상태 변경 감지
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange(callback)
}

// 비밀번호 재설정
export const resetPassword = async (email) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    if (error) throw error
  } catch (error) {
    console.error('비밀번호 재설정 오류:', error)
    throw error
  }
} 