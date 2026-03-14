import { supabase } from './supabase.js';

/**
 * Discord 알림 전송 헬퍼 함수
 * Edge Function을 호출하여 Discord 웹훅으로 알림을 전송합니다.
 */

/**
 * Edge Function 호출 (Supabase Functions)
 * @param {string} type - 알림 타입 ('habit_check' | 'week_save' | 'week_complete')
 * @param {object} data - 알림 데이터
 * @returns {Promise<object>} 응답 데이터
 */
async function callEdgeFunction(type, data) {
  try {
    const { data: result, error } = await supabase.functions.invoke('send-discord-notification', {
      body: {
        type,
        ...data,
      },
    });

    if (error) {
      console.error('Discord notification error:', error);
      return { success: false, error };
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to send Discord notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Discord 알림이 활성화되어 있는지 확인
 * Edge Function에서 서버 사이드로 웹훅 URL을 관리하므로
 * 클라이언트에서는 항상 true를 반환합니다.
 * @returns {boolean}
 */
export function isDiscordEnabled() {
  return true;
}

/**
 * 습관 체크 알림 전송
 * @param {string} childName - 아이 이름
 * @param {string} habitName - 습관 이름
 * @param {string} color - 색상 ('green' | 'yellow' | 'red')
 * @param {string} dayOfWeek - 요일 (선택)
 * @returns {Promise<object>}
 */
export async function notifyHabitCheck(childName, habitName, color, dayOfWeek = null) {
  if (!isDiscordEnabled()) {
    return { success: false, message: 'Discord not configured' };
  }

  // 빈 색상은 알림 안 보냄 (사용자가 색상을 지웠을 때)
  if (!color || color === '') {
    return { success: false, message: 'Empty color, skipping notification' };
  }

  const data = {
    childName,
    habitName,
    color,
    dayOfWeek: dayOfWeek || new Date().toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    }),
  };

  return await callEdgeFunction('habit_check', data);
}

/**
 * 주간 데이터 저장 알림 전송
 * @param {string} childName - 아이 이름
 * @param {string} weekPeriod - 주간 기간 (예: "2025년 1월 13일 ~ 2025년 1월 19일")
 * @param {number} habitCount - 습관 개수
 * @returns {Promise<object>}
 */
export async function notifyWeekSave(childName, weekPeriod, habitCount) {
  if (!isDiscordEnabled()) {
    return { success: false, message: 'Discord not configured' };
  }

  const data = {
    childName,
    weekPeriod,
    habitCount,
  };

  return await callEdgeFunction('week_save', data);
}

/**
 * 주간 목표 달성 알림 전송
 * @param {string} childName - 아이 이름
 * @param {string} weekPeriod - 주간 기간
 * @param {object} stats - 통계 데이터 { total, completed, successRate }
 * @returns {Promise<object>}
 */
export async function notifyWeekComplete(childName, weekPeriod, stats) {
  if (!isDiscordEnabled()) {
    return { success: false, message: 'Discord not configured' };
  }

  const data = {
    childName,
    weekPeriod,
    stats,
  };

  return await callEdgeFunction('week_complete', data);
}

/**
 * 주간 습관 데이터로 통계 계산
 * @param {Array} habits - 습관 배열 [{ id, name, times: [] }]
 * @returns {object} { total, completed, successRate }
 */
export function calculateWeekStats(habits) {
  const total = habits.length * 7; // 습관 수 × 7일
  const completed = habits
    .flatMap((habit) => habit.times)
    .filter((time) => time === 'green').length;

  const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    completed,
    successRate,
  };
}

/**
 * 주간 습관 요약 알림 전송 (모든 습관이 채워졌을 때)
 * @param {string} childName - 아이 이름
 * @param {string} weekPeriod - 주간 기간
 * @param {object} stats - 통계 { total, green, yellow, red, successRate }
 * @returns {Promise<object>}
 */
export async function notifyWeekSummary(childName, weekPeriod, stats) {
  if (!isDiscordEnabled()) {
    return { success: false, message: 'Discord not configured' };
  }

  const data = {
    childName,
    weekPeriod,
    stats,
  };

  return await callEdgeFunction('week_summary', data);
}

/**
 * 주간 습관 데이터로 상세 통계 계산 (green/yellow/red 포함)
 * @param {Array} habits - 습관 배열 [{ id, name, times: [] }]
 * @returns {object} { total, green, yellow, red, empty, successRate, allFilled }
 */
export function calculateDetailedWeekStats(habits) {
  const total = habits.length * 7;
  const allTimes = habits.flatMap((habit) => habit.times);
  const green = allTimes.filter((t) => t === 'green').length;
  const yellow = allTimes.filter((t) => t === 'yellow').length;
  const red = allTimes.filter((t) => t === 'red').length;
  const empty = allTimes.filter((t) => !t || t === '').length;
  const successRate = total > 0 ? Math.round((green / total) * 100) : 0;

  return {
    total,
    green,
    yellow,
    red,
    empty,
    successRate,
    allFilled: empty === 0 && total > 0,
  };
}

/**
 * 일괄 테스트용 함수 (개발용)
 * @param {string} childName - 아이 이름
 */
export async function testDiscordNotifications(childName = '테스트') {

  // 1. 습관 체크 알림 (초록)
  await notifyHabitCheck(childName, '책 읽기', 'green');
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 2. 습관 체크 알림 (노랑)
  await notifyHabitCheck(childName, '운동하기', 'yellow');
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 3. 주간 저장 알림
  await notifyWeekSave(childName, '2025년 1월 13일 ~ 2025년 1월 19일', 5);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 4. 주간 목표 달성 알림
  await notifyWeekComplete(childName, '2025년 1월 13일 ~ 2025년 1월 19일', {
    total: 35,
    completed: 30,
    successRate: 86,
  });

}
