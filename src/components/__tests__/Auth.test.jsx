import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock auth module
vi.mock('@/lib/auth.js', () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  resetPassword: vi.fn(),
}))

import { Auth } from '../Auth.jsx'

describe('Auth', () => {
  it('renders login form by default', () => {
    render(<Auth onAuthSuccess={() => {}} />)
    expect(screen.getByText('로그인', { selector: 'h3, [class*="CardTitle"]' })).toBeInTheDocument()
    expect(screen.getByLabelText(/이메일/)).toBeInTheDocument()
    expect(screen.getByLabelText(/비밀번호/)).toBeInTheDocument()
  })

  it('switches to signup mode', async () => {
    const user = userEvent.setup()
    render(<Auth onAuthSuccess={() => {}} />)

    await user.click(screen.getByRole('button', { name: /회원가입/ }))
    expect(screen.getByLabelText(/비밀번호 확인/)).toBeInTheDocument()
  })

  it('switches to reset password mode', async () => {
    const user = userEvent.setup()
    render(<Auth onAuthSuccess={() => {}} />)

    await user.click(screen.getByRole('button', { name: /비밀번호를 잊으셨나요/ }))
    expect(screen.getByText('비밀번호 재설정')).toBeInTheDocument()
  })

  it('shows password toggle', async () => {
    const user = userEvent.setup()
    render(<Auth onAuthSuccess={() => {}} />)

    const passwordInput = screen.getByLabelText(/비밀번호/)
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('validates email field is required', () => {
    render(<Auth onAuthSuccess={() => {}} />)
    const emailInput = screen.getByLabelText(/이메일/)
    expect(emailInput).toHaveAttribute('required')
  })

  it('returns to login from signup', async () => {
    const user = userEvent.setup()
    render(<Auth onAuthSuccess={() => {}} />)

    // Go to signup
    await user.click(screen.getByRole('button', { name: /회원가입/ }))
    // Return to login
    await user.click(screen.getByRole('button', { name: /이미 계정이 있으신가요/ }))
    expect(screen.getByText('로그인', { selector: 'h3, [class*="CardTitle"]' })).toBeInTheDocument()
  })
})
