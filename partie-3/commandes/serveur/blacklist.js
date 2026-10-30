const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const rep = require('../../outils/reponses');
const parametres = require('../../outils/parametres');
const { journaliser } = require('../../outils/journal');
const { lireDuree, afficherDuree } = require('../../outils/duree');
const couleurs = require('../../reglages/couleurs');
const textes = require('../../reglages/textes');
const gw = require('../../systemes/giveaways');

module.exports = {
  data: new SlashCommandBuilder().setName('blacklist').setDescription('Interdit un membre de participer aux giveaways')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((o) => o.setName('action').setDescription('Que faire ?').setRequired(true).addChoices(
      { name: 'ajouter', value: 'ajouter' }, { name: 'retirer', value: 'retirer' }, { name: 'liste', value: 'liste' },
      { name: 'role (rôle donné aux blacklistés)', value: 'role' }))
    .addUserOption((o) => o.setName('membre').setDescription('La personne'))
    .addStringOption((o) => o.setName('duree').setDescription('Exemples : 7j, 30j (pour « ajouter »)'))
    .addStringOption((o) => o.setName('raison').setDescription('Pourquoi ?'))
    .addRoleOption((o) => o.setName('role').setDescription('Pour « role » : le rôle à donner (facultatif)')),
  async execute(i) {
    const action = i.options.getString('action'); const user = i.options.getUser('membre');
    if (action === 'liste') {
      const l = gw.blacklistActive();
      return rep.repondre(i, l.length ? new EmbedBuilder().setColor(couleurs.rose).setTitle('🚫 Blacklist giveaways').setFooter({ text: textes.pied })
        .setDescription(l.map((e) => `<@${e.userId}> · jusqu'au <t:${Math.floor(e.endTimestamp / 1000)}:d> · ${e.raison || 'sans raison'}`).join('\n'))
        : rep.info('Personne n’est blacklisté 🌸'));
    }
    if (action === 'role') {
      const r = i.options.getRole('role'); parametres.ecrire('blacklistRoleId', r?.id || null);
      return rep.repondre(i, rep.ok(r ? `Les blacklistés recevront le rôle **${r.name}**.` : 'Plus de rôle donné aux blacklistés.'));
    }
    if (!user) return rep.repondre(i, rep.erreur('Choisis le `membre`.'));
    const roleId = parametres.lire('blacklistRoleId'); const m = await i.guild.members.fetch(user.id).catch(() => null);
    if (action === 'ajouter') {
      const ms = lireDuree(i.options.getString('duree'));
      if (!ms) return rep.repondre(i, rep.erreur('Durée invalide. Exemples : `7j`, `30j`.'));
      gw.bl.data.liste = gw.bl.data.liste.filter((e) => e.userId !== user.id);
      gw.bl.data.liste.push({ userId: user.id, endTimestamp: Date.now() + ms, raison: i.options.getString('raison'), par: i.user.id }); gw.bl.sauver();
      if (m && roleId) await m.roles.add(roleId, 'Blacklist giveaways').catch(() => {});
      await journaliser(i.guild, { titre: '🚫 Blacklist giveaways', champs: [{ name: 'Membre', value: `${user}`, inline: true }, { name: 'Durée', value: afficherDuree(ms), inline: true }, { name: 'Par', value: `${i.user}`, inline: true }] });
      return rep.repondre(i, rep.ok(`**${user.displayName}** est blacklisté(e) pour **${afficherDuree(ms)}**.`));
    }
    gw.bl.data.liste = gw.bl.data.liste.filter((e) => e.userId !== user.id); gw.bl.sauver();
    if (m && roleId) await m.roles.remove(roleId, 'Fin de blacklist').catch(() => {});
    await rep.repondre(i, rep.ok(`**${user.displayName}** peut de nouveau participer.`));
  },
};
