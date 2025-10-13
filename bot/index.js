/**
 * Habit Tracker Discord Bot
 *
 * Main entry point for the Discord bot.
 * Handles slash command interactions and queries habit data from Supabase.
 *
 * Features:
 * - /습관조회 - Query weekly habit data for children
 * - Beautiful Discord embeds with progress visualization
 * - Integration with Supabase database (new schema)
 *
 * @author Claude Code (Agent 1: Discord Bot Developer)
 * @version 1.0.0 - Day 2 Implementation
 */

import { Client, GatewayIntentBits, Collection } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate environment variables
const requiredEnvVars = ['DISCORD_TOKEN', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Error: Missing required environment variables:');
  missingVars.forEach(varName => console.error(`  - ${varName}`));
  console.error('\nPlease create a .env file with these variables.');
  console.error('See .env.example for reference.');
  process.exit(1);
}

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

// Initialize command collection
client.commands = new Collection();

// Load commands from commands/ directory
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

console.log('📦 Loading commands...');

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = await import(`file://${filePath}`);

  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    console.log(`  ✓ Loaded: ${command.data.name}`);
  } else {
    console.warn(`  ⚠ Warning: ${file} is missing required "data" or "execute" export`);
  }
}

console.log(`✅ Loaded ${client.commands.size} command(s)\n`);

// Event: Bot ready
client.once('ready', () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🤖 Habit Tracker Discord Bot');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Logged in as: ${client.user.tag}`);
  console.log(`📊 Serving ${client.guilds.cache.size} guild(s)`);
  console.log(`🎯 Commands loaded: ${client.commands.size}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('✨ Bot is ready and listening for commands!\n');

  // Set bot activity status
  client.user.setActivity('습관 트래커', { type: 'WATCHING' });
});

// Event: Slash command interaction
client.on('interactionCreate', async interaction => {
  // Only handle slash commands
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.warn(`⚠ Unknown command: ${interaction.commandName}`);
    return;
  }

  try {
    console.log(`📨 Command received: /${interaction.commandName} from ${interaction.user.tag}`);
    await command.execute(interaction);
    console.log(`✅ Command executed successfully: /${interaction.commandName}`);
  } catch (error) {
    console.error(`❌ Error executing command: /${interaction.commandName}`);
    console.error(error);

    const errorMessage = {
      content: '❌ 명령어 실행 중 오류가 발생했어요. 나중에 다시 시도해주세요.',
      ephemeral: true
    };

    // Try to reply or follow up depending on interaction state
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    } catch (replyError) {
      console.error('❌ Failed to send error message to user:', replyError);
    }
  }
});

// Event: Error handling
client.on('error', error => {
  console.error('❌ Discord client error:', error);
});

process.on('unhandledRejection', error => {
  console.error('❌ Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  client.destroy();
  process.exit(0);
});

// Login to Discord
console.log('🚀 Starting bot...\n');
client.login(process.env.DISCORD_TOKEN);
