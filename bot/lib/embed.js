/**
 * Discord Embed Helper Functions
 *
 * This module creates beautiful Discord embeds to display habit data.
 * Uses Discord.js v14 EmbedBuilder API.
 */

import { EmbedBuilder } from 'discord.js';

/**
 * Color scheme for Discord embeds
 */
const COLORS = {
  SUCCESS: 0x22c55e,  // Green
  WARNING: 0xeab308,  // Yellow
  ERROR: 0xef4444,    // Red
  INFO: 0x3b82f6,     // Blue
  NEUTRAL: 0x64748b   // Gray
};

/**
 * Status emoji mapping
 */
const STATUS_EMOJI = {
  green: '🟢',
  yellow: '🟡',
  red: '🔴',
  none: '⚪'
};

/**
 * Day of week names in Korean
 */
const DAY_NAMES = ['월', '화', '수', '목', '금', '토', '일'];

/**
 * Create a habit lookup embed showing weekly progress
 *
 * @param {Object} weekData - Week data from getChildWeekData
 * @param {Object} stats - Statistics from getWeeklyStats (optional)
 * @returns {EmbedBuilder} Discord embed
 */
export function createHabitLookupEmbed(weekData, stats = null) {
  const { childName, weekPeriod, habits, theme, reward } = weekData;

  // Calculate stats if not provided
  if (!stats) {
    stats = calculateQuickStats(habits);
  }

  // Determine embed color based on success rate
  let embedColor = COLORS.NEUTRAL;
  if (stats.successRate >= 80) {
    embedColor = COLORS.SUCCESS;
  } else if (stats.successRate >= 60) {
    embedColor = COLORS.WARNING;
  } else if (stats.checkedRecords > 0) {
    embedColor = COLORS.ERROR;
  }

  const embed = new EmbedBuilder()
    .setColor(embedColor)
    .setTitle(`📊 ${childName}님의 습관 조회`)
    .setDescription(`**기간:** ${weekPeriod}`)
    .setTimestamp()
    .setFooter({ text: '습관 트래커 Discord Bot' });

  // Add theme if available
  if (theme) {
    embed.addFields({
      name: '🎯 이번 주 테마',
      value: theme,
      inline: true
    });
  }

  // Add reward if available
  if (reward) {
    embed.addFields({
      name: '🎁 목표 보상',
      value: reward,
      inline: true
    });
  }

  // Add separator if theme or reward exists
  if (theme || reward) {
    embed.addFields({
      name: '\u200B',
      value: '━━━━━━━━━━━━━━━━━━━━━━━━'
    });
  }

  // Add each habit with progress
  habits.forEach((habit, index) => {
    const progressBar = createHabitProgressBar(habit.times);
    const completion = calculateHabitCompletion(habit.times);

    embed.addFields({
      name: `${index + 1}. ${habit.name}`,
      value: `${progressBar}\n${completion.text}`,
      inline: false
    });
  });

  // Add overall statistics
  embed.addFields({
    name: '\u200B',
    value: '━━━━━━━━━━━━━━━━━━━━━━━━'
  });

  embed.addFields({
    name: '📈 전체 통계',
    value: createStatsText(stats),
    inline: false
  });

  // Add motivational message
  const message = getMotivationalMessage(stats.successRate);
  if (message) {
    embed.addFields({
      name: '💬 한마디',
      value: message,
      inline: false
    });
  }

  return embed;
}

/**
 * Create a progress bar for a habit's 7 days
 *
 * @param {Array<string>} times - 7-day status array
 * @returns {string} Progress bar with day labels
 */
function createHabitProgressBar(times) {
  const dayLine = DAY_NAMES.map(day => `**${day}**`).join(' ');
  const statusLine = times.map(status => STATUS_EMOJI[status] || STATUS_EMOJI.none).join(' ');

  return `${dayLine}\n${statusLine}`;
}

/**
 * Calculate completion stats for a single habit
 *
 * @param {Array<string>} times - 7-day status array
 * @returns {Object} Completion stats with text
 */
function calculateHabitCompletion(times) {
  const green = times.filter(t => t === 'green').length;
  const yellow = times.filter(t => t === 'yellow').length;
  const red = times.filter(t => t === 'red').length;
  const checked = green + yellow + red;

  const percentage = checked > 0 ? Math.round((green / checked) * 100) : 0;

  let text = `✅ ${green}/7일 완료`;
  if (yellow > 0 || red > 0) {
    text += ` (🟡 ${yellow}일, 🔴 ${red}일)`;
  }
  if (percentage >= 80) {
    text += ' 🌟';
  }

  return { green, yellow, red, checked, percentage, text };
}

/**
 * Calculate quick stats from habit data
 *
 * @param {Array<Object>} habits - Habits array with times
 * @returns {Object} Statistics
 */
