const playtimeDb = require('./playtimeDb');
const cfxDb = require('./cfxDb');
const db = require('./db');
const { EmbedBuilder } = require('discord.js');
const { getConfig } = require('./configManager');
const timeHelpers = require('./timeHelpers');

// Store active play sessions in memory
// Map of userId -> { startTime, guildId }
const activeSessions = new Map();

// Helper to save playtime to DB
async function savePlaytimeToDb(userId, guildId, durationMs) {
    if (durationMs <= 0) return;
    try {
        let userRecord = await playtimeDb.findOne({ userId: userId, guildId: guildId });
        const now = new Date();
        
        if (userRecord) {
            const lastUpdated = new Date(userRecord.lastUpdated || 0);
            
            let daily = userRecord.dailyPlaytime || 0;
            let weekly = userRecord.weeklyPlaytime || 0;
            let monthly = userRecord.monthlyPlaytime || 0;
            
            if (!timeHelpers.isSameDay(now, lastUpdated)) daily = 0;
            if (!timeHelpers.isSameWeek(now, lastUpdated)) weekly = 0;
            if (!timeHelpers.isSameMonth(now, lastUpdated)) monthly = 0;

            await playtimeDb.update(
                { _id: userRecord._id },
                { 
                    $inc: { totalPlaytime: durationMs },
                    $set: {
                        dailyPlaytime: daily + durationMs,
                        weeklyPlaytime: weekly + durationMs,
                        monthlyPlaytime: monthly + durationMs,
                        lastUpdated: now.getTime()
                    }
                }
            );
        } else {
            await playtimeDb.insert({
                userId: userId,
                guildId: guildId,
                totalPlaytime: durationMs,
                dailyPlaytime: durationMs,
                weeklyPlaytime: durationMs,
                monthlyPlaytime: durationMs,
                lastUpdated: now.getTime()
            });
        }
    } catch (e) {
        console.error("Playtime track DB error:", e);
    }
}

module.exports = {
    activeSessions,
    init: (client) => {
        // Continuous incremental saver (every 1 minute)
        // This ensures if the bot restarts, we don't lose playtime.
        setInterval(async () => {
            const now = Date.now();
            for (const [userId, session] of activeSessions.entries()) {
                const durationMs = now - session.startTime;
                if (durationMs >= 60000) {
                    await savePlaytimeToDb(userId, session.guildId, durationMs);
                    session.startTime = now; // Reset start time so it doesn't double count
                }
            }
        }, 60000);

        // --- CFX API POLLER ---
        setInterval(async () => {
            try {
                const configs = await db.find({ CFX_CODE: { $exists: true } });
                for (const config of configs) {
                    if (!config.CFX_CODE) continue;
                    const guildId = config.guildId;
                    
                    const response = await fetch(`https://frontend.cfx-services.net/api/servers/single/${config.CFX_CODE}`);
                    if (!response.ok) continue;
                    const data = await response.json();
                    if (!data || !data.Data || !data.Data.players) continue;
                    
                    const onlinePlayerNames = data.Data.players.map(p => (p.name || '').toLowerCase());
                    const linkedUsers = await cfxDb.find({ guildId: guildId, inGameName: { $exists: true } });
                    
                    for (const user of linkedUsers) {
                        const inGameName = user.inGameName.toLowerCase();
                        const isOnline = onlinePlayerNames.some(name => name === inGameName || name.includes(inGameName));
                        
                        if (isOnline) {
                            if (!activeSessions.has(user.userId)) {
                                activeSessions.set(user.userId, { startTime: Date.now(), originalStartTime: Date.now(), guildId: guildId, source: 'cfx' });
                            } else {
                                const session = activeSessions.get(user.userId);
                                session.source = 'cfx';
                            }
                        } else {
                            if (activeSessions.has(user.userId)) {
                                const session = activeSessions.get(user.userId);
                                if (session.source === 'cfx') {
                                    // They disconnected from CFX server
                                    await endSession(user.userId, guildId, client);
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                console.error("CFX Poller Error:", e);
            }
        }, 120000);

        async function endSession(userId, guildId, client) {
            if (!activeSessions.has(userId)) return;
            const sessionData = activeSessions.get(userId);
            
            const finalDurationMs = Date.now() - sessionData.startTime;
            const totalSessionDurationMs = Date.now() - (sessionData.originalStartTime || sessionData.startTime);
            
            activeSessions.delete(userId);

            if (totalSessionDurationMs < 10000) return; // Ignore tiny sessions

            await savePlaytimeToDb(userId, guildId, finalDurationMs);

            const config = await getConfig(guildId);
            if (config && config.LOG_CHANNEL_ID) {
                const guild = client.guilds.cache.get(guildId);
                if (!guild) return;
                const logCh = guild.channels.cache.get(config.LOG_CHANNEL_ID);
                if (logCh) {
                    const hours = Math.floor(totalSessionDurationMs / 3600000);
                    const minutes = Math.floor((totalSessionDurationMs % 3600000) / 60000);
                    
                    const member = await guild.members.fetch(userId).catch(() => null);
                    const userTag = member ? member.user.tag : `<@${userId}>`;
                    
                    const embed = new EmbedBuilder()
                        .setColor('#00ff99')
                        .setTitle('🎮 Playtime Tracked')
                        .setDescription(`**${userTag}** finished a session.`)
                        .addFields(
                            { name: 'Session Time', value: `${hours}h ${minutes}m`, inline: true }
                        )
                        .setTimestamp();

                    logCh.send({ embeds: [embed] }).catch(() => {});
                }
            }
        }
    }
};
