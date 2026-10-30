// 💌 Messages tout prêts (succès, erreur, info) pour que toutes les réponses aient le même style.
const { EmbedBuilder, MessageFlags } = require('discord.js');
const couleurs = require('../reglages/couleurs');
const textes = require('../reglages/textes');

const embed = (couleur, emoji, texte) =>
  new EmbedBuilder().setColor(couleur).setDescription(`${emoji} ${texte}`);

const ok = (t) => embed(couleurs.ok, textes.emoji.ok, t);
const erreur = (t) => embed(couleurs.erreur, textes.emoji.erreur, t);
const info = (t) => embed(couleurs.info, textes.emoji.info, t);

// Répond de façon privée (visible seulement par la personne)
async function repondre(interaction, embedOuTexte, extra = {}) {
  const payload = typeof embedOuTexte === 'string'
    ? { content: embedOuTexte, ...extra }
    : { embeds: [embedOuTexte], ...extra };
  payload.flags = MessageFlags.Ephemeral;
  if (interaction.deferred || interaction.replied) return interaction.editReply(payload);
  return interaction.reply(payload);
}

module.exports = { ok, erreur, info, repondre };
