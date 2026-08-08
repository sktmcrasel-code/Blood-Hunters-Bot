const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const playtimeDb = require('../utils/playtimeDb');
const { activeSessions } = require('../utils/playtimeTracker');
const timeHelpers = require('../utils/timeHelpers');
const db = require('../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('playtime')
        .setDescription('Shows FiveM playtime report (Today, Week, Month, or Full Profile).')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to check playtime for')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('timeframe')
                .setDescription('Filter report by timeframe (Today, Week, Month, Full Profile)')
                .setRequired(false)
                .addChoices(
                    { name: 'Full Profile', value: 'full' },
                    { name: 'Today', value: 'today' },
                    { name: 'This Week', value: 'week' },
                    { name: 'This Month', value: 'month' }
                ))
        .addStringOption(option =>
            option.setName('code')
                .setDescription('Filter by specific CFX Server Code (omit to see total across all servers)')
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
            console.error("Playtime autocomplete error:", e);
        }
    },
    
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const timeframe = interaction.options.getString('timeframe') || 'full';
        const codeOption = interaction.options.getString('code')?.trim();
        const username = targetUser.globalName || targetUser.displayName || targetUser.username;
        
        try {
            const config = await db.findOne({ guildId: interaction.guild.id }) || {};
            let servers = config.CFX_SERVERS || [];
            if (config.CFX_CODE && servers.length === 0) servers = [config.CFX_CODE];

            if (codeOption && !servers.includes(codeOption)) {
                return interaction.reply({ content: `❌ The server code **${codeOption}** is not in this server's tracking list.`, ephemeral: true });
            }

            const query = { userId: targetUser.id, guildId: interaction.guild.id };
            if (codeOption) query.serverCode = codeOption;
            
            const records = await playtimeDb.find(query);
            
            let daily = 0;
            let weekly = 0;
            let monthly = 0;
            let total = 0;
            
            const now = new Date();
            for (const record of records) {
                let recDaily = record.dailyPlaytime || 0;
                let recWeekly = record.weeklyPlaytime || 0;
                let recMonthly = record.monthlyPlaytime || 0;
                let recTotal = record.totalPlaytime || 0;
                
                const last = new Date(record.lastUpdated || 0);
                if (!timeHelpers.isSameDay(now, last)) recDaily = 0;
                if (!timeHelpers.isSameWeek(now, last)) recWeekly = 0;
                if (!timeHelpers.isSameMonth(now, last)) recMonthly = 0;

                daily += recDaily;
                weekly += recWeekly;
                monthly += recMonthly;
                total += recTotal;
            }
            
            let statusText = "🔴 Currently Offline / Not Playing";
            let activeDuration = 0;
            let isOnline = false;

            const sessionKey = `${interaction.guild.id}-${targetUser.id}`;
            if (activeSessions.has(sessionKey)) {
                const session = activeSessions.get(sessionKey);
                if (!codeOption || session.serverCode === codeOption) {
                    isOnline = true;
                    activeDuration = Date.now() - (session.sessionStart || session.startTime || Date.now());
                    daily += activeDuration;
                    weekly += activeDuration;
                    monthly += activeDuration;
                    total += activeDuration;
                    
                    const formatLiveDuration = (ms) => {
                        const totalMins = Math.floor(ms / 60000);
                        const hours = Math.floor(totalMins / 60);
                        const mins = totalMins % 60;
                        if (hours > 0) return `${hours}h ${mins}m`;
                        return `${mins}m`;
                    };

                    statusText = `🟢 Currently Playing FiveM! (on server \`${session.serverCode}\` • +${formatLiveDuration(activeDuration)} live)`;
                }
            }

            const formatMs = (ms) => {
                if (!ms || ms <= 0) return '`0m`';
                const totalMins = Math.floor(ms / 60000);
                const hours = Math.floor(totalMins / 60);
                const mins = totalMins % 60;
                if (hours > 0) return `\`${hours}h ${mins}m\``;
                return `\`${mins}m\``;
            };

            const serverNames = config.CFX_SERVER_NAMES || {};
            const serverDisplayName = codeOption ? (serverNames[codeOption] || codeOption) : null;

            const embed = new EmbedBuilder()
                .setColor('#ed4245')
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: `FiveM Playtime Tracker${codeOption ? ` • Server: ${serverDisplayName}` : ''}` })
                .setTimestamp();

            const scopeText = codeOption ? `for server **${serverDisplayName}**` : 'across all servers';

            if (timeframe === 'today') {
                embed.setTitle(`📅 Today's Playtime — ${username}`)
                     .setDescription(`Playtime report for **${username}** ${scopeText} for today:\n\n**Current Status:** ${statusText}`)
                     .addFields(
                          { name: '📅 Today\'s Total Playtime', value: formatMs(daily), inline: true }
                      );
                if (isOnline) {
                    embed.addFields({ name: '⚡ Current Live Session', value: formatMs(activeDuration), inline: true });
                }
            } else if (timeframe === 'week') {
                embed.setTitle(`📅 Weekly Playtime — ${username}`)
                     .setDescription(`Playtime report for **${username}** ${scopeText} over the last 7 days:\n\n**Current Status:** ${statusText}`)
                     .addFields(
                          { name: '📅 Last 7 Days Playtime', value: formatMs(weekly), inline: true }
                      );
            } else if (timeframe === 'month') {
                embed.setTitle(`📅 Monthly Playtime — ${username}`)
                     .setDescription(`Playtime report for **${username}** ${scopeText} over the last 30 days:\n\n**Current Status:** ${statusText}`)
                     .addFields(
                          { name: '📅 Last 30 Days Playtime', value: formatMs(monthly), inline: true }
                      );
            } else {
                embed.setTitle(`🎮 FiveM Playtime Profile — ${username}`)
                     .setDescription(`Here is the complete FiveM playtime report for **${username}** ${scopeText}:\n\n**Current Status:** ${statusText}`);

                if (isOnline) {
                    embed.addFields(
                        { name: '📅 Today (Total)', value: formatMs(daily), inline: true },
                        { name: '⚡ Current Session', value: formatMs(activeDuration), inline: true },
                        { name: '📅 Last 7 Days', value: formatMs(weekly), inline: true },
                        { name: '📅 Last 30 Days', value: formatMs(monthly), inline: true },
                        { name: '🏆 Lifetime Total', value: formatMs(total), inline: false }
                    );
                } else {
                    embed.addFields(
                        { name: '📅 Today', value: formatMs(daily), inline: true },
                        { name: '📅 Last 7 Days', value: formatMs(weekly), inline: true },
                        { name: '📅 Last 30 Days', value: formatMs(monthly), inline: true },
                        { name: '🏆 Lifetime Total', value: formatMs(total), inline: false }
                    );
                }
            }

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error("Playtime command error:", error);
            await interaction.reply({ content: '❌ An error occurred fetching playtime.', ephemeral: true });
        }
    }
};
