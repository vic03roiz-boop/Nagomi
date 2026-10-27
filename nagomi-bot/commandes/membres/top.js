const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const nv = require('../../outils/niveaux');
const couleurs = require('../../reglages/couleurs');
const textes = require('../../reglages/textes');

const MEDAILLES = ['🥇', '🥈', '🥉'];

module.exports = {
  data: new SlashCommandBuilder().setName('top').setDescription('Le classement des membres les plus actifs'),
  async execute(i) {
    const top = nv.classement().slice(0, 10);
    if (!top.length) return i.reply({ content: "Personne n'a encore d'XP, lance la discussion ! 🌸", flags: 64 });
    const lignes = top.map((m, k) => `${MEDAILLES[k] || `**${k + 1}.**`} <@${m.id}> · niveau **${nv.niveauDepuisXp(m.xp)}** · ${m.xp} XP`);
    await i.reply({ embeds: [new EmbedBuilder().setColor(couleurs.rose).setTitle('🍵 Le classement de Nagomi').setDescription(lignes.join('\n')).setFooter({ text: textes.pied })], allowedMentions: { parse: [] } });
  },
};
