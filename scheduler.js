const cron = require('node-cron');
const { EmbedBuilder, ActivityType } = require('discord.js');
const db = require('./database');

// Checks if today is the user's birthday
function isBirthdayToday(bday, date) {
  const month = date.getMonth() + 1; // 1-indexed
  const day = date.getDate();

  // Standard match
  if (bday.month === month && bday.day === day) {
    return true;
  }

  // Handle Feb 29 birthdays in non-leap years
  if (bday.month === 2 && bday.day === 29 && month === 2 && day === 28) {
    const year = date.getFullYear();
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    if (!isLeapYear) {
      return true; // Celebrate on Feb 28 in non-leap years
    }
  }

  return false;
}

// Perform the announcement
async function announceBirthdays(client, forcedDate = null) {
  const channelId = db.getAnnouncementChannel();
  if (!channelId) {
    console.warn('Birthday Announcement Warning: No announcement channel set. Use /birthday channel to set one.');
    return;
  }

  let channel;
  try {
    channel = await client.channels.fetch(channelId);
  } catch (error) {
    console.error(`Failed to fetch announcement channel with ID ${channelId}:`, error);
    return;
  }

  if (!channel) {
    console.warn(`Channel with ID ${channelId} not found.`);
    return;
  }

  const today = forcedDate || new Date();
  const birthdays = db.getBirthdays();
  const celebratingToday = [];

  for (const bday of birthdays) {
    if (isBirthdayToday(bday, today)) {
      celebratingToday.push(bday);
    }
  }

  if (celebratingToday.length === 0) {
    console.log(`[Scheduler] Checked birthdays for ${today.toDateString()}. No birthdays today.`);
    return 0;
  }

  let successCount = 0;
  for (const bday of celebratingToday) {
    try {
      // Try to fetch user from the client to get the latest avatar/details
      const user = await client.users.fetch(bday.userId);
      
      const userDisplayName = bday.name ? `<@${bday.userId}> (${bday.name})` : `<@${bday.userId}>`;

      // Calculate age if year is registered
      let ageText = '';
      let isMilestone = false;
      let age = null;
      if (bday.year) {
        age = today.getFullYear() - bday.year;
        ageText = ` celebrating turning **${age}**`;
        if (age >= 20 && age % 10 === 0) {
          isMilestone = true;
        }
      }

      // Predefined list of beautiful, warm, birthday greeting templates to keep announcements fresh
      const templates = [
        `Wishing the absolute best to ${userDisplayName}${ageText}! Hope your day is filled with joy, laughter, and lots of cake! 🎂✨`,
        `Hip, hip, hooray! 🎉 Let's celebrate ${userDisplayName}${ageText} today! May this new chapter bring you happiness and success. 🎈💖`,
        `Sending warmest birthday wishes to ${userDisplayName}${ageText}! May all your dreams and wishes come true. Have a fantastic day! 🌟🥳`,
        `It's a special day! 🎁 Join us in wishing ${userDisplayName} a wonderful Happy Birthday!${ageText} Have an amazing celebration! 🍰🎊`
      ];

      // Pick a template based on the user's ID to keep it deterministic but varied
      const templateIdx = parseInt(bday.userId.slice(-2) || '0', 10) % templates.length;
      let greeting = templates[templateIdx];

      // Add special funny milestone text for ages 20, 30, 40, 50, etc.
      if (isMilestone) {
        greeting = `🎉 **Oh wow, ${userDisplayName} is turning ${age} today!** Officially a certified **old fart**! 👴💨 Hope your joints don't creak too much while blowing out the candles! 🎂🍰`;
      }

      // Create a gorgeous Embed
      const embed = new EmbedBuilder()
        .setColor('#FF6B6B') // Vibrant warm pink/coral
        .setTitle('🎉 Happy Birthday! 🎉')
        .setDescription(greeting)
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
          { name: 'Date', value: `${getMonthName(bday.month)} ${bday.day}`, inline: true }
        )
        .setImage('https://media.giphy.com/media/26FPIVHP2fnDxAIU0/giphy.gif') // Classic cute confetti/birthday celebration GIF
        .setFooter({ text: 'Make sure to wish them a great day!', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

      if (bday.year) {
        embed.addFields({ name: 'Born In', value: `${bday.year}`, inline: true });
      }

      // Send the embed and ping the user in the channel
      await channel.send({
        content: `🎉 Hey everyone, it's <@${bday.userId}>'s birthday today! 🎂`,
        embeds: [embed]
      });

      successCount++;
    } catch (err) {
      console.error(`Failed to announce birthday for ${bday.username} (${bday.userId}):`, err);
    }
  }
  return successCount;
}

// Convert month number to month name
function getMonthName(monthNumber) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthNumber - 1] || 'Unknown';
}

// Update bot presence state
function updatePresence(client) {
  try {
    const today = new Date();
    const birthdays = db.getBirthdays();
    const celebratingToday = birthdays.filter(bday => isBirthdayToday(bday, today));

    if (celebratingToday.length === 0) {
      client.user.setPresence({
        activities: [{
          name: 'customstatus',
          state: 'Watching for birthdays 🎂',
          type: ActivityType.Custom
        }]
      });
    } else if (celebratingToday.length === 1) {
      const bday = celebratingToday[0];
      const displayName = bday.name || bday.username;
      client.user.setPresence({
        activities: [{
          name: 'customstatus',
          state: `🎉 Celebrating ${displayName}'s birthday! 🎂`,
          type: ActivityType.Custom
        }]
      });
    } else {
      client.user.setPresence({
        activities: [{
          name: 'customstatus',
          state: `🎉 Celebrating ${celebratingToday.length} birthdays today! 🎂`,
          type: ActivityType.Custom
        }]
      });
    }
  } catch (err) {
    console.error('Failed to update bot activity presence:', err);
  }
}

// Initialize Scheduler
function startScheduler(client) {
  // Update presence immediately on startup
  updatePresence(client);

  // Run everyday at 9:00 AM server local time
  // Cron format: minute hour day-of-month month day-of-week
  cron.schedule('0 9 * * *', () => {
    console.log('[Scheduler] Running scheduled birthday checks...');
    announceBirthdays(client);
    updatePresence(client);
  });
  
  console.log('[Scheduler] Birthday check scheduler loaded. Scheduled for 9:00 AM daily.');
}

module.exports = {
  startScheduler,
  announceBirthdays,
  updatePresence
};
