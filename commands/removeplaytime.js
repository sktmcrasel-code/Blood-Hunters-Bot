const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../utils/db');
const cfxDb = require('../utils/cfxDb');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removeplaytime')
        .setDescription('Remove a member from the playtime tracking list (Admin Only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to remove from tracking')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        const user = interaction.options.getUser('user');

        try {
            await interaction.deferReply({ ephemeral: true });

            // Remove from config array
            const config = await db.findOne({ guildId: interaction.guild.id });
            if (config && config.PLAYTIME_TRACKED_MEMBERS) {
                let members = config.PLAYTIME_TRACKED_MEMBERS;
                const index = members.indexOf(user.id);
                if (index > -1) {
                    members.splice(index, 1);
                    await db.update(
                        { guildId: interaction.guild.id }, 
                        { $set: { PLAYTIME_TRACKED_MEMBERS: members } }, 
                        { upsert: true }
                    );
                }
            }

            // Remove from cfxDb so they aren't linked anymore
            await cfxDb.remove({ userId: user.id, guildId: interaction.guild.id }, { multi: true });

            await interaction.editReply({ 
                content: `✅ Successfully removed **${user.tag}** from the playtime tracking list.` 
            });
        } catch (error) {
            console.error("RemovePlaytime Error:", error);
            await interaction.editReply({ content: '❌ An error occurred while removing the user.' });
        }
    }
};
