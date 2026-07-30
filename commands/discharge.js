const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require("discord.js");

const fs = require("fs");
const path = require("path");
const { getConfig } = require("../utils/configManager");

/* ================= DATA FILE ================= */
const dataFolder = path.join(__dirname, "..", "data");
const jsonPath = path.join(dataFolder, "BloodGang.json");

/* ================= EMOJI HELPER ================ */
function getEmojis(config) {
  return {
    arrow: `<a:arrowred1:${config.EMOJI_ARROW_ID}>`,
    alert1: `<a:alert1:${config.EMOJI_ALERT_ID}>`,
    redcrownfire: `<a:redcrownfire:${config.EMOJI_REDCROWNFIRE_ID}>`,
    pinkquartz: `<a:pinkquartz:${config.EMOJI_PINKQUARTZ_ID}>`,
    diablo: `<a:diablo:${config.EMOJI_DIABLO_ID}>`,
    flashingskull: `<a:flashingskull:${config.EMOJI_FLASHINGSKULL_ID}>`,
    teammythril: `<a:teammythril:${config.EMOJI_TEAMMYTHRIL_ID}>`,
    worldcollector: `<a:worldcollector:${config.EMOJI_WORLDCOLLECTOR_ID}>`,
    recruitrank: `<a:recruitrank:${config.EMOJI_RECRUITRANK_ID}>`,
    divider2: `<a:divider2:${config.EMOJI_DIVIDER2_ID}>`,
    divider1: `<a:divider1:${config.EMOJI_DIVIDER1_ID}>`,
    bluesiren: `<a:bluesiren:${config.EMOJI_BLUESIREN_ID}>`
  };
}

/* ================= FAREWELL MESSAGES ================= */
const farewellMessages = [
  "📜 **Thanks for your valuable time and best wishes for the future.**",
  "🫡 **Farewell soldier, may success follow you always.**",
  "🤝 **We appreciate your contribution to the HUNTERS.**",
  "🌅 **Every ending is a new beginning — good luck ahead!**",
  "⚜️ **You will always be remembered as part of the team.**"
];

/* ================= JSON HELPERS ================= */
function ensureJSON() {
  if (!fs.existsSync(dataFolder)) fs.mkdirSync(dataFolder);
  if (!fs.existsSync(jsonPath)) {
    fs.writeFileSync(
      jsonPath,
      JSON.stringify({
        recruit: [], firstDivision: [], secondDivision: [], thirdDivision: [],
        highCommand: [], coLeader: [], Mafia: []
      }, null, 2)
    );
  }
}

function loadGang() {
  ensureJSON();
  return JSON.parse(fs.readFileSync(jsonPath, "utf8"));
}

function saveGang(data) {
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
}

function removeFromGang(userId, gang) {
  for (const rank in gang) {
    gang[rank] = gang[rank].filter(id => id !== userId);
  }
}

/* ================= MEMBER CHART EMBED ================= */
function formatGangEmbed(gang, client, config) {
  const emoji = getEmojis(config);
  const format = arr =>
    arr.length ? arr.map(id => `${emoji.arrow} <@${id}>`).join("\n") : "_None_";

  return new EmbedBuilder()
    .setColor("White")
    .setTitle(`${emoji.alert1} THE OFFICIAL MEMBERS OF BLOOD HUNTERS ${emoji.alert1}`)
    .setDescription(`
${emoji.divider1}${emoji.divider1}${emoji.divider1}${emoji.divider1}${emoji.divider1}${emoji.divider1}${emoji.divider1}${emoji.divider1}${emoji.divider1}${emoji.divider1}${emoji.divider1}${emoji.divider1}${emoji.divider1}${emoji.divider1}${emoji.divider1}${emoji.divider1}${emoji.divider1}${emoji.divider1}${emoji.divider1}${emoji.divider1}${emoji.divider1}
${emoji.redcrownfire} **Mafia**
${format(gang.Mafia)}

${emoji.pinkquartz} **Co-Leader**
${format(gang.coLeader)}

${emoji.diablo} **High-Command**
${format(gang.highCommand)}

${emoji.flashingskull} **Third Devision**
${format(gang.thirdDivision)}

${emoji.teammythril} **Second Devision**
${format(gang.secondDivision)}

${emoji.worldcollector} **First Devision**
${format(gang.firstDivision)}

${emoji.recruitrank} **Recruit**
${format(gang.recruit)}

${emoji.divider2}${emoji.divider2}${emoji.divider2}${emoji.divider2}${emoji.divider2}${emoji.divider2}${emoji.divider2}${emoji.divider2}${emoji.divider2}${emoji.divider2}${emoji.divider2}${emoji.divider2}${emoji.divider2}${emoji.divider2}${emoji.divider2}${emoji.divider2}${emoji.divider2}${emoji.divider2}${emoji.divider2}${emoji.divider2}${emoji.divider2}
<@&${config.GANG_ACCESS_ROLE_ID}>   <@&${config.KHOMOTA_ROLE_ID}>
`)
    .setImage("https://cdn.discordapp.com/attachments/1328281349471342593/1466672070573162567/IMG_3279.png")
    .setFooter({
      text: "👑BLOOD HUNTERS Management",
      iconURL: client.user.displayAvatarURL()
    });
}

