# 🎉 Discord Birthday Announcement Bot

A Node.js Discord clanker that lets server members register their birthdays using native Discord forms (Modals), displays countdowns for upcoming birthdays, and posts beautiful, automatic announcements when their special day arrives!

---

## 🛠️ Setup & Installation

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v16.11.0 or higher is required for Discord.js v14)
- A Discord account and a server where you have Administrator permissions.

### 2. Install Dependencies
Open your terminal in this directory (`C:\Users\quinn\.gemini\antigravity\scratch\birthday-bot`) and run:
```bash
npm install
```

### 3. Create your Discord Bot Application
1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Click **New Application** and give your bot a name (e.g., "Birthday Bot").
3. Go to the **Bot** tab on the left sidebar:
   - Click **Add Bot** (if prompted).
   - Under the **Token** section, click **Reset Token** and copy the token. **Paste it into your `.env` file as `DISCORD_TOKEN`**.
   - Scroll down to the **Privileged Gateway Intents** section:
     - Enable **Server Members Intent** (required so the bot can fetch server member details and match birthdays).
     - Save changes.
4. Go to the **General Information** tab:
   - Copy the **Application ID**. **Paste it into your `.env` file as `CLIENT_ID`**.
5. *(Optional but recommended for testing)* Copy your Discord Server's ID:
   - In Discord, enable developer mode (*Settings > Advanced > Developer Mode*).
   - Right-click your server's icon and click **Copy Server ID**.
   - **Paste it into your `.env` file as `GUILD_ID`** for instant slash command updates.

### 4. Invite the Bot to Your Server
1. In the Developer Portal, go to the **OAuth2** tab, then select the **URL Generator** sub-tab.
2. Select the `bot` scope.
3. Under **Bot Permissions**, select:
   - **Read Messages/View Channels**
   - **Send Messages**
   - **Embed Links**
   - **Use Slash Commands**
4. Copy the generated URL at the bottom and open it in your browser to invite the bot to your server.

---

## 🚀 Running the Bot

### 1. Register Slash Commands
Run the command deployment script to register your commands with Discord:
```bash
npm run register
```
*Note: If `GUILD_ID` is set in your `.env`, commands register instantly on your test server. If not, they are registered globally and can take up to 1 hour to propagate.*

### 2. Start the Bot
Run the bot:
```bash
npm start
```

---

## 📖 Command Guide
| Command | Subcommands / Options | Permission | Description |
| :--- | :--- | :--- | :--- |
| `/birthday set` | None | Everyone | Opens a popup form (Modal) to register or update your birthday. |
| `/birthday list` | None | Everyone | Shows a list of all registered birthdays sorted by who celebrates next. |
| `/birthday remove` | None | Everyone | Deletes your birthday from the bot's database. |
| `/birthday channel` | `channel` *(Text Channel)* | Manage Channels | Sets the channel where birthday announcements will be sent. |
| `/birthday test` | `month` *(Optional)*, `day` *(Optional)* | Manage Channels | Triggers an immediate announcement check. Can simulate any custom date. |
