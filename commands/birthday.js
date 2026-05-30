const { 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  ActionRowBuilder, 
  EmbedBuilder,
  PermissionFlagsBits
} = require('discord.js');
const db = require('../database');
const { announceBirthdays, updatePresence } = require('../scheduler');

// Helper to validate date
function isValidDate(month, day, year = null) {
  const checkYear = year !== null ? parseInt(year, 10) : 2024; // Default to leap year 2024
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);

  if (isNaN(m) || isNaN(d) || isNaN(checkYear)) return false;
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;

  // Use setFullYear to correctly handle years < 100 AD and BCE (negative) years
  // new Date(year, ...) misinterprets 0-99 as 1900-1999
  const date = new Date(0);
  date.setFullYear(checkYear, m - 1, d);
  return (
    date.getFullYear() === checkYear &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  );
}

// Convert month number to month name
function getMonthName(monthNumber) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthNumber - 1] || 'Unknown';
}

// Calculate days until next birthday
function getDaysUntilBirthday(month, day) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const year = today.getFullYear();
  let bdayThisYear = new Date(year, month - 1, day);
  bdayThisYear.setHours(0, 0, 0, 0);

  if (bdayThisYear < today) {
    // Birthday has passed this year, check next year
    bdayThisYear.setFullYear(year + 1);
  }

  const diffTime = bdayThisYear - today;
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

