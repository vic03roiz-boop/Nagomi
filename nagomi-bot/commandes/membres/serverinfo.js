const { SlashCommandBuilder, EmbedBuilder, time } = require('discord.js');
const couleurs = require('../../reglages/couleurs');

module.exports = {
  data: new SlashCommandBuilder().setName('serverinfo').setDescription('Informations sur le serveur'),
  async execute(i) {
    const g = i.guild;
    const e = new EmbedBuilder().setColor(couleurs.rose).setTitle(`🍵 ${g.name}`).setThumbnail(g.iconURL({ size: 256 }))
      .addFields(
        { name: 'Membres', value: String(g.memberCount), inline: true },
        { name: 'Salons', value: String(g.channels.cache.size), inline: true },
        { name: 'Rôles', value: String(g.roles.cache.size - 1), inline: true },
        { name: 'Boosts', value: `${g.premiumSubscriptionCount || 0} (niveau ${g.premiumTier})`, inline: true },
        { name: 'Créé le', value: time(g.createdAt, 'D'), inline: true },
      );
    await i.reply({ embeds: [e] });
  },
};
