import React from 'react';
import ChildSelector from '../../common/ChildSelector';

/**
 * Self-Awareness Dashboard (Placeholder)
 * Phase 3에서 구현될 예정
 */
export default function SelfAwarenessDashboard({ childId, onChildSelect }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">🧠 자기인식 분석</h2>
        <p className="text-gray-600 mt-1">아이의 약점과 강점을 분석합니다</p>
      </div>

      {!childId && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <p className="text-blue-900 font-medium">아이를 선택해주세요</p>
          <div className="mt-4">
            <ChildSelector onSelect={onChildSelect} />
          </div>
        </div>
      )}

      {childId && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <p className="text-yellow-900 font-medium">🚧 구현 준비 중</p>
          <p className="text-yellow-800 text-sm mt-2">
            자기인식 분석 기능은 Phase 3에서 구현될 예정입니다.
          </p>
          <p className="text-yellow-800 text-sm mt-2">
            기대해주세요! 예상: 1주일 내
          </p>
        </div>
      )}
    </div>
  );
}
