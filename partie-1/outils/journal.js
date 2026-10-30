// 📋 Envoie une trace dans le salon des logs (défini avec /config ou /setup).
const { EmbedBuilder } = require('discord.js');
const parametres = require('./parametres');
const couleurs = require('../reglages/couleurs');
const fils = require('./fils');

async function journaliser(guild, { titre, description, champs = [], couleur = couleurs.rose, cat = 'bot' }) {
  const id = parametres.lire('logsChannelId');
  const salon = (await fils.cible(guild, cat)) || (id && (guild.channels.cache.get(id) || await guild.channels.fetch(id).catch(() => null)));
  if (!salon) return false;
  const e = new EmbedBuilder().setColor(couleur).setTitle(titre).setTimestamp();
  if (description) e.setDescription(description);
  if (champs.length) e.addFields(champs);
  await salon.send({ embeds: [e] }).catch(() => {});
  return true;
}

module.exports = { journaliser };
