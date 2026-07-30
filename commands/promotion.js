const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const { getConfig } = require("../utils/configManager");

/* ================= FILE PATH ================= */
const dataFolder = path.join(__dirname, "..", "data");
const jsonPath = path.join(dataFolder, "BloodGang.json");

/* ================= EMOJI HELPER ================= */
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
    bluesiren: `<a:bluesiren:${config.EMOJI_BLUESIREN_ID}>`,
    rankup: `<a:rankup:${config.EMOJI_RANKUP_ID}>`,
    rankdown: `<a:rankdown:${config.EMOJI_RANKDOWN_ID}>`,
    Rainbow: `<a:divider1:${config.EMOJI_RAINBOW_ID}>`
  };
}

/* ================= JSON FUNCTIONS ================= */
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

function removeFromPreviousRank(userId, gang) {
  for (const r in gang) {
    gang[r] = gang[r].filter(id => id !== userId);
  }
}

function getTotalMembers(gang) {
  return Object.values(gang).reduce((total, arr) => total + arr.length, 0);
}

/* ================= MEMBER CHART ================= */
function formatGangEmbed(gang, client, config) {
  const emoji = getEmojis(config);
  const totalMembers = getTotalMembers(gang);
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

${emoji.bluesiren} **Total Members:** **${totalMembers}**
${emoji.divider2}${emoji.divider2}${emoji.divider2}${emoji.divider2}${emoji.divider2}${emoji.divider2}${emoji.divider2}${emoji.divider2}${emoji.divider2}${emoji.divider2}${emoji.divider2}${emoji.divider2}${emoji.divider2}${emoji.divider2}${emoji.divider2}${emoji.divider2}${emoji.divider2}${emoji.divider2}${emoji.divider2}${emoji.divider2}${emoji.divider2}
<@&${config.GANG_ACCESS_ROLE_ID}>   <@&${config.KHOMOTA_ROLE_ID}>
`)
    .setImage("https://cdn.discordapp.com/attachments/1328281349471342593/1466672070573162567/IMG_3279.png")
    .setFooter({ text: "BLOOD HUNTERS Management", iconURL: client.user.displayAvatarURL() });
}

/* ================= SLASH COMMAND ================= */
module.exports = {
  data: new SlashCommandBuilder()
    .setName("gangmembar")
    .setDescription("BLOOD HUNTERS member system")
    .addStringOption(o =>
      o.setName("action")
        .setDescription("Action")
        .setRequired(true)
        .addChoices(
          { name: "Add Member", value: "add" },
          { name: "Remove Member", value: "remove" },
          { name: "Promotion", value: "promotion" },
          { name: "Demotion", value: "demotion" },
          { name: "Reset Member Chart", value: "reset" }
        )
    )
    .addUserOption(o => o.setName("user").setDescription("Member").setRequired(true))
    .addRoleOption(o => o.setName("newrole").setDescription("Rank")),

  async execute(interaction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const config = await getConfig(interaction.guild.id);
      const emoji = getEmojis(config);

      const promotionMessages = [
        `${emoji.alert1} Congratulations on your well-deserved promotion!`,
        `${emoji.diablo} The BLOOD HUNTERS grows stronger with your promotion.`,
        `${emoji.redcrownfire} Another warrior rises higher on the battlefield.`
      ];

      const demotionMessages = [
        `${emoji.alert1} Due to internal decision, rank has been adjusted.`,
        `${emoji.flashingskull} Discipline is the path to strength.`
      ];

      const roleToRankMap = {
        [config.RANK_RECRUIT_ROLE_ID]: "recruit",
        [config.RANK_FIRST_DIVISION_ROLE_ID]: "firstDivision",
        [config.RANK_SECOND_DIVISION_ROLE_ID]: "secondDivision",
        [config.RANK_THIRD_DIVISION_ROLE_ID]: "thirdDivision",
        [config.RANK_HIGH_COMMAND_ROLE_ID]: "highCommand",
        [config.RANK_CO_LEADER_ROLE_ID]: "coLeader",
        [config.RANK_MAFIA_ROLE_ID]: "Mafia"
      };

      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles))
        return interaction.editReply("❌ You don't have permission to manage roles.");

      const user = interaction.options.getUser("user");
      const action = interaction.options.getString("action");
      const newRole = interaction.options.getRole("newrole");
      const member = await interaction.guild.members.fetch(user.id);

      // Permission Check for the Bot
      const botMember = await interaction.guild.members.fetchMe();
      if (newRole && newRole.position >= botMember.roles.highest.position) {
        return interaction.editReply("❌ **Missing Permissions:** The bot's role must be HIGHER than the role you are trying to give. Please drag the Bot's role to the TOP in Server Settings > Roles.");
      }

      const gang = loadGang();
      let reply = "";

      if (action !== "reset" && !newRole) return interaction.editReply("❌ Select a rank.");
      const rankKey = action !== "reset" ? roleToRankMap[newRole.id] : null;

      if (action !== "reset" && !rankKey) return interaction.editReply("❌ Rank not mapped.");

      if (action === "add") {
        if (!gang[rankKey].includes(user.id)) gang[rankKey].push(user.id);
        await member.roles.add(newRole);
        reply = "✅ Member added.";
      }

      if (action === "remove") {
        gang[rankKey] = gang[rankKey].filter(id => id !== user.id);
        await member.roles.remove(newRole);
        reply = "❌ Member removed.";
      }

      if (action === "promotion") {
        removeFromPreviousRank(user.id, gang);

        // Clean up old roles
        const rolesToRemove = Object.keys(roleToRankMap).filter(id => member.roles.cache.has(id));
        for (const rId of rolesToRemove) {
          try { await member.roles.remove(rId); } catch { }
        }

        gang[rankKey].push(user.id);
        await member.roles.add(newRole);

        const finalMessage = promotionMessages[Math.floor(Math.random() * promotionMessages.length)];
        const promoEmbed = new EmbedBuilder()
          .setColor("Green")
          .setTitle("🏅 Promotion Announcement")
          .setDescription(
            `${emoji.redcrownfire} **${user}** has been promoted!\n\n` +
            `${emoji.rankup} **New Rank:** ${newRole}\n\n` +
            `${finalMessage}`
          )
          .setThumbnail(user.displayAvatarURL({ dynamic: true }))
          .setImage("https://media.discordapp.net/attachments/1328281349471342593/1461291979408412841/standard_4.gif")
          .setFooter({ text: "BLOOD HUNTERS Management", iconURL: interaction.client.user.displayAvatarURL() });

        if (config.PROMOTION_CHANNEL_ID) {
          const promoCh = await interaction.guild.channels.fetch(config.PROMOTION_CHANNEL_ID).catch(() => null);
          if (promoCh) await promoCh.send({ content: `${user}`, embeds: [promoEmbed] });
        }
        reply = "🏅 Promotion successful.";
      }

      if (action === "demotion") {
        removeFromPreviousRank(user.id, gang);

        // Clean up old roles
        const rolesToRemove = Object.keys(roleToRankMap).filter(id => member.roles.cache.has(id));
        for (const rId of rolesToRemove) {
          try { await member.roles.remove(rId); } catch { }
        }

        gang[rankKey].push(user.id);
        await member.roles.add(newRole);

        const finalMessage = demotionMessages[Math.floor(Math.random() * demotionMessages.length)];
        const demoteEmbed = new EmbedBuilder()
          .setColor("Red")
          .setTitle("⚠️ Demotion Notice")
          .setDescription(
            `${emoji.redcrownfire} **${user}** has been demoted.\n\n` +
            `${emoji.rankdown} **New Rank:** ${newRole}\n\n` +
            `${finalMessage}`
          )
          .setThumbnail(user.displayAvatarURL({ dynamic: true }))
          .setImage("https://media.discordapp.net/attachments/1328281349471342593/1461291979408412841/standard_4.gif")
          .setFooter({ text: "BLOOD HUNTERS Management", iconURL: interaction.client.user.displayAvatarURL() });

        if (config.DEMOTION_CHANNEL_ID) {
          const promoCh = await interaction.guild.channels.fetch(config.DEMOTION_CHANNEL_ID).catch(() => null);
          if (promoCh) await promoCh.send({ content: `${user}`, embeds: [demoteEmbed] });
        }
        reply = "⚠️ Demotion successful.";
      }

      if (action === "reset") {
        const emptyGang = {
          recruit: [], firstDivision: [], secondDivision: [], thirdDivision: [],
          highCommand: [], coLeader: [], Mafia: []
        };
        saveGang(emptyGang);

        if (config.MEMBER_CHART_CHANNEL_ID) {
          const chartCh = await interaction.guild.channels.fetch(config.MEMBER_CHART_CHANNEL_ID).catch(() => null);
          if (chartCh) {
            const msgs = await chartCh.messages.fetch({ limit: 10 });
            msgs.filter(m => m.author.id === interaction.client.user.id).forEach(m => m.delete().catch(() => { }));
            await chartCh.send({
              embeds: [formatGangEmbed(emptyGang, interaction.client, config)],
              allowedMentions: { roles: [config.GANG_ACCESS_ROLE_ID, config.KHOMOTA_ROLE_ID] }
            });
          }
        }
        return interaction.editReply("✅ Member chart has been reset successfully.");
      }

      saveGang(gang);

      if (config.MEMBER_CHART_CHANNEL_ID) {
        const chartCh = await interaction.guild.channels.fetch(config.MEMBER_CHART_CHANNEL_ID).catch(() => null);
        if (chartCh) {
          const msgs = await chartCh.messages.fetch({ limit: 10 });
          msgs.filter(m => m.author.id === interaction.client.user.id).forEach(m => m.delete().catch(() => { }));
          await chartCh.send({
            embeds: [formatGangEmbed(gang, interaction.client, config)],
            allowedMentions: { roles: [config.GANG_ACCESS_ROLE_ID, config.KHOMOTA_ROLE_ID] }
          });
        }
      }

      interaction.editReply(reply);

    } catch (e) {
      console.error(e);
      if (e.code === 50013) {
        interaction.editReply("❌ **Missing Permissions:** The bot cannot manage this role because it is HIGHER than the bot's own role. Please go to **Server Settings > Roles** and drag the bot's role above all Mafia ranks.");
      } else {
        interaction.editReply("❌ Error occurred during role management.");
      }
    }
  }
};
