// 추가 보안 기능들

// 세션 타임아웃 설정 (30분)
export const SESSION_TIMEOUT = 30 * 60 * 1000 // 30분

// 세션 체크
export const checkSessionTimeout = () => {
  const lastActivity = localStorage.getItem('lastActivity')
  if (lastActivity) {
    const timeSinceLastActivity = Date.now() - parseInt(lastActivity)
    if (timeSinceLastActivity > SESSION_TIMEOUT) {
      // 세션 만료 시 로그아웃
      localStorage.removeItem('lastActivity')
      return false
    }
  }
  return true
}

// 활동 시간 업데이트
export const updateActivityTime = () => {
  localStorage.setItem('lastActivity', Date.now().toString())
}

// 입력 데이터 검증
export const validateInput = (data) => {
  const sanitized = {}
  
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      // XSS 방지를 위한 기본적인 이스케이프
      sanitized[key] = value
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .trim()
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized
}

// 비밀번호 강도 검증
export const validatePassword = (password) => {
  const minLength = 8
  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)
  
  const errors = []
  
  if (password.length < minLength) {
    errors.push(`비밀번호는 최소 ${minLength}자 이상이어야 합니다.`)
  }
  if (!hasUpperCase) {
    errors.push('대문자를 포함해야 합니다.')
  }
  if (!hasLowerCase) {
    errors.push('소문자를 포함해야 합니다.')
  }
  if (!hasNumbers) {
    errors.push('숫자를 포함해야 합니다.')
  }
  if (!hasSpecialChar) {
    errors.push('특수문자를 포함해야 합니다.')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// IP 화이트리스트 (선택사항)
export const ALLOWED_IPS = [
  // 허용할 IP 주소들
  // '192.168.1.1',
  // '10.0.0.1'
]

// IP 체크 (클라이언트에서는 제한적)
export const checkIP = async () => {
  try {
    const response = await fetch('https://api.ipify.org?format=json')
    const data = await response.json()
    const clientIP = data.ip
    
    // 개발 환경에서는 모든 IP 허용
    if (process.env.NODE_ENV === 'development') {
      return true
    }
    
    return ALLOWED_IPS.includes(clientIP)
  } catch (error) {
    console.error('IP 체크 오류:', error)
    return true // 오류 시 허용
  }
}

// 데이터 암호화 (클라이언트 사이드 - 제한적)
export const encryptData = (data) => {
  // 실제 운영에서는 서버 사이드 암호화 권장
  return btoa(JSON.stringify(data))
}

export const decryptData = (encryptedData) => {
  try {
    return JSON.parse(atob(encryptedData))
  } catch (error) {
    console.error('데이터 복호화 오류:', error)
    return null
  }
} 