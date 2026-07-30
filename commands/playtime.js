const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const playtimeDb = require('../utils/playtimeDb');
const { activeSessions } = require('../utils/playtimeTracker');
const timeHelpers = require('../utils/timeHelpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('playtime')
        .setDescription('Check your or another member\'s FiveM playtime')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to check playtime for')
                .setRequired(false)),
    
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        
        try {
            const record = await playtimeDb.findOne({ userId: targetUser.id, guildId: interaction.guild.id });
            
            let daily = record ? record.dailyPlaytime || 0 : 0;
            let weekly = record ? record.weeklyPlaytime || 0 : 0;
            let monthly = record ? record.monthlyPlaytime || 0 : 0;
            let total = record ? record.totalPlaytime || 0 : 0;
            
            const now = new Date();
            if (record) {
                const last = new Date(record.lastUpdated || 0);
                if (!timeHelpers.isSameDay(now, last)) daily = 0;
                if (!timeHelpers.isSameWeek(now, last)) weekly = 0;
                if (!timeHelpers.isSameMonth(now, last)) monthly = 0;
            }

            let currentSessionStr = "";

            // Check for active session
            if (activeSessions.has(targetUser.id)) {
                const session = activeSessions.get(targetUser.id);
                if (session.guildId === interaction.guild.id) {
                    const activeDuration = Date.now() - session.startTime;
                    daily += activeDuration;
                    weekly += activeDuration;
                    monthly += activeDuration;
                    total += activeDuration;
                    
                    const actHours = Math.floor(activeDuration / 3600000);
                    const actMins = Math.floor((activeDuration % 3600000) / 60000);
                    currentSessionStr = `\n\n🟢 *Currently playing for ${actHours}h ${actMins}m*`;
                }
            }
            
            if (total === 0) {
                return interaction.reply({
                    content: `❌ **${targetUser.username}** has no recorded playtime yet.`,
                    ephemeral: true
                });
            }

            const formatMs = ms => `\`${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m\``;

            const embed = new EmbedBuilder()
                .setColor('#00ff99')
                .setTitle(`⏱️ Playtime Stats`)
                .setDescription(`Playtime record for <@${targetUser.id}>${currentSessionStr}`)
                .addFields(
                    { name: '📅 Today', value: formatMs(daily), inline: true },
                    { name: '🗓️ This Week', value: formatMs(weekly), inline: true },
                    { name: '📊 This Month', value: formatMs(monthly), inline: true },
                    { name: '🏆 All Time', value: formatMs(total), inline: true }
                )
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: `${interaction.guild.name} • Playtime Tracker` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error("Playtime command error:", error);
            await interaction.reply({ content: '❌ An error occurred fetching playtime.', ephemeral: true });
        }
    }
};
