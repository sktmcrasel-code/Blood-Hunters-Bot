const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const playtimeDb = require('./playtimeDb');
const db = require('./db');
const { activeSessions, fetchCFXServerData } = require('./playtimeTracker');
const timeHelpers = require('./timeHelpers');

async function updateList(client, guildId) {
    try {
        const config = await db.findOne({ guildId });
        if (!config) return;

        let lists = config.PLAYTIME_LISTS || [];

        // Migrate old single configuration if it exists
        if (config.PLAYTIME_LIST_CHANNEL_ID && config.PLAYTIME_LIST_MESSAGE_ID && lists.length === 0) {
            let defaultCode = 'unknown';
            if (config.CFX_SERVERS && config.CFX_SERVERS.length > 0) defaultCode = config.CFX_SERVERS[0];
            else if (config.CFX_CODE) defaultCode = config.CFX_CODE;

            lists = [{
                code: defaultCode,
                channelId: config.PLAYTIME_LIST_CHANNEL_ID,
                messageId: config.PLAYTIME_LIST_MESSAGE_ID
            }];
            await db.update({ guildId }, { $set: { PLAYTIME_LISTS: lists } });
        }

        if (lists.length === 0) return;

        const guild = client.guilds.cache.get(guildId);
        if (!guild) return;

        const now = new Date();
        const formatMs = ms => `\`${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m\``;

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('refresh_playtime_list')
                .setLabel('🔄 Refresh List')
                .setStyle(ButtonStyle.Primary)
        );

        for (const listConfig of lists) {
            const { code, channelId, messageId } = listConfig;
            if (!code || !channelId || !messageId) continue;

            let serverName = code;
            const serverData = await fetchCFXServerData(code);
            if (serverData && serverData.hostname) {
                serverName = serverData.hostname.substring(0, 30).replace(/\^([0-9]|\~[a-z])/gi, "");
            }

            const channel = guild.channels.cache.get(channelId);
            if (!channel) continue;

            const message = await channel.messages.fetch(messageId).catch(() => null);
            if (!message) continue;

            let description = '';
            const { getTrackedMembers } = require('./playtimeHelpers');
            const trackedMembers = await getTrackedMembers(guild, config);

            if (trackedMembers.length === 0) {
                description = "*No members are currently added to the tracking list.*";
            } else {
                let membersData = [];
                for (const userId of trackedMembers) {
                    const record = await playtimeDb.findOne({ userId, guildId, serverCode: code });
                    let daily = 0, weekly = 0, monthly = 0, total = 0;

                    if (record) {
                        const last = new Date(record.lastUpdated || 0);
                        daily = timeHelpers.isSameDay(now, last) ? (record.dailyPlaytime || 0) : 0;
                        weekly = timeHelpers.isSameWeek(now, last) ? (record.weeklyPlaytime || 0) : 0;
                        monthly = timeHelpers.isSameMonth(now, last) ? (record.monthlyPlaytime || 0) : 0;
                        total = record.totalPlaytime || 0;
                    }

                    let isPlaying = false;
                    let sessionDuration = 0;
                    const sessionKey = `${guildId}-${userId}`;
                    if (activeSessions.has(sessionKey)) {
                        const session = activeSessions.get(sessionKey);
                        if (session.serverCode === code) {
                            isPlaying = true;
                            sessionDuration = Date.now() - (session.sessionStart || Date.now());
                            daily += sessionDuration;
                            weekly += sessionDuration;
                            monthly += sessionDuration;
                            total += sessionDuration;
                        }
                    }

                    membersData.push({ userId, daily, weekly, monthly, total, isPlaying, sessionDuration });
                }

                // Sort by weekly playtime descending
                membersData.sort((a, b) => b.weekly - a.weekly);

                for (let i = 0; i < membersData.length; i++) {
                    const data = membersData[i];
                    let rankEmoji = '🔹';
                    if (i === 0) rankEmoji = '🥇';
                    else if (i === 1) rankEmoji = '🥈';
                    else if (i === 2) rankEmoji = '🥉';

                    let statusText = data.isPlaying
                        ? '🟢 **ONLINE** *(Playing FiveM)*'
                        : '🔴 **OFFLINE**';

                    description += `**${rankEmoji}** <@${data.userId}>\n`;
                    description += ` ├─ **Status:** ${statusText}\n`;
                    if (data.isPlaying) {
                        description += ` ├─ **Current Session:** ${formatMs(data.sessionDuration)}\n`;
                    }
                    description += ` ├─ 📅 **Today:** ${formatMs(data.daily)} | 🗓️ **7 Days:** ${formatMs(data.weekly)} | 📊 **30 Days:** ${formatMs(data.monthly)}\n`;
                    description += ` └─ 🏆 **Lifetime:** ${formatMs(data.total)}\n\n`;
                }

                description += `\n🔄 **Next Update:** <t:${Math.floor(Date.now() / 1000) + 30}:R>`;
            }

            const embed = new EmbedBuilder()
                .setColor('#2b2d31')
                .setTitle(`⏱️ Live Playtime Tracking List — ${serverName}`)
                .setDescription(description)
                .setFooter({ text: `Server: ${serverName} • Auto-updates every 30s` })
                .setTimestamp();

            await message.edit({ embeds: [embed], components: [row] }).catch(() => { });
        }

    } catch (e) {
        console.error("Playtime List Updater Error:", e);
    }
}

module.exports = {
    updateList,
    init: (client) => {
        // Run every 30 seconds
        setInterval(() => {
            const guildIds = client.guilds.cache.map(g => g.id);
            for (const guildId of guildIds) {
                updateList(client, guildId);
            }
        }, 30 * 1000);
    }
};
