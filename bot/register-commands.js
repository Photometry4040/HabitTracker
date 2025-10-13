/**
 * Discord Slash Command Registration Script
 *
 * This script registers slash commands with Discord's API.
 * Run this once when deploying the bot or when commands change.
 *
 * Usage:
 *   npm run register
 */

import { REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;
const token = process.env.DISCORD_TOKEN;

if (!clientId || !token) {
  console.error('❌ Error: Missing required environment variables');
  console.error('Required: DISCORD_CLIENT_ID, DISCORD_TOKEN');
  console.error('Optional: DISCORD_GUILD_ID (for guild-only commands)');
  process.exit(1);
}

// Collect all commands from commands/ directory
const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

console.log('📦 Loading commands...');

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = await import(`file://${filePath}`);

  if ('data' in command && 'execute' in command) {
    commands.push(command.data.toJSON());
    console.log(`  ✓ Loaded: ${command.data.name}`);
  } else {
    console.warn(`  ⚠ Warning: ${file} is missing required "data" or "execute" export`);
  }
}

console.log(`\n✅ Loaded ${commands.length} command(s)\n`);

// Register commands with Discord API
const rest = new REST().setToken(token);

try {
  console.log('🚀 Registering slash commands with Discord...\n');

  let data;

  if (guildId) {
    // Register commands to specific guild (instant, for testing)
    console.log(`📍 Registering to guild: ${guildId}`);
    data = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );
    console.log('✅ Commands registered to guild (instant update)');
  } else {
    // Register commands globally (takes up to 1 hour to propagate)
    console.log('🌍 Registering globally');
    data = await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands }
    );
    console.log('✅ Commands registered globally (may take up to 1 hour to appear)');
  }

  console.log(`\n📊 Successfully registered ${data.length} command(s):`);
  data.forEach(cmd => {
    console.log(`  • /${cmd.name} - ${cmd.description}`);
  });

  console.log('\n✨ Registration complete!');

  if (!guildId) {
    console.log('\n💡 Tip: For instant testing, set DISCORD_GUILD_ID in .env');
    console.log('   Guild commands update instantly, global commands take ~1 hour');
  }

} catch (error) {
  console.error('\n❌ Error registering commands:');
  console.error(error);

  if (error.status === 401) {
    console.error('\n🔑 Authentication failed. Check your DISCORD_TOKEN.');
  } else if (error.status === 403) {
    console.error('\n🚫 Permission denied. Ensure bot has applications.commands scope.');
  } else if (error.status === 404) {
    console.error('\n🔍 Client ID or Guild ID not found. Check your environment variables.');
  }

  process.exit(1);
}
