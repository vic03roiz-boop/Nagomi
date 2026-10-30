const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const nv = require('../../outils/niveaux');
const { carteNiveau } = require('../../outils/carte');

module.exports = {
  data: new SlashCommandBuilder().setName('rank').setDescription('Ta carte de niveau')
    .addUserOption((o) => o.setName('membre').setDescription('La personne (toi par défaut)')),
  async execute(i) {
    const u = i.options.getUser('membre') || i.user;
    if (u.bot) return i.reply({ content: 'Les bots ne gagnent pas d’XP 🤖', flags: 64 });
    await i.deferReply();
    const d = nv.infos(u.id);
    const rang = nv.classement().findIndex((x) => x.id === u.id) + 1;
    const suivant = nv.paliers().find((p) => p.niveau > d.niveau);
    const membre = i.guild.members.cache.get(u.id) || await i.guild.members.fetch(u.id).catch(() => null);
    try {
      const png = await carteNiveau({ nom: membre?.displayName || u.displayName, avatarUrl: (membre || u).displayAvatarURL({ extension: 'png', size: 256 }),
        niveau: d.niveau, rang, xp: d.dansNiveau, xpMax: d.pourSuivant, messages: d.messages, prochain: suivant?.niveau });
      await i.editReply({ files: [new AttachmentBuilder(png, { name: 'niveau.png' })] });
    } catch (e) { console.error('[rank]', e.message); await i.editReply({ content: `🌸 **${u.displayName}** · niveau **${d.niveau}** · ${d.dansNiveau}/${d.pourSuivant} XP${rang ? ` · #${rang}` : ''}` }); }
  },
};