function calculateQuickStats(habits) {
  let greenCount = 0;
  let yellowCount = 0;
  let redCount = 0;
  let noneCount = 0;

  habits.forEach(habit => {
    habit.times.forEach(status => {
      if (status === 'green') greenCount++;
      else if (status === 'yellow') yellowCount++;
      else if (status === 'red') redCount++;
      else noneCount++;
    });
  });

  const totalChecks = habits.length * 7;
  const checkedRecords = greenCount + yellowCount + redCount;
  const successRate = checkedRecords > 0
    ? Math.round((greenCount / checkedRecords) * 100)
    : 0;

  return {
    totalHabits: habits.length,
    totalChecks,
    greenCount,
    yellowCount,
    redCount,
    noneCount,
    checkedRecords,
    successRate
  };
}

/**
 * Create statistics text for embed
 *
 * @param {Object} stats - Statistics object
 * @returns {string} Formatted stats text
 */
function createStatsText(stats) {
  const lines = [];

  lines.push(`**총 습관 수:** ${stats.totalHabits}개`);
  lines.push(`**체크 현황:** ${stats.checkedRecords}/${stats.totalChecks}회`);
  lines.push('');
  lines.push(`🟢 완료: ${stats.greenCount}회`);
  lines.push(`🟡 보통: ${stats.yellowCount}회`);
  lines.push(`🔴 안함: ${stats.redCount}회`);
  lines.push('');
  lines.push(`**성공률:** ${stats.successRate}%`);

  // Add progress bar
  const progressBar = createPercentageBar(stats.successRate);
  lines.push(progressBar);

  return lines.join('\n');
}

/**
 * Create percentage progress bar
 *
 * @param {number} percentage - Percentage (0-100)
 * @returns {string} Visual progress bar
 */
function createPercentageBar(percentage) {
  const filled = Math.floor(percentage / 10);
  const empty = 10 - filled;

  const bar = '█'.repeat(filled) + '░'.repeat(empty);

  let emoji = '';
  if (percentage >= 90) emoji = '🏆';
  else if (percentage >= 80) emoji = '🎉';
  else if (percentage >= 70) emoji = '👍';
  else if (percentage >= 50) emoji = '💪';

  return `[${bar}] ${percentage}% ${emoji}`;
}

/**
 * Get motivational message based on success rate
 *
 * @param {number} successRate - Success rate percentage
 * @returns {string} Motivational message
 */
function getMotivationalMessage(successRate) {
  if (successRate >= 90) {
    return '완벽해요! 정말 대단해요! 계속 이 멋진 습관을 유지해주세요! 🌟🌟🌟';
  } else if (successRate >= 80) {
    return '훌륭해요! 목표를 달성했어요! 이대로만 계속하면 돼요! 🎉';
  } else if (successRate >= 70) {
    return '잘하고 있어요! 조금만 더 노력하면 목표 달성이에요! 💪';
  } else if (successRate >= 50) {
    return '좋은 시작이에요! 매일 조금씩 꾸준히 하는 게 중요해요! 📈';
  } else if (successRate > 0) {
    return '괜찮아요! 처음엔 누구나 어려워요. 작은 것부터 시작해봐요! 🌱';
  }
  return null;
}

/**
 * Create an error embed
 *
 * @param {string} title - Error title
 * @param {string} message - Error message
 * @returns {EmbedBuilder} Error embed
 */
export function createErrorEmbed(title, message) {
  return new EmbedBuilder()
    .setColor(COLORS.ERROR)
    .setTitle(`❌ ${title}`)
    .setDescription(message)
    .setTimestamp()
    .setFooter({ text: '습관 트래커 Discord Bot' });
}

/**
 * Create an info embed
 *
 * @param {string} title - Info title
 * @param {string} message - Info message
 * @returns {EmbedBuilder} Info embed
 */
export function createInfoEmbed(title, message) {
  return new EmbedBuilder()
    .setColor(COLORS.INFO)
    .setTitle(`ℹ️ ${title}`)
    .setDescription(message)
    .setTimestamp()
    .setFooter({ text: '습관 트래커 Discord Bot' });
}

/**
 * Create a help embed for commands
 *
 * @returns {EmbedBuilder} Help embed
 */
export function createHelpEmbed() {
  return new EmbedBuilder()
    .setColor(COLORS.INFO)
    .setTitle('📖 습관 트래커 Bot 사용법')
    .setDescription('아래 명령어를 사용하여 습관 데이터를 조회할 수 있어요!')
    .addFields(
      {
        name: '/습관조회',
        value: '특정 아이의 주간 습관 데이터를 조회해요.\n예: `/습관조회 이름:지우 날짜:2025-10-13`',
        inline: false
      },
      {
        name: '매개변수',
        value: '**이름** (필수): 아이 이름\n**날짜** (선택): 주의 시작일 (월요일), 형식: YYYY-MM-DD\n날짜를 생략하면 이번 주 데이터를 조회해요.',
        inline: false
      },
      {
        name: '사용 예시',
        value: '```\n/습관조회 이름:지우\n/습관조회 이름:지우 날짜:2025-10-13\n```',
        inline: false
      }
    )
    .setTimestamp()
    .setFooter({ text: '습관 트래커 Discord Bot' });
}

export default {
  createHabitLookupEmbed,
  createErrorEmbed,
  createInfoEmbed,
  createHelpEmbed
};
