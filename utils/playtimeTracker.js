const playtimeDb = require('./playtimeDb');
const cfxDb = require('./cfxDb');
const db = require('./db');
const { EmbedBuilder } = require('discord.js');
const { getConfig } = require('./configManager');
const timeHelpers = require('./timeHelpers');

// Store active play sessions in memory
// Map of userId -> { sessionStart, lastSaved, guildId, source, inGameName }
const activeSessions = new Map();

// Cache CFX server responses: code -> { data, timestamp }
const cfxCache = new Map();

async function fetchCFXServerData(cfxCode) {
    if (!cfxCode) return null;
    const cached = cfxCache.get(cfxCode);
    const now = Date.now();
    // Cache TTL 10 seconds
    if (cached && (now - cached.timestamp < 10000)) {
        return cached.data;
    }

    try {
        let targetCode = cfxCode.trim();

        if (targetCode.includes('cfx.re/join/')) {
            targetCode = targetCode.split('cfx.re/join/')[1].split('/')[0];
        }

        // 1. Try standard CFX API query (Always reliable for join codes like qplrv9)
        const response = await fetch(`https://frontend.cfx-services.net/api/servers/single/${targetCode}`).catch(() => null);
        if (response && response.ok) {
            const data = await response.json().catch(() => null);
            if (data && data.Data) {
                let serverData = data.Data;

                // Try instant direct IP fetch from connectEndPoints if accessible
                if (serverData.connectEndPoints && Array.isArray(serverData.connectEndPoints) && serverData.connectEndPoints.length > 0) {
                    const directEp = serverData.connectEndPoints[0];
                    if (directEp && !directEp.includes('cfx.re')) {
                        try {
                            const controller = new AbortController();
                            const timeoutId = setTimeout(() => controller.abort(), 3500);
                            const directRes = await fetch(`http://${directEp}/players.json`, { 
                                signal: controller.signal,
                                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
                            }).catch(() => null);
                            clearTimeout(timeoutId);

                            if (directRes && directRes.ok) {
                                const livePlayers = await directRes.json().catch(() => null);
                                if (Array.isArray(livePlayers)) {
                                    serverData.players = livePlayers;
                                }
                            }
                        } catch (err) {
                            // Fallback to standard CFX players
                        }
                    }
                }

                cfxCache.set(cfxCode, { data: serverData, timestamp: now });
                return serverData;
            }
        }

        // 2. Direct IP:Port query fallback (if user set code to IP:Port directly)
        let directUrl = targetCode;
        if (directUrl.includes(':') && !directUrl.startsWith('http')) {
            directUrl = `http://${directUrl}`;
        }
        if (directUrl.startsWith('http')) {
            const cleanUrl = directUrl.replace(/\/+$/, '');
            const playersUrl = cleanUrl.endsWith('/players.json') ? cleanUrl : `${cleanUrl}/players.json`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const playersRes = await fetch(playersUrl, {
                signal: controller.signal,
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
            }).catch(() => null);
            clearTimeout(timeoutId);

            if (playersRes && playersRes.ok) {
                const players = await playersRes.json().catch(() => []);
                const data = {
                    players: Array.isArray(players) ? players : [],
                    sv_maxclients: '128',
                    hostname: cfxCode
                };
                cfxCache.set(cfxCode, { data, timestamp: now });
                return data;
            }
        }
    } catch (e) {
        console.error(`CFX Fetch Error for code ${cfxCode}:`, e.message);
    }
    return cached ? cached.data : null;
}

