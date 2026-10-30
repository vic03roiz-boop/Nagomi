// 🧵 Logs rangés en fils privés : un fil par catégorie, dans un salon réservé à l'équipe (réglé avec /logs action:fils).
const { ChannelType } = require('discord.js');
const parametres = require('./parametres');

const NOMS = {
  messages: '💬・messages', membres: '👤・membres', roles: '🎀・rôles', salons: '📁・salons',
  vocal: '🔊・vocal', moderation: '🔨・modération', tickets: '🎫・tickets', bot: '🤖・bot',
};
const verrous = new Map();

const lire = () => parametres.lire('logsFils') || null;
const actif = () => !!lire()?.conteneur;
const sontFils = (canal) => { const f = lire(); return !!f && !!canal && (canal.id === f.conteneur || Object.values(f.ids || {}).includes(canal.id)); };

async function creer(guild, cat) {
  const f = lire(); if (!f?.conteneur) return null;
  const cont = guild.channels.cache.get(f.conteneur) || await guild.channels.fetch(f.conteneur).catch(() => null);
  if (!cont?.threads) return null;
  let fil = f.ids?.[cat] ? await guild.channels.fetch(f.ids[cat]).catch(() => null) : null;
  if (!fil) {
    fil = await cont.threads.create({ name: NOMS[cat] || cat, type: ChannelType.PrivateThread, invitable: false, autoArchiveDuration: 10080, reason: 'Logs Nagomi' })
      .catch((e) => { console.error('[fils]', e.message); return null; });
    if (!fil) return null;
    const maj = lire(); maj.ids = { ...(maj.ids || {}), [cat]: fil.id }; parametres.ecrire('logsFils', maj);
  }
  if (fil.archived) await fil.setArchived(false).catch(() => {});
  return fil;
}

// Renvoie le fil de la catégorie (créé ou rouvert si besoin), ou null si le mode « fils » n'est pas activé
function cible(guild, cat) {
  if (!actif() || !guild) return Promise.resolve(null);
  if (!verrous.has(cat)) verrous.set(cat, creer(guild, cat).finally(() => verrous.delete(cat)));
  return verrous.get(cat);
}

module.exports = { NOMS, cible, actif, sontFils, lire };
