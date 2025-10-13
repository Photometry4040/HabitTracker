/**
 * Habit Tracker Discord Bot
 *
 * Main entry point for the Discord bot that provides interactive commands
 * and automated reports for the Habit Tracker application.
 *
 * @author Agent 1 - Discord Bot Developer
 * @version 1.0.0
 */

import { Client, GatewayIntentBits, Events } from 'discord.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ============================================================
// CONFIGURATION
// ============================================================

const {
  DISCORD_BOT_TOKEN,
  DISCORD_APPLICATION_ID,
  DISCORD_GUILD_ID,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  NODE_ENV = 'development'
} = process.env;

// ============================================================
// ENVIRONMENT VALIDATION
// ============================================================

/**
 * Validates required environment variables
 * Exits process if any required variables are missing
 */
function validateEnvironment() {
  const required = [
    'DISCORD_BOT_TOKEN',
    'DISCORD_APPLICATION_ID',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nPlease check your .env file.');
    process.exit(1);
  }

  console.log('✅ Environment variables validated');
}

// ============================================================
// DISCORD CLIENT SETUP
// ============================================================

/**
 * Initialize Discord client with required intents
 *
 * Intents used:
 * - Guilds: Basic server information
 * - GuildMessages: Read messages in servers
 * - MessageContent: Access message content (required for commands)
 */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ============================================================
// SUPABASE CLIENT SETUP
// ============================================================

/**
 * Initialize Supabase client
 * Uses service role key for full database access
 */
let supabase;

try {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  console.log('✅ Supabase client initialized');
} catch (error) {
  console.error('❌ Failed to initialize Supabase client:', error.message);
  process.exit(1);
}

// ============================================================
// EVENT HANDLERS
// ============================================================

/**
 * Event: Bot is ready and connected to Discord
 *
 * This event fires once when the bot successfully connects to Discord.
 * Use this to perform initialization tasks.
 */
client.once(Events.ClientReady, async (readyClient) => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Discord Bot is ready!`);
  console.log(`🤖 Logged in as: ${readyClient.user.tag}`);
  console.log(`📊 Serving ${readyClient.guilds.cache.size} server(s)`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Test Supabase connection
  await testSupabaseConnection();
});

/**
 * Event: Slash command interaction received
 *
 * This event fires when a user executes a slash command.
 * Currently a placeholder - will be implemented in Day 2.
 */
client.on(Events.InteractionCreate, async (interaction) => {
  // Only handle slash commands
  if (!interaction.isChatInputCommand()) return;

  console.log(`📝 Command received: /${interaction.commandName} from ${interaction.user.tag}`);

  // TODO: Day 2 - Implement command handlers
  // Example structure:
  // - commands/lookup.js - /습관조회
  // - commands/update.js - /습관수정
  // - commands/stats.js - /통계
  // - commands/settings.js - /알림설정

  try {
    // Placeholder response
    await interaction.reply({
      content: '⚠️ 명령어 핸들러가 아직 구현되지 않았습니다.\n이 기능은 Day 2에 추가될 예정입니다.',
      ephemeral: true // Only visible to the user who ran the command
    });
  } catch (error) {
    console.error('❌ Error handling interaction:', error);
  }
});

/**
 * Event: Error occurred
 *
 * Global error handler for the Discord client
 */
client.on(Events.Error, (error) => {
  console.error('❌ Discord client error:', error);
});

// ============================================================
// SUPABASE CONNECTION TEST
// ============================================================

/**
 * Tests Supabase database connection
 *
 * Attempts to query the habit_data table to verify:
 * 1. Database connection is working
 * 2. Credentials are correct
 * 3. Table exists and is accessible
 */
async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase connection...');

  try {
    // Simple query to test connection
    // Query the habit_data table (limit 1 to minimize data transfer)
    const { data, error } = await supabase
      .from('habit_data')
      .select('id')
      .limit(1);

    if (error) {
      console.error('❌ Supabase connection test failed:', error.message);
      return;
    }

    console.log('✅ Supabase connection successful');
    console.log(`📊 Database is accessible (found ${data?.length || 0} sample record(s))`);
  } catch (error) {
    console.error('❌ Unexpected error during Supabase test:', error.message);
  }
}

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================

/**
 * Handle graceful shutdown on process termination
 *
 * Ensures the bot properly disconnects from Discord
 * before the process exits.
 */
process.on('SIGINT', async () => {
  console.log('\n⚠️  Received SIGINT, shutting down gracefully...');
  client.destroy();
  console.log('👋 Bot disconnected. Goodbye!');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️  Received SIGTERM, shutting down gracefully...');
  client.destroy();
  console.log('👋 Bot disconnected. Goodbye!');
  process.exit(0);
});

// ============================================================
// START BOT
// ============================================================

/**
 * Main function - starts the bot
 *
 * Validates environment and logs in to Discord
 */
async function main() {
  console.log('🚀 Starting Habit Tracker Discord Bot...\n');

  // Validate environment variables
  validateEnvironment();

  // Login to Discord
  try {
    await client.login(DISCORD_BOT_TOKEN);
  } catch (error) {
    console.error('❌ Failed to login to Discord:', error.message);
    process.exit(1);
  }
}

// Run the bot
main();
