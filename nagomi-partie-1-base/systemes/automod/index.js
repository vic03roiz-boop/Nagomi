// 🛡️ Automod + anti-raid. Réglé avec /automod. L'équipe et les rôles/salons exemptés ne sont jamais touchés.
const { Events, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const parametres = require('../../outils/parametres');
const { journaliser } = require('../../outils/journal');
const permissions = require('../../outils/permissions');
const couleurs = require('../../reglages/couleurs');

const DEFAUT = {
  invitations: true,            // liens d'invitation Discord
  liens: false,                 // tous les autres liens
  mots: true,                   // mots interdits (liste dans motsListe)
  mentions: true,               // trop de mentions dans un message
  spam: true,                   // trop de messages d'affilée
  motsListe: [], liensOk: ['tenor.com', 'giphy.com', 'discord.com', 'youtube.com', 'youtu.be', 'tiktok.com', 'instagram.com'],
  mentionsMax: 5, spamMessages: 6, spamSecondes: 5,
  sanctionApres: 3,             // après X infractions en 10 min → sourdine
  sanctionMinutes: 10,
  raid: true, raidArrivees: 6, raidSecondes: 15, raidMinutes: 10,
  exemptRoles: [], exemptSalons: [],
};
const reglages = () => ({ ...DEFAUT, ...(parametres.lire('automod') || {}) });
const enregistrer = (r) => parametres.ecrire('automod', r);

const RE_INVITE = /(discord\.(gg|com\/invite|gg\/)|discordapp\.com\/invite)\/?[\w-]+/i;
const RE_LIEN = /(https?:\/\/|www\.)[^\s<]+/gi;
const strikes = new Map();     // userId → [timestamps]
const flux = new Map();        // userId → [timestamps de messages]
let arrivees = [];             // timestamps des arrivées récentes
let raid = { actif: false, fin: 0 };

const normaliser = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

async function sanctionner(message, raison) {
  await message.delete().catch(() => {});
  const r = reglages(); const now = Date.now();
  const liste = (strikes.get(message.author.id) || []).filter((t) => now - t < 10 * 60 * 1000); liste.push(now);
  strikes.set(message.author.id, liste);
  const mute = liste.length >= r.sanctionApres;
  const e = new EmbedBuilder().setColor(couleurs.miel).setDescription(`🌸 ${message.author}, ${raison}${mute ? `\n🤫 Tu es en sourdine ${r.sanctionMinutes} min.` : ''}`);
  const m = await message.channel.send({ embeds: [e], allowedMentions: { users: [message.author.id] } }).catch(() => null);
  if (m) setTimeout(() => m.delete().catch(() => {}), 8000);
  if (mute) {
    strikes.delete(message.author.id);
    await message.member?.timeout(r.sanctionMinutes * 60 * 1000, `Automod : ${raison}`).catch(() => {});
  }
  await journaliser(message.guild, { titre: '🛡️ Automod', couleur: couleurs.miel, description: `${message.author} dans ${message.channel}`,
    champs: [{ name: 'Raison', value: raison, inline: true }, { name: 'Message', value: (message.content || '—').slice(0, 900) }, ...(mute ? [{ name: 'Sanction', value: `sourdine ${r.sanctionMinutes} min` }] : [])] });
}

async function verifier(message) {
  if (!message.guild || message.author.bot || !message.member) return;
  if (permissions.estStaff(message.member)) return;
  const r = reglages();
  if (r.exemptSalons.includes(message.channelId) || r.exemptSalons.includes(message.channel.parentId)) return;
  if (message.member.roles.cache.some((x) => r.exemptRoles.includes(x.id))) return;
  const texte = message.content || '';

  if (r.invitations && RE_INVITE.test(texte)) return sanctionner(message, "les invitations vers d'autres serveurs ne sont pas autorisées.");
  if (r.liens) {
    const liens = texte.match(RE_LIEN) || [];
    const mauvais = liens.some((l) => { try { const h = new URL(l.startsWith('http') ? l : `https://${l}`).hostname.replace(/^www\./, ''); return !r.liensOk.some((ok) => h === ok || h.endsWith(`.${ok}`)); } catch { return true; } });
    if (mauvais) return sanctionner(message, "les liens ne sont pas autorisés ici.");
  }
  if (r.mots && r.motsListe.length) {
    const t = normaliser(texte);
    if (r.motsListe.some((w) => new RegExp(`(^|[^a-z0-9])${normaliser(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9])`).test(t)))
      return sanctionner(message, "ce message contient un mot interdit.");
  }
  if (r.mentions && (message.mentions.users.size + message.mentions.roles.size) > r.mentionsMax)
    return sanctionner(message, `trop de mentions dans un seul message (max ${r.mentionsMax}).`);
  if (r.spam) {
    const now = Date.now(); const l = (flux.get(message.author.id) || []).filter((t) => now - t < r.spamSecondes * 1000); l.push(now); flux.set(message.author.id, l);
    if (l.length >= r.spamMessages) { flux.delete(message.author.id); return sanctionner(message, "doucement, tu envoies trop de messages d'affilée."); }
  }
}

// ----- Anti-raid : beaucoup d'arrivées en quelques secondes -----
async function surArrivee(membre) {
  const r = reglages(); if (!r.raid) return;
  const now = Date.now();
  if (raid.actif && now > raid.fin) raid.actif = false;
  if (raid.actif) { await membre.timeout(r.raidMinutes * 60 * 1000, 'Anti-raid').catch(() => {}); return; }
  arrivees = arrivees.filter((t) => now - t.t < r.raidSecondes * 1000); arrivees.push({ t: now, m: membre });
  if (arrivees.length < r.raidArrivees) return;
  raid = { actif: true, fin: now + r.raidMinutes * 60 * 1000 };
  const victimes = arrivees.map((a) => a.m); arrivees = [];
  for (const m of victimes) await m.timeout(r.raidMinutes * 60 * 1000, 'Anti-raid').catch(() => {});
  await journaliser(membre.guild, { titre: '🚨 Raid détecté !', couleur: couleurs.erreur,
    description: `**${victimes.length}** arrivées en moins de ${r.raidSecondes} s. Les nouveaux membres sont mis en sourdine ${r.raidMinutes} min.\n` +
      `Pour arrêter : \`/automod action:raid\`. Pour expulser les suspects : fais-le depuis la liste des membres.` });
}

module.exports = {
  DEFAUT, reglages, enregistrer,
  etatRaid: () => ({ ...raid, actif: raid.actif && Date.now() < raid.fin }),
  arreterRaid: () => { raid = { actif: false, fin: 0 }; },
  demarrer(client) {
    client.on(Events.MessageCreate, (m) => verifier(m).catch((e) => console.error('[automod]', e.message)));
    client.on(Events.GuildMemberAdd, (m) => { if (!m.user.bot) surArrivee(m).catch((e) => console.error('[anti-raid]', e.message)); });
  },
};
