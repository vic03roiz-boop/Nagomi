// 💾 Sauvegarde du serveur : rôles, salons, permissions, rôles des membres, réglages du bot.
// Une sauvegarde automatique par jour (les 7 dernières sont gardées). /sauvegarde pour le reste.
const fs = require('fs');
const path = require('path');
const { Events, ChannelType, PermissionsBitField } = require('discord.js');
const { DOSSIER, ouvrir } = require('../../outils/stockage');
const parametres = require('../../outils/parametres');

const REP = path.join(DOSSIER, 'sauvegardes');
fs.mkdirSync(REP, { recursive: true });
const AUTO_GARDEES = 7;
const TYPES_OK = [ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildCategory, ChannelType.GuildAnnouncement, ChannelType.GuildStageVoice, ChannelType.GuildForum];

const fichiers = () => fs.readdirSync(REP).filter((f) => f.endsWith('.json')).sort().reverse();
const lire = (nom) => JSON.parse(fs.readFileSync(path.join(REP, nom), 'utf8'));
const chemin = (nom) => path.join(REP, nom);

async function capturer(guild) {
  await guild.members.fetch().catch(() => {});
  const roles = guild.roles.cache.filter((r) => r.id !== guild.id && !r.managed).map((r) => ({
    id: r.id, nom: r.name, couleur: r.color, hoist: r.hoist, mentionnable: r.mentionable, permissions: r.permissions.bitfield.toString(), position: r.position }));
  const salons = guild.channels.cache.filter((c) => TYPES_OK.includes(c.type)).map((c) => ({
    id: c.id, nom: c.name, type: c.type, parentId: c.parentId, position: c.rawPosition, topic: c.topic ?? null, nsfw: !!c.nsfw,
    slowmode: c.rateLimitPerUser || 0, bitrate: c.bitrate || null, limite: c.userLimit || null,
    droits: c.permissionOverwrites.cache.map((o) => ({ id: o.id, type: o.type, allow: o.allow.bitfield.toString(), deny: o.deny.bitfield.toString() })) }));
  const membres = {};
  for (const m of guild.members.cache.values()) if (!m.user.bot) { const l = m.roles.cache.filter((r) => r.id !== guild.id && !r.managed).map((r) => r.id); if (l.length) membres[m.id] = l; }
  return { version: 1, date: Date.now(), serveur: { id: guild.id, nom: guild.name, membres: guild.memberCount }, roles, salons, membres, parametres: parametres.tout() };
}

async function sauvegarder(guild, auto = false) {
  const data = await capturer(guild);
  const nom = `${auto ? 'auto' : 'manuelle'}-${new Date(data.date).toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`;
  fs.writeFileSync(chemin(nom), JSON.stringify(data));
  const autos = fichiers().filter((f) => f.startsWith('auto-'));
  for (const vieux of autos.slice(AUTO_GARDEES)) fs.rmSync(chemin(vieux), { force: true });
  return { nom, data };
}

// remplace partout (dans les réglages du bot) les anciens identifiants par les nouveaux
function remapper(carte) {
  const parcourir = (x) => {
    if (Array.isArray(x)) return x.map(parcourir);
    if (x && typeof x === 'object') { for (const k of Object.keys(x)) x[k] = parcourir(x[k]); return x; }
    return typeof x === 'string' && carte.has(x) ? carte.get(x) : x;
  };
  for (const nom of ['parametres', 'autoroles', 'rolesreactions', 'paliers']) { const bd = ouvrir(nom, {}); parcourir(bd.data); bd.sauver(); }
}

