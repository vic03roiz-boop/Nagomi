// 📈 Chaque message rapporte un peu d'XP (1 fois par minute max par personne).
// Quand on change de niveau : message d'annonce + rôle de palier (réglé avec /palier).
const { Events, EmbedBuilder } = require('discord.js');
const nv = require('../../outils/niveaux');
const parametres = require('../../outils/parametres');
const couleurs = require('../../reglages/couleurs');
const textes = require('../../reglages/textes');

const XP_MIN = 15, XP_MAX = 25, DELAI = 60 * 1000;
const dernier = new Map();
const [d1, d2] = textes.deco;

async function annoncer(message, niveau, rolesGagnes) {
  const id = parametres.lire('levelChannelId');
  const salon = (id && await message.guild.channels.fetch(id).catch(() => null)) || message.channel;
  const e = new EmbedBuilder().setColor(couleurs.rose).setThumbnail(message.author.displayAvatarURL({ size: 128 }))
    .setDescription(`${d1}\n${message.author}, tu viens de passer au niveau **${niveau}** ! 🌸\n${d2}` +
      (rolesGagnes.length ? `\n\n✨ Nouveau rôle : ${rolesGagnes.map((r) => `<@&${r}>`).join(' ')}` : ''))
    .setFooter({ text: textes.pied });
  await salon.send({ content: `${message.author}`, embeds: [e], allowedMentions: { users: [message.author.id] } }).catch(() => {});
}

module.exports = {
  demarrer(client) {
    client.on(Events.MessageCreate, async (message) => {
      if (!message.guild || message.author.bot || message.webhookId) return;
      const maintenant = Date.now();
      if (maintenant - (dernier.get(message.author.id) || 0) < DELAI) return;
      dernier.set(message.author.id, maintenant);
      const gain = XP_MIN + Math.floor(Math.random() * (XP_MAX - XP_MIN + 1));
      const { ancien, nouveau } = nv.changerXp(message.author.id, (x) => x + gain, true);
      if (nouveau > ancien) {
        const membre = message.member || await message.guild.members.fetch(message.author.id).catch(() => null);
        const gagnes = membre ? await nv.synchroniser(membre, nouveau) : [];
        await annoncer(message, nouveau, gagnes);
      }
    });
  },
};
