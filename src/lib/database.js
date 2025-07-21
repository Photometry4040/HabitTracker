import { supabase } from './supabase.js'

// 아이별 주간별 데이터 저장 (덮어쓰기 지원)
export const saveChildData = async (childName, data) => {
  try {
    // 데이터 유효성 검사
    if (!data || !childName) {
      throw new Error('필수 데이터가 누락되었습니다.')
    }

    // 현재 사용자 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('인증되지 않은 사용자입니다.')
    }

    const saveData = {
      child_name: childName,
      week_period: data.weekPeriod || '',
      theme: data.theme || '',
      habits: data.habits || [],
      reflection: data.reflection || {},
      reward: data.reward || '',
      // user_id: user.id, // 임시로 주석 처리 (데이터베이스 업데이트 후 활성화)
      updated_at: new Date().toISOString()
    }

    // week_start_date 필드가 있는 경우에만 추가
    if (data.weekStartDate) {
      saveData.week_start_date = data.weekStartDate
    }

    // 기존 데이터가 있으면 삭제 후 새 데이터 저장 (덮어쓰기)
    if (data.weekPeriod) {
      // 기존 데이터 삭제 (임시로 user_id 조건 제거)
      await supabase
        .from('habit_tracker')
        .delete()
        .eq('child_name', childName)
        .eq('week_period', data.weekPeriod)
        // .eq('user_id', user.id) // 임시로 주석 처리
    }

    // 새 데이터 저장
    const { data: result, error } = await supabase
      .from('habit_tracker')
      .insert(saveData)

    if (error) throw error
    return result
  } catch (error) {
    console.error('데이터 저장 오류:', error)
    throw error
  }
}

// 아이별 주간별 데이터 로드
export const loadChildData = async (childName, weekPeriod) => {
  try {
    // 현재 사용자 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('인증되지 않은 사용자입니다.')
    }

    // 임시로 user_id 조건 제거
    const { data, error } = await supabase
      .from('habit_tracker')
      .select('*')
      .eq('child_name', childName)
      // .eq('user_id', user.id) // 임시로 주석 처리

    if (error) throw error
    
    // 클라이언트에서 주간 기간 필터링
    const matchingData = data.find(item => item.week_period === weekPeriod)
    return matchingData || null
  } catch (error) {
    console.error('데이터 로드 오류:', error)
    return null
  }
}

// 모든 아이 데이터 로드 (아이별로 처음과 마지막 기간 표시)
export const loadAllChildren = async () => {
  try {
    // 현재 사용자 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('인증되지 않은 사용자입니다.')
    }

    const { data, error } = await supabase
      .from('habit_tracker')
      .select('child_name, week_period, theme, updated_at')
      // .eq('user_id', user.id) // 임시로 주석 처리
      .order('updated_at', { ascending: true })

    if (error) throw error
    
    // 아이별로 그룹화하여 처음과 마지막 기간 찾기
    const childrenMap = new Map()
    
    data.forEach(child => {
      if (!childrenMap.has(child.child_name)) {
        childrenMap.set(child.child_name, {
          child_name: child.child_name,
          first_week: child.week_period,
          last_week: child.week_period,
          theme: child.theme,
          updated_at: child.updated_at,
          weeks: [child.week_period]
        })
      } else {
        const existing = childrenMap.get(child.child_name)
        // 모든 주간 기간을 수집
        existing.weeks.push(child.week_period)
        // 가장 최근 업데이트 시간으로 설정
        if (new Date(child.updated_at) > new Date(existing.updated_at)) {
          existing.updated_at = child.updated_at
        }
        if (child.theme) {
          existing.theme = child.theme
        }
      }
    })
    
    // 각 아이의 처음과 마지막 기간 설정
    childrenMap.forEach((child, childName) => {
      if (child.weeks.length > 1) {
        // 주간 기간을 날짜로 파싱하여 정렬
        const sortedWeeks = child.weeks.sort((a, b) => {
          // 한국어 날짜 형식 파싱: "2025년 6월 30일 ~ 2025년 7월 6일"
          const parseKoreanDate = (dateStr) => {
            const startDate = dateStr.split('~')[0].trim()
            const match = startDate.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/)
            if (match) {
              const [, year, month, day] = match
              return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
            }
            return new Date(0) // 파싱 실패시 최소값
          }
          
          const dateA = parseKoreanDate(a)
          const dateB = parseKoreanDate(b)
          return dateA - dateB
        })
        child.first_week = sortedWeeks[0]
        child.last_week = sortedWeeks[sortedWeeks.length - 1]
      }
      delete child.weeks // 임시 배열 제거
    })
    
    // Map을 배열로 변환하고 최신 순으로 정렬
    const uniqueChildren = Array.from(childrenMap.values())
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    
    return uniqueChildren
  } catch (error) {
    console.error('아이 목록 로드 오류:', error)
    return []
  }
}

// 특정 아이의 모든 주간 데이터 로드
export const loadChildWeeks = async (childName) => {
  try {
    const { data, error } = await supabase
      .from('habit_tracker')
      .select('week_period, theme, updated_at')
      .eq('child_name', childName)
      .order('updated_at', { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.error('아이 주간 목록 로드 오류:', error)
    return []
  }
}

// 특정 아이의 여러 주간 데이터 로드 (주간/월간 조회용)
export const loadChildMultipleWeeks = async (childName, weeks = 4) => {
  try {
    const { data, error } = await supabase
      .from('habit_tracker')
      .select('*')
      .eq('child_name', childName)
      .order('updated_at', { ascending: false })
      .limit(weeks)

    if (error) throw error
    return data
  } catch (error) {
    console.error('여러 주간 데이터 로드 오류:', error)
    return []
  }
}

// 특정 아이의 특정 주간 데이터 삭제
export const deleteChildWeekData = async (childName, weekPeriod) => {
  try {
    const { error } = await supabase
      .from('habit_tracker')
      .delete()
      .eq('child_name', childName)
      .eq('week_period', weekPeriod)

    if (error) throw error
    return true
  } catch (error) {
    console.error('주간 데이터 삭제 오류:', error)
    throw error
  }
}

// 아이 데이터 삭제
export const deleteChildData = async (childName) => {
  try {
    const { error } = await supabase
      .from('habit_tracker')
      .delete()
      .eq('child_name', childName)

    if (error) throw error
    return true
  } catch (error) {
    console.error('데이터 삭제 오류:', error)
    throw error
  }
} 