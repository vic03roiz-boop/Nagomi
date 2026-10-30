const { SlashCommandBuilder, EmbedBuilder, time } = require('discord.js');
const couleurs = require('../../reglages/couleurs');

module.exports = {
  data: new SlashCommandBuilder().setName('userinfo').setDescription("Informations sur un membre")
    .addUserOption((o) => o.setName('membre').setDescription('La personne (toi par défaut)')),
  async execute(i) {
    const u = i.options.getUser('membre') || i.user;
    const m = await i.guild.members.fetch(u.id).catch(() => null);
    const roles = m ? m.roles.cache.filter((r) => r.id !== i.guild.id).sort((a, b) => b.position - a.position).map((r) => r.toString()) : [];
    const e = new EmbedBuilder().setColor(couleurs.rose).setTitle(`🌸 ${u.displayName}`).setThumbnail(u.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'Pseudo Discord', value: `@${u.username}`, inline: true },
        { name: 'ID', value: u.id, inline: true },
        { name: 'Compte créé', value: time(u.createdAt, 'D'), inline: true },
      );
    if (m?.joinedAt) e.addFields({ name: 'A rejoint le serveur', value: time(m.joinedAt, 'D'), inline: true });
    if (roles.length) e.addFields({ name: `Rôles (${roles.length})`, value: roles.slice(0, 20).join(' ') });
    await i.reply({ embeds: [e] });
  },
};
