async function getTrackedMembers(guild, config) {
    const trackedSet = new Set();
    
    if (config.PLAYTIME_ROLE_ID) {
        try {
            const role = guild.roles.cache.get(config.PLAYTIME_ROLE_ID);
            if (role) {
                for (const [memberId] of role.members) {
                    trackedSet.add(memberId);
                }
            }
        } catch (e) {
            console.error("Error reading playtime role members cache:", e);
        }
    }
    return Array.from(trackedSet);
}

function getPlaytimeLogChannel(guild, config, serverCode) {
    let logChannelId = null;

    const logChannels = config.PLAYTIME_LOG_CHANNELS || [];
    const mapping = logChannels.find(lc => lc.code === serverCode);
    if (mapping) {
        logChannelId = mapping.channelId;
    } else {
        logChannelId = config.PLAYTIME_LOG_CHANNEL_ID || config.LOG_CHANNEL_ID;
    }

    if (!logChannelId) return null;
    return guild.channels.cache.get(logChannelId);
}

module.exports = { getTrackedMembers, getPlaytimeLogChannel };
