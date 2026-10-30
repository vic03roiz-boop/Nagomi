const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const rep = require('../../outils/reponses');
const perms = require('../../outils/permissions');
const { journaliser } = require('../../outils/journal');
const { ouvrir } = require('../../outils/stockage');
const couleurs = require('../../reglages/couleurs');
const { prevenir } = require('./_outils');

const bd = ouvrir('avertissements', {}); // { idMembre: [{ id, raison, par, date }] }

module.exports = {
  bd, // partagé avec /warns et /unwarn
  data: new SlashCommandBuilder().setName('warn').setDescription('Avertit un membre')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName('membre').setDescription('La personne').setRequired(true))
    .addStringOption((o) => o.setName('raison').setDescription('Pourquoi ?').setRequired(true)),
  async execute(i) {
    const user = i.options.getUser('membre');
    const raison = i.options.getString('raison');
    const membre = await i.guild.members.fetch(user.id).catch(() => null);
    const err = perms.verifierCible(i, membre);
    if (err) return rep.repondre(i, rep.erreur(err));
    const liste = (bd.data[user.id] ||= []);
    const id = (liste.at(-1)?.id || 0) + 1;
    liste.push({ id, raison, par: i.user.id, date: Date.now() });
    bd.sauver();
    const mp = await prevenir(user, i.guild, '⚠️ Avertissement', raison, `C'est ton avertissement n°**${liste.length}**.`);
    await journaliser(i.guild, { titre: `⚠️ Avertissement n°${liste.length}`, couleur: couleurs.miel,
      champs: [{ name: 'Membre', value: `${user}`, inline: true }, { name: 'Par', value: `${i.user}`, inline: true }, { name: 'Raison', value: raison }] });
    await rep.repondre(i, rep.ok(`**${user.displayName}** a reçu un avertissement (total : **${liste.length}**).${mp ? '' : '\n*(Ses messages privés sont fermés, il/elle n’a pas été prévenu(e).)*'}`));
  },
};
