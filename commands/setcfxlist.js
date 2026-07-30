const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setcfxlist')
        .setDescription('Set up a live auto-updating player list for the CFX server in a channel')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to display the live player list')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction, client) {
        const channel = interaction.options.getChannel('channel');

        // Check if the bot has permission to send messages in that channel
        if (!channel.isTextBased()) {
            return interaction.reply({ content: '❌ Please select a text channel.', ephemeral: true });
        }

        const permissions = channel.permissionsFor(interaction.guild.members.me);
        if (!permissions.has('ViewChannel') || !permissions.has('SendMessages')) {
            return interaction.reply({ content: '❌ I do not have permission to send messages in that channel.', ephemeral: true });
        }

        try {
            await interaction.deferReply({ ephemeral: true });

            // Create initial placeholder embed
            const embed = new EmbedBuilder()
                .setColor('#2b2d31')
                .setTitle('🎮 Live Server Players')
                .setDescription('*Fetching player list from CFX server...*')
                .setFooter({ text: 'Setting up...' })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('refresh_cfx_list')
                    .setLabel('🔄 Refresh List')
                    .setStyle(ButtonStyle.Primary)
            );

            const message = await channel.send({ embeds: [embed], components: [row] });

            // Save the channel ID and message ID to database
            await db.update(
                { guildId: interaction.guild.id },
                { 
                    $set: { 
                        CFX_PLAYER_LIST_CHANNEL_ID: channel.id,
                        CFX_PLAYER_LIST_MESSAGE_ID: message.id
                    } 
                },
                { upsert: true }
            );

            await interaction.editReply({ content: `✅ Live player list has been set up in ${channel}. It will automatically update every minute.` });

            // Trigger an immediate update
            const updater = require('../utils/cfxListUpdater');
            updater.updateList(client, interaction.guild.id);

        } catch (error) {
            console.error("SetCFXList Error:", error);
            if (interaction.deferred) {
                await interaction.editReply({ content: '❌ An error occurred while setting up the player list.' });
            } else {
                await interaction.reply({ content: '❌ An error occurred while setting up the player list.', ephemeral: true });
            }
        }
    }
};
