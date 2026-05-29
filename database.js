const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'database.json');

// Initialize database file if it doesn't exist
function initDB() {
  if (!fs.existsSync(DB_PATH)) {
    const defaultData = {
      birthdays: {},
      config: {
        announcementChannelId: null
      }
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultData, null, 2), 'utf-8');
  }
}

// Read database
function readDB() {
  initDB();
  try {
    const rawData = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(rawData);
  } catch (error) {
    console.error('Error reading database file, returning empty state:', error);
    return { birthdays: {}, config: { announcementChannelId: null } };
  }
}

// Write database
function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// Save/Update birthday for a user
function saveBirthday(userId, username, month, day, year = null, name = null) {
  const data = readDB();
  data.birthdays[userId] = {
    userId,
    username,
    name: name || null,
    month: parseInt(month, 10),
    day: parseInt(day, 10),
    year: year ? parseInt(year, 10) : null,
    updatedAt: new Date().toISOString()
  };
  writeDB(data); // Throws on failure — do not swallow
  console.log(`[Database] Saved birthday for ${username} (${userId}): ${month}/${day}${year ? '/' + year : ''}`);
  return data.birthdays[userId];
}

// Remove birthday for a user
function removeBirthday(userId) {
  const data = readDB();
  if (data.birthdays[userId]) {
    delete data.birthdays[userId];
    writeDB(data);
    return true;
  }
  return false;
}

// Get all birthdays
function getBirthdays() {
  const data = readDB();
  return Object.values(data.birthdays);
}

// Get birthday for a single user
function getBirthday(userId) {
  const data = readDB();
  return data.birthdays[userId] || null;
}

// Save announcement channel
function setAnnouncementChannel(channelId) {
  const data = readDB();
  data.config.announcementChannelId = channelId;
  writeDB(data);
  return channelId;
}

// Get announcement channel
function getAnnouncementChannel() {
  const data = readDB();
  return data.config.announcementChannelId;
}

module.exports = {
  saveBirthday,
  removeBirthday,
  getBirthdays,
  getBirthday,
  setAnnouncementChannel,
  getAnnouncementChannel
};
