import { Component } from 'react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-lg border border-red-200 m-4">
          <div className="text-4xl mb-3">😵</div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            {this.props.title || '문제가 발생했어요'}
          </h3>
          <p className="text-sm text-red-600 mb-4 text-center">
            {this.props.message || '이 부분을 불러오는 중 오류가 발생했습니다.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            다시 시도
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
