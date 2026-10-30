const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const rep = require('../../outils/reponses');
const perms = require('../../outils/permissions');
const { journaliser } = require('../../outils/journal');
const { prevenir, RAISON_DEFAUT } = require('./_outils');

module.exports = {
  data: new SlashCommandBuilder().setName('kick').setDescription('Expulse un membre (il peut revenir)')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((o) => o.setName('membre').setDescription("La personne à expulser").setRequired(true))
    .addStringOption((o) => o.setName('raison').setDescription('Pourquoi ?')),
  async execute(i) {
    const user = i.options.getUser('membre');
    const raison = i.options.getString('raison') || RAISON_DEFAUT;
    const membre = await i.guild.members.fetch(user.id).catch(() => null);
    const err = perms.verifierCible(i, membre);
    if (err) return rep.repondre(i, rep.erreur(err));
    await i.deferReply({ flags: 64 });
    await prevenir(user, i.guild, '👢 Tu as été expulsé(e)', raison);
    await membre.kick(`${i.user.tag} : ${raison}`);
    await journaliser(i.guild, { titre: '👢 Expulsion', champs: [{ name: 'Membre', value: `${user} (${user.id})`, inline: true }, { name: 'Par', value: `${i.user}`, inline: true }, { name: 'Raison', value: raison }] });
    await rep.repondre(i, rep.ok(`**${user.displayName}** a été expulsé(e).`));
  },
};
