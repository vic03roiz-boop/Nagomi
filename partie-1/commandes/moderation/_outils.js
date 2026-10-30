// Petits outils partagés par les commandes de modération (le _ évite que ce fichier soit pris pour une commande)
const { EmbedBuilder } = require('discord.js');
const couleurs = require('../../reglages/couleurs');

// Prévient la personne en message privé (silencieux si ses MP sont fermés)
async function prevenir(user, guild, titre, raison, extra = '') {
  const e = new EmbedBuilder().setColor(couleurs.rose).setTitle(titre)
    .setDescription(`Sur **${guild.name}**\n**Raison :** ${raison}${extra ? `\n${extra}` : ''}`);
  return user.send({ embeds: [e] }).then(() => true).catch(() => false);
}

module.exports = { prevenir, RAISON_DEFAUT: 'Aucune raison précisée' };
