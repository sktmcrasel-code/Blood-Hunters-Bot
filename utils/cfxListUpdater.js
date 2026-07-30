const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('./db');
const cfxDb = require('./cfxDb');

async function updateList(client, guildId) {
    try {
        const config = await db.findOne({ guildId });
        if (!config || !config.CFX_PLAYER_LIST_CHANNEL_ID || !config.CFX_PLAYER_LIST_MESSAGE_ID || !config.CFX_CODE) return;

        const guild = client.guilds.cache.get(guildId);
        if (!guild) return;

        const channel = guild.channels.cache.get(config.CFX_PLAYER_LIST_CHANNEL_ID);
        if (!channel) return;

        const message = await channel.messages.fetch(config.CFX_PLAYER_LIST_MESSAGE_ID).catch(() => null);
        if (!message) return;

        // Fetch CFX Data
        let serverData = null;
        try {
            const response = await fetch(`https://frontend.cfx-services.net/api/servers/single/${config.CFX_CODE}`);
            if (response.ok) {
                const data = await response.json();
                if (data && data.Data) {
                    serverData = data.Data;
                }
            }
        } catch (err) {
            // Likely a JSON parse error because the API returned "not found"
            serverData = null;
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('refresh_cfx_list')
                .setLabel('🔄 Refresh List')
                .setStyle(ButtonStyle.Primary)
        );

        if (!serverData) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle(`🎮 Live Server Players`)
                .setDescription(`❌ **Server Not Found.**\nThe CFX code \`${config.CFX_CODE}\` might be expired or the server is offline.\n\nPlease use \`/setcfx\` to update the server code!\n\n🔄 **Next Update:** <t:${Math.floor(Date.now() / 1000) + 300}:R>`)
                .setFooter({ text: `Auto-updates every 5 mins` })
                .setTimestamp();

            await message.edit({ embeds: [errorEmbed], components: [row] }).catch(() => { });
            return;
        }

        const players = serverData.players || [];

        // Sort players alphabetically
        players.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        // Fetch linked users to show Discord tags
        const linkedUsers = await cfxDb.find({ guildId });
        const linkedNamesMap = new Map();
        for (const u of linkedUsers) {
            if (u.inGameName) linkedNamesMap.set(u.inGameName.toLowerCase(), u.userId);
        }

        let description = '';
        if (players.length === 0) {
            description = "🔴 *No players are currently online.*";
        } else {
            // Build the player list string
            let playerListStrs = players.map(p => {
                const lowerName = (p.name || '').toLowerCase();
                const userId = linkedNamesMap.get(lowerName);
                const playerId = p.id !== undefined ? p.id : '?';
                
                if (userId) {
                    return `👤 \`[ID: ${playerId}] ${p.name}\` (<@${userId}>)`;
                }
                return `👤 \`[ID: ${playerId}] ${p.name}\``;
            });

            let playerListStr = playerListStrs.join('\n');

            // Discord embeds have a 4096 character limit for descriptions.
            // If the list is too long, we need to truncate it.
            if (playerListStr.length > 3800) {
                const truncatedLength = playerListStr.substring(0, 3800).lastIndexOf('\n');
                playerListStr = playerListStr.substring(0, truncatedLength) + `\n\n*...and ${players.length - (playerListStr.substring(0, truncatedLength).split('\n').length)} more players (list truncated).*`;
            }

            description = playerListStr + `\n\n🔄 **Next Update:** <t:${Math.floor(Date.now() / 1000) + 300}:R>`;
        }

        const maxClients = serverData.sv_maxclients || 'Unknown';

        const embed = new EmbedBuilder()
            .setColor('#00ff99')
            .setTitle(`🎮 Live Server Players [${players.length} / ${maxClients}]`)
            .setDescription(description)
            .setFooter({ text: `Server: ${serverData.hostname ? serverData.hostname.substring(0, 30).replace(/\^([0-9]|\~[a-z])+/gi, "") : config.CFX_CODE} • Auto-updates every 5 mins` })
            .setTimestamp();

        await message.edit({ embeds: [embed], components: [row] }).catch(() => { });

    } catch (e) {
        console.error("CFX List Updater Error:", e);
    }
}

module.exports = {
    updateList,
    init: (client) => {
        // Run every 5 minutes
        setInterval(() => {
            const guildIds = client.guilds.cache.map(g => g.id);
            for (const guildId of guildIds) {
                updateList(client, guildId);
            }
        }, 5 * 60 * 1000);
    }
};
