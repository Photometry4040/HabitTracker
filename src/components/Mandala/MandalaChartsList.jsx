import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent } from '@/components/ui/card.jsx'
import { LayoutGrid, Eye, Trash2 } from 'lucide-react'

export function MandalaChartsList({ charts, handleViewChart, handleDeleteChart }) {
  if (charts.length > 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {charts.map((chart) => {
          const color = chart.center_goal_color || '#6366F1'
          return (
            <Card
              key={chart.id}
              className="border-0 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 rounded-2xl overflow-hidden cursor-pointer group"
              onClick={() => handleViewChart(chart)}
            >
              <div className="h-1" style={{ backgroundColor: color }} />
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start gap-4">
                  {/* 대형 이모지 */}
                  <div
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center flex-shrink-0 text-3xl sm:text-4xl"
                    style={{ backgroundColor: `${color}12` }}
                  >
                    {chart.center_goal_emoji || '📋'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg text-gray-800 truncate group-hover:text-gray-900">
                      {chart.center_goal}
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      노드: {chart.nodes?.length || 0}/8개
                    </p>

                    {chart.overall_completion_rate > 0 && (
                      <div className="mt-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                            <div
                              className="h-2.5 rounded-full transition-all duration-500"
                              style={{ width: `${chart.overall_completion_rate}%`, backgroundColor: color }}
                            />
                          </div>
                          <span className="text-xs font-medium" style={{ color }}>
                            {chart.overall_completion_rate}%
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 mt-3">
                      <Button
                        onClick={(e) => { e.stopPropagation(); handleViewChart(chart) }}
                        className="h-9 text-sm px-3 rounded-xl"
                        style={{ backgroundColor: color }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        보기
                      </Button>
                      <Button
                        variant="outline"
                        className="text-red-500 hover:bg-red-50 h-9 text-sm px-3 rounded-xl border-red-200"
                        onClick={(e) => { e.stopPropagation(); handleDeleteChart(chart.id) }}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        삭제
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  return (
    <Card className="border-0 shadow-sm rounded-2xl">
      <CardContent className="pt-10 pb-10 text-center text-gray-400">
        <LayoutGrid className="w-14 h-14 mx-auto mb-4 text-gray-200" />
        <p className="text-lg font-medium text-gray-500">아직 만다라트 차트가 없습니다</p>
        <p className="text-sm mt-1">위의 &ldquo;새 만다라트&rdquo; 버튼을 클릭하여 첫 차트를 만들어보세요!</p>
      </CardContent>
    </Card>
  )
}