async function restaurer(guild, s, { restaurerMembres = true } = {}) {
  const rapport = { rolesCrees: 0, salonsCrees: 0, rolesDonnes: 0, echecs: [] };
  const carte = new Map();                         // ancien id → nouvel id
  carte.set(s.serveur.id, guild.id);
  // --- rôles ---
  const nouveauxRoles = new Set();
  for (const d of [...s.roles].sort((a, b) => a.position - b.position)) {
    let r = guild.roles.cache.get(d.id) || guild.roles.cache.find((x) => x.name === d.nom && !x.managed);
    if (!r) {
      r = await guild.roles.create({ name: d.nom, color: d.couleur, hoist: d.hoist, mentionable: d.mentionnable, permissions: new PermissionsBitField(BigInt(d.permissions)), reason: 'Restauration Nagomi' })
        .catch((e) => { rapport.echecs.push(`rôle ${d.nom} : ${e.message}`); return null; });
      if (r) { rapport.rolesCrees++; nouveauxRoles.add(r.id); }
    }
    if (r) carte.set(d.id, r.id);
  }
  // --- salons : catégories d'abord ---
  const parNom = (d, parentNouveau) => guild.channels.cache.find((c) => c.name === d.nom && c.type === d.type && (c.parentId || null) === (parentNouveau || null));
  const droits = (d) => d.droits.map((o) => ({ id: carte.get(o.id) || o.id, type: o.type, allow: BigInt(o.allow), deny: BigInt(o.deny) }))
    .filter((o) => o.type !== 0 || guild.roles.cache.has(o.id));
  const ordre = [...s.salons.filter((c) => c.type === ChannelType.GuildCategory), ...s.salons.filter((c) => c.type !== ChannelType.GuildCategory)]
    .sort((a, b) => (a.type === ChannelType.GuildCategory ? 0 : 1) - (b.type === ChannelType.GuildCategory ? 0 : 1) || a.position - b.position);
  for (const d of ordre) {
    const parent = d.parentId ? carte.get(d.parentId) || null : null;
    let c = guild.channels.cache.get(d.id) || parNom(d, parent);
    if (!c) {
      const opts = { name: d.nom, type: d.type, parent: parent || undefined, permissionOverwrites: droits(d), reason: 'Restauration Nagomi' };
      if (d.topic) opts.topic = d.topic;
      if (d.nsfw) opts.nsfw = true;
      if (d.slowmode) opts.rateLimitPerUser = d.slowmode;
      if (d.type === ChannelType.GuildVoice || d.type === ChannelType.GuildStageVoice) { if (d.limite) opts.userLimit = d.limite; }
      c = await guild.channels.create(opts).catch((e) => { rapport.echecs.push(`salon ${d.nom} : ${e.message}`); return null; });
      if (c) rapport.salonsCrees++;
    }
    if (c) carte.set(d.id, c.id);
  }
  // --- rôles des membres (seulement les rôles qui viennent d'être recréés) ---
  if (restaurerMembres && nouveauxRoles.size) {
    await guild.members.fetch().catch(() => {});
    for (const [idMembre, liste] of Object.entries(s.membres || {})) {
      const m = guild.members.cache.get(idMembre); if (!m) continue;
      const aDonner = liste.map((id) => carte.get(id)).filter((id) => id && nouveauxRoles.has(id));
      if (aDonner.length) { await m.roles.add(aDonner, 'Restauration Nagomi').then(() => rapport.rolesDonnes++).catch(() => {}); }
    }
  }
  // --- réglages du bot : les ids changent, on les met à jour ---
  const changes = new Map([...carte].filter(([a, b]) => a !== b));
  if (changes.size) remapper(changes);
  rapport.idsMisAJour = changes.size;
  return rapport;
}

module.exports = {
  REP, fichiers, lire, chemin, capturer, sauvegarder, restaurer,
  demarrer(client) {
    const verifier = async () => {
      const guild = client.guilds.cache.first(); if (!guild) return;
      const derniere = fichiers().find((f) => f.startsWith('auto-'));
      if (derniere && Date.now() - fs.statSync(chemin(derniere)).mtimeMs < 23.5 * 3600 * 1000) return;
      await sauvegarder(guild, true).then(() => console.log('[sauvegarde] automatique faite')).catch((e) => console.error('[sauvegarde]', e.message));
    };
    client.once(Events.ClientReady, () => { setTimeout(verifier, 60 * 1000); setInterval(verifier, 60 * 60 * 1000); });
  },
};
