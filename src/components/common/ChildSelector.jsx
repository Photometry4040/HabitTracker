import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { LoadingSpinner } from './LoadingSpinner';

/**
 * Child Selector Component
 * 아이 선택 드롭다운
 */
export default function ChildSelector({ onSelect }) {
  const [children, setChildren] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    async function fetchChildren() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('children')
          .select('id, name')
          .eq('user_id', user.id)
          .order('name');

        if (error) throw error;

        setChildren(data || []);
        if (data && data.length > 0) {
          setSelectedId(data[0].id);
          onSelect(data[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch children:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchChildren();
  }, [onSelect]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (children.length === 0) {
    return (
      <p className="text-gray-600">등록된 아이가 없습니다</p>
    );
  }

  return (
    <select
      value={selectedId || ''}
      onChange={(e) => {
        setSelectedId(e.target.value);
        onSelect(e.target.value);
      }}
      className="px-4 py-2 rounded border border-gray-300 bg-white text-gray-700"
    >
      <option value="">아이 선택...</option>
      {children.map((child) => (
        <option key={child.id} value={child.id}>
          {child.name}
        </option>
      ))}
    </select>
  );
}