/* ================= SLASH COMMAND ================= */
module.exports = {
  data: new SlashCommandBuilder()
    .setName("discharge")
    .setDescription("📜 Officially discharge a member")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(o =>
      o.setName("user").setDescription("Member").setRequired(true))
    .addStringOption(o =>
      o.setName("reason").setDescription("Reason").setRequired(true))
    .addStringOption(o =>
      o.setName("message").setDescription("Farewell message (optional)")
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const config = await getConfig(interaction.guild.id);

      const user = interaction.options.getUser("user");
      const reason = interaction.options.getString("reason");
      const customMessage = interaction.options.getString("message");
      const member = await interaction.guild.members.fetch(user.id);

      // Bot Permission Check
      const botMember = await interaction.guild.members.fetchMe();
      if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return interaction.editReply("❌ **Missing Permissions:** The bot does not have 'Manage Roles' permission.");
      }

      /* ===== REMOVE FROM GANG JSON ===== */
      const gang = loadGang();
      removeFromGang(user.id, gang);
      saveGang(gang);

      /* ===== REMOVE ROLES ===== */
      const oldRoles = member.roles.cache
        .filter(r => r.id !== interaction.guild.id)
        .map(r => `<@&${r.id}>`);

      try {
        await member.roles.set([]);
        if (config.DISCHARGED_ROLE_ID && config.DISCHARGED_ROLE_ID.length > 0) {
          await member.roles.add(config.DISCHARGED_ROLE_ID);
        }
      } catch (err) {
        if (err.code === 50013) {
          return interaction.editReply("❌ **Missing Permissions:** The bot cannot modify this member's roles. Please ensure the Bot's role is HIGHER than all HUNTERS roles in Server Settings > Roles.");
        }
        throw err;
      }

      /* ===== PUBLIC EMBED ===== */
      const farewell =
        customMessage ||
        farewellMessages[Math.floor(Math.random() * farewellMessages.length)];

      const publicEmbed = new EmbedBuilder()
        .setColor("Red")
        .setTitle("📜 OFFICIAL DISCHARGE NOTICE")
        .setDescription(`${farewell}`)
        .addFields(
          { name: "👤 Member", value: `${user}` },
          { name: "✍️ Reason", value: reason },
          { name: "🛡️ Discharged By", value: `${interaction.user}` }
        )
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setImage("https://media.discordapp.net/attachments/1328281349471342593/1461291979408412841/standard_4.gif")
        .setFooter({
          text: "👑BLOOD HUNTERS Management",
          iconURL: interaction.client.user.displayAvatarURL()
        });

      if (config.DISCHARGE_CHANNEL_ID) {
        const ch = await interaction.guild.channels.fetch(config.DISCHARGE_CHANNEL_ID).catch(() => null);
        ch && ch.send({ content: `${user}`, embeds: [publicEmbed] });
      }

      /* ===== LOG ===== */
      if (config.LOG_CHANNEL_ID) {
        const logCh = await interaction.guild.channels.fetch(config.LOG_CHANNEL_ID).catch(() => null);
        if (logCh) {
          const logEmbed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle("📘 Discharge Logged")
            .addFields(
              { name: "Member", value: `${user} (${user.id})` },
              { name: "Reason", value: reason },
              { name: "Removed Roles", value: oldRoles.join(", ") || "None" }
            )
            .setTimestamp();
          await logCh.send({ embeds: [logEmbed] });
        }
      }

      /* ===== UPDATE MEMBER CHART ===== */
      if (config.MEMBER_CHART_CHANNEL_ID) {
        const chartCh = await interaction.guild.channels
          .fetch(config.MEMBER_CHART_CHANNEL_ID)
          .catch(() => null);

        if (chartCh) {
          const msgs = await chartCh.messages.fetch({ limit: 10 });
          msgs
            .filter(m => m.author.id === interaction.client.user.id)
            .forEach(m => m.delete().catch(() => { }));

          await chartCh.send({
            embeds: [formatGangEmbed(gang, interaction.client, config)],
            allowedMentions: {
              roles: [config.GANG_ACCESS_ROLE_ID, config.KHOMOTA_ROLE_ID]
            }
          });
        }
      }

      await interaction.editReply(`✅ **${user.tag} discharged successfully**`);
    } catch (err) {
      console.error("❌ Discharge error:", err);
      await interaction.editReply("⚠️ Failed to discharge member.");
    }
  }
};
