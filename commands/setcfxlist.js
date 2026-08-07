const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setcfxlist')
        .setDescription('Set up a live auto-updating player list for a specific CFX server in a channel')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to display the live player list')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('code')
                .setDescription('The CFX code of the server (e.g. qplrv9)')
                .setRequired(true)
                .setAutocomplete(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
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
            console.error("SetCFXList autocomplete error:", e);
        }
    },
    
    async execute(interaction, client) {
        const channel = interaction.options.getChannel('channel');
        let code = interaction.options.getString('code').trim();

        if (code.includes('/')) {
            const parts = code.split('/');
            code = parts[parts.length - 1];
        }

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

            const config = await db.findOne({ guildId: interaction.guild.id }) || {};
            let servers = config.CFX_SERVERS || [];
            if (config.CFX_CODE && servers.length === 0) servers = [config.CFX_CODE];

            if (!servers.includes(code)) {
                return interaction.editReply(`❌ The server code **${code}** is not in your tracking list. Please add it first using \`/setcfx add\`.`);
            }

            // Create initial placeholder embed
            const embed = new EmbedBuilder()
                .setColor('#2b2d31')
                .setTitle(`🎮 Live Server Players — ${code}`)
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

            let lists = config.CFX_LISTS || [];
            
            // Migrate old schema if exists
            if (config.CFX_PLAYER_LIST_CHANNEL_ID && config.CFX_PLAYER_LIST_MESSAGE_ID && config.CFX_CODE && lists.length === 0) {
                lists.push({
                    code: config.CFX_CODE,
                    channelId: config.CFX_PLAYER_LIST_CHANNEL_ID,
                    messageId: config.CFX_PLAYER_LIST_MESSAGE_ID
                });
            }

            // Remove existing list config for this server code
            lists = lists.filter(l => l.code !== code);
            
            // Add new config
            lists.push({
                code: code,
                channelId: channel.id,
                messageId: message.id
            });

            await db.update(
                { guildId: interaction.guild.id },
                { 
                    $set: { CFX_LISTS: lists } 
                },
                { upsert: true }
            );

            await interaction.editReply({ content: `✅ Live player list for server **${code}** has been set up in ${channel}. It will automatically update every minute.` });

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
