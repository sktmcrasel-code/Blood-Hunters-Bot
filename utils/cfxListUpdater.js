const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('./db');
const cfxDb = require('./cfxDb');
const { fetchCFXServerData } = require('./playtimeTracker');

async function updateList(client, guildId) {
    try {
        const config = await db.findOne({ guildId });
        if (!config) return;

        let lists = config.CFX_LISTS || [];
        
        // Migrate old single configuration if it exists
        if (config.CFX_PLAYER_LIST_CHANNEL_ID && config.CFX_PLAYER_LIST_MESSAGE_ID && config.CFX_CODE && lists.length === 0) {
            lists = [{
                code: config.CFX_CODE,
                channelId: config.CFX_PLAYER_LIST_CHANNEL_ID,
                messageId: config.CFX_PLAYER_LIST_MESSAGE_ID
            }];
            await db.update({ guildId }, { $set: { CFX_LISTS: lists } });
        }
        
        if (lists.length === 0) return;

        const guild = client.guilds.cache.get(guildId);
        if (!guild) return;

        // Fetch linked users to show Discord tags (reused for all lists)
        const linkedUsers = await cfxDb.find({});
        const linkedNamesMap = new Map();
        for (const u of linkedUsers) {
            if (u.inGameName) linkedNamesMap.set(u.inGameName.toLowerCase(), u.userId);
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('refresh_cfx_list')
                .setLabel('🔄 Refresh List')
                .setStyle(ButtonStyle.Primary)
        );

        for (const listConfig of lists) {
            const { code, channelId, messageId } = listConfig;
            if (!code || !channelId || !messageId) continue;

            const channel = guild.channels.cache.get(channelId);
            if (!channel) continue;

            const message = await channel.messages.fetch(messageId).catch(() => null);
            if (!message) continue;

            let serverData = await fetchCFXServerData(code);

            if (!serverData) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle(`🎮 Live Server Players — ${code}`)
                    .setDescription(`❌ **Server Not Found.**\nThe CFX code \`${code}\` might be expired or the server is offline.\n\n🔄 **Next Update:** <t:${Math.floor(Date.now() / 1000) + 30}:R>`)
                    .setFooter({ text: `Auto-updates every 30s` })
                    .setTimestamp();

                await message.edit({ embeds: [errorEmbed], components: [row] }).catch(() => { });
                continue;
            }

            const players = serverData.players || [];

            // Sort players alphabetically
            players.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            let description = '';
            if (players.length === 0) {
                description = "🔴 *No players are currently online.*";
            } else {
                // Build the player list string
                let playerListStrs = players.map(p => {
                    const lowerName = (p.name || '').toLowerCase();
                    let userId = linkedNamesMap.get(lowerName);
                    
                    if (!userId && p.identifiers && Array.isArray(p.identifiers)) {
                        const discordIdId = p.identifiers.find(id => id.startsWith('discord:'));
                        if (discordIdId) {
                            userId = discordIdId.replace('discord:', '');
                        }
                    }
                    
                    const playerId = p.id !== undefined ? p.id : '?';
                    
                    if (userId) {
                        return `👤 \`[ID: ${playerId}] ${p.name}\` (<@${userId}>)`;
                    }
                    return `👤 \`[ID: ${playerId}] ${p.name}\``;
                });

                let playerListStr = playerListStrs.join('\n');

                if (playerListStr.length > 3800) {
                    const truncatedLength = playerListStr.substring(0, 3800).lastIndexOf('\n');
                    playerListStr = playerListStr.substring(0, truncatedLength) + `\n\n*...and ${players.length - (playerListStr.substring(0, truncatedLength).split('\n').length)} more players (list truncated).*`;
                }

                description = playerListStr;
            }
            
            description += `\n\n🔄 **Next Update:** <t:${Math.floor(Date.now() / 1000) + 30}:R>`;

            const maxClients = serverData.sv_maxclients || 'Unknown';
            const cleanHostname = serverData.hostname ? serverData.hostname.substring(0, 30).replace(/\^([0-9]|\~[a-z])/gi, "") : code;

            const embed = new EmbedBuilder()
                .setColor('#00ff99')
                .setTitle(`🎮 Live Server Players [${players.length} / ${maxClients}]`)
                .setDescription(description)
                .setFooter({ text: `Server: ${cleanHostname} • Auto-updates every 30s` })
                .setTimestamp();
            
            await message.edit({ embeds: [embed], components: [row] }).catch(() => { });
        }

    } catch (e) {
        console.error("CFX List Updater Error:", e);
    }
}

module.exports = {
    updateList,
    init: (client) => {
        // Run every 30 seconds
        setInterval(() => {
            const guildIds = client.guilds.cache.map(g => g.id);
            for (const guildId of guildIds) {
                updateList(client, guildId);
            }
        }, 30 * 1000);
    }
};
