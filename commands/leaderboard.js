const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const playtimeDb = require('../utils/playtimeDb');
const { activeSessions } = require('../utils/playtimeTracker');
const timeHelpers = require('../utils/timeHelpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Shows the top 10 members with the most FiveM playtime')
        .addStringOption(option => 
            option.setName('timeframe')
                .setDescription('The time period to view')
                .setRequired(false)
                .addChoices(
                    { name: 'Today', value: 'daily' },
                    { name: 'This Week', value: 'weekly' },
                    { name: 'This Month', value: 'monthly' },
                    { name: 'All Time', value: 'total' }
                )),
    
    async execute(interaction) {
        try {
            await interaction.deferReply();

            const timeframe = interaction.options.getString('timeframe') || 'weekly';

            // Fetch all records for this guild
            let records = await playtimeDb.find({ guildId: interaction.guild.id });
            const now = new Date();
            
            // Map records and include active session time if applicable
            let leaderboardData = records.map(record => {
                let val = 0;
                const last = new Date(record.lastUpdated || 0);
                
                // Read base value based on timeframe and rollover logic
                if (timeframe === 'daily') val = timeHelpers.isSameDay(now, last) ? (record.dailyPlaytime || 0) : 0;
                else if (timeframe === 'weekly') val = timeHelpers.isSameWeek(now, last) ? (record.weeklyPlaytime || 0) : 0;
                else if (timeframe === 'monthly') val = timeHelpers.isSameMonth(now, last) ? (record.monthlyPlaytime || 0) : 0;
                else val = record.totalPlaytime || 0;

                if (activeSessions.has(record.userId)) {
                    const session = activeSessions.get(record.userId);
                    if (session.guildId === interaction.guild.id) {
                        val += (Date.now() - session.startTime);
                    }
                }
                return { userId: record.userId, totalPlaytime: val };
            });

            // Also add users who only have an active session (no DB record yet)
            for (const [userId, session] of activeSessions.entries()) {
                if (session.guildId === interaction.guild.id) {
                    if (!leaderboardData.find(r => r.userId === userId)) {
                        leaderboardData.push({
                            userId: userId,
                            totalPlaytime: Date.now() - session.startTime
                        });
                    }
                }
            }

            // Filter out 0 playtime and sort descending
            leaderboardData = leaderboardData.filter(d => d.totalPlaytime > 0);
            leaderboardData.sort((a, b) => b.totalPlaytime - a.totalPlaytime);

            if (leaderboardData.length === 0) {
                return interaction.editReply({ content: 'No playtime data has been recorded for this timeframe yet.' });
            }

            const top10 = leaderboardData.slice(0, 10);
            
            let description = '';
            for (let i = 0; i < top10.length; i++) {
                const data = top10[i];
                const hours = Math.floor(data.totalPlaytime / 3600000);
                const minutes = Math.floor((data.totalPlaytime % 3600000) / 60000);
                
                let rankEmoji = '🏅';
                if (i === 0) rankEmoji = '🥇';
                else if (i === 1) rankEmoji = '🥈';
                else if (i === 2) rankEmoji = '🥉';

                description += `${rankEmoji} **#${i + 1}** <@${data.userId}> — \`${hours}h ${minutes}m\`\n`;
            }

            const timeframeNames = {
                'daily': 'Today',
                'weekly': 'This Week',
                'monthly': 'This Month',
                'total': 'All Time'
            };

            const embed = new EmbedBuilder()
                .setColor('#00ff99')
                .setTitle(`🏆 Playtime Leaderboard (${timeframeNames[timeframe]})`)
                .setDescription(description)
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                .setFooter({ text: `${interaction.guild.name} • Top 10 Players` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("Leaderboard command error:", error);
            await interaction.editReply({ content: '❌ An error occurred fetching the leaderboard.' });
        }
    }
};
