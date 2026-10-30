const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const rep = require('../../outils/reponses');
const nv = require('../../outils/niveaux');
const { journaliser } = require('../../outils/journal');

module.exports = {
  data: new SlashCommandBuilder().setName('xp').setDescription("Modifie l'XP ou le niveau d'un membre")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((o) => o.setName('action').setDescription('Que faire ?').setRequired(true).addChoices(
      { name: 'ajouter (de l’XP)', value: 'ajouter' }, { name: 'retirer (de l’XP)', value: 'retirer' },
      { name: 'niveau (fixer un niveau)', value: 'niveau' }, { name: 'reset (tout remettre à zéro)', value: 'reset' }))
    .addUserOption((o) => o.setName('membre').setDescription('La personne').setRequired(true))
    .addIntegerOption((o) => o.setName('valeur').setDescription("Quantité d'XP, ou niveau à fixer").setMinValue(0).setMaxValue(10000000)),
  async execute(i) {
    const user = i.options.getUser('membre');
    const action = i.options.getString('action');
    const v = i.options.getInteger('valeur');
    if (user.bot) return rep.repondre(i, rep.erreur('Les bots ne gagnent pas d’XP.'));
    if (action !== 'reset' && v === null) return rep.repondre(i, rep.erreur('Il me faut la `valeur`.'));
    const f = { ajouter: (x) => x + v, retirer: (x) => x - v, niveau: () => nv.xpPourAtteindre(v), reset: () => 0 }[action];
    const { nouveau } = nv.changerXp(user.id, f);
    const membre = await i.guild.members.fetch(user.id).catch(() => null);
    if (membre) await nv.synchroniser(membre, nouveau);
    await journaliser(i.guild, { titre: '📈 XP modifié', champs: [{ name: 'Membre', value: `${user}`, inline: true }, { name: 'Action', value: `${action}${v !== null ? ` ${v}` : ''}`, inline: true }, { name: 'Par', value: `${i.user}`, inline: true }] });
    await rep.repondre(i, rep.ok(`**${user.displayName}** est maintenant niveau **${nouveau}** (${nv.infos(user.id).xp} XP).`));
  },
};
