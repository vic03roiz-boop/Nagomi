const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const rep = require('../../outils/reponses');
const perms = require('../../outils/permissions');
const { journaliser } = require('../../outils/journal');
const couleurs = require('../../reglages/couleurs');
const { prevenir, RAISON_DEFAUT } = require('./_outils');

module.exports = {
  data: new SlashCommandBuilder().setName('ban').setDescription('Bannit un membre du serveur')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((o) => o.setName('membre').setDescription('La personne à bannir').setRequired(true))
    .addStringOption((o) => o.setName('raison').setDescription('Pourquoi ?'))
    .addIntegerOption((o) => o.setName('jours').setDescription('Supprimer ses messages des X derniers jours (0 à 7)').setMinValue(0).setMaxValue(7)),
  async execute(i) {
    const user = i.options.getUser('membre');
    const raison = i.options.getString('raison') || RAISON_DEFAUT;
    const membre = await i.guild.members.fetch(user.id).catch(() => null);
    if (membre) {
      const err = perms.verifierCible(i, membre);
      if (err) return rep.repondre(i, rep.erreur(err));
    }
    await i.deferReply({ flags: 64 });
    await prevenir(user, i.guild, '🔨 Tu as été banni(e)', raison);
    await i.guild.members.ban(user.id, { reason: `${i.user.tag} : ${raison}`, deleteMessageSeconds: (i.options.getInteger('jours') || 0) * 86400 });
    await journaliser(i.guild, { titre: '🔨 Bannissement', couleur: couleurs.erreur,
      champs: [{ name: 'Membre', value: `${user} (${user.id})`, inline: true }, { name: 'Par', value: `${i.user}`, inline: true }, { name: 'Raison', value: raison }] });
    await rep.repondre(i, rep.ok(`**${user.displayName}** a été banni(e).`));
  },
};
