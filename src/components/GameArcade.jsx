import { Card, CardContent } from '@/components/ui/card.jsx'
import { Gamepad2, ExternalLink } from 'lucide-react'

const GAMES = [
  {
    id: 'brick-broker',
    title: 'Brick Broker',
    description: '벽돌을 깨면서 스트레스를 날려보세요!',
    emoji: '🧱',
    url: 'https://bickbroker.netlify.app/',
    color: '#F59E0B',
  },
  {
    id: 'penalty-shoot',
    title: 'Penalty Shoot Goal',
    description: '골대를 향해 슛! 승부차기 게임',
    emoji: '⚽',
    url: 'https://penaltyshootgoal.netlify.app/',
    color: '#10B981',
  },
]

export function GameArcade() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-yellow-400 via-pink-400 to-green-400" />
        <CardContent className="pt-5 pb-4 text-center">
          <div className="text-4xl mb-2">🎮</div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">놀이터</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">잠깐 쉬면서 스트레스를 풀어보세요!</p>
        </CardContent>
      </Card>

      {/* Game Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {GAMES.map((game) => (
          <Card
            key={game.id}
            className="border-0 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 rounded-2xl overflow-hidden cursor-pointer group"
            onClick={() => window.open(game.url, '_blank', 'noopener,noreferrer')}
          >
            <div className="h-1.5" style={{ backgroundColor: game.color }} />
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start gap-4">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 text-4xl"
                  style={{ backgroundColor: `${game.color}15` }}
                >
                  {game.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 group-hover:text-gray-900 dark:group-hover:text-white">
                    {game.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {game.description}
                  </p>
                  <div className="mt-3">
                    <span
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white transition-opacity group-hover:opacity-90"
                      style={{ backgroundColor: game.color }}
                    >
                      <Gamepad2 className="w-4 h-4" />
                      게임 시작
                      <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer message */}
      <div className="text-center py-3">
        <p className="text-sm text-gray-400 dark:text-gray-500">
          게임을 즐긴 후, 습관 기록도 잊지 마세요! 📝
        </p>
      </div>
    </div>
  )
}
