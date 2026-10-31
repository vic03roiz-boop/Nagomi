// 🎙️ Salons vocaux temporaires (/vocal) et 🔢 compteurs de membres (/compteur)
const { Events, ChannelType, PermissionFlagsBits } = require('discord.js');
const { ouvrir } = require('../../outils/stockage');

const bd = ouvrir('vocaux', { hubId: null, modele: '🍵・{pseudo}', temporaires: [], compteurs: [] });
bd.data.temporaires ||= []; bd.data.compteurs ||= []; bd.data.modele ||= '🍵・{pseudo}';
const recents = new Map(); // anti-spam : un salon créé par personne toutes les 10 s

const nomSalon = (membre) => bd.data.modele.replaceAll('{pseudo}', membre.displayName.replace(/[^\p{L}\p{N} _\-.]/gu, '').trim() || 'invité(e)').slice(0, 90);

async function creerSalon(etat) {
  const m = etat.member, hub = etat.channel;
  const existant = bd.data.temporaires.map((id) => etat.guild.channels.cache.get(id)).find((c) => c?.permissionOverwrites.cache.has(m.id));
  if (existant) return m.voice.setChannel(existant).catch(() => {});
  if (Date.now() - (recents.get(m.id) || 0) < 10000) return m.voice.disconnect().catch(() => {});
  recents.set(m.id, Date.now());
  const salon = await etat.guild.channels.create({
    name: nomSalon(m), type: ChannelType.GuildVoice, parent: hub.parentId, bitrate: hub.bitrate, reason: 'Salon vocal temporaire',
    permissionOverwrites: [{ id: m.id, allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] }],
  }).catch((e) => { console.error('[vocaux]', e.message); return null; });
  if (!salon) return;
  bd.data.temporaires.push(salon.id); bd.sauver();
  const ok = await m.voice.setChannel(salon).then(() => true).catch(() => false);
  if (!ok) await supprimer(salon);
}

async function supprimer(salon) {
  bd.data.temporaires = bd.data.temporaires.filter((id) => id !== salon.id); bd.sauver();
  await salon.delete('Salon vocal temporaire vide').catch(() => {});
}

async function majCompteurs(client) {
  for (const c of bd.data.compteurs) {
    const salon = await client.channels.fetch(c.channelId).catch(() => null);
    if (!salon) continue;
    const nom = c.modele.replaceAll('{n}', String(salon.guild.memberCount)).slice(0, 100);
    if (salon.name !== nom) await salon.setName(nom, 'Compteur de membres').catch((e) => console.error('[compteur]', e.message));
  }
}

module.exports = {
  bd, majCompteurs,
  demarrer(client) {
    client.once(Events.ClientReady, async () => {
      for (const id of [...bd.data.temporaires]) {
        const c = await client.channels.fetch(id).catch(() => null);
        if (!c) bd.data.temporaires = bd.data.temporaires.filter((x) => x !== id);
        else if (!c.members.size) await supprimer(c);
      }
      bd.sauver();
      majCompteurs(client);
      setInterval(() => majCompteurs(client), 10 * 60 * 1000); // Discord limite les renommages : toutes les 10 min
    });
    client.on(Events.VoiceStateUpdate, async (avant, apres) => {
      try {
        if (apres.channelId && apres.channelId === bd.data.hubId && !apres.member.user.bot) await creerSalon(apres);
        if (avant.channelId && avant.channelId !== apres.channelId && bd.data.temporaires.includes(avant.channelId) && !avant.channel?.members.size) await supprimer(avant.channel);
      } catch (e) { console.error('[vocaux]', e.message); }
    });
    client.on(Events.ChannelDelete, (c) => { if (bd.data.temporaires.includes(c.id)) { bd.data.temporaires = bd.data.temporaires.filter((x) => x !== c.id); bd.sauver(); } });
  },
};
