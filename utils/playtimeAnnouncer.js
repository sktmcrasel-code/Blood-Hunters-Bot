const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const playtimeDb = require('./playtimeDb');
const { activeSessions } = require('./playtimeTracker');
const timeHelpers = require('./timeHelpers');
const { getConfig } = require('./configManager');

function formatMs(ms) {
    if (!ms || ms <= 0) return '`0m`';
    const totalMins = Math.floor(ms / 60000);
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hours > 0) return `\`${hours}h ${mins}m\``;
    return `\`${mins}m\``;
}

async function announceTopPlayers(client, guildId, timeframe = 'daily', refDate = new Date()) {
    try {
        const config = await getConfig(guildId);
        if (!config) return;
        const channelId = config.PLAYTIME_ANNOUNCE_CHANNEL_ID || config.PLAYTIME_LOG_CHANNEL_ID || config.LOG_CHANNEL_ID;
        if (!channelId) return;

        const guild = client.guilds.cache.get(guildId);
        if (!guild) return;

        const channel = guild.channels.cache.get(channelId);
        if (!channel) return;

        const { getTrackedMembers } = require('./playtimeHelpers');
        const trackedMembers = await getTrackedMembers(guild, config);

        const records = await playtimeDb.find({ guildId });
        const now = refDate || new Date();

        // Fallback to all unique userIds in DB records if no tracked members role is set/has members
        let targetUserIds = [];
        if (trackedMembers && trackedMembers.length > 0) {
            targetUserIds = trackedMembers;
        } else {
            targetUserIds = Array.from(new Set(records.map(r => r.userId)));
        }

        let leaderboardData = [];
        for (const userId of targetUserIds) {
            const userRecords = records.filter(r => r.userId === userId);
            let daily = 0, weekly = 0, monthly = 0, total = 0;

            for (const record of userRecords) {
                const last = new Date(record.lastUpdated || 0);
                daily += timeHelpers.isSameDay(now, last) ? (record.dailyPlaytime || 0) : 0;
                weekly += timeHelpers.isSameWeek(now, last) ? (record.weeklyPlaytime || 0) : 0;
                monthly += timeHelpers.isSameMonth(now, last) ? (record.monthlyPlaytime || 0) : 0;
                total += record.totalPlaytime || 0;
            }

            // Include active session playtime if online
            if (activeSessions.has(userId)) {
                const session = activeSessions.get(userId);
                if (session.guildId === guildId) {
                    const sessionDuration = Date.now() - (session.sessionStart || session.startTime || Date.now());
                    daily += sessionDuration;
                    weekly += sessionDuration;
                    monthly += sessionDuration;
                    total += sessionDuration;
                }
            }

            let activeTimeframePlaytime = 0;
            if (timeframe === 'daily') activeTimeframePlaytime = daily;
            else if (timeframe === 'weekly') activeTimeframePlaytime = weekly;
            else if (timeframe === 'monthly') activeTimeframePlaytime = monthly;
            else activeTimeframePlaytime = total;

            leaderboardData.push({
                userId,
                daily,
                weekly,
                monthly,
                total,
                playtime: activeTimeframePlaytime
            });
        }

        // Sort descending by active timeframe playtime, using lifetime playtime as a tie-breaker
        leaderboardData.sort((a, b) => {
            if (b.playtime !== a.playtime) {
                return b.playtime - a.playtime;
            }
            return b.total - a.total;
        });

        // We only announce if at least the top player has some playtime
        if (leaderboardData.length === 0 || leaderboardData[0].playtime === 0) return;

        const top5 = leaderboardData.slice(0, 5);

        const titles = {
            daily: '🩸 DAILY MOST WANTED LEADERBOARD',
            weekly: '🩸 WEEKLY MOST WANTED LEADERBOARD',
            monthly: '🩸 MONTHLY MOST WANTED LEADERBOARD'
        };

        const colors = {
            daily: '#ffaa00',
            weekly: '#00ffcc',
            monthly: '#ff0055'
        };

        const firstPlace = top5[0];
        const winnerMention = `<@${firstPlace.userId}>`;

        const mvpCongratulations = [
            "🩸 **Bow down to the Hunter!** {winner} has dominated the turf with legendary playtime and captured the #1 spot for **Blood Hunters**! 🏆",
            "🩸 **Blood Hunters' finest!** {winner} has set our turf on fire with absolute dedication and hustle! Keep dominating! 🔥",
            "🩸 **Pure predator mode!** {winner} showed the ultimate Hunter's grit, outlasting everyone to claim the #1 MVP title! ⚔️",
            "🩸 **Sensational hunt!** {winner} has risen above all to earn the crown of the ultimate **Blood Hunters** MVP! 👑",
            "🩸 **Top Hunter of the guild!** A massive shoutout to {winner} for setting the bar high with incredible loyalty & playtime! 🚀",
            "🩸 **Blood Hunters dedication!** {winner} has earned the ultimate bragging rights as our #1 champion hunter! 💎",
            "🩸 **The ultimate target acquired!** {winner} has completely crushed the opposition and secured the top spot! 💥",
            "🩸 **The hunt is won!** {winner} has proven their unmatched loyalty and grit on the playtime leaderboard! 🛡️",
            "🩸 **Unrivaled hunter instincts!** {winner} has shown the entire server what it means to be a true **Blood Hunter**! 👑",
            "🩸 **Straight to the top of the food chain!** {winner} has hunted down everyone to claim this well-deserved #1 MVP! 🌟",
            "🩸 **A true Hunter's commitment!** {winner} has conquered the turf with outstanding activity and dominance! ⚔️",
            "🩸 **Leading the pack!** **Blood Hunters** are proud to have {winner} leading the charge at the #1 spot! 🏆",
            "🩸 **The ultimate Hunter crown!** {winner} has claimed the throne of our gang's playtime leaderboard! 🔥",
            "🩸 **Fierce and unstoppable!** {winner} has put in massive hours to secure their place as the undisputed **Blood Hunters** MVP! 👑",
            "🩸 **The alpha hunter!** {winner} has earned the highest honor on our gang's leaderboard today! 🎉"
        ];

        const randomMsgTemplate = mvpCongratulations[Math.floor(Math.random() * mvpCongratulations.length)];
        const specialCongratulation = randomMsgTemplate.replace('{winner}', winnerMention);

        let description = `🏆 **Huge Congratulations to our Top 5 Hunters!** 🏆\n`;
        description += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        description += `🔥 **👑 MOST WANTED HUNTER OF THE ${timeframe.toUpperCase()}:**\n`;
        description += `➔ ${winnerMention} — ${formatMs(firstPlace.playtime)}\n\n`;
        description += `> ${specialCongratulation}\n\n`;
        description += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        description += `📊 **LEADERBOARD RANKINGS:**\n`;
        const rankEmojis = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

        for (let i = 0; i < top5.length; i++) {
            const player = top5[i];
            const emoji = rankEmojis[i] || '🏅';
            const badge = i === 0 ? '👑 *(CHAMPION)*' : '';

            description += `**${emoji} Rank #${i + 1}** | <@${player.userId}> ${badge}\n`;
            description += ` ├─ 📅 **Today:** ${formatMs(player.daily)}\n`;
            description += ` ├─ 🗓️ **7 Days:** ${formatMs(player.weekly)}\n`;
            description += ` ├─ 📊 **30 Days:** ${formatMs(player.monthly)}\n`;
            description += ` └─ 🏆 **Lifetime:** ${formatMs(player.total)}\n\n`;
        }

        const footerMessages = [
            "🩸 *Thank you for your active participation & loyalty to the Blood Hunters! Keep up the hunt!* ⚔️",
            "🩸 *Blood Hunters never sleep! Keep dominating the city and representing the gangs!* ⚔️",
            "🩸 *Huge respect to all active Hunters! Let's keep the gang on top!* ⚔️",
            "🩸 *The grind never stops in Blood Hunters! Keep up the incredible work, team!* ⚔️",
            "🩸 *United we stand, blood we hunt! Thank you for keeping our legacy alive!* ⚔️"
        ];
        const randomFooter = footerMessages[Math.floor(Math.random() * footerMessages.length)];
        description += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n${randomFooter}`;

        const embed = new EmbedBuilder()
            .setColor(colors[timeframe] || '#00ff99')
            .setTitle(titles[timeframe] || '🩸 PLAYTIME CHAMPIONS')
            .setDescription(description)
            .setThumbnail(guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL())
            .setFooter({ text: `${guild.name} • Playtime Celebrations` })
            .setTimestamp();

        await channel.send({ content: `🎊 **Congratulations ${winnerMention} & Top 5 Hunters!** 🎊`, embeds: [embed] });
    } catch (e) {
        console.error(`Announce Top Players (${timeframe}) Error:`, e);
    }
}

module.exports = {
    announceTopPlayers,
    init: (client) => {
        // Daily Top 5 at 06:00 AM
        cron.schedule('0 6 * * *', async () => {
            console.log("📢 Triggering Daily Top 5 Playtime Announcement...");
            // Use 1 minute prior (05:59 AM) as reference date, which belongs to the previous playtime day due to 6-hour offset
            const refDate = new Date(Date.now() - 60000);
            const guildIds = client.guilds.cache.map(g => g.id);
            for (const guildId of guildIds) {
                await announceTopPlayers(client, guildId, 'daily', refDate);
            }
        });

        // Weekly Top 5 on Friday at night 12:00 AM (calendar-wise Saturday 00:00)
        cron.schedule('0 0 * * 6', async () => {
            console.log("📢 Triggering Weekly Top 5 Playtime Announcement...");
            // Use 1 minute prior (Friday 23:59) as reference date to guarantee correct week evaluation
            const refDate = new Date(Date.now() - 60000);
            const guildIds = client.guilds.cache.map(g => g.id);
            for (const guildId of guildIds) {
                await announceTopPlayers(client, guildId, 'weekly', refDate);
            }
        });

        // Monthly Top 5 on end of month at night 12:00 AM (calendar-wise 1st of next month at 00:00)
        cron.schedule('0 0 1 * *', async () => {
            console.log("📢 Triggering Monthly Top 5 Playtime Announcement...");
            // Use 1 minute prior (last day of month at 23:59) as reference date to guarantee correct month evaluation
            const refDate = new Date(Date.now() - 60000);
            const guildIds = client.guilds.cache.map(g => g.id);
            for (const guildId of guildIds) {
                await announceTopPlayers(client, guildId, 'monthly', refDate);
            }
        });
    }
};
