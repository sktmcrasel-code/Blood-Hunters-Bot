const db = require('./db');

/**
 * Get configuration for a guild. 
 * If not found, creates an EMPTY config (all IDs blank) so owners can set them up via web.
 */
async function getConfig(guildId) {
    try {
        let config = await db.findOne({ guildId });
        
        if (!config) {
            // Create a COMPLETELY BLANK default config for new servers
            config = {
                guildId,
                // Channels
                LOG_CHANNEL_ID: "",
                WELCOME_CHANNEL_ID: "",
                LEAVE_CHANNEL_ID: "",
                DM_FAIL_LOG_CHANNEL_ID: "",
                SERVER_RULES_CHANNEL_ID: "",
                ABOUT_US_CHANNEL_ID: "",
                FIXED_LOA_CHANNEL_ID: "",
                FIXED_END_LOA_CHANNEL_ID: "",
                PROMOTION_CHANNEL_ID: "",
                DEMOTION_CHANNEL_ID: "",
                MEMBER_CHART_CHANNEL_ID: "",
                DISCHARGE_CHANNEL_ID: "",
                BAN_CHANNEL_ID: "",
                UNBAN_CHANNEL_ID: "",
                INVITE_LOG_CHANNEL_ID: "",
                GANG_FUND_CHANNEL_ID: "",
                KICK_LOG_CHANNEL_ID: "",
                MUTE_LOG_CHANNEL_ID: "",
                UNMUTE_LOG_CHANNEL_ID: "",
                WARN_LOG_CHANNEL_ID: "",
                CLEARWARN_LOG_CHANNEL_ID: "",
                SITUATION_LOG_CHANNEL_ID: "",
                INTERACTION_LOG_CHANNEL_ID: "",
                PLAYTIME_LIST_CHANNEL_ID: "",
                PLAYTIME_LIST_MESSAGE_ID: "",
                PLAYTIME_ANNOUNCE_CHANNEL_ID: "",
                PLAYTIME_TRACKED_MEMBERS: [],
                CFX_PLAYER_LIST_CHANNEL_ID: "",
                CFX_PLAYER_LIST_MESSAGE_ID: "",

                // Messages & Animations
                WELCOME_MESSAGE: "",
                WELCOME_GIF: "",
                LEAVE_MESSAGE: "",
                LEAVE_GIF: "",

                // Roles
                AUTO_ROLE_ID: "",
                MOD_ROLE_IDS: [],
                ALLOWED_LOA_ROLE: [],
                ALLOWED_APPROVE_ROLES: [],
                ALLOWED_GANGFUND_ROLE: [],
                ALLOWED_INTERACTION_ROLE: [],
                ALLOWED_END_LOA_ROLE: [],
                DISCHARGED_ROLE_ID: [],
                GANG_ACCESS_ROLE_ID: "",
                KHOMOTA_ROLE_ID: "",

                // Ranks
                RANK_RECRUIT_ROLE_ID: "",
                RANK_FIRST_DIVISION_ROLE_ID: "",
                RANK_SECOND_DIVISION_ROLE_ID: "",
                RANK_THIRD_DIVISION_ROLE_ID: "",
                RANK_HIGH_COMMAND_ROLE_ID: "",
                RANK_CO_LEADER_ROLE_ID: "",
                RANK_MAFIA_ROLE_ID: "",

                // Emojis
                EMOJI_ARROW_ID: "",
                EMOJI_ALERT_ID: "",
                EMOJI_REDCROWNFIRE_ID: "",
                EMOJI_PINKQUARTZ_ID: "",
                EMOJI_DIABLO_ID: "",
                EMOJI_FLASHINGSKULL_ID: "",
                EMOJI_TEAMMYTHRIL_ID: "",
                EMOJI_WORLDCOLLECTOR_ID: "",
                EMOJI_RECRUITRANK_ID: "",
                EMOJI_DIVIDER2_ID: "",
                EMOJI_DIVIDER1_ID: "",
                EMOJI_BLUESIREN_ID: "",
                EMOJI_RANKUP_ID: "",
                EMOJI_RANKDOWN_ID: "",
                EMOJI_RAINBOW_ID: ""
            };
            await db.insert(config);
            console.log(`📡 Created new completely blank config for guild: ${guildId}`);
        }
        return config;
    } catch (error) {
        console.error(`❌ Error fetching config for guild ${guildId}:`, error);
        return { guildId };
    }
}

module.exports = { getConfig };
