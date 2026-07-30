const { SlashCommandBuilder } = require('discord.js');
const cfxDb = require('../utils/cfxDb');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('linkname')
        .setDescription('Link your FiveM In-Game Name for accurate playtime tracking')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Your exact in-game name (e.g. thinka)')
                .setRequired(true)),
    
    async execute(interaction) {
        const name = interaction.options.getString('name').trim();

        try {
            await cfxDb.update(
                { userId: interaction.user.id, guildId: interaction.guild.id },
                { $set: { inGameName: name } },
                { upsert: true }
            );

            // Auto-add to tracking list
            const configDb = require('../utils/db');
            const config = await configDb.findOne({ guildId: interaction.guild.id }) || { PLAYTIME_TRACKED_MEMBERS: [] };
            let members = config.PLAYTIME_TRACKED_MEMBERS || [];
            if (!members.includes(interaction.user.id)) {
                members.push(interaction.user.id);
                await configDb.update(
                    { guildId: interaction.guild.id }, 
                    { $set: { PLAYTIME_TRACKED_MEMBERS: members } }, 
                    { upsert: true }
                );
            }

            await interaction.reply({ 
                content: `✅ Successfully linked your Discord to the in-game name **${name}**.\nThe bot will now track your playtime and you have been added to the tracking list!`, 
                ephemeral: true 
            });
        } catch (error) {
            console.error("LinkName Error:", error);
            await interaction.reply({ content: '❌ An error occurred while saving your name.', ephemeral: true });
        }
    }
};
