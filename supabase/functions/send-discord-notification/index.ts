import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Discord 메시지 타입 정의
interface DiscordEmbed {
  title: string;
  description: string;
  color: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  timestamp?: string;
  footer?: {
    text: string;
  };
}

interface NotificationRequest {
  type: 'habit_check' | 'week_save' | 'week_complete' | 'week_summary';
  childName: string;
  habitName?: string;
  color?: string;
  weekPeriod?: string;
  habitCount?: number;
  stats?: {
    total: number;
    completed?: number;
    green?: number;
    yellow?: number;
    red?: number;
    empty?: number;
    successRate: number;
    allFilled?: boolean;
  };
  dayOfWeek?: string;
}

// 색상 이름을 한글로 변환
function getColorNameKorean(color: string): string {
  const colorMap: { [key: string]: string } = {
    'green': '완료',
    'yellow': '보통',
    'red': '안함',
  };
  return colorMap[color] || color;
}

// 색상에 따른 이모지 반환
function getColorEmoji(color: string): string {
  const emojiMap: { [key: string]: string } = {
    'green': '🟢',
    'yellow': '🟡',
    'red': '🔴',
  };
  return emojiMap[color] || '⚪';
}

// Discord Embed 색상 코드 (16진수)
function getEmbedColor(color: string): number {
  const colorMap: { [key: string]: number } = {
    'green': 0x00FF00,   // 밝은 초록
    'yellow': 0xFFFF00,  // 노랑
    'red': 0xFF0000,     // 빨강
    'blue': 0x0099FF,    // 파랑 (저장용)
    'gold': 0xFFD700,    // 금색 (축하용)
  };
  return colorMap[color] || 0x5865F2; // Discord 기본 색상
}

