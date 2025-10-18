import React from 'react';

/**
 * Loading Spinner Component
 * 데이터 로딩 중일 때 표시
 */
export default function LoadingSpinner({ size = 'md', text = '로딩 중...' }) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div className={`${sizeClasses[size]} animate-spin rounded-full border-b-2 border-blue-500`}></div>
      {text && (
        <p className={`mt-3 text-gray-600 ${textSizeClasses[size]}`}>
          {text}
        </p>
      )}
    </div>
  );
}

export { LoadingSpinner };
