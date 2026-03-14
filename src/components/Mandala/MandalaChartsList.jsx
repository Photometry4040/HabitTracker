import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent } from '@/components/ui/card.jsx'
import { LayoutGrid, Eye, Trash2 } from 'lucide-react'

export function MandalaChartsList({ charts, handleViewChart, handleDeleteChart }) {
  if (charts.length > 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {charts.map((chart) => (
          <Card key={chart.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {chart.center_goal_emoji && (
                      <span className="text-2xl">{chart.center_goal_emoji}</span>
                    )}
                    <h3 className="font-semibold text-lg">{chart.center_goal}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    노드: {chart.nodes?.length || 0}/8개
                  </p>
                  {chart.overall_completion_rate > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-indigo-600 h-2 rounded-full"
                            style={{ width: `${chart.overall_completion_rate}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600">
                          {chart.overall_completion_rate}%
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleViewChart(chart)}
                      className="bg-indigo-600 hover:bg-indigo-700 h-10 md:h-8 text-sm px-3 md:px-2"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">보기</span>
                      <span className="sm:hidden">열기</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="text-red-600 hover:bg-red-50 h-10 md:h-8 text-sm px-3 md:px-2"
                      onClick={() => handleDeleteChart(chart.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">삭제</span>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6 text-center text-gray-500">
        <LayoutGrid className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>아직 만다라트 차트가 없습니다.</p>
        <p className="text-sm">위의 &ldquo;새 만다라트&rdquo; 버튼을 클릭하여 첫 차트를 만들어보세요!</p>
      </CardContent>
    </Card>
  )
}
