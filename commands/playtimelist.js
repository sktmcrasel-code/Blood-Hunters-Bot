const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../utils/db');
const { updateList } = require('../utils/playtimeListUpdater');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('playtimelist')
        .setDescription('Manage the Live Auto-Updating Playtime List')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand.setName('setup')
                .setDescription('Setup the live playtime list in a channel')
                .addChannelOption(option => 
                    option.setName('channel')
                        .setDescription('The channel to post the live list in')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('add')
                .setDescription('Add a member to the tracking list')
                .addUserOption(option => 
                    option.setName('user')
                        .setDescription('The user to track')
                        .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('remove')
                .setDescription('Remove a member from the tracking list')
                .addUserOption(option => 
                    option.setName('user')
                        .setDescription('The user to remove')
                        .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('update')
                .setDescription('Manually force the list to update right now')
        ),
    
    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        await interaction.deferReply({ ephemeral: true });

        let config = await db.findOne({ guildId: interaction.guild.id });
        if (!config) {
            return interaction.editReply('❌ Configuration not found. Please setup the bot first.');
        }

        if (sub === 'setup') {
            const channel = interaction.options.getChannel('channel');

            const embed = new EmbedBuilder()
                .setColor('#2b2d31')
                .setTitle(`⏱️ Live Playtime Tracking List`)
                .setDescription("Initializing list... Please add members and wait for the next update cycle.")
                .setFooter({ text: `Auto-updates every 30 mins` });

            const msg = await channel.send({ embeds: [embed] });

            await db.update(
                { guildId: interaction.guild.id },
                { $set: { PLAYTIME_LIST_CHANNEL_ID: channel.id, PLAYTIME_LIST_MESSAGE_ID: msg.id } }
            );

            await interaction.editReply(`✅ Setup complete! The live list has been posted in ${channel}.`);
            await updateList(interaction.client, interaction.guild.id);
        }

        else if (sub === 'add') {
            const user = interaction.options.getUser('user');
            
            let tracked = config.PLAYTIME_TRACKED_MEMBERS || [];
            if (tracked.includes(user.id)) {
                return interaction.editReply(`❌ **${user.username}** is already on the tracking list!`);
            }

            tracked.push(user.id);
            await db.update(
                { guildId: interaction.guild.id },
                { $set: { PLAYTIME_TRACKED_MEMBERS: tracked } }
            );

            await updateList(interaction.client, interaction.guild.id);
            await interaction.editReply(`✅ **${user.username}** has been added to the Live Playtime List!`);
        }

        else if (sub === 'remove') {
            const user = interaction.options.getUser('user');
            
            let tracked = config.PLAYTIME_TRACKED_MEMBERS || [];
            if (!tracked.includes(user.id)) {
                return interaction.editReply(`❌ **${user.username}** is not on the tracking list!`);
            }

            tracked = tracked.filter(id => id !== user.id);
            await db.update(
                { guildId: interaction.guild.id },
                { $set: { PLAYTIME_TRACKED_MEMBERS: tracked } }
            );

            await updateList(interaction.client, interaction.guild.id);
            await interaction.editReply(`✅ **${user.username}** has been removed from the Live Playtime List!`);
        }

        else if (sub === 'update') {
            if (!config.PLAYTIME_LIST_MESSAGE_ID) {
                return interaction.editReply('❌ You have not setup a list yet. Run `/playtimelist setup` first.');
            }
            
            await updateList(interaction.client, interaction.guild.id);
            await interaction.editReply('✅ The Live Playtime List has been manually updated!');
        }
    }
};
