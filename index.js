require('dotenv').config();
const { Client, GatewayIntentBits, Events } = require('discord.js');
const birthdayCommand = require('./commands/birthday');
const { deployCommands } = require('./deploy-commands');
const { startScheduler, updatePresence } = require('./scheduler');
const db = require('./database');

// Create Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// Event: Client Ready
client.once(Events.ClientReady, async (c) => {
  console.log(`🚀 Bot is online! Logged in as ${c.user.tag}`);
  
  // Automatically register/update slash commands on boot
  await deployCommands();
  
  // Start the birthday check scheduler
  startScheduler(client);
});

// Event: Interaction Create
client.on(Events.InteractionCreate, async (interaction) => {
  // Handle Slash Commands
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'birthday') {
      try {
        await birthdayCommand.execute(interaction);
      } catch (error) {
        console.error('Error executing birthday command:', error);
        const replyPayload = { 
          content: '❌ There was an error executing this command!', 
          ephemeral: true 
        };
        
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(replyPayload);
        } else {
          await interaction.reply(replyPayload);
        }
      }
    }
  }

  // Handle Modal Submissions
  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'birthday_modal') {
      try {
        await birthdayCommand.handleModalSubmit(interaction);
      } catch (error) {
        console.error('Error handling birthday modal submission:', error);
        const replyPayload = { 
          content: '❌ There was an error processing your birthday registration!', 
          ephemeral: true 
        };
        
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(replyPayload);
        } else {
          await interaction.reply(replyPayload);
        }
      }
    }
  }
});

// Event: Guild Member Remove (User leaves server)
client.on(Events.GuildMemberRemove, (member) => {
  const removed = db.removeBirthday(member.id);
  if (removed) {
    console.log(`[Database] Automatically removed birthday registry for leaving member: ${member.user.tag} (${member.id})`);
    updatePresence(member.client);
  }
});

// Log in to Discord
const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('CRITICAL: DISCORD_TOKEN is not defined in the environment variables (check your .env file).');
  process.exit(1);
}

client.login(token).catch(err => {
  console.error('Failed to log in to Discord. Please verify your DISCORD_TOKEN in the .env file.', err);
});
