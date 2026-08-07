const { EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const { getConfig } = require("../utils/configManager");

const LOA_FILE = path.join(__dirname, "../data/loas.json");
if (!fs.existsSync(LOA_FILE)) fs.writeFileSync(LOA_FILE, JSON.stringify({}));

module.exports = async (interaction, client) => {
  try {
    // =========================================================
    // SLASH COMMAND HANDLER (Fallback)
    // =========================================================
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction, client);
      } catch (err) {
        console.error(`❌ Error running command ${interaction.commandName}:`, err);
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({ content: "⚠️ Command execution failed." }).catch(() => {});
        } else {
          await interaction.reply({ content: "⚠️ Command failed.", ephemeral: true }).catch(() => {});
        }
      }
      return;
    }

    // =========================================================
    // AUTOCOMPLETE HANDLER
    // =========================================================
    if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        if (command.autocomplete) {
          await command.autocomplete(interaction, client);
        }
      } catch (err) {
        console.error(`❌ Error running autocomplete for ${interaction.commandName}:`, err);
      }
      return;
    }

    // =========================================================
    // BUTTON HANDLER (LOA APPROVE / REJECT)
    // =========================================================
    if (!interaction.isButton()) return;

    // =========================================================
    // CFX PLAYER LIST REFRESH HANDLER
    // =========================================================
    if (interaction.customId === 'refresh_cfx_list') {
        try {
            await interaction.deferReply({ ephemeral: true });
            const updater = require('../utils/cfxListUpdater');
            await updater.updateList(client, interaction.guild.id);
            await interaction.editReply({ content: '✅ Player list refreshed!' });
        } catch (e) {
            console.error("Refresh CFX List Error:", e);
            if (interaction.deferred) {
                await interaction.editReply({ content: '❌ Error refreshing list.' });
            } else {
                await interaction.reply({ content: '❌ Error refreshing list.', ephemeral: true });
            }
        }
        return;
    }

    // =========================================================
    // PLAYTIME LIST REFRESH HANDLER
    // =========================================================
    if (interaction.customId === 'refresh_playtime_list') {
        try {
            await interaction.deferReply({ ephemeral: true });
            const updater = require('../utils/playtimeListUpdater');
            await updater.updateList(client, interaction.guild.id);
            await interaction.editReply({ content: '✅ Playtime list refreshed!' });
        } catch (e) {
            console.error("Refresh Playtime List Error:", e);
            if (interaction.deferred) {
                await interaction.editReply({ content: '❌ Error refreshing list.' });
            } else {
                await interaction.reply({ content: '❌ Error refreshing list.', ephemeral: true });
            }
        }
        return;
    }

    const config = await getConfig(interaction.guild.id);
    const [prefix, action, userId] = interaction.customId.split("_");
    if (prefix !== "loa" || !["approve", "cancel"].includes(action)) return;

    // 🔒 Permission Check (Web Config)
    const allowedRoles = config.ALLOWED_APPROVE_ROLES || [];
    const khomotaRole = config.KHOMOTA_ROLE_ID;

    const isAllowed = interaction.member.roles.cache.some(r =>
      allowedRoles.includes(r.id) || r.id === khomotaRole
    );

    if (!isAllowed) {
      return interaction.reply({
        content: "⛔ You don’t have permission to approve/reject LOA requests.",
        ephemeral: true,
      });
    }

    const member = await interaction.guild.members.fetch(userId).catch(() => null);
    if (!member) {
      return interaction.reply({ content: "❌ Member not found.", ephemeral: true });
    }

    // Load LOA DB
    let loas = {};
    if (fs.existsSync(LOA_FILE)) {
      loas = JSON.parse(fs.readFileSync(LOA_FILE, "utf8"));
    }

    // ❌ Delete button message
    await interaction.message.delete().catch(() => { });

    // =========================================================
    // APPROVE HANDLER
    // =========================================================
    if (action === "approve") {
      if (loas[userId]) {
        loas[userId].status = "approved";
        loas[userId].approver = interaction.user.id;
        fs.writeFileSync(LOA_FILE, JSON.stringify(loas, null, 2));
      }

      const userLoa = loas[userId] || {};

      const approveEmbed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("✅ **LOA APPROVED**")
        .setDescription(
          `🎉 **Your Leave of Absence (LOA) request has been approved!**\n` +
          `Enjoy your break and return stronger.\n\n` +
          `👤 **Member:** ${member}\n` +
          `🛡️ **Approved By:** ${interaction.user}`
        )
        .addFields(
          { name: "📝 **Reason Provided**", value: userLoa.reason || "N/A", inline: false },
          { name: "⏳ **Requested Duration**", value: userLoa.duration || "N/A", inline: true },
          { name: "📅 **End Time (BD)**", value: userLoa.endTime || "N/A", inline: true }
        )
        .setImage("https://media.discordapp.net/attachments/1328281349471342593/1461291979408412841/standard_4.gif")
        .setFooter({
          text: "⚔️ BLOOD HUNTERS •",
          iconURL: client.user.displayAvatarURL()
        })
        .setTimestamp();

      // Send to current channel
      interaction.channel.send({ embeds: [approveEmbed] });

      // DM
      try {
        await member.send({ embeds: [approveEmbed] });
      } catch { }

      // Log
      if (config.LOG_CHANNEL_ID) {
        const logChannel = interaction.guild.channels.cache.get(config.LOG_CHANNEL_ID);
        if (logChannel) logChannel.send({ embeds: [approveEmbed] });
      }
    }

    // =========================================================
    // REJECT HANDLER
    // =========================================================
    if (action === "cancel") {
      if (loas[userId]) {
        loas[userId].status = "rejected";
        loas[userId].rejectedBy = interaction.user.id;
        fs.writeFileSync(LOA_FILE, JSON.stringify(loas, null, 2));
      }

      const rejectEmbed = new EmbedBuilder()
        .setColor("Red")
        .setTitle("❌ **LOA REJECTED**")
        .setDescription(
          `⚠️ **Your Leave of Absence (LOA) request has been rejected!**\n` +
          `Please contact staff for more information.\n\n` +
          `👤 **Member:** ${member}\n` +
          `⛔ **Rejected By:** ${interaction.user}`
        )
        .addFields(
          { name: "📝 **Reason Provided**", value: loas[userId]?.reason || "N/A", inline: false }
        )
        .setImage("https://media.discordapp.net/attachments/1328281349471342593/1461291979408412841/standard_4.gif")
        .setFooter({
          text: "⚔️ BLOOD HUNTERS • ",
          iconURL: client.user.displayAvatarURL()
        })
        .setTimestamp();

      interaction.channel.send({ embeds: [rejectEmbed] });

      try {
        await member.send({
          embeds: [
            new EmbedBuilder()
              .setColor("Red")
              .setTitle("❌ **Your LOA Request Rejected!**")
              .setDescription("⚠️ Your **LOA request** has been **rejected**. Please contact staff.")
              .setImage("https://media.discordapp.net/attachments/1328281349471342593/1461291979408412841/standard_4.gif")
              .setFooter({ text: "⚔️ BLOOD HUNTERS • ", iconURL: client.user.displayAvatarURL() })
              .setTimestamp()
          ]
        });
      } catch { }

      if (config.LOG_CHANNEL_ID) {
        const logChannel = interaction.guild.channels.cache.get(config.LOG_CHANNEL_ID);
        if (logChannel) logChannel.send({ embeds: [rejectEmbed] });
      }
    }
  } catch (err) {
    console.error("❌ Interaction handler error:", err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "⚠️ Something went wrong.", ephemeral: true });
    }
  }
};
