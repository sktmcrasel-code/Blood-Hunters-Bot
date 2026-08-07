const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const cfxDb = require('../utils/cfxDb');
const configDb = require('../utils/db');
const { updateList } = require('../utils/playtimeListUpdater');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('linkname')
        .setDescription('Link a FiveM In-Game Name for playtime tracking')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('The exact in-game name (e.g. thinka)')
                .setRequired(true))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('(Admin only) The target member to link the in-game name for')
                .setRequired(false)),
    
    async execute(interaction) {
        const name = interaction.options.getString('name').trim();
        const targetUserOption = interaction.options.getUser('user');

        let targetUser = interaction.user;

        // If another user is specified, verify admin/manage guild permissions
        if (targetUserOption && targetUserOption.id !== interaction.user.id) {
            const hasPermission = interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) || 
                                  interaction.member.permissions.has(PermissionFlagsBits.Administrator);
            if (!hasPermission) {
                return interaction.reply({
                    content: '❌ **Only Admins or Managers** can link in-game names for other members!',
                    ephemeral: true
                });
            }
            targetUser = targetUserOption;
        }

        try {
            await interaction.deferReply({ ephemeral: true });

            await cfxDb.update(
                { userId: targetUser.id, guildId: interaction.guild.id },
                { $set: { inGameName: name } },
                { upsert: true }
            );

            // Refresh the live playtime list (non-blocking)
            updateList(interaction.client, interaction.guild.id).catch(() => {});

            if (targetUser.id === interaction.user.id) {
                await interaction.editReply({ 
                    content: `✅ Successfully linked your Discord to the in-game name **${name}**.\nThe bot will now track your playtime and you have been added to the tracking list!`, 
                });
            } else {
                await interaction.editReply({ 
                    content: `✅ Successfully linked **${targetUser.tag}** (<@${targetUser.id}>) to the in-game name **${name}**.\nThey have been automatically added to the playtime tracking list!`, 
                });
            }
        } catch (error) {
            console.error("LinkName Error:", error);
            if (interaction.deferred) {
                await interaction.editReply({ content: '❌ An error occurred while saving the name.' });
            } else {
                await interaction.reply({ content: '❌ An error occurred while saving the name.', ephemeral: true });
            }
        }
    }
};
