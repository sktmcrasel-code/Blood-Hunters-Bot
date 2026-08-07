const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const playtimeDb = require('../utils/playtimeDb');
const { activeSessions } = require('../utils/playtimeTracker');
const timeHelpers = require('../utils/timeHelpers');
const db = require('../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('week')
        .setDescription('Shows how long you\'ve played FiveM over the last 7 days.')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to check weekly playtime for')
                .setRequired(false))
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
            console.error("Week autocomplete error:", e);
        }
    },
    
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
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
            
            let weekly = 0;
            const now = new Date();
            for (const record of records) {
                let recWeekly = record.weeklyPlaytime || 0;
                const last = new Date(record.lastUpdated || 0);
                if (!timeHelpers.isSameWeek(now, last)) recWeekly = 0;
                weekly += recWeekly;
            }

            let statusText = "🔴 Currently Offline / Not Playing";

            if (activeSessions.has(targetUser.id)) {
                const session = activeSessions.get(targetUser.id);
                if (session.guildId === interaction.guild.id && (!codeOption || session.serverCode === codeOption)) {
                    const activeDuration = Date.now() - (session.sessionStart || session.startTime || Date.now());
                    weekly += activeDuration;
                    
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
            const scopeText = codeOption ? `for server **${serverDisplayName}**` : 'across all servers';

            const embed = new EmbedBuilder()
                .setColor('#ed4245')
                .setTitle(`📅 Weekly Playtime — ${username}`)
                .setDescription(`Playtime report for **${username}** ${scopeText} over the last 7 days:\n\n**Current Status:** ${statusText}`)
                .addFields(
                    { name: '📅 Last 7 Days Playtime', value: formatMs(weekly), inline: true }
                )
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: `FiveM Playtime Tracker${codeOption ? ` • Server: ${serverDisplayName}` : ''}` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error("Week command error:", error);
            await interaction.reply({ content: '❌ An error occurred fetching weekly playtime.', ephemeral: true });
        }
    }
};
