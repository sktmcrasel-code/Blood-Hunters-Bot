// ===========================
// BOT STARTUP
// ===========================
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Global Crash Prevention
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});
process.on('uncaughtException', error => {
    console.error('Uncaught exception:', error);
});
const {
    Client,
    GatewayIntentBits,
    Partials,
    Collection,
    REST,
    Routes,
    EmbedBuilder
} = require("discord.js");
const cron = require("node-cron");
const { getConfig } = require("./utils/configManager");

console.log("📂 Using Local Database (NeDB)");

// ===========================
// CLIENT SETUP
// ===========================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.MessageContent
    ],
    partials: [
        Partials.User,
        Partials.GuildMember,
        Partials.Message,
        Partials.Channel,
        Partials.Reaction
    ]
});

client.commands = new Collection();
client.invites = new Collection();

// ===========================
// LOAD COMMANDS
// ===========================
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if (command.data && command.execute) {
        client.commands.set(command.data.name, command);
    } else {
        console.log(`⚠️ Invalid command file: ${file}`);
    }
}

// ===========================
// ===========================
// REST CLIENT SETUP
// ===========================
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

// ===========================
// INTERACTION HANDLER
// ===========================
client.on("interactionCreate", async interaction => {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction, client);
        } catch (err) {
            console.error(err);
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ content: "❌ Error executing command." }).catch(() => null);
                } else {
                    await interaction.reply({ content: "❌ Error executing command.", ephemeral: true }).catch(() => null);
                }
            } catch (replyError) {
                console.error("Failed to send error reply to interaction:", replyError);
            }
        }
    }

    if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            if (command.autocomplete) {
                await command.autocomplete(interaction, client);
            }
        } catch (err) {
            console.error(`❌ Autocomplete error for ${interaction.commandName}:`, err);
        }
    }

    if (interaction.isButton()) {
        const handler = require("./events/interactionCreate");
        handler(interaction, client);
    }
});

// CONFIG will now be fetched per-guild in events
const { welcomeMessages, leaveMessages } = require("./messages");

// ===========================
// UTIL FUNCTIONS
// ===========================
function formatMessage(template, member, config, inviterText = "Unknown") {
    if (!template) return "";
    return template
        .replaceAll("{id}", member.id)
        .replaceAll("{user}", `<@${member.id}>`)
        .replaceAll("{tag}", member.user.tag)
        .replaceAll("{guild}", member.guild.name)
        .replaceAll("{inviter}", inviterText)
        .replaceAll("{rules}", `<#${config.SERVER_RULES_CHANNEL_ID}>`)
        .replaceAll("{about}", `<#${config.ABOUT_US_CHANNEL_ID}>`);
}

function buildEmbed(title, desc, color, member) {
    return new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(desc)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({
            text: "BLOOD HUNTERS Family",
            iconURL: client.user.displayAvatarURL()
        })
        .setTimestamp();
}

// ===========================
// GUILD JOIN EVENT
// ===========================
client.on("guildCreate", async guild => {
    console.log(`📡 Joined new guild: ${guild.name} (${guild.id})`);
    // Automatically initialize config in DB
    await getConfig(guild.id);
});

// ===========================
// MEMBER JOIN WITH ANIMATED GIF & INVITE TRACKER
// ===========================
client.on("inviteCreate", async invite => {
    try {
        const guildInvites = client.invites.get(invite.guild.id);
        if (guildInvites) {
            guildInvites.set(invite.code, invite.uses);
        }
    } catch (e) { }
});

client.on("inviteDelete", async invite => {
    try {
        const guildInvites = client.invites.get(invite.guild.id);
        if (guildInvites) {
            guildInvites.delete(invite.code);
        }
    } catch (e) { }
});

