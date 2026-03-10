import { useState } from 'react'
import { ClipboardCheck, BarChart3, GraduationCap, Calendar, MoreHorizontal,
         Target, LayoutGrid, AlertCircle, LogOut, Users, X } from 'lucide-react'

/**
 * BottomNav - Mobile-only bottom navigation bar (MyFitnessPal style)
 * Groups 7 features into 5 tabs. Hidden on md+ (desktop shows header grid).
 */
export function BottomNav({
  activeView,
  onNavigate,
  onLogout,
  onSwitchChild,
}) {
  const [showLearnSheet, setShowLearnSheet] = useState(false)
  const [showMoreSheet, setShowMoreSheet] = useState(false)

  const handleLearnTap = () => {
    setShowMoreSheet(false)
    setShowLearnSheet(prev => !prev)
  }

  const handleMoreTap = () => {
    setShowLearnSheet(false)
    setShowMoreSheet(prev => !prev)
  }

  const handleNav = (view) => {
    setShowLearnSheet(false)
    setShowMoreSheet(false)
    onNavigate(view)
  }

  const tabs = [
    { id: 'tracker', icon: ClipboardCheck, label: '습관' },
    { id: 'dashboard', icon: BarChart3, label: '보드' },
    { id: 'learn', icon: GraduationCap, label: '학습', isSheet: true },
    { id: 'planner', icon: Calendar, label: '계획' },
    { id: 'more', icon: MoreHorizontal, label: '더보기', isSheet: true },
  ]

  const isActive = (tabId) => {
    if (tabId === 'tracker') return activeView === 'tracker'
    if (tabId === 'dashboard') return activeView === 'dashboard'
    if (tabId === 'learn') return ['goals', 'mandala', 'weaknesses'].includes(activeView) || showLearnSheet
    if (tabId === 'planner') return ['planner', 'templates'].includes(activeView)
    if (tabId === 'more') return showMoreSheet
    return false
  }

  const handleTabClick = (tabId) => {
    if (tabId === 'learn') {
      handleLearnTap()
    } else if (tabId === 'more') {
      handleMoreTap()
    } else if (tabId === 'tracker') {
      handleNav('tracker')
    } else if (tabId === 'dashboard') {
      handleNav('dashboard')
    } else if (tabId === 'planner') {
      handleNav('planner')
    }
  }

  return (
    <>
      {/* Backdrop for sheets */}
      {(showLearnSheet || showMoreSheet) && (
        <div
          className="fixed inset-0 z-40 bg-black/20 md:hidden"
          onClick={() => { setShowLearnSheet(false); setShowMoreSheet(false) }}
        />
      )}

      {/* Learning Mode Sheet */}
      <div className={`fixed inset-x-0 bottom-16 z-40 bg-white rounded-t-2xl shadow-2xl
        transform transition-transform duration-300 ease-out md:hidden
        ${showLearnSheet ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="p-4 pb-5">
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
          <div className="space-y-2">
            <button
              onClick={() => handleNav('goals')}
              className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 hover:bg-blue-100 active:bg-blue-100 w-full text-left transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">목표</p>
                <p className="text-xs text-gray-500">학습 목표 관리 및 ICE 분석</p>
              </div>
            </button>
            <button
              onClick={() => handleNav('mandala')}
              className="flex items-center gap-3 p-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-100 w-full text-left transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center">
                <LayoutGrid className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">만다라트</p>
                <p className="text-xs text-gray-500">81칸 목표 확장 차트</p>
              </div>
            </button>
            <button
              onClick={() => handleNav('weaknesses')}
              className="flex items-center gap-3 p-4 rounded-xl bg-orange-50 hover:bg-orange-100 active:bg-orange-100 w-full text-left transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">약점 관리</p>
                <p className="text-xs text-gray-500">약점 추적 및 개선 기록</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* More Sheet */}
      <div className={`fixed inset-x-0 bottom-16 z-40 bg-white rounded-t-2xl shadow-2xl
        transform transition-transform duration-300 ease-out md:hidden
        ${showMoreSheet ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="p-4 pb-5">
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
          <div className="space-y-2">
            <button
              onClick={() => { setShowMoreSheet(false); onSwitchChild() }}
              className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 active:bg-gray-100 w-full text-left transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-500 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">아이 변경</p>
                <p className="text-xs text-gray-500">다른 아이 프로필로 전환</p>
              </div>
            </button>
            <button
              onClick={() => handleNav('templates')}
              className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 active:bg-gray-100 w-full text-left transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">습관 템플릿</p>
                <p className="text-xs text-gray-500">템플릿 관리 및 적용</p>
              </div>
            </button>
            <button
              onClick={() => { setShowMoreSheet(false); onLogout() }}
              className="flex items-center gap-3 p-4 rounded-xl bg-red-50 hover:bg-red-100 active:bg-red-100 w-full text-left transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center">
                <LogOut className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-red-700">로그아웃</p>
                <p className="text-xs text-gray-500">계정에서 로그아웃</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200
                      flex justify-around items-center h-16 px-1 md:hidden safe-bottom">
        {tabs.map(tab => {
          const Icon = tab.icon
          const active = isActive(tab.id)
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-2 min-w-[52px]
                         rounded-lg transition-colors ${active ? 'text-blue-600' : 'text-gray-400'}`}
            >
              <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5]' : ''}`} />
              <span className={`text-[10px] leading-tight ${active ? 'font-semibold' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </nav>
    </>
  )
}
