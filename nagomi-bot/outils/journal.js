// 📋 Envoie une trace dans le salon des logs (défini avec /config ou /setup).
const { EmbedBuilder } = require('discord.js');
const parametres = require('./parametres');
const couleurs = require('../reglages/couleurs');

async function journaliser(guild, { titre, description, champs = [], couleur = couleurs.rose }) {
  const id = parametres.lire('logsChannelId');
  if (!id) return false;
  const salon = guild.channels.cache.get(id) || await guild.channels.fetch(id).catch(() => null);
  if (!salon) return false;
  const e = new EmbedBuilder().setColor(couleur).setTitle(titre).setTimestamp();
  if (description) e.setDescription(description);
  if (champs.length) e.addFields(champs);
  await salon.send({ embeds: [e] }).catch(() => {});
  return true;
}

module.exports = { journaliser };
