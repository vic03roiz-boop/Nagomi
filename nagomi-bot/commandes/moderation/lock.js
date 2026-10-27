const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const rep = require('../../outils/reponses');
const { journaliser } = require('../../outils/journal');

module.exports = {
  data: new SlashCommandBuilder().setName('lock').setDescription("Verrouille un salon (personne ne peut écrire)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption((o) => o.setName('salon').setDescription('Le salon (celui-ci par défaut)').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)),
  async execute(i) {
    const salon = i.options.getChannel('salon') || i.channel;
    await salon.permissionOverwrites.edit(i.guild.roles.everyone, { SendMessages: false });
    await journaliser(i.guild, { titre: '🔒 Salon verrouillé', champs: [{ name: 'Salon', value: `${salon}`, inline: true }, { name: 'Par', value: `${i.user}`, inline: true }] });
    await rep.repondre(i, rep.ok(`${salon} est verrouillé 🔒`));
  },
};
