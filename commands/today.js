const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const playtimeDb = require('../utils/playtimeDb');
const { activeSessions } = require('../utils/playtimeTracker');
const timeHelpers = require('../utils/timeHelpers');
const db = require('../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('today')
        .setDescription('Shows how long you\'ve played FiveM today.')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to check daily playtime for')
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
            console.error("Today autocomplete error:", e);
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
            
            let daily = 0;
            const now = new Date();
            for (const record of records) {
                let recDaily = record.dailyPlaytime || 0;
                const last = new Date(record.lastUpdated || 0);
                if (!timeHelpers.isSameDay(now, last)) recDaily = 0;
                daily += recDaily;
            }

            let statusText = "🔴 Currently Offline / Not Playing";
            let currentSessionDuration = 0;

            const sessionKey = `${interaction.guild.id}-${targetUser.id}`;
            if (activeSessions.has(sessionKey)) {
                const session = activeSessions.get(sessionKey);
                if (!codeOption || session.serverCode === codeOption) {
                    currentSessionDuration = Date.now() - (session.sessionStart || session.startTime || Date.now());
                    daily += currentSessionDuration;
                    
                    const formatLiveDuration = (ms) => {
                        const totalMins = Math.floor(ms / 60000);
                        const hours = Math.floor(totalMins / 60);
                        const mins = totalMins % 60;
                        if (hours > 0) return `${hours}h ${mins}m`;
                        return `${mins}m`;
                    };

                    statusText = `🟢 Currently Playing FiveM! (on server \`${session.serverCode}\` • +${formatLiveDuration(currentSessionDuration)} live)`;
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

            const fields = [
                { name: '📅 Today\'s Total Playtime', value: formatMs(daily), inline: true }
            ];

            if (currentSessionDuration > 0) {
                fields.push({ name: '🟢 Current Live Session', value: formatMs(currentSessionDuration), inline: true });
            }

            const serverNames = config.CFX_SERVER_NAMES || {};
            const serverDisplayName = codeOption ? (serverNames[codeOption] || codeOption) : null;
            const scopeText = codeOption ? `for server **${serverDisplayName}**` : 'across all servers';

            const embed = new EmbedBuilder()
                .setColor('#ed4245')
                .setTitle(`📅 Today's Playtime — ${username}`)
                .setDescription(`Playtime report for **${username}** ${scopeText} for today:\n\n**Current Status:** ${statusText}`)
                .addFields(fields)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: `FiveM Playtime Tracker${codeOption ? ` • Server: ${serverDisplayName}` : ''}` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error("Today command error:", error);
            await interaction.reply({ content: '❌ An error occurred fetching daily playtime.', ephemeral: true });
        }
    }
};
