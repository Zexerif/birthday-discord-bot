require('dotenv').config();
const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('birthday')
    .setDescription('Manage birthday registry and configuration.')
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Register or update your birthday using a popup form.')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove your birthday from the registry.')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all registered birthdays.')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('channel')
        .setDescription('Set the channel where birthday announcements will be posted.')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('The text channel for birthday announcements')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('set-user')
        .setDescription("Set another member's birthday (Admin only).")
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The member whose birthday you want to set')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('month')
            .setDescription('Month (1-12)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(12)
        )
        .addIntegerOption(option =>
          option
            .setName('day')
            .setDescription('Day (1-31)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(31)
        )
        .addIntegerOption(option =>
          option
            .setName('year')
            .setDescription('Optional birth year (negative = BCE, e.g. -400 for 400 BCE)')
            .setRequired(false)
            .setMinValue(-9999)
            .setMaxValue(new Date().getFullYear())
        )
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('Preferred or real name of the member')
            .setRequired(false)
            .setMaxLength(100)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove-user')
        .setDescription("Remove another member's birthday (Admin only).")
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The member whose birthday you want to remove')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('test')
        .setDescription('Force the bot to check and announce birthdays (Admin only).')
        .addIntegerOption(option =>
          option
            .setName('month')
            .setDescription('Optional month (1-12) to test a specific date')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(12)
        )
        .addIntegerOption(option =>
          option
            .setName('day')
            .setDescription('Optional day (1-31) to test a specific date')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(31)
        )
    )
].map(command => command.toJSON());

async function deployCommands() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;
  const guildId = process.env.GUILD_ID;

  if (!token || !clientId) {
    console.error('[Deploy] Error: DISCORD_TOKEN and CLIENT_ID must be specified.');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log(`[Deploy] Started refreshing ${commands.length} application (/) commands.`);

    if (guildId) {
      console.log(`[Deploy] Registering commands to Guild: ${guildId}`);
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands }
      );
      console.log('[Deploy] Successfully registered application commands locally in test guild!');
    } else {
      console.log('[Deploy] Registering commands globally (may take up to 1 hour to propagate across Discord)...');
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands }
      );
      console.log('[Deploy] Successfully registered application commands globally!');
    }
  } catch (error) {
    console.error('[Deploy] Failed to deploy commands:', error);
  }
}

module.exports = { deployCommands };

if (require.main === module) {
  deployCommands();
}

