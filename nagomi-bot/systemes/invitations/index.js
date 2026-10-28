// 🎀 Suivi des invitations : qui a invité qui. Utilisé par le message de bienvenue et par /invites.
const { Events } = require('discord.js');
const { ouvrir } = require('../../outils/stockage');

const bd = ouvrir('invitations', { inviteurs: {}, membres: {} });   // inviteurs: {id:{total,partis}} · membres: {idMembre: idInviteur}
const cache = new Map();                                              // guildId → Map(code → {uses, max, inviterId})

async function charger(guild) {
  try {
    const liste = await guild.invites.fetch();
    cache.set(guild.id, new Map(liste.map((i) => [i.code, { uses: i.uses ?? 0, max: i.maxUses ?? 0, inviterId: i.inviterId }])));
  } catch { /* pas la permission "Gérer le serveur" : on ne pourra pas suivre */ }
}

const stats = (id) => {
  const s = bd.data.inviteurs[id] || { total: 0, partis: 0 };
  return { total: s.total, partis: s.partis, restants: Math.max(0, s.total - s.partis) };
};

// Trouve quelle invitation vient d'être utilisée. Renvoie { inviterId, code } ou null.
const enCours = new Map();
function identifier(membre) {
  if (!enCours.has(membre.id)) enCours.set(membre.id, trouver(membre).finally(() => setTimeout(() => enCours.delete(membre.id), 10000)));
  return enCours.get(membre.id);
}
async function trouver(membre) {
  const avant = cache.get(membre.guild.id);
  let apres;
  try { apres = await membre.guild.invites.fetch(); } catch { return null; }
  const nouveau = new Map(apres.map((i) => [i.code, { uses: i.uses ?? 0, max: i.maxUses ?? 0, inviterId: i.inviterId }]));
  cache.set(membre.guild.id, nouveau);
  if (!avant) return null;
  let trouve = null;
  for (const [code, n] of nouveau) if (n.uses > (avant.get(code)?.uses ?? 0)) { trouve = { code, ...n }; break; }
  if (!trouve) for (const [code, a] of avant)            // invitation à usage limité : supprimée juste après son dernier usage
    if (!nouveau.has(code) && a.max && a.uses + 1 >= a.max) { trouve = { code, ...a }; break; }
  if (!trouve?.inviterId) return null;
  const s = (bd.data.inviteurs[trouve.inviterId] ||= { total: 0, partis: 0 });
  s.total++; bd.data.membres[membre.id] = trouve.inviterId; bd.sauver();
  return { inviterId: trouve.inviterId, code: trouve.code, ...stats(trouve.inviterId) };
}

module.exports = {
  stats, identifier,
  demarrer(client) {
    client.once(Events.ClientReady, () => client.guilds.cache.forEach(charger));
    client.on(Events.GuildCreate, charger);
    client.on(Events.InviteCreate, (i) => cache.get(i.guild.id)?.set(i.code, { uses: i.uses ?? 0, max: i.maxUses ?? 0, inviterId: i.inviterId }));
    client.on(Events.InviteDelete, (i) => setTimeout(() => cache.get(i.guild.id)?.delete(i.code), 5000));   // délai : laisse identifier() lire le dernier usage
    client.on(Events.GuildMemberRemove, (m) => {
      const id = bd.data.membres[m.id];
      if (!id) return;
      (bd.data.inviteurs[id] ||= { total: 0, partis: 0 }).partis++;
      delete bd.data.membres[m.id]; bd.sauver();
    });
  },
};
