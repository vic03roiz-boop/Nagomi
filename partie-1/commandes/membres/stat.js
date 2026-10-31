// 📊 /stat : toutes les statistiques d'un membre (messages, vocal, invitations, niveau)
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const couleurs = require('../../reglages/couleurs');
const textes = require('../../reglages/textes');
const st = require('../../systemes/stats');
const inv = require('../../systemes/invitations');
const nv = require('../../outils/niveaux');

const duree = (s) => {
  if (s < 60) return '0 min';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`;
};
const nb = (n) => n.toLocaleString('fr-FR');

module.exports = {
  data: new SlashCommandBuilder().setName('stat').setDescription('Toutes les statistiques d\'un membre')
    .addUserOption((o) => o.setName('membre').setDescription('La personne (toi par défaut)')),
  async execute(i) {
    const u = i.options.getUser('membre') || i.user;
    if (u.bot) return i.reply({ content: 'Les bots n\'ont pas de statistiques 🤖', flags: 64 });
    const j1 = st.totaux(u.id, 1), j7 = st.totaux(u.id, 7), j30 = st.totaux(u.id, 30);
    const s = inv.stats(u.id), d = nv.infos(u.id);
    const rang = nv.classement().findIndex((x) => x.id === u.id) + 1;
    const depuis = Math.floor(st.bd.data.depuis / 1000);
    const e = new EmbedBuilder().setColor(couleurs.rose).setTitle(`📊 Statistiques de ${u.displayName}`).setThumbnail(u.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: '💬 Messages', value: `Aujourd'hui : **${nb(j1.m)}**\n7 jours : **${nb(j7.m)}**\n30 jours : **${nb(j30.m)}**`, inline: true },
        { name: '🎙️ Vocal', value: `Aujourd'hui : **${duree(j1.v)}**\n7 jours : **${duree(j7.v)}**\n30 jours : **${duree(j30.v)}**`, inline: true },
        { name: '​', value: '​', inline: true },
        { name: '🎀 Invitations', value: `**${s.restants}** actuelle${s.restants > 1 ? 's' : ''}\n${s.total} au total · ${s.partis} parti${s.partis > 1 ? 's' : ''}`, inline: true },
        { name: '🌸 Niveau', value: `Niveau **${d.niveau}**${rang ? ` · #${rang}` : ''}\n${nb(d.messages)} messages au total`, inline: true },
      )
      .setFooter({ text: `Statistiques comptées depuis le ${new Date(st.bd.data.depuis).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })} · ${textes.pied}` });
    await i.reply({ embeds: [e] });
  },
};
