const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const rep = require('../../outils/reponses');
const { journaliser } = require('../../outils/journal');
const { ouvrir } = require('../../outils/stockage');
const bd = ouvrir('avertissements', {});

module.exports = {
  data: new SlashCommandBuilder().setName('unwarn').setDescription('Retire un avertissement')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName('membre').setDescription('La personne').setRequired(true))
    .addIntegerOption((o) => o.setName('numero').setDescription("Numéro de l'avertissement (voir /warns)").setRequired(true).setMinValue(1)),
  async execute(i) {
    const user = i.options.getUser('membre');
    const n = i.options.getInteger('numero');
    const liste = bd.data[user.id] || [];
    const idx = liste.findIndex((w) => w.id === n);
    if (idx < 0) return rep.repondre(i, rep.erreur(`Pas d'avertissement n°${n} pour cette personne.`));
    liste.splice(idx, 1);
    if (!liste.length) delete bd.data[user.id];
    bd.sauver();
    await journaliser(i.guild, { titre: '🌿 Avertissement retiré', champs: [{ name: 'Membre', value: `${user}`, inline: true }, { name: 'Par', value: `${i.user}`, inline: true }, { name: 'N°', value: String(n), inline: true }] });
    await rep.repondre(i, rep.ok(`Avertissement n°${n} retiré pour **${user.displayName}**.`));
  },
};
