const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const nv = require('../../outils/niveaux');
const couleurs = require('../../reglages/couleurs');
const textes = require('../../reglages/textes');

const barre = (part, total) => { const n = Math.round((part / total) * 10); return '🌸'.repeat(n) + '▫️'.repeat(10 - n); };

module.exports = {
  data: new SlashCommandBuilder().setName('rank').setDescription('Ton niveau et ton XP')
    .addUserOption((o) => o.setName('membre').setDescription('La personne (toi par défaut)')),
  async execute(i) {
    const u = i.options.getUser('membre') || i.user;
    if (u.bot) return i.reply({ content: 'Les bots ne gagnent pas d’XP 🤖', flags: 64 });
    const d = nv.infos(u.id);
    const rang = nv.classement().findIndex((x) => x.id === u.id) + 1;
    const suivant = nv.paliers().find((p) => p.niveau > d.niveau);
    const e = new EmbedBuilder().setColor(couleurs.rose).setTitle(`🌸 ${u.displayName}`).setThumbnail(u.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'Niveau', value: `**${d.niveau}**`, inline: true },
        { name: 'Classement', value: rang ? `#${rang}` : '—', inline: true },
        { name: 'Messages', value: String(d.messages), inline: true },
        { name: `XP · ${d.dansNiveau} / ${d.pourSuivant}`, value: barre(d.dansNiveau, d.pourSuivant) },
      ).setFooter({ text: textes.pied });
    if (suivant) e.addFields({ name: 'Prochain palier', value: `Niveau **${suivant.niveau}** → <@&${suivant.roleId}>` });
    await i.reply({ embeds: [e] });
  },
};
