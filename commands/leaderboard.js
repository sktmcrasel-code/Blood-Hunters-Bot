const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const playtimeDb = require('../utils/playtimeDb');
const { activeSessions } = require('../utils/playtimeTracker');
const timeHelpers = require('../utils/timeHelpers');
const { getConfig } = require('../utils/configManager');
const db = require('../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Shows the top 10 FiveM players by playtime.')
        .addStringOption(option => 
            option.setName('timeframe')
                .setDescription('The time period to view')
                .setRequired(false)
                .addChoices(
                    { name: 'Today', value: 'daily' },
                    { name: 'This Week', value: 'weekly' },
                    { name: 'This Month', value: 'monthly' },
                    { name: 'All Time', value: 'total' }
                ))
        .addStringOption(option =>
            option.setName('code')
                .setDescription('Filter leaderboard by a specific FiveM server code')
                .setRequired(false)
                .setAutocomplete(true)),
    
    async autocomplete(interaction) {
        try {
            const focusedValue = interaction.options.getFocused().toLowerCase();
            const config = await db.findOne({ guildId: interaction.guild.id }) || {};
            let servers = config.CFX_SERVERS || [];
            if (config.CFX_CODE && servers.length === 0) servers = [config.CFX_CODE];
            const serverNames = config.CFX_SERVER_NAMES || {};

            const filtered = servers.filter(choice => 
                choice.toLowerCase().includes(focusedValue) || 
                (serverNames[choice] && serverNames[choice].toLowerCase().includes(focusedValue))
            );
            await interaction.respond(
                filtered.map(choice => {
                    const displayName = serverNames[choice] ? `${serverNames[choice]} (${choice})` : choice;
                    return { name: displayName.substring(0, 100), value: choice };
                })
            );
        } catch (e) {
            if (e.code === 40060 || e.code === 10062) return;
            console.error("Leaderboard autocomplete error:", e);
        }
    },
    
    async execute(interaction) {
        try {
            await interaction.deferReply();

            const timeframe = interaction.options.getString('timeframe') || 'weekly';
            const codeOption = interaction.options.getString('code')?.trim();

            // Fetch config to check for tracked members list and valid server codes
            const config = await getConfig(interaction.guild.id);
            if (!config) {
                return interaction.editReply('❌ Configuration not found. Please setup the bot first.');
            }

            let servers = config.CFX_SERVERS || [];
            if (config.CFX_CODE && servers.length === 0) servers = [config.CFX_CODE];

            if (codeOption && !servers.includes(codeOption)) {
                return interaction.editReply(`❌ The server code **${codeOption}** is not in this server's tracking list.`);
            }

            const hasTrackingConfigured = (config && config.PLAYTIME_TRACKED_MEMBERS && config.PLAYTIME_TRACKED_MEMBERS.length > 0) || (config && config.PLAYTIME_ROLE_ID);
            
            const { getTrackedMembers } = require('../utils/playtimeHelpers');
            const trackedMembers = hasTrackingConfigured ? await getTrackedMembers(interaction.guild, config) : null;

            // Fetch all records for this guild
            const query = { guildId: interaction.guild.id };
            if (codeOption) query.serverCode = codeOption;

            let records = await playtimeDb.find(query);
            const now = new Date();

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
                    if (session.guildId === interaction.guild.id && (!codeOption || session.serverCode === codeOption)) {
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

            // Sort descending with total as tie-breaker
            leaderboardData.sort((a, b) => {
                if (b.playtime !== a.playtime) {
                    return b.playtime - a.playtime;
                }
                return b.total - a.total;
            });

            if (leaderboardData.length === 0) {
                return interaction.editReply({ content: '❌ No tracked members configured or found on the server.' });
            }

            const top10 = leaderboardData.slice(0, 10);

            const formatMs = (ms) => {
                if (!ms || ms <= 0) return '`0m`';
                const totalMins = Math.floor(ms / 60000);
                const hours = Math.floor(totalMins / 60);
                const mins = totalMins % 60;
                if (hours > 0) return `\`${hours}h ${mins}m\``;
                return `\`${mins}m\``;
            };

            const timeframeNames = {
                'daily': 'Today',
                'weekly': 'This Week',
                'monthly': 'This Month',
                'total': 'All Time'
            };

            const timeframeLabels = {
                'daily': "Today's Playtime",
                'weekly': "7 Days Playtime",
                'monthly': "30 Days Playtime",
                'total': "Lifetime Playtime"
            };
            const activeLabel = timeframeLabels[timeframe] || 'Playtime';

            const serverNames = config.CFX_SERVER_NAMES || {};
            const serverDisplayName = codeOption ? (serverNames[codeOption] || codeOption) : null;
            const scopeText = codeOption ? `for server: **${serverDisplayName}**` : 'across all servers';

            let description = `🏆 **Top FiveM Players (${timeframeNames[timeframe]})**\n*Showing rankings ${scopeText}*\n\n`;
            
            const rankEmojis = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

            for (let i = 0; i < top10.length; i++) {
                const data = top10[i];
                const emoji = rankEmojis[i] || '🏅';
                const badge = i === 0 ? '👑 *(CHAMPION)*' : '';

                description += `**${emoji} Rank #${i + 1}** | <@${data.userId}> ${badge}\n`;
                description += ` └─ ⏱️ **${activeLabel}:** ${formatMs(data.playtime)}\n\n`;
            }

            const embed = new EmbedBuilder()
                .setColor('#ed4245')
                .setTitle(`🏆 FiveM Playtime Leaderboard (${timeframeNames[timeframe]})`)
                .setDescription(description)
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }) || interaction.client.user.displayAvatarURL())
                .setFooter({ text: `${interaction.guild.name} • Top 10 Players${codeOption ? ` • Server: ${serverDisplayName}` : ''}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("Leaderboard command error:", error);
            await interaction.editReply({ content: '❌ An error occurred fetching the leaderboard.' });
        }
    }
};
