const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const rep = require('../../outils/reponses');
const perms = require('../../outils/permissions');
const { journaliser } = require('../../outils/journal');
const { lireDuree, afficherDuree } = require('../../outils/duree');
const { prevenir, RAISON_DEFAUT } = require('./_outils');

const MAX = 28 * 86400000; // limite Discord : 28 jours

module.exports = {
  data: new SlashCommandBuilder().setName('mute').setDescription('Rend muet un membre (timeout)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName('membre').setDescription('La personne').setRequired(true))
    .addStringOption((o) => o.setName('duree').setDescription('Exemples : 10m, 2h, 3j (max 28j)').setRequired(true))
    .addStringOption((o) => o.setName('raison').setDescription('Pourquoi ?')),
  async execute(i) {
    const user = i.options.getUser('membre');
    const ms = lireDuree(i.options.getString('duree'));
    const raison = i.options.getString('raison') || RAISON_DEFAUT;
    if (!ms || ms > MAX) return rep.repondre(i, rep.erreur('Durée invalide. Exemples : `10m`, `2h`, `3j` (28 jours maximum).'));
    const membre = await i.guild.members.fetch(user.id).catch(() => null);
    const err = perms.verifierCible(i, membre);
    if (err) return rep.repondre(i, rep.erreur(err));
    await membre.timeout(ms, `${i.user.tag} : ${raison}`);
    await prevenir(user, i.guild, '🤫 Tu as été rendu(e) muet(te)', raison, `**Durée :** ${afficherDuree(ms)}`);
    await journaliser(i.guild, { titre: '🤫 Mute', champs: [{ name: 'Membre', value: `${user}`, inline: true }, { name: 'Durée', value: afficherDuree(ms), inline: true }, { name: 'Par', value: `${i.user}`, inline: true }, { name: 'Raison', value: raison }] });
    await rep.repondre(i, rep.ok(`**${user.displayName}** est muet(te) pendant **${afficherDuree(ms)}**.`));
  },
};