client.on("guildMemberAdd", async member => {
    const config = await getConfig(member.guild.id);
    if (!config) return;

    try {
        // Auto role
        if (config.AUTO_ROLE_ID) {
            const role = await member.guild.roles.fetch(config.AUTO_ROLE_ID);
            if (role) await member.roles.add(role);
            console.log(`🎭 Added role to ${member.user.tag}`);
        }
    } catch (e) {
        console.error("❌ Role add error:", e);
    }

    // Invite tracking logic
    let inviterText = "Unknown";
    try {
        const cachedInvites = client.invites.get(member.guild.id) || new Collection();
        const newInvites = await member.guild.invites.fetch().catch(() => new Collection());
        
        const usedInvite = newInvites.find(inv => {
            const cached = cachedInvites.get(inv.code);
            return cached !== undefined && inv.uses > cached;
        });

        if (usedInvite && usedInvite.inviter) {
            inviterText = `<@${usedInvite.inviter.id}>`;
            // update cache for next joins
            client.invites.set(member.guild.id, new Collection(newInvites.map(i => [i.code, i.uses])));
        } else if (member.guild.vanityURLCode) {
            inviterText = "Vanity URL";
        }
        
        if (config.INVITE_LOG_CHANNEL_ID) {
            const logCh = member.guild.channels.cache.get(config.INVITE_LOG_CHANNEL_ID);
            if (logCh) {
                const invEmbed = buildEmbed(`📥 Invite Tracker`, `**User:** ${member.user.tag} (<@${member.id}>)\n**Invited By:** ${inviterText}`, "#00ff99", member);
                logCh.send({ embeds: [invEmbed] }).catch(() => {});
            }
        }
    } catch (e) {
        console.error("Invite tracking error:", e);
    }

    // Message selection (Custom or Random)
    const template = config.WELCOME_MESSAGE || welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
    const msg = formatMessage(template, member, config, inviterText);

    // Build embed
    const embed = new EmbedBuilder()
        .setColor("#00ff99")
        .setTitle(`👑 Welcome to ${member.guild.name} 👑`)
        .setDescription(msg)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `${member.guild.name} Family`, iconURL: client.user.displayAvatarURL() })
        .setTimestamp()
        .setImage(config.WELCOME_GIF || "https://cdn.discordapp.com/attachments/1328281349471342593/1461291979408412841/standard_4.gif");

    // Send to Welcome Channel
    if (config.WELCOME_CHANNEL_ID) {
        const ch = member.guild.channels.cache.get(config.WELCOME_CHANNEL_ID);
        if (ch) {
            ch.send({ embeds: [embed] })
                .then(() => console.log(`📩 Welcome embed sent in #${ch.name}`))
                .catch(console.error);
        }
    }

    // Optional DM
    try {
        await member.send({ embeds: [embed] });
        console.log(`📩 Sent welcome DM to ${member.user.tag}`);
    } catch (err) {
        console.error(`⚠️ Could not send DM: ${err.message}`);
    }
});

// ===========================
// MEMBER UPDATE (ROLE CHANGE DETECTION FOR PLAYTIME)
// ===========================
client.on("guildMemberUpdate", async (oldMember, newMember) => {
    try {
        const db = require("./utils/db");
        const { updateList } = require("./utils/playtimeListUpdater");
        
        const config = await db.findOne({ guildId: newMember.guild.id });
        if (!config || !config.PLAYTIME_ROLE_ID) return;
        
        const roleId = config.PLAYTIME_ROLE_ID;
        const hadRole = oldMember.roles.cache.has(roleId);
        const hasRole = newMember.roles.cache.has(roleId);
        
        if (hadRole !== hasRole) {
            console.log(`🔔 Role changed for ${newMember.user.tag}. Re-evaluating playtime list...`);
            updateList(newMember.client, newMember.guild.id).catch(() => {});
        }
    } catch (err) {
        console.error("Error in guildMemberUpdate listener:", err);
    }
});

