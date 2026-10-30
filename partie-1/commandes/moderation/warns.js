const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, time } = require('discord.js');
const rep = require('../../outils/reponses');
const couleurs = require('../../reglages/couleurs');
const { ouvrir } = require('../../outils/stockage');
const bd = ouvrir('avertissements', {});

module.exports = {
  data: new SlashCommandBuilder().setName('warns').setDescription("Voir les avertissements d'un membre")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName('membre').setDescription('La personne').setRequired(true)),
  async execute(i) {
    const user = i.options.getUser('membre');
    const liste = bd.data[user.id] || [];
    if (!liste.length) return rep.repondre(i, rep.info(`**${user.displayName}** n'a aucun avertissement 🌸`));
    const e = new EmbedBuilder().setColor(couleurs.miel).setTitle(`⚠️ Avertissements de ${user.displayName}`)
      .setDescription(liste.slice(-15).map((w) => `**#${w.id}** · ${time(Math.floor(w.date / 1000), 'd')} · par <@${w.par}>\n${w.raison}`).join('\n\n'));
    await rep.repondre(i, e);
  },
};
