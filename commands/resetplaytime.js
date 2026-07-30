const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const playtimeDb = require('../utils/playtimeDb');
const db = require('../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resetplaytime')
        .setDescription('Reset all playtime data for this server (Admin Only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });
            
            // Remove all playtime records for this guild
            await playtimeDb.remove({ guildId: interaction.guild.id }, { multi: true });
            
            // Clear the tracking list in config
            await db.update(
                { guildId: interaction.guild.id }, 
                { $set: { PLAYTIME_TRACKED_MEMBERS: [] } }, 
                { upsert: true }
            );

            await interaction.editReply({ 
                content: `✅ Successfully reset all playtime data and cleared the tracking list for this server.` 
            });
        } catch (error) {
            console.error("ResetPlaytime Error:", error);
            await interaction.editReply({ content: '❌ An error occurred while resetting playtime data.' });
        }
    }
};
