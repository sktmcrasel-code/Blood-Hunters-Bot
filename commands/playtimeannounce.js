const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { announceTopPlayers } = require('../utils/playtimeAnnouncer');
const db = require('../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('playtime-announce')
        .setDescription('Manage automated playtime announcements and configurations')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand.setName('trigger')
                .setDescription('Manually trigger congratulations announcement for Top 5 playtime leaders')
                .addStringOption(option =>
                    option.setName('timeframe')
                        .setDescription('The timeframe to announce Top 5 for')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Daily Top 5', value: 'daily' },
                            { name: 'Weekly Top 5', value: 'weekly' },
                            { name: 'Monthly Top 5', value: 'monthly' }
                        ))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('setup')
                .setDescription('Set the target channel for daily, weekly, and monthly announcements')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel to post announcements in')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText))
        ),

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        await interaction.deferReply({ ephemeral: true });

        try {
            if (subcommand === 'trigger') {
                const timeframe = interaction.options.getString('timeframe');
                // Calculate refDate with 1 minute offset for boundary compatibility
                const refDate = new Date(Date.now() - 60000);
                await announceTopPlayers(client, interaction.guild.id, timeframe, refDate);
                await interaction.editReply(`✅ Successfully announced the **${timeframe.toUpperCase()} Top 5 Playtime Champions**!`);
            } else if (subcommand === 'setup') {
                const channel = interaction.options.getChannel('channel');

                await db.update(
                    { guildId: interaction.guild.id },
                    { $set: { PLAYTIME_ANNOUNCE_CHANNEL_ID: channel.id } },
                    { upsert: true }
                );

                await interaction.editReply(`✅ Playtime announcement channel has been set to ${channel}. Daily, weekly, and monthly announcements will now be posted here.`);
            }
        } catch (error) {
            console.error("Playtime Announce Command Error:", error);
            await interaction.editReply('❌ Failed to execute command. Please try again.');
        }
    }
};