module.exports = {
  // Command handler
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'set') {
      // Create a modal to prompt for birthday info
      const modal = new ModalBuilder()
        .setCustomId('birthday_modal')
        .setTitle('Register Your Birthday');

      const monthInput = new TextInputBuilder()
        .setCustomId('birthday_month')
        .setLabel('Month (1-12)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(2)
        .setPlaceholder('e.g., 5 for May');

      const dayInput = new TextInputBuilder()
        .setCustomId('birthday_day')
        .setLabel('Day (1-31)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(2)
        .setPlaceholder('e.g., 28');

      const yearInput = new TextInputBuilder()
        .setCustomId('birthday_year')
        .setLabel('Birth Year (Optional, negative = BCE)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMinLength(1)
        .setMaxLength(5)
        .setPlaceholder('e.g., 2001 or -400');

      const nameInput = new TextInputBuilder()
        .setCustomId('birthday_name')
        .setLabel('Preferred or Real Name (Optional)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMinLength(1)
        .setMaxLength(100)
        .setPlaceholder('e.g., Glorbus');

      // Add to action rows (each input must be in its own row)
      const firstRow = new ActionRowBuilder().addComponents(monthInput);
      const secondRow = new ActionRowBuilder().addComponents(dayInput);
      const thirdRow = new ActionRowBuilder().addComponents(yearInput);
      const fourthRow = new ActionRowBuilder().addComponents(nameInput);

      modal.addComponents(firstRow, secondRow, thirdRow, fourthRow);

      // Show the modal
      await interaction.showModal(modal);
    }

    else if (subcommand === 'help') {
      const embed = new EmbedBuilder()
        .setColor('#FCC419') // Warm gold
        .setTitle('🎂 Birthday Bot Help & Guide')
        .setDescription(
          'Welcome to the Birthday Bot! I announce server members\' birthdays and track upcoming celebrations.\n\n' +
          '### 👤 Member Commands\n' +
          '- **`/birthday set`**: Registers or updates your own birthday. It opens a simple form popup where you can input:\n' +
          '  * **Month & Day** (required numbers, e.g. Month `12`, Day `25`)\n' +
          '  * **Birth Year** (optional number, e.g. `2001`, or negative numbers for BCE like `-400`)\n' +
          '  * **Preferred Name** (optional text, e.g. `Glorbus`, used instead of your username in announcements)\n' +
          '- **`/birthday list`**: View a chronological list of upcoming birthdays in the server, with countdown timers.\n' +
          '- **`/birthday remove`**: Permanently removes your birthday from the bot\'s database.\n\n' +
          '### 🛠️ Moderator Commands (Requires "Manage Channels" permission)\n' +
          '- **`/birthday set-user [user] [month] [day] [year] [name]`**: Set or override the birthday for another server member.\n' +
          '- **`/birthday remove-user [user]`**: Delete the birthday entry for another server member.\n' +
          '- **`/birthday channel [channel]`**: Select the text channel where daily birthday announcements will be sent.\n' +
          '- **`/birthday test`**: Execute a dry-run check for today\'s date to verify announcements.\n' +
          '- **`/birthday test [month] [day]`**: Simulate and test a specific date\'s birthday announcements.'
        )
        .setFooter({ text: 'Made with ❤️ to celebrate your special days!' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    else if (subcommand === 'remove') {
      const removed = db.removeBirthday(interaction.user.id);
      if (removed) updatePresence(interaction.client);
      
      const embed = new EmbedBuilder()
        .setColor(removed ? '#FFA8A8' : '#CED4DA')
        .setTitle(removed ? '🗑️ Birthday Removed' : 'ℹ️ No Birthday Registered')
        .setDescription(
          removed 
            ? 'Your birthday has been successfully removed from the registry.'
            : "You don't have a birthday registered in this server."
        );

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    else if (subcommand === 'list') {
      const birthdays = db.getBirthdays();

      if (birthdays.length === 0) {
        const embed = new EmbedBuilder()
          .setColor('#CED4DA')
          .setTitle('🎂 Birthday Registry')
          .setDescription('No birthdays registered yet! Be the first to register using `/birthday set`.');
        return interaction.reply({ embeds: [embed] });
      }

      // Sort birthdays by days remaining
      const sortedBirthdays = birthdays
        .map(bday => ({
          ...bday,
          daysUntil: getDaysUntilBirthday(bday.month, bday.day)
        }))
        .sort((a, b) => a.daysUntil - b.daysUntil);

      const embed = new EmbedBuilder()
        .setColor('#4DABF7') // Radiant sky blue
        .setTitle('🎂 Upcoming Server Birthdays')
        .setDescription('Here is a list of registered birthdays, sorted by who is celebrating next:')
        .setTimestamp();

      const listLines = sortedBirthdays.map((bday, index) => {
        const dateStr = `${getMonthName(bday.month)} ${bday.day}`;
        const yearStr = bday.year ? `, ${bday.year}` : '';
        const countdown = bday.daysUntil === 0 
          ? '**Today!** 🎉' 
          : bday.daysUntil === 1 
            ? 'tomorrow!' 
            : `in ${bday.daysUntil} days`;
        
        return `**${index + 1}.** <@${bday.userId}> - **${dateStr}${yearStr}** (${countdown})`;
      });

      embed.setDescription(
        `Here is a list of registered birthdays, sorted by who is celebrating next:\n\n${listLines.join('\n')}`
      );

      await interaction.reply({ embeds: [embed] });
    }

    else if (subcommand === 'channel') {
      // Check admin permission
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        const embed = new EmbedBuilder()
          .setColor('#FA5252')
          .setTitle('❌ Access Denied')
          .setDescription('You need the **Manage Channels** permission to configure the announcement channel.');
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const channel = interaction.options.getChannel('channel');
      
      // Ensure it is a text channel
      if (!channel.isTextBased()) {
        const embed = new EmbedBuilder()
          .setColor('#FA5252')
          .setTitle('❌ Invalid Channel')
          .setDescription('Please select a text-based channel for birthday announcements.');
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      db.setAnnouncementChannel(channel.id);

      const embed = new EmbedBuilder()
        .setColor('#51CF66') // Success green
        .setTitle('⚙️ Announcement Channel Set')
        .setDescription(`Birthday announcements will now be sent to <#${channel.id}>!`);

      await interaction.reply({ embeds: [embed] });
    }

    else if (subcommand === 'set-user') {
      // Check admin permission
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        const embed = new EmbedBuilder()
          .setColor('#FA5252')
          .setTitle('❌ Access Denied')
          .setDescription('You need the **Manage Channels** permission to set another member\'s birthday.');
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const targetUser = interaction.options.getUser('user');
      const month = interaction.options.getInteger('month');
      const day = interaction.options.getInteger('day');
      const year = interaction.options.getInteger('year');
      const name = interaction.options.getString('name');

      // Validate date combination
      if (!isValidDate(month, day, year)) {
        const embed = new EmbedBuilder()
          .setColor('#FA5252')
          .setTitle('❌ Invalid Date')
          .setDescription(`The date **${month}/${day}${year ? '/' + year : ''}** does not exist. Please check your calendar.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // Save to database
      db.saveBirthday(targetUser.id, targetUser.username, month, day, year, name);
      updatePresence(interaction.client);

      const dateStr = `${getMonthName(month)} ${day}`;
      const yearStr = year ? `, ${year}` : '';
      const nameStr = name ? ` (${name})` : '';

      const embed = new EmbedBuilder()
        .setColor('#51CF66') // Success green
        .setTitle('🎉 Birthday Registered')
        .setDescription(`Successfully registered the birthday for <@${targetUser.id}> as **${dateStr}${yearStr}**${nameStr}.`);

      await interaction.reply({ embeds: [embed] });
    }

    else if (subcommand === 'remove-user') {
      // Check admin permission
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        const embed = new EmbedBuilder()
          .setColor('#FA5252')
          .setTitle('❌ Access Denied')
          .setDescription('You need the **Manage Channels** permission to remove another member\'s birthday.');
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const targetUser = interaction.options.getUser('user');
      const removed = db.removeBirthday(targetUser.id);
      if (removed) updatePresence(interaction.client);

      const embed = new EmbedBuilder()
        .setColor(removed ? '#FFA8A8' : '#CED4DA')
        .setTitle(removed ? '🗑️ Birthday Removed' : 'ℹ️ No Birthday Registered')
        .setDescription(
          removed 
            ? `Successfully removed the birthday registry for <@${targetUser.id}>.`
            : `<@${targetUser.id}> does not have a birthday registered in this server.`
        );

      await interaction.reply({ embeds: [embed] });
    }

    else if (subcommand === 'test') {
      // Check admin permission
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        const embed = new EmbedBuilder()
          .setColor('#FA5252')
          .setTitle('❌ Access Denied')
          .setDescription('You need the **Manage Channels** permission to run birthday tests.');
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const monthOpt = interaction.options.getInteger('month');
      const dayOpt = interaction.options.getInteger('day');

      await interaction.reply({ content: '⚙️ Checking for birthdays and running test announcement...', ephemeral: true });

      try {
        let count = 0;
        if (monthOpt !== null && dayOpt !== null) {
          if (!isValidDate(monthOpt, dayOpt)) {
            return interaction.followUp({ content: '❌ Invalid month/day combination provided for testing.', ephemeral: true });
          }
          // Simulate a specific date safely (avoids month overflow, e.g. May 31 -> Feb 31 -> March 3)
          const testDate = new Date(new Date().getFullYear(), monthOpt - 1, dayOpt);
          console.log(`[Test] Running test announcements for date: ${testDate.toDateString()}`);
          count = await announceBirthdays(interaction.client, testDate);
        } else {
          // Check today's date
          console.log(`[Test] Running test announcements for today: ${new Date().toDateString()}`);
          count = await announceBirthdays(interaction.client);
        }

        if (count === 0) {
          await interaction.followUp({ 
            content: 'ℹ️ Test completed! No birthdays are registered for that date, so no announcements were sent. Make sure you register a birthday for that date first (using `/birthday set` or `/birthday set-user`) or run the test for a date that has registered birthdays!', 
            ephemeral: true 
          });
        } else {
          await interaction.followUp({ 
            content: `✅ Test completed! Successfully sent ${count} birthday announcement(s) to the configured channel.`, 
            ephemeral: true 
          });
        }
      } catch (err) {
        console.error('Test announcement failed:', err);
        await interaction.followUp({ content: `❌ Test run failed: ${err.message}`, ephemeral: true });
      }
    }
  },

  // Modal submission handler
  async handleModalSubmit(interaction) {
    const getSafeValue = (id) => {
      try {
        return (interaction.fields.getTextInputValue(id) || '').trim();
      } catch {
        return '';
      }
    };

    const monthRaw = getSafeValue('birthday_month');
    const dayRaw = getSafeValue('birthday_day');
    const yearRaw = getSafeValue('birthday_year');
    const nameRaw = getSafeValue('birthday_name');

    const month = parseInt(monthRaw, 10);
    const day = parseInt(dayRaw, 10);
    const year = yearRaw ? parseInt(yearRaw, 10) : null;
    const name = nameRaw || null;

    // Validate inputs
    if (isNaN(month) || isNaN(day)) {
      const embed = new EmbedBuilder()
        .setColor('#FA5252')
        .setTitle('❌ Registration Failed')
        .setDescription('Month and Day must be valid numbers.');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (yearRaw && (isNaN(year) || year < -9999 || year > new Date().getFullYear())) {
      const embed = new EmbedBuilder()
        .setColor('#FA5252')
        .setTitle('❌ Registration Failed')
        .setDescription(`Please enter a valid year between **-9999** (BCE) and **${new Date().getFullYear()}**. Use a negative number for BCE years (e.g., -400 for 400 BCE).`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (!isValidDate(month, day, year)) {
      const embed = new EmbedBuilder()
        .setColor('#FA5252')
        .setTitle('❌ Registration Failed')
        .setDescription(`The date **${monthRaw}/${dayRaw}${year ? '/' + year : ''}** does not exist. Please check your calendar.`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Save to database
    db.saveBirthday(interaction.user.id, interaction.user.username, month, day, year, name);
    updatePresence(interaction.client);

    const dateStr = `${getMonthName(month)} ${day}`;
    const yearStr = year ? `, ${year}` : '';
    const nameStr = name ? ` (${name})` : '';
    const daysRemaining = getDaysUntilBirthday(month, day);
    const countdown = daysRemaining === 0 
      ? "today! 🥳" 
      : daysRemaining === 1 
        ? "tomorrow!" 
        : `in ${daysRemaining} days.`;

    const embed = new EmbedBuilder()
      .setColor('#FCC419') // Warm gold/yellow
      .setTitle('🎉 Birthday Registered!')
      .setDescription(
        `Success! We've registered your birthday as **${dateStr}${yearStr}**${nameStr}.\n\n` +
        `Your next birthday is ${countdown} We'll post a celebratory announcement in the server when the day arrives! 🎂`
      )
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: 'You can change this anytime by running /birthday set again.' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
