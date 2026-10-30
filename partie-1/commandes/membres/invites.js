const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const inv = require('../../systemes/invitations');
const couleurs = require('../../reglages/couleurs');
const textes = require('../../reglages/textes');

module.exports = {
  data: new SlashCommandBuilder().setName('invites').setDescription('Combien de personnes as-tu invitées ?')
    .addUserOption((o) => o.setName('membre').setDescription('La personne (toi par défaut)')),
  async execute(i) {
    const u = i.options.getUser('membre') || i.user; const s = inv.stats(u.id);
    const e = new EmbedBuilder().setColor(couleurs.rose).setTitle(`🎀 Invitations de ${u.displayName}`).setThumbnail(u.displayAvatarURL({ size: 256 }))
      .setDescription(`**${s.restants}** invitation${s.restants > 1 ? 's' : ''} 🌸\n\n🍵 ${s.total} au total · 🍃 ${s.partis} parti${s.partis > 1 ? 's' : ''}`).setFooter({ text: textes.pied });
    await i.reply({ embeds: [e] });
  },
};