// ===========================
// MEMBER LEAVE
// ===========================
client.on("guildMemberRemove", async member => {
    const config = await getConfig(member.guild.id);
    if (!config) return;

    // Message selection (Custom or Random)
    const template = config.LEAVE_MESSAGE || leaveMessages[Math.floor(Math.random() * leaveMessages.length)];
    const msg = formatMessage(template, member, config);

    const embed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle(`👋 Goodbye from ${member.guild.name}`)
        .setDescription(msg)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setImage(config.LEAVE_GIF || "https://cdn.discordapp.com/attachments/1328281349471342593/1461291979408412841/standard_4.gif")
        .setFooter({
            text: `${member.guild.name} Family`,
            iconURL: member.guild.iconURL({ dynamic: true })
        })
        .setTimestamp();

    // 🔴 Try DM
    try {
        await member.send({ embeds: [embed] });
    } catch (err) {
        if (config.DM_FAIL_LOG_CHANNEL_ID) {
            const log = member.guild.channels.cache.get(config.DM_FAIL_LOG_CHANNEL_ID);
            if (log) {
                log.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("DarkRed")
                            .setTitle("⚠️ DM Failed")
                            .setDescription(`DM failed to **${member.user.tag}**`)
                            .addFields({ name: "Reason", value: err.message || "DM Closed" })
                            .setTimestamp()
                    ]
                });
            }
        }
    }

    // 🔴 Send to Leave Channel
    if (config.LEAVE_CHANNEL_ID) {
        const ch = member.guild.channels.cache.get(config.LEAVE_CHANNEL_ID);
        if (ch) ch.send({ embeds: [embed] });
    }
});


// ===========================
// READY EVENT
// ===========================
client.once("ready", async () => {
    console.log(`🤖 Logged in as ${client.user.tag}`);
    client.user.setActivity("BLOOD HUNTERS", { type: 0 });

    // Register slash commands automatically using bot client ID
    try {
        console.log("⏳ Registering slash commands...");
        const commands = client.commands.map(cmd => cmd.data.toJSON());
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        console.log("✅ Slash commands registered successfully!");
    } catch (err) {
        console.error("❌ Slash register error:", err);
    }

    // Cache all guild members for quick role tracking lookup
    for (const guild of client.guilds.cache.values()) {
        try {
            await guild.members.fetch();
            console.log(`👥 Cached all members for guild: ${guild.name}`);
        } catch (e) {
            console.warn(`⚠️ Could not cache members for guild ${guild.name}:`, e.message);
        }
    }

    // Cache initial invites
    for (const guild of client.guilds.cache.values()) {
        try {
            const firstInvites = await guild.invites.fetch();
            client.invites.set(guild.id, new Collection(firstInvites.map(inv => [inv.code, inv.uses])));
        } catch (e) {
            // Ignore missing permissions for invites
        }
    }

    // 🔥 AUTO FRIDAY GANG FUND
    const { startNewWeek } = require("./commands/gangfund");

    // Every Friday 12 PM BD (06:00 UTC)
    cron.schedule("0 6 * * 5", async () => {
        try {
            console.log("📊 GangFund auto week process...");
            await startNewWeek(client);
            console.log("✅ GangFund updated");
        } catch (err) {
            console.error("❌ GangFund cron error:", err);
        }
    });

    // Auto systems
    require("./banChecker").banChecker(client);
    require("./loaChecker").loaChecker(client);
    require("./logger")(client);
    require("./utils/playtimeTracker").init(client);
    require("./utils/playtimeListUpdater").init(client);
    require("./utils/cfxListUpdater").init(client);
    require("./utils/playtimeAnnouncer").init(client);

    // Dashboard
    try {
        require("./dashboard/server")(client);
        console.log("-----------------------------------------");
        console.log("🚀 BOT & DASHBOARD ARE READY!");
        console.log("🤖 Bot: " + client.user.tag);
        console.log("🌐 Dashboard: http://localhost:" + (process.env.PORT || process.env.DASHBOARD_PORT || 3000));
        console.log("-----------------------------------------");
    } catch (err) {
        console.error("❌ Dashboard start error:", err);
    }
});

// ===========================
// LOGIN
// ===========================
client.login(process.env.TOKEN);
