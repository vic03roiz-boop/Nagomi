const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const couleurs = require('../../reglages/couleurs');

module.exports = {
  data: new SlashCommandBuilder().setName('avatar').setDescription("Affiche la photo de profil d'un membre")
    .addUserOption((o) => o.setName('membre').setDescription('La personne (toi par défaut)')),
  async execute(i) {
    const u = i.options.getUser('membre') || i.user;
    const url = u.displayAvatarURL({ size: 1024 });
    await i.reply({ embeds: [new EmbedBuilder().setColor(couleurs.rose).setTitle(`🌸 ${u.displayName}`).setImage(url).setURL(url)] });
  },
};
