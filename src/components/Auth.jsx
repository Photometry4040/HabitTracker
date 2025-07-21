import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Lock, Mail, User, Eye, EyeOff, Shield } from 'lucide-react'
import { signIn, signUp, resetPassword } from '@/lib/auth.js'

export function Auth({ onAuthSuccess }) {
  const [mode, setMode] = useState('login') // 'login', 'signup', 'reset'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (mode === 'login') {
        await signIn(email, password)
        onAuthSuccess()
      } else if (mode === 'signup') {
        if (password !== confirmPassword) {
          throw new Error('비밀번호가 일치하지 않습니다.')
        }
        if (password.length < 6) {
          throw new Error('비밀번호는 최소 6자 이상이어야 합니다.')
        }
        await signUp(email, password)
        setMessage('회원가입이 완료되었습니다. 이메일을 확인해주세요.')
      } else if (mode === 'reset') {
        await resetPassword(email)
        setMessage('비밀번호 재설정 이메일을 발송했습니다.')
      }
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setError('')
    setMessage('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm shadow-xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="w-8 h-8 text-purple-600" />
            <CardTitle className="text-2xl font-bold text-purple-800">
              {mode === 'login' && '로그인'}
              {mode === 'signup' && '회원가입'}
              {mode === 'reset' && '비밀번호 재설정'}
            </CardTitle>
          </div>
          <p className="text-gray-600 text-sm">
            {mode === 'login' && '아이들의 습관 추적을 시작해보세요'}
            {mode === 'signup' && '새로운 계정을 만들어보세요'}
            {mode === 'reset' && '이메일 주소를 입력해주세요'}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                이메일
              </Label>
                          <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              className="mt-1"
              autoComplete="email"
            />
            </div>

            {mode !== 'reset' && (
              <div>
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  비밀번호
                </Label>
                <div className="relative mt-1">
                              <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              required
              className="pr-10"
              autoComplete="current-password"
            />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <Label htmlFor="confirmPassword" className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  비밀번호 확인
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="비밀번호를 다시 입력하세요"
                  required
                  className="mt-1"
                  autoComplete="new-password"
                />
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {message && (
              <div className="bg-green-50 border border-green-200 rounded-md p-3">
                <p className="text-green-600 text-sm">{message}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? '처리 중...' : (
                mode === 'login' ? '로그인' :
                mode === 'signup' ? '회원가입' : '이메일 발송'
              )}
            </Button>
          </form>

          <div className="mt-6 space-y-2">
            {mode === 'login' && (
              <>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setMode('signup')
                    resetForm()
                  }}
                >
                  <User className="w-4 h-4 mr-2" />
                  회원가입
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-sm"
                  onClick={() => {
                    setMode('reset')
                    resetForm()
                  }}
                >
                  비밀번호를 잊으셨나요?
                </Button>
              </>
            )}

            {mode === 'signup' && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setMode('login')
                  resetForm()
                }}
              >
                이미 계정이 있으신가요? 로그인
              </Button>
            )}

            {mode === 'reset' && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setMode('login')
                  resetForm()
                }}
              >
                로그인으로 돌아가기
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 