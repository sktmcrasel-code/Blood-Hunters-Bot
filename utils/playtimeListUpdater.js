const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const playtimeDb = require('./playtimeDb');
const db = require('./db');
const { activeSessions } = require('./playtimeTracker');
const timeHelpers = require('./timeHelpers');

async function updateList(client, guildId) {
    try {
        const config = await db.findOne({ guildId });
        if (!config || !config.PLAYTIME_LIST_CHANNEL_ID || !config.PLAYTIME_LIST_MESSAGE_ID) return;

        const guild = client.guilds.cache.get(guildId);
        if (!guild) return;

        const channel = guild.channels.cache.get(config.PLAYTIME_LIST_CHANNEL_ID);
        if (!channel) return;

        const message = await channel.messages.fetch(config.PLAYTIME_LIST_MESSAGE_ID).catch(() => null);
        if (!message) return;

        const now = new Date();
        const formatMs = ms => `\`${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m\``;

        let description = '';
        const trackedMembers = config.PLAYTIME_TRACKED_MEMBERS || [];

        if (trackedMembers.length === 0) {
            description = "*No members are currently added to the tracking list.*";
        } else {
            let membersData = [];
            for (const userId of trackedMembers) {
                const record = await playtimeDb.findOne({ userId, guildId });
                let daily = 0, weekly = 0, monthly = 0;

                if (record) {
                    const last = new Date(record.lastUpdated || 0);
                    daily = timeHelpers.isSameDay(now, last) ? (record.dailyPlaytime || 0) : 0;
                    weekly = timeHelpers.isSameWeek(now, last) ? (record.weeklyPlaytime || 0) : 0;
                    monthly = timeHelpers.isSameMonth(now, last) ? (record.monthlyPlaytime || 0) : 0;
                }

                let isPlaying = false;
                if (activeSessions.has(userId)) {
                    const session = activeSessions.get(userId);
                    if (session.guildId === guildId) {
                        isPlaying = true;
                        const activeDuration = Date.now() - session.startTime;
                        daily += activeDuration;
                        weekly += activeDuration;
                        monthly += activeDuration;
                    }
                }
                
                membersData.push({ userId, daily, weekly, monthly, isPlaying });
            }

            // Sort by weekly playtime descending
            membersData.sort((a, b) => b.weekly - a.weekly);

            for (let i = 0; i < membersData.length; i++) {
                const data = membersData[i];
                let rankEmoji = '🔹';
                if (i === 0) rankEmoji = '🥇';
                else if (i === 1) rankEmoji = '🥈';
                else if (i === 2) rankEmoji = '🥉';

                let statusText = data.isPlaying ? '🟢 **ONLINE** *(Playing FiveM)*' : '🔴 **OFFLINE**';

                description += `**${rankEmoji} <@${data.userId}>**\n`;
                description += `> **Status:** ${statusText}\n`;
                description += `> 📅 **Today:** ${formatMs(data.daily)}   |   🗓️ **Week:** ${formatMs(data.weekly)}   |   📊 **Month:** ${formatMs(data.monthly)}\n\n`;
            }
            
            description += `\n🔄 **Next Update:** <t:${Math.floor(Date.now() / 1000) + 300}:R>`;
        }

        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle(`⏱️ Live Playtime Tracking List`)
            .setDescription(description)
            .setFooter({ text: `Auto-updates every 5 mins` })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('refresh_playtime_list')
                .setLabel('🔄 Refresh List')
                .setStyle(ButtonStyle.Primary)
        );

        await message.edit({ embeds: [embed], components: [row] }).catch(() => {});

    } catch (e) {
        console.error("Playtime List Updater Error:", e);
    }
}

module.exports = {
    updateList,
    init: (client) => {
        // Run every 5 minutes
        setInterval(() => {
            const guildIds = client.guilds.cache.map(g => g.id);
            for (const guildId of guildIds) {
                updateList(client, guildId);
            }
        }, 5 * 60 * 1000);
    }
};
