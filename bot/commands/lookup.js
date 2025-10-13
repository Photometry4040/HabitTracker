/**
 * /습관조회 Slash Command
 *
 * Query and display weekly habit data for a child.
 * This command fetches data from Supabase and displays it in a beautiful Discord embed.
 */

import { SlashCommandBuilder } from 'discord.js';
import { getChildWeekData, getWeeklyStats } from '../lib/supabase.js';
import { createHabitLookupEmbed, createErrorEmbed } from '../lib/embed.js';

export const data = new SlashCommandBuilder()
  .setName('습관조회')
  .setDescription('아이의 주간 습관 데이터를 조회합니다')
  .addStringOption(option =>
    option
      .setName('이름')
      .setDescription('아이 이름')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('날짜')
      .setDescription('주의 시작일 (월요일) - 형식: YYYY-MM-DD (예: 2025-10-13)')
      .setRequired(false)
  );

export async function execute(interaction) {
  // Defer reply immediately (slash commands have 3 second timeout)
  await interaction.deferReply();

  try {
    // Get command parameters
    const childName = interaction.options.getString('이름');
    let weekStartDate = interaction.options.getString('날짜');

    // If no date provided, use current week's Monday
    if (!weekStartDate) {
      weekStartDate = getCurrentWeekMonday();
    }

    // Validate date format
    if (!isValidDate(weekStartDate)) {
      const errorEmbed = createErrorEmbed(
        '잘못된 날짜 형식',
        '날짜는 **YYYY-MM-DD** 형식이어야 해요.\n예: `2025-10-13`'
      );
      await interaction.editReply({ embeds: [errorEmbed] });
      return;
    }

    // Ensure date is a Monday
    const adjustedDate = adjustToMonday(weekStartDate);
    if (adjustedDate !== weekStartDate) {
      console.log(`Adjusted date from ${weekStartDate} to Monday ${adjustedDate}`);
      weekStartDate = adjustedDate;
    }

    // Fetch data from Supabase
    console.log(`Fetching data for ${childName}, week starting ${weekStartDate}`);
    const weekData = await getChildWeekData(childName, weekStartDate);

    if (!weekData) {
      const errorEmbed = createErrorEmbed(
        '데이터를 찾을 수 없어요',
        `**${childName}**님의 **${weekStartDate}** 주차 데이터가 없어요.\n\n` +
        '**확인사항:**\n' +
        '• 아이 이름이 정확한가요?\n' +
        '• 해당 주에 데이터를 저장했나요?\n' +
        '• 날짜가 월요일인가요?'
      );
      await interaction.editReply({ embeds: [errorEmbed] });
      return;
    }

    // Try to get pre-calculated stats from materialized view
    const stats = await getWeeklyStats(childName, weekStartDate);

    // Create and send embed
    const embed = createHabitLookupEmbed(weekData, stats);
    await interaction.editReply({ embeds: [embed] });

    console.log(`Successfully sent habit data for ${childName}, week ${weekStartDate}`);

  } catch (error) {
    console.error('Error executing lookup command:', error);

    const errorEmbed = createErrorEmbed(
      '오류가 발생했어요',
      '데이터를 가져오는 중에 문제가 발생했어요. 나중에 다시 시도해주세요.\n\n' +
      `**오류 메시지:** ${error.message}`
    );

    // Try to edit reply, fallback to follow-up if edit fails
    try {
      await interaction.editReply({ embeds: [errorEmbed] });
    } catch (editError) {
      await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
    }
  }
}

/**
 * Get current week's Monday in ISO format
 *
 * @returns {string} ISO date string (YYYY-MM-DD)
 */
function getCurrentWeekMonday() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday

  // Calculate offset to Monday
  const offset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(today);
  monday.setDate(today.getDate() + offset);

  return monday.toISOString().split('T')[0];
}

/**
 * Validate date format (YYYY-MM-DD)
 *
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if valid
 */
function isValidDate(dateString) {
  if (!dateString) return false;

  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

/**
 * Adjust date to the nearest Monday (backwards)
 * If the date is not Monday, returns the previous Monday
 *
 * @param {string} dateString - ISO date string
 * @returns {string} Adjusted ISO date string (Monday)
 */
function adjustToMonday(dateString) {
  const date = new Date(dateString);
  const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday

  if (dayOfWeek === 1) {
    // Already Monday
    return dateString;
  }

  // Calculate offset to previous Monday
  const offset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(date);
  monday.setDate(date.getDate() + offset);

  return monday.toISOString().split('T')[0];
}

export default { data, execute };
