const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const rep = require('../../outils/reponses');
const { journaliser } = require('../../outils/journal');
const { RAISON_DEFAUT } = require('./_outils');

module.exports = {
  data: new SlashCommandBuilder().setName('unban').setDescription('Débannit quelqu’un')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption((o) => o.setName('id').setDescription("L'identifiant (ID) de la personne").setRequired(true))
    .addStringOption((o) => o.setName('raison').setDescription('Pourquoi ?')),
  async execute(i) {
    const id = i.options.getString('id').trim();
    const raison = i.options.getString('raison') || RAISON_DEFAUT;
    const ban = await i.guild.bans.fetch(id).catch(() => null);
    if (!ban) return rep.repondre(i, rep.erreur("Cette personne n'est pas dans la liste des bannis (vérifie l'ID)."));
    await i.guild.bans.remove(id, `${i.user.tag} : ${raison}`);
    await journaliser(i.guild, { titre: '🕊️ Débannissement', champs: [{ name: 'Membre', value: `${ban.user.tag} (${id})`, inline: true }, { name: 'Par', value: `${i.user}`, inline: true }, { name: 'Raison', value: raison }] });
    await rep.repondre(i, rep.ok(`**${ban.user.tag}** est débanni(e).`));
  },
};
