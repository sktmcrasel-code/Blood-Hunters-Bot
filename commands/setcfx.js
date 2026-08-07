const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const db = require('../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setcfx')
        .setDescription('Manage the CFX server codes for playtime tracking and live lists')
        .addSubcommand(subcommand =>
            subcommand.setName('add')
                .setDescription('Add a CFX server code')
                .addStringOption(option =>
                    option.setName('code')
                        .setDescription('The CFX code (e.g. qplrv9)')
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('log_channel')
                        .setDescription('Optional channel to post player join/leave session logs in')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('remove')
                .setDescription('Remove a CFX server code')
                .addStringOption(option =>
                    option.setName('code')
                        .setDescription('The CFX code to remove')
                        .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('list')
                .setDescription('List all tracked CFX server codes')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        await interaction.deferReply({ ephemeral: true });

        let config = await db.findOne({ guildId: interaction.guild.id }) || { CFX_SERVERS: [] };
        
        // Migrate old single CFX_CODE to array if it exists
        if (config.CFX_CODE && (!config.CFX_SERVERS || config.CFX_SERVERS.length === 0)) {
            config.CFX_SERVERS = [config.CFX_CODE];
            await db.update({ guildId: interaction.guild.id }, { $set: { CFX_SERVERS: config.CFX_SERVERS } });
        }
        
        let servers = config.CFX_SERVERS || [];

        if (sub === 'add') {
            let code = interaction.options.getString('code').trim();
            const logChannel = interaction.options.getChannel('log_channel');
            
            if (code.includes('/')) {
                const parts = code.split('/');
                code = parts[parts.length - 1];
            }

            let alreadyExists = servers.includes(code);
            if (!alreadyExists) {
                servers.push(code);
            }
            
            const updateData = { CFX_SERVERS: servers };

            // Fetch and cache server name immediately
            const { fetchCFXServerData } = require('../utils/playtimeTracker');
            const serverData = await fetchCFXServerData(code).catch(() => null);
            let serverName = code;
            if (serverData && serverData.hostname) {
                serverName = serverData.hostname.substring(0, 30).replace(/\^([0-9]|\~[a-z])/gi, "").trim();
            }
            const serverNames = config.CFX_SERVER_NAMES || {};
            serverNames[code] = serverName;
            updateData.CFX_SERVER_NAMES = serverNames;
            
            let logChannels = config.PLAYTIME_LOG_CHANNELS || [];
            if (config.PLAYTIME_LOG_CHANNEL_ID && logChannels.length === 0) {
                let defaultCode = 'unknown';
                if (servers.length > 0) defaultCode = servers[0];
                logChannels.push({ code: defaultCode, channelId: config.PLAYTIME_LOG_CHANNEL_ID });
            }

            if (logChannel) {
                logChannels = logChannels.filter(lc => lc.code !== code);
                logChannels.push({ code: code, channelId: logChannel.id });
                updateData.PLAYTIME_LOG_CHANNELS = logChannels;
            }

            await db.update(
                { guildId: interaction.guild.id },
                { $set: updateData },
                { upsert: true }
            );

            let logMsg = logChannel ? `\n\n📢 **Playtime Log Channel:** ${logChannel}` : '';
            if (alreadyExists) {
                await interaction.editReply(`✅ Updated tracking options for CFX server **${code}**!${logMsg}`);
            } else {
                await interaction.editReply(`✅ Added CFX server **${code}** to the tracking list!${logMsg}`);
            }
        }
        else if (sub === 'remove') {
            let code = interaction.options.getString('code').trim();
            
            if (!servers.includes(code)) {
                return interaction.editReply(`❌ The server code **${code}** is not in your tracking list.`);
            }

            servers = servers.filter(c => c !== code);
            let logChannels = config.PLAYTIME_LOG_CHANNELS || [];
            logChannels = logChannels.filter(lc => lc.code !== code);

            await db.update(
                { guildId: interaction.guild.id },
                { $set: { CFX_SERVERS: servers, PLAYTIME_LOG_CHANNELS: logChannels } }
            );

            await interaction.editReply(`✅ Removed CFX server **${code}** from the tracking list!`);
        }
        else if (sub === 'list') {
            if (servers.length === 0) {
                return interaction.editReply(`No CFX servers are currently configured. Use \`/setcfx add\` to add one.`);
            }
            
            const embed = new EmbedBuilder()
                .setColor('#00ff99')
                .setTitle('🌐 Tracked CFX Servers')
                .setDescription(servers.map((s, i) => `**${i+1}.** \`${s}\``).join('\n'));
                
            await interaction.editReply({ embeds: [embed] });
        }
    }
};
