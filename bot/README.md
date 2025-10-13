# Habit Tracker Discord Bot

Discord Bot for the Habit Tracker application - provides interactive commands and automated reports for kids habit tracking.

## Features (Planned)

- **Slash Commands**
  - `/습관조회` - View habit data for a child and week
  - `/습관수정` - Update habit status with interactive buttons
  - `/통계` - View statistics and charts
  - `/알림설정` - Configure notification preferences

- **Interactive UI**
  - Button components for easy habit updates
  - Select menus for child/week selection
  - Modal forms for data input

- **Automated Reports** (Cron Jobs)
  - Daily summary (9 PM daily)
  - Weekly report (8 PM Sunday)

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Discord.js v14.14.1
- **Database**: Supabase (PostgreSQL)
- **Scheduler**: node-cron (planned)
- **Hosting**: Railway.app (planned)

## Prerequisites

Before you begin, ensure you have:

- Node.js 18 or higher installed
- A Discord account and server
- A Supabase project with the Habit Tracker database

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd "Habit Tracker Template for Kids with Visual Goals/bot"
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup environment variables

Copy the example environment file:

```bash
cp .env.example .env
```

Then edit `.env` and fill in your credentials:

```env
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_APPLICATION_ID=your_application_id_here
DISCORD_GUILD_ID=your_guild_id_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
NODE_ENV=development
```

### 4. Create Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" section:
   - Click "Add Bot"
   - Copy the Bot Token → paste into `DISCORD_BOT_TOKEN`
   - Enable "Message Content Intent" under Privileged Gateway Intents
4. Go to "General Information":
   - Copy Application ID → paste into `DISCORD_APPLICATION_ID`

### 5. Invite Bot to Your Server

1. In Discord Developer Portal, go to OAuth2 → URL Generator
2. Select scopes:
   - `bot`
   - `applications.commands`
3. Select bot permissions:
   - Send Messages
   - Use Slash Commands
   - Embed Links
   - Read Message History
4. Copy the generated URL and open it in your browser
5. Select your server and click "Authorize"

### 6. Get Guild ID

1. Enable Developer Mode in Discord:
   - User Settings → Advanced → Developer Mode (toggle on)
2. Right-click your server icon → Copy Server ID
3. Paste into `DISCORD_GUILD_ID` in `.env`

### 7. Get Supabase Credentials

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings → API
4. Copy the following:
   - Project URL → paste into `SUPABASE_URL`
   - `service_role` key (NOT anon key!) → paste into `SUPABASE_SERVICE_ROLE_KEY`

**Important**: The bot uses the `service_role` key for full database access. Keep this secret!

## Usage

### Development Mode

Run the bot with auto-restart on file changes:

```bash
npm run dev
```

### Production Mode

Run the bot normally:

```bash
npm start
```

### Verify Setup

When the bot starts successfully, you should see:

```
✅ Environment variables validated
✅ Supabase client initialized
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Discord Bot is ready!
🤖 Logged in as: YourBotName#1234
📊 Serving 1 server(s)
🌍 Environment: development
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 Testing Supabase connection...
✅ Supabase connection successful
📊 Database is accessible (found X sample record(s))
```

## Project Structure

```
bot/
├── index.js              # Main entry point (current implementation)
├── commands/             # Slash commands (planned - Day 2+)
│   ├── lookup.js         # /습관조회
│   ├── update.js         # /습관수정
│   ├── stats.js          # /통계
│   └── settings.js       # /알림설정
├── lib/                  # Helper functions (planned - Day 2+)
│   ├── supabase.js       # Supabase helpers
│   ├── embed.js          # Embed builder
│   └── utils.js          # Utilities
├── cron/                 # Automated reports (planned - Day 7)
│   ├── daily-summary.js  # Daily summary
│   └── weekly-report.js  # Weekly report
├── .env.example          # Environment template
├── .env                  # Your credentials (gitignored)
├── package.json          # Dependencies
└── README.md             # This file
```

## Current Status (Day 1)

**Implemented:**
- ✅ Basic bot structure
- ✅ Discord client initialization
- ✅ Supabase connection
- ✅ Environment validation
- ✅ Event handlers (ready, interactionCreate)
- ✅ Graceful shutdown handling
- ✅ Connection test on startup

**Coming Next (Day 2):**
- `/습관조회` Slash Command
- Discord Embed design
- Error handling
- Command registration script

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DISCORD_BOT_TOKEN` | Yes | Bot authentication token | `MTIzNDU2...` |
| `DISCORD_APPLICATION_ID` | Yes | Application/Client ID | `1234567890...` |
| `DISCORD_GUILD_ID` | No | Server ID (for dev) | `9876543210...` |
| `SUPABASE_URL` | Yes | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key | `eyJhbGciOi...` |
| `NODE_ENV` | No | Environment mode | `development` |

## Troubleshooting

### Bot doesn't start

**Error: Missing environment variables**
- Make sure you copied `.env.example` to `.env`
- Fill in all required variables

**Error: Invalid token**
- Check that `DISCORD_BOT_TOKEN` is correct
- Generate a new token in Discord Developer Portal if needed

### Supabase connection fails

**Error: Supabase connection test failed**
- Verify `SUPABASE_URL` format (should be `https://xxx.supabase.co`)
- Check that `SUPABASE_SERVICE_ROLE_KEY` is the service_role key, not anon key
- Ensure `habit_data` table exists in your database

### Bot is online but doesn't respond

This is expected for Day 1! Slash commands are not yet implemented.
- Commands will be added in Day 2
- Currently shows a placeholder message

## Development Roadmap

| Day | Tasks |
|-----|-------|
| **Day 1** | ✅ Initial setup, Discord client, Supabase connection |
| **Day 2** | `/습관조회` command, Embed design, Error handling |
| **Day 3** | Integration test, Bug fixes |
| **Day 4-5** | `/습관수정` command, Interactive UI, Buttons |
| **Day 6** | `/통계` command, Statistics integration |
| **Day 7** | Automated reports, Cron jobs, `/알림설정` |
| **Day 8** | Deployment to Railway.app, Production testing |

## Resources

- [Discord.js Guide](https://discordjs.guide/)
- [Discord Developer Portal](https://discord.com/developers/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Railway.app Documentation](https://docs.railway.app/)

## License

MIT

## Author

Agent 1 - Discord Bot Developer

## Related Documentation

- [Parent Project README](../README.md)
- [Discord Bot Specification](../docs/DISCORD_BOT_SPEC.md) (coming soon)
- [Parallel Development Plan](../docs/PARALLEL_DEV_PLAN.md)
