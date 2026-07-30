const mongoose = require('mongoose');

const GuildConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    guildName: { type: String },
    
    // 🔗 Channels
    LOG_CHANNEL_ID: { type: String, default: "" },
    WELCOME_CHANNEL_ID: { type: String, default: "" },
    LEAVE_CHANNEL_ID: { type: String, default: "" },
    DM_FAIL_LOG_CHANNEL_ID: { type: String, default: "" },
    SERVER_RULES_CHANNEL_ID: { type: String, default: "" },
    ABOUT_US_CHANNEL_ID: { type: String, default: "" },
    FIXED_LOA_CHANNEL_ID: { type: String, default: "" },
    FIXED_END_LOA_CHANNEL_ID: { type: String, default: "" },
    PROMOTION_CHANNEL_ID: { type: String, default: "" },
    DEMOTION_CHANNEL_ID: { type: String, default: "" },
    MEMBER_CHART_CHANNEL_ID: { type: String, default: "" },
    DISCHARGE_CHANNEL_ID: { type: String, default: "" },
    BAN_CHANNEL_ID: { type: String, default: "" },
    UNBAN_CHANNEL_ID: { type: String, default: "" },
    INVITE_LOG_CHANNEL_ID: { type: String, default: "" },
    GANG_FUND_CHANNEL_ID: { type: String, default: "" },
    KICK_LOG_CHANNEL_ID: { type: String, default: "" },
    MUTE_LOG_CHANNEL_ID: { type: String, default: "" },
    UNMUTE_LOG_CHANNEL_ID: { type: String, default: "" },
    WARN_LOG_CHANNEL_ID: { type: String, default: "" },
    CLEARWARN_LOG_CHANNEL_ID: { type: String, default: "" },
    SITUATION_LOG_CHANNEL_ID: { type: String, default: "" },
    INTERACTION_LOG_CHANNEL_ID: { type: String, default: "" },

    // 🎭 Roles
    AUTO_ROLE_ID: { type: String, default: "" },
    MOD_ROLE_IDS: { type: [String], default: [] },
    ALLOWED_LOA_ROLE: { type: [String], default: [] },
    ALLOWED_APPROVE_ROLES: { type: [String], default: [] },
    ALLOWED_GANGFUND_ROLE: { type: [String], default: [] },
    ALLOWED_INTERACTION_ROLE: { type: [String], default: [] },
    ALLOWED_END_LOA_ROLE: { type: [String], default: [] },
    DISCHARGED_ROLE_ID: { type: [String], default: [] },
    GANG_ACCESS_ROLE_ID: { type: String, default: "" },
    KHOMOTA_ROLE_ID: { type: String, default: "" },

    // 🔱 Rank Roles
    RANK_RECRUIT_ROLE_ID: { type: String, default: "" },
    RANK_FIRST_DIVISION_ROLE_ID: { type: String, default: "" },
    RANK_SECOND_DIVISION_ROLE_ID: { type: String, default: "" },
    RANK_THIRD_DIVISION_ROLE_ID: { type: String, default: "" },
    RANK_HIGH_COMMAND_ROLE_ID: { type: String, default: "" },
    RANK_CO_LEADER_ROLE_ID: { type: String, default: "" },
    RANK_MAFIA_ROLE_ID: { type: String, default: "" },

    // ✨ Emojis
    EMOJI_ARROW_ID: { type: String, default: "" },
    EMOJI_ALERT_ID: { type: String, default: "" },
    EMOJI_REDCROWNFIRE_ID: { type: String, default: "" },
    EMOJI_PINKQUARTZ_ID: { type: String, default: "" },
    EMOJI_DIABLO_ID: { type: String, default: "" },
    EMOJI_FLASHINGSKULL_ID: { type: String, default: "" },
    EMOJI_TEAMMYTHRIL_ID: { type: String, default: "" },
    EMOJI_WORLDCOLLECTOR_ID: { type: String, default: "" },
    EMOJI_RECRUITRANK_ID: { type: String, default: "" },
    EMOJI_DIVIDER2_ID: { type: String, default: "" },
    EMOJI_DIVIDER1_ID: { type: String, default: "" },
    EMOJI_BLUESIREN_ID: { type: String, default: "" },
    EMOJI_RANKUP_ID: { type: String, default: "" },
    EMOJI_RANKDOWN_ID: { type: String, default: "" },
    EMOJI_RAINBOW_ID: { type: String, default: "" }
}, { timestamps: true });

module.exports = mongoose.model('GuildConfig', GuildConfigSchema);