// Discord 웹훅으로 메시지 전송
async function sendToDiscord(webhookUrl: string, embed: DiscordEmbed) {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      embeds: [embed],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Discord API error: ${response.status} - ${errorText}`);
  }

  return response;
}

// 습관 체크 알림 생성
function createHabitCheckEmbed(data: NotificationRequest): DiscordEmbed {
  const colorName = getColorNameKorean(data.color!);
  const emoji = getColorEmoji(data.color!);
  const embedColor = getEmbedColor(data.color!);

  return {
    title: '🎯 습관 체크!',
    description: `**${data.childName}**님이 **${data.habitName}** 습관을 체크했어요!`,
    color: embedColor,
    fields: [
      {
        name: '👤 아이',
        value: data.childName,
        inline: true,
      },
      {
        name: '📚 습관',
        value: data.habitName!,
        inline: true,
      },
      {
        name: '✅ 상태',
        value: `${emoji} ${colorName}`,
        inline: true,
      },
      {
        name: '📅 날짜',
        value: data.dayOfWeek || new Date().toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        }),
        inline: false,
      },
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: data.color === 'green'
        ? '계속 이런 식으로 하면 목표 달성이에요! 🎉'
        : '매일 꾸준히 하는 것이 중요해요! 💪',
    },
  };
}

// 주간 저장 알림 생성
function createWeekSaveEmbed(data: NotificationRequest): DiscordEmbed {
  return {
    title: '💾 주간 데이터 저장 완료',
    description: `**${data.childName}**님의 이번 주 습관 데이터가 저장되었어요!`,
    color: getEmbedColor('blue'),
    fields: [
      {
        name: '👤 아이',
        value: data.childName,
        inline: true,
      },
      {
        name: '📅 기간',
        value: data.weekPeriod || '현재 주',
        inline: true,
      },
      {
        name: '📊 습관 수',
        value: `${data.habitCount}개`,
        inline: true,
      },
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: '습관 트래커 앱에서 자동 저장되었습니다 ✨',
    },
  };
}

// 주간 목표 달성 알림 생성
function createWeekCompleteEmbed(data: NotificationRequest): DiscordEmbed {
  const stats = data.stats!;
  const emoji = stats.successRate >= 90 ? '🏆' : stats.successRate >= 80 ? '🎉' : '👏';

  return {
    title: `${emoji} 축하합니다!`,
    description: `**${data.childName}**님이 이번 주 목표를 달성했어요!`,
    color: getEmbedColor('gold'),
    fields: [
      {
        name: '👤 아이',
        value: data.childName,
        inline: true,
      },
      {
        name: '📅 기간',
        value: data.weekPeriod || '현재 주',
        inline: true,
      },
      {
        name: '📊 성공률',
        value: `**${stats.successRate}%**`,
        inline: true,
      },
      {
        name: '✨ 완료',
        value: `${stats.completed}/${stats.total}개`,
        inline: true,
      },
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: stats.successRate >= 90
        ? '완벽해요! 정말 대단해요! 🌟🌟🌟'
        : '훌륭해요! 계속 이렇게 해나가요! 🌟',
    },
  };
}

// 주간 습관 요약 알림 생성 (모든 습관 채워졌을 때)
function createWeekSummaryEmbed(data: NotificationRequest): DiscordEmbed {
  const stats = data.stats!;
  const rate = stats.successRate;
  const emoji = rate >= 90 ? '🌟' : rate >= 70 ? '👍' : '💪';

  return {
    title: `${emoji} 주간 습관 요약`,
    description: `**${data.childName}**님의 이번 주 습관 기록이 완성되었어요!`,
    color: getEmbedColor(rate >= 80 ? 'green' : rate >= 50 ? 'yellow' : 'red'),
    fields: [
      {
        name: '📅 기간',
        value: data.weekPeriod || '현재 주',
        inline: false,
      },
      {
        name: '🟢 달성',
        value: `${stats.green || 0}개`,
        inline: true,
      },
      {
        name: '🟡 보통',
        value: `${stats.yellow || 0}개`,
        inline: true,
      },
      {
        name: '🔴 미달성',
        value: `${stats.red || 0}개`,
        inline: true,
      },
      {
        name: '📊 달성률',
        value: `**${rate}%** (${stats.green || 0}/${stats.total})`,
        inline: false,
      },
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: rate >= 90
        ? '대단해요! 완벽한 한 주였어요! 🏆'
        : rate >= 70
        ? '잘했어요! 다음 주도 화이팅! 💪'
        : '괜찮아요! 조금씩 나아지고 있어요! 🌱',
    },
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Discord 웹훅 URL 확인
    const webhookUrl = Deno.env.get('DISCORD_WEBHOOK_URL');
    if (!webhookUrl) {
      throw new Error('DISCORD_WEBHOOK_URL environment variable not set');
    }

    // 요청 데이터 파싱
    const data: NotificationRequest = await req.json();

    console.log('Received notification request:', {
      type: data.type,
      childName: data.childName,
      habitName: data.habitName,
    });

    // 알림 타입에 따라 Embed 생성
    let embed: DiscordEmbed;

    switch (data.type) {
      case 'habit_check':
        if (!data.habitName || !data.color) {
          throw new Error('habitName and color are required for habit_check type');
        }
        embed = createHabitCheckEmbed(data);
        break;

      case 'week_save':
        if (!data.weekPeriod || data.habitCount === undefined) {
          throw new Error('weekPeriod and habitCount are required for week_save type');
        }
        embed = createWeekSaveEmbed(data);
        break;

      case 'week_complete':
        if (!data.weekPeriod || !data.stats) {
          throw new Error('weekPeriod and stats are required for week_complete type');
        }
        embed = createWeekCompleteEmbed(data);
        break;

      case 'week_summary':
        if (!data.stats) {
          throw new Error('stats are required for week_summary type');
        }
        embed = createWeekSummaryEmbed(data);
        break;

      default:
        throw new Error(`Unknown notification type: ${data.type}`);
    }

    // Discord로 전송
    await sendToDiscord(webhookUrl, embed);

    console.log('Discord notification sent successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Notification sent to Discord',
        type: data.type,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error sending Discord notification:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
