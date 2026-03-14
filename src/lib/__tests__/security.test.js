import { describe, it, expect } from 'vitest'
import { validateInput, validatePassword, sanitizeInput } from '../security.js'

describe('validateInput', () => {
  it('XSS 특수문자를 이스케이프한다', () => {
    const { sanitized } = validateInput({ name: '<script>alert("xss")</script>' })
    expect(sanitized.name).not.toContain('<script>')
    expect(sanitized.name).toContain('&lt;script&gt;')
  })

  it('문자열을 trim한다', () => {
    const { sanitized } = validateInput({ name: '  hello  ' })
    expect(sanitized.name).toBe('hello')
  })

  it('필드별 길이 제한을 적용한다', () => {
    const longName = 'a'.repeat(30)
    const { sanitized, errors, isValid } = validateInput({ child_name: longName })
    expect(sanitized.child_name.length).toBe(20)
    expect(isValid).toBe(false)
    expect(errors.length).toBe(1)
  })

  it('숫자 값은 그대로 통과시킨다', () => {
    const { sanitized } = validateInput({ count: 42 })
    expect(sanitized.count).toBe(42)
  })

  it('정상 길이 입력은 에러 없이 통과한다', () => {
    const { sanitized, isValid } = validateInput({ child_name: '민수' })
    expect(sanitized.child_name).toBe('민수')
    expect(isValid).toBe(true)
  })
})

describe('sanitizeInput', () => {
  it('sanitized 객체만 반환한다', () => {
    const result = sanitizeInput({ child_name: '  테스트  ' })
    expect(result.child_name).toBe('테스트')
    expect(result).not.toHaveProperty('errors')
  })
})

describe('validatePassword', () => {
  it('8자 미만 비밀번호를 거부한다', () => {
    const result = validatePassword('Abc1!')
    expect(result.isValid).toBe(false)
  })

  it('대소문자+숫자+특수문자 포함 시 통과한다', () => {
    const result = validatePassword('MyPass1!')
    expect(result.isValid).toBe(true)
  })

  it('특수문자 없으면 거부한다', () => {
    const result = validatePassword('MyPass12')
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('특수문자'))).toBe(true)
  })
})