// Helper to save playtime to DB
async function savePlaytimeToDb(userId, guildId, durationMs, serverCode) {
    if (durationMs <= 0) return;
    try {
        const finalServerCode = serverCode || 'unknown';
        let userRecord = await playtimeDb.findOne({ userId: userId, guildId: guildId, serverCode: finalServerCode });
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
                serverCode: finalServerCode,
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

async function startSessionLog(userId, inGameName, guildId, client, serverCode, serverName) {
    try {
        const config = await getConfig(guildId);
        if (!config) return;

        const guild = client.guilds.cache.get(guildId);
        if (!guild) return;

        const { getPlaytimeLogChannel } = require('./playtimeHelpers');
        const logCh = getPlaytimeLogChannel(guild, config, serverCode);
        if (!logCh) return;
        if (!logCh) return;

        const member = await guild.members.fetch(userId).catch(() => null);
        const userMention = `<@${userId}>`;
        const avatarUrl = member ? member.displayAvatarURL({ dynamic: true }) : client.user.displayAvatarURL();

        const record = await playtimeDb.findOne({ userId, guildId, serverCode });
        let daily = 0;
        if (record) {
            const now = new Date();
            const last = new Date(record.lastUpdated || 0);
            if (timeHelpers.isSameDay(now, last)) daily = record.dailyPlaytime || 0;
        }

        const formatMs = (ms) => {
            if (!ms || ms <= 0) return '`0m`';
            const totalMins = Math.floor(ms / 60000);
            const hours = Math.floor(totalMins / 60);
            const mins = totalMins % 60;
            if (hours > 0) return `\`${hours}h ${mins}m\``;
            return `\`${mins}m\``;
        };

        const embed = new EmbedBuilder()
            .setColor('#00ff99')
            .setTitle('🟢 Player Connected — FiveM Server')
            .setDescription(`👤 **User:** ${userMention}\n🎮 **In-Game Name:** \`${inGameName}\`\n🌐 **Server:** \`${serverName || 'Unknown Server'}\`\n✨ Joined the FiveM server and started a new play session!`)
            .addFields(
                { name: '⏰ Joined At', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
                { name: '📅 Today Total (Prior)', value: formatMs(daily), inline: true }
            )
            .setThumbnail(avatarUrl)
            .setFooter({ text: 'FiveM Playtime Tracker • Session Started' })
            .setTimestamp();

        logCh.send({ embeds: [embed] }).catch(() => {});
    } catch (e) {
        console.error("Start session log error:", e);
    }
}

async function endSession(userId, guildId, client) {
    if (!activeSessions.has(userId)) return;
    const sessionData = activeSessions.get(userId);
    
    const now = Date.now();
    const finalIncremental = now - (sessionData.lastSaved || sessionData.sessionStart);
    const totalSessionDurationMs = now - sessionData.sessionStart;
    
    activeSessions.delete(userId);

    if (totalSessionDurationMs < 10000) return; // Ignore tiny sessions under 10s

    await savePlaytimeToDb(userId, guildId, finalIncremental, sessionData.serverCode);

    const config = await getConfig(guildId);
    if (config) {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return;

        const { getPlaytimeLogChannel } = require('./playtimeHelpers');
        const logCh = getPlaytimeLogChannel(guild, config, sessionData.serverCode);
        if (logCh) {
            const formatMs = (ms) => {
                if (!ms || ms <= 0) return '`0m`';
                const totalMins = Math.floor(ms / 60000);
                const hours = Math.floor(totalMins / 60);
                const mins = totalMins % 60;
                if (hours > 0) return `\`${hours}h ${mins}m\``;
                return `\`${mins}m\``;
            };

            const record = await playtimeDb.findOne({ userId, guildId, serverCode: sessionData.serverCode });
            let daily = record ? record.dailyPlaytime || 0 : 0;
            let total = record ? record.totalPlaytime || 0 : 0;

            const member = await guild.members.fetch(userId).catch(() => null);
            const userMention = `<@${userId}>`;
            const avatarUrl = member ? member.displayAvatarURL({ dynamic: true }) : client.user.displayAvatarURL();

            const embed = new EmbedBuilder()
                .setColor('#ed4245')
                .setTitle('🔴 Player Disconnected — FiveM Server')
                .setDescription(`👤 **User:** ${userMention}\n🎮 **In-Game Name:** \`${sessionData.inGameName || 'N/A'}\`\n🌐 **Server:** \`${sessionData.serverName || 'Unknown Server'}\`\n🔌 Finished session and disconnected from the FiveM server.`)
                .addFields(
                    { name: '⚡ Session Duration', value: formatMs(totalSessionDurationMs), inline: true },
                    { name: '📅 Today Total Playtime', value: formatMs(daily), inline: true },
                    { name: '🏆 Lifetime Total', value: formatMs(total), inline: true }
                )
                .setThumbnail(avatarUrl)
                .setFooter({ text: 'FiveM Playtime Tracker • Session Ended' })
                .setTimestamp();

            logCh.send({ embeds: [embed] }).catch(() => {});
        }
    }
}

module.exports = {
    activeSessions,
    fetchCFXServerData,
    init: (client) => {
        // Continuous incremental saver (every 1 minute)
        setInterval(async () => {
            const now = Date.now();
            for (const [userId, session] of activeSessions.entries()) {
                const durationMs = now - (session.lastSaved || session.sessionStart);
                if (durationMs >= 60000) {
                    await savePlaytimeToDb(userId, session.guildId, durationMs, session.serverCode);
                    session.lastSaved = now;
                }
            }
        }, 60000);

        // --- FAST CFX API POLLER (Runs every 20 seconds) ---
        setInterval(async () => {
            try {
                const configs = await db.find({ $or: [{ CFX_CODE: { $exists: true } }, { CFX_SERVERS: { $exists: true } }] });
                for (const config of configs) {
                    const guildId = config.guildId;
                    let servers = config.CFX_SERVERS || [];
                    if (config.CFX_CODE && servers.length === 0) servers = [config.CFX_CODE];
                    if (servers.length === 0) continue;

                    const guild = client.guilds.cache.get(guildId);
                    if (!guild) continue;
                    
                    const { getTrackedMembers } = require('./playtimeHelpers');
                    const trackedMembers = await getTrackedMembers(guild, config);
                    const linkedUsers = await cfxDb.find({ guildId: guildId });
                    
                    // Combine all users to check (tracked members list + linked users)
                    const allUserIdsToTrack = new Set([
                        ...trackedMembers,
                        ...linkedUsers.map(u => u.userId)
                    ]);
                    
                    const linkedMap = new Map();
                    for (const u of linkedUsers) {
                        if (u.inGameName) linkedMap.set(u.userId, u.inGameName.toLowerCase());
                    }

                    // Keep track of who is online across ANY of the guild's servers
                    const currentOnlineUsers = new Set();
                    
                    for (const cfxCode of servers) {
                        const serverData = await fetchCFXServerData(cfxCode);
                        if (!serverData || !serverData.players) continue;
                        
                        const players = serverData.players || [];
                        const cleanHostname = serverData.hostname ? serverData.hostname.substring(0, 30).replace(/\^([0-9]|\~[a-z])/gi, "").trim() : cfxCode;

                        // Dynamically update CFX_SERVER_NAMES in database config
                        const configNames = config.CFX_SERVER_NAMES || {};
                        if (configNames[cfxCode] !== cleanHostname) {
                            configNames[cfxCode] = cleanHostname;
                            await db.update(
                                { guildId: guildId },
                                { $set: { CFX_SERVER_NAMES: configNames } }
                            );
                        }
                        
                        for (const userId of allUserIdsToTrack) {
                            // If they are already found on another server this cycle, skip checking again
                            if (currentOnlineUsers.has(userId)) continue;
                            
                            const userInGameName = linkedMap.get(userId);
                            let isOnline = false;
                            let detectedName = userInGameName || 'FiveM Player';
                            
                            for (const p of players) {
                                const rawName = p.name || '';
                                const pName = rawName.replace(/\^([0-9]|\~[a-z])/gi, '').toLowerCase().trim();
                                const pIdentifiers = p.identifiers || [];
                                const hasDiscordMatch = pIdentifiers.some(id => id === `discord:${userId}`);
                                const hasNameMatch = userInGameName && (pName === userInGameName || pName.includes(userInGameName));
                                
                                if (hasDiscordMatch || hasNameMatch) {
                                    isOnline = true;
                                    detectedName = rawName || detectedName;
                                    break;
                                }
                            }
                            
                            if (isOnline) {
                                currentOnlineUsers.add(userId);
                                if (!activeSessions.has(userId)) {
                                    const now = Date.now();
                                    activeSessions.set(userId, { 
                                        sessionStart: now, 
                                        lastSaved: now, 
                                        guildId: guildId, 
                                        source: 'cfx',
                                        inGameName: detectedName,
                                        serverCode: cfxCode,
                                        serverName: cleanHostname
                                    });
                                    await startSessionLog(userId, detectedName, guildId, client, cfxCode, cleanHostname);
                                } else {
                                    const session = activeSessions.get(userId);
                                    session.source = 'cfx';
                                    session.serverCode = cfxCode;
                                    session.serverName = cleanHostname; // update server name if they moved servers
                                    if (!session.inGameName || session.inGameName === 'FiveM Player') {
                                        session.inGameName = detectedName;
                                    }
                                }
                            }
                        }
                    }
                    
                    // After checking ALL servers for this guild, handle disconnects
                    for (const userId of allUserIdsToTrack) {
                        if (!currentOnlineUsers.has(userId) && activeSessions.has(userId)) {
                            const session = activeSessions.get(userId);
                            if (session.source === 'cfx' && session.guildId === guildId) {
                                // Disconnected from server
                                await endSession(userId, guildId, client);
                            }
                        }
                    }
                }
            } catch (e) {
                console.error("CFX Poller Error:", e);
            }
        }, 20000);
    }
};
