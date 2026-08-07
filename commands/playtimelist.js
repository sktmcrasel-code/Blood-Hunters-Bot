const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../utils/db');
const { updateList } = require('../utils/playtimeListUpdater');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('playtimelist')
        .setDescription('Manage the Live Auto-Updating Playtime List')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand.setName('setup')
                .setDescription('Setup the live playtime list in a channel')
                .addChannelOption(option => 
                    option.setName('channel')
                        .setDescription('The channel to post the live list in')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('code')
                        .setDescription('The CFX code of the server (e.g. qplrv9)')
                        .setRequired(true)
                        .setAutocomplete(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('role')
                .setDescription('Manage role-based auto-tracking')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Action (set, remove)')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Set Role', value: 'set' },
                            { name: 'Remove Role', value: 'remove' }
                        ))
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The role to track (required if setting)')
                        .setRequired(false))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('update')
                .setDescription('Manually force the list to update right now')
        ),
    
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
            console.error("PlaytimeList autocomplete error:", e);
        }
    },
    
    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        await interaction.deferReply({ ephemeral: true });

        let config = await db.findOne({ guildId: interaction.guild.id });
        if (!config) {
            return interaction.editReply('❌ Configuration not found. Please setup the bot first.');
        }

        if (sub === 'setup') {
            const channel = interaction.options.getChannel('channel');
            let code = interaction.options.getString('code').trim();

            if (code.includes('/')) {
                const parts = code.split('/');
                code = parts[parts.length - 1];
            }

            // Check if server is in tracked list
            let servers = config.CFX_SERVERS || [];
            if (config.CFX_CODE && servers.length === 0) servers = [config.CFX_CODE];

            if (!servers.includes(code)) {
                return interaction.editReply(`❌ The server code **${code}** is not in your tracking list. Please add it first using \`/setcfx add\`.`);
            }

            const embed = new EmbedBuilder()
                .setColor('#2b2d31')
                .setTitle(`⏱️ Live Playtime Tracking List — ${code}`)
                .setDescription("Initializing list... Please add members and wait for the next update cycle.")
                .setFooter({ text: `Auto-updates every 30s` });

            const msg = await channel.send({ embeds: [embed] });

            let lists = config.PLAYTIME_LISTS || [];
            
            // Migrate old schema
            if (config.PLAYTIME_LIST_CHANNEL_ID && config.PLAYTIME_LIST_MESSAGE_ID && lists.length === 0) {
                let defaultCode = 'unknown';
                if (servers.length > 0) defaultCode = servers[0];
                lists.push({
                    code: defaultCode,
                    channelId: config.PLAYTIME_LIST_CHANNEL_ID,
                    messageId: config.PLAYTIME_LIST_MESSAGE_ID
                });
            }

            // Filter out existing list for this code
            lists = lists.filter(l => l.code !== code);

            // Add new config
            lists.push({
                code: code,
                channelId: channel.id,
                messageId: msg.id
            });

            await db.update(
                { guildId: interaction.guild.id },
                { $set: { PLAYTIME_LISTS: lists } }
            );

            await interaction.editReply(`✅ Setup complete! The live playtime list for server **${code}** has been posted in ${channel}.`);
            await updateList(interaction.client, interaction.guild.id);
        }

        else if (sub === 'role') {
            const action = interaction.options.getString('action');
            
            if (action === 'set') {
                const role = interaction.options.getRole('role');
                if (!role) {
                    return interaction.editReply('❌ You must specify a role when action is "Set Role".');
                }

                await db.update(
                    { guildId: interaction.guild.id },
                    { $set: { PLAYTIME_ROLE_ID: role.id } }
                );

                await updateList(interaction.client, interaction.guild.id);
                await interaction.editReply(`✅ Successfully set the playtime tracked role to **${role.name}** (${role}). All members with this role will now be tracked automatically!`);
            } 
            else if (action === 'remove') {
                await db.update(
                    { guildId: interaction.guild.id },
                    { $unset: { PLAYTIME_ROLE_ID: true } }
                );

                await updateList(interaction.client, interaction.guild.id);
                await interaction.editReply('✅ Removed the playtime tracked role. The bot will no longer track players by role.');
            }
        }

        else if (sub === 'update') {
            const lists = config.PLAYTIME_LISTS || [];
            if (lists.length === 0 && !config.PLAYTIME_LIST_MESSAGE_ID) {
                return interaction.editReply('❌ You have not setup a list yet. Run `/playtimelist setup` first.');
            }
            
            await updateList(interaction.client, interaction.guild.id);
            await interaction.editReply('✅ All Live Playtime Lists have been manually updated!');
        }
    }
};
