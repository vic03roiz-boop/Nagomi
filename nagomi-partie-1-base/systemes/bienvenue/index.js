// 🌸 Message de bienvenue (à l'arrivée) et d'au revoir (au départ), chacun dans son salon.
// Réglé avec /bienvenue. Textes dans reglages/messages.js.
const fs = require('fs');
const path = require('path');
const { Events, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const parametres = require('../../outils/parametres');
const { DOSSIER } = require('../../outils/stockage');
const couleurs = require('../../reglages/couleurs');
const textes = require('../../reglages/textes');
const messages = require('../../reglages/messages');
const invitations = require('../invitations');

const EXT = ['gif', 'png', 'jpg', 'webp'];
const DOSSIER_IMAGES = path.join(DOSSIER, 'images');
const IMAGES_DEPOT = path.join(__dirname, '..', '..', 'images');

// Cherche l'image du type voulu : d'abord celle envoyée avec /bienvenue, sinon celle du dossier images/
function trouverImage(type) {
  for (const dossier of [DOSSIER_IMAGES, IMAGES_DEPOT])
    for (const ext of EXT) {
      const f = path.join(dossier, `${type}.${ext}`);
      if (fs.existsSync(f)) return { fichier: f, nom: `${type}.${ext}` };
    }
  return null;
}

const lien = (id) => (id ? `<#${id}>` : '*(salon à définir)*');
function remplir(texte, membre) {
  return texte
    .replaceAll('{membre}', `<@${membre.id}>`).replaceAll('{pseudo}', membre.displayName || membre.user?.username || 'quelqu’un')
    .replaceAll('{serveur}', membre.guild.name).replaceAll('{nombre}', String(membre.guild.memberCount))
    .replaceAll('{reglement}', lien(parametres.lire('rulesChannelId'))).replaceAll('{presentations}', lien(parametres.lire('introChannelId')));
}

// Fabrique le message (embed + image) pour 'bienvenue' ou 'aurevoir'
// info (facultatif) = résultat de invitations.identifier() : ajoute « Invité(e) par … » au message
function construire(type, membre, info) {
  const m = messages[type];
  const e = new EmbedBuilder().setColor(type === 'bienvenue' ? couleurs.rose : couleurs.matcha)
    .setTitle(remplir(m.titre, membre)).setDescription(remplir(m.description, membre))
    .setThumbnail((membre.user || membre).displayAvatarURL({ size: 256 })).setFooter({ text: textes.pied });
  if (type === 'bienvenue' && info !== undefined) {
    e.addFields({ name: '🎀 Invitation', value: info
      ? `Invité(e) par <@${info.inviterId}> · **${info.restants}** invitation${info.restants > 1 ? 's' : ''}`
      : "Arrivé(e) par un lien que je n'ai pas pu retrouver 🌸" });
  }
  const payload = { embeds: [e] };
  const img = trouverImage(type);
  if (img) { payload.files = [new AttachmentBuilder(img.fichier, { name: img.nom })]; e.setImage(`attachment://${img.nom}`); }
  return payload;
}

async function salon(guild, cle) {
  const id = parametres.lire(cle);
  return id ? (guild.channels.cache.get(id) || await guild.channels.fetch(id).catch(() => null)) : null;
}

module.exports = {
  construire, trouverImage, DOSSIER_IMAGES,
  demarrer(client) {
    client.on(Events.GuildMemberAdd, async (membre) => {
      if (membre.user.bot) return;
      const ch = await salon(membre.guild, 'welcomeChannelId');
      if (!ch) return;
      const info = await invitations.identifier(membre).catch(() => null);
      const p = construire('bienvenue', membre, info);
      await ch.send({ content: `<@${membre.id}>`, ...p, allowedMentions: { users: [membre.id] } }).catch((e) => console.error('[bienvenue]', e.message));
    });
    client.on(Events.GuildMemberRemove, async (membre) => {
      if (membre.user?.bot) return;
      const ch = await salon(membre.guild, 'goodbyeChannelId');
      if (!ch) return;
      await ch.send({ ...construire('aurevoir', membre), allowedMentions: { parse: [] } }).catch((e) => console.error('[au revoir]', e.message));
    });
  },
};
