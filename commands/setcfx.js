const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setcfx')
        .setDescription('Set the CFX server code for playtime tracking (e.g. qplrv9)')
        .addStringOption(option =>
            option.setName('code')
                .setDescription('The CFX code (e.g. qplrv9)')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        let code = interaction.options.getString('code').trim();
        
        // Extract code if user pasted a full link like cfx.re/join/qplrv9
        if (code.includes('/')) {
            const parts = code.split('/');
            code = parts[parts.length - 1];
        }

        try {
            await db.update(
                { guildId: interaction.guild.id },
                { $set: { CFX_CODE: code } },
                { upsert: true }
            );

            await interaction.reply({ 
                content: `✅ The FiveM CFX code has been set to **${code}**. The bot will now track playtime using this server's public data.`, 
                ephemeral: true 
            });
        } catch (error) {
            console.error("SetCFX Error:", error);
            await interaction.reply({ content: '❌ An error occurred while saving the CFX code.', ephemeral: true });
        }
    }
};
