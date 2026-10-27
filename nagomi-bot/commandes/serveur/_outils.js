// Outils partagés par les commandes du dossier serveur/
const { AttachmentBuilder } = require('discord.js');

// Lien de message ou ID → { channelId, messageId }
function lireMessage(texte, salonParDefaut) {
  const t = String(texte || '').trim();
  const lien = t.match(/channels\/\d+\/(\d+)\/(\d+)/);
  if (lien) return { channelId: lien[1], messageId: lien[2] };
  if (/^\d{15,25}$/.test(t)) return { channelId: salonParDefaut, messageId: t };
  return null;
}

// Emoji (unicode ou <:nom:id>) → { cle, aReagir, custom, nom, animé }
function lireEmoji(texte) {
  const t = String(texte || '').trim();
  const m = t.match(/^<(a?):(\w+):(\d+)>$/);
  if (m) return { cle: m[3], aReagir: m[3], custom: true, nom: m[2], anime: !!m[1], id: m[3] };
  if (!t) return null;
  return { cle: t, aReagir: t, custom: false, nom: t };
}

// Télécharge un fichier joint pour le renvoyer proprement (évite les liens qui expirent)
async function telecharger(attachment) {
  const r = await fetch(attachment.url);
  if (!r.ok) throw new Error('téléchargement impossible');
  const buf = Buffer.from(await r.arrayBuffer());
  return new AttachmentBuilder(buf, { name: attachment.name || 'image.png' });
}

module.exports = { lireMessage, lireEmoji, telecharger };
