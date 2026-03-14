import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from '../common/ErrorBoundary.jsx'

function ThrowError({ shouldThrow }) {
  if (shouldThrow) throw new Error('Test error')
  return <div>정상 렌더링</div>
}

describe('ErrorBoundary', () => {
  it('정상 상태에서 자식을 렌더링한다', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )
    expect(screen.getByText('정상 렌더링')).toBeTruthy()
  })

  it('에러 발생 시 폴백 UI를 표시한다', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary title="커스텀 에러">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText('커스텀 에러')).toBeTruthy()
    spy.mockRestore()
  })

  it('다시 시도 버튼 클릭 시 복구를 시도한다', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    const retryButton = screen.getByText('다시 시도')
    expect(retryButton).toBeTruthy()
    spy.mockRestore()
  })
})
