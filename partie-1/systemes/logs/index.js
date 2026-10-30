// 📋 Les logs "à la Carl-bot" : messages, membres, rôles, salons, vocal, modération.
// Réglages avec /logs (salon, catégories à activer/désactiver).
const { Events, EmbedBuilder, AuditLogEvent, ChannelType } = require('discord.js');
const parametres = require('../../outils/parametres');
const couleurs = require('../../reglages/couleurs');
const fils = require('../../outils/fils');

const CATEGORIES = { messages: '💬 Messages', membres: '👤 Membres', roles: '🎀 Rôles', salons: '📁 Salons', vocal: '🔊 Vocal', moderation: '🔨 Modération' };
const lireReglages = () => parametres.lire('logs') || { off: [], salons: {} };

function actif(cat) { return !lireReglages().off.includes(cat); }
function salonDe(guild, cat) {
  const r = lireReglages();
  const id = r.salons?.[cat] || parametres.lire('logsChannelId');
  return id ? guild.channels.cache.get(id) : null;
}
async function envoyer(guild, cat, { titre, description, champs = [], couleur = couleurs.rose, image, auteur }) {
  if (!guild || !actif(cat)) return;
  const salon = (await fils.cible(guild, cat)) || salonDe(guild, cat);
  if (!salon) return;
  const e = new EmbedBuilder().setColor(couleur).setTitle(titre).setTimestamp().setFooter({ text: CATEGORIES[cat] });
  if (description) e.setDescription(description.slice(0, 4000));
  if (champs.length) e.addFields(champs.map((c) => ({ ...c, value: String(c.value).slice(0, 1000) || '—' })));
  if (auteur) e.setAuthor({ name: auteur.tag || auteur.username, iconURL: auteur.displayAvatarURL?.() });
  if (image) e.setImage(image);
  await salon.send({ embeds: [e], allowedMentions: { parse: [] } }).catch(() => {});
}
const ignorer = (guild, canal) => !guild || fils.sontFils(canal) || fils.sontFils(canal?.parent) || [parametres.lire('logsChannelId'), ...Object.values(lireReglages().salons || {})].includes(canal?.id);

// Qui a fait l'action ? (nécessite la permission "Voir les logs du serveur")
async function executant(guild, type, cibleId) {
  try {
    const l = await guild.fetchAuditLogs({ type, limit: 5 });
    const e = l.entries.find((x) => (!cibleId || x.targetId === cibleId) && Date.now() - x.createdTimestamp < 8000);
    return e?.executor || null;
  } catch { return null; }
}

module.exports = {
  CATEGORIES,
  demarrer(client) {
    // ----- Messages -----
    client.on(Events.MessageDelete, async (m) => {
      if (ignorer(m.guild, m.channel) || m.author?.bot) return;
      const fichiers = [...(m.attachments?.values() || [])].map((a) => a.url).join('\n');
      await envoyer(m.guild, 'messages', { titre: '🗑️ Message supprimé', couleur: couleurs.erreur, auteur: m.author || undefined,
        description: m.content || (m.partial ? '*(message ancien : contenu inconnu)*' : '*(aucun texte)*'),
        champs: [{ name: 'Salon', value: `<#${m.channelId}>`, inline: true }, { name: 'Auteur', value: m.author ? `${m.author} (${m.author.id})` : 'inconnu', inline: true },
          ...(fichiers ? [{ name: 'Pièces jointes', value: fichiers }] : [])] });
    });
    client.on(Events.MessageBulkDelete, async (msgs, canal) => {
      if (ignorer(canal.guild, canal)) return;
      await envoyer(canal.guild, 'messages', { titre: '🧹 Messages supprimés en masse', couleur: couleurs.erreur, description: `**${msgs.size}** messages supprimés dans ${canal}.` });
    });
    client.on(Events.MessageUpdate, async (avant, apres) => {
      if (ignorer(apres.guild, apres.channel) || apres.author?.bot) return;
      if (avant.content === apres.content || avant.content == null || apres.content == null) return;
      await envoyer(apres.guild, 'messages', { titre: '✏️ Message modifié', couleur: couleurs.miel, auteur: apres.author,
        description: `[Aller au message](${apres.url})`,
        champs: [{ name: 'Avant', value: avant.content || '—' }, { name: 'Après', value: apres.content || '—' }, { name: 'Salon', value: `<#${apres.channelId}>`, inline: true }] });
    });

    // ----- Membres -----
    client.on(Events.GuildMemberAdd, async (m) => {
      const age = Math.floor(m.user.createdTimestamp / 1000);
      await envoyer(m.guild, 'membres', { titre: '🌸 Un membre est arrivé', couleur: couleurs.matcha, auteur: m.user,
        description: `${m} (${m.id})`, champs: [{ name: 'Compte créé', value: `<t:${age}:R>`, inline: true }, { name: 'Membres', value: String(m.guild.memberCount), inline: true }] });
    });
    client.on(Events.GuildMemberRemove, async (m) => {
      await envoyer(m.guild, 'membres', { titre: '🍃 Un membre est parti', couleur: couleurs.erreur, auteur: m.user,
        description: `${m.user} (${m.id})`, champs: [{ name: 'Rôles', value: m.roles?.cache.filter((r) => r.id !== m.guild.id).map((r) => `<@&${r.id}>`).join(' ') || 'aucun' }] });
    });
    client.on(Events.GuildMemberUpdate, async (avant, apres) => {
      if (apres.user.bot && !avant.roles) return;
      if (avant.nickname !== apres.nickname)
        await envoyer(apres.guild, 'membres', { titre: '📝 Pseudo modifié', auteur: apres.user, description: `${apres}`,
          champs: [{ name: 'Avant', value: avant.nickname || '*(aucun)*', inline: true }, { name: 'Après', value: apres.nickname || '*(aucun)*', inline: true }] });
      const plus = apres.roles.cache.filter((r) => !avant.roles.cache.has(r.id));
      const moins = avant.roles.cache.filter((r) => !apres.roles.cache.has(r.id));
      if (plus.size || moins.size) {
        const qui = await executant(apres.guild, AuditLogEvent.MemberRoleUpdate, apres.id);
        await envoyer(apres.guild, 'roles', { titre: '🎀 Rôles du membre modifiés', auteur: apres.user, description: `${apres}${qui ? `\nPar ${qui}` : ''}`,
          champs: [...(plus.size ? [{ name: '➕ Ajoutés', value: plus.map((r) => `<@&${r.id}>`).join(' ') }] : []), ...(moins.size ? [{ name: '➖ Retirés', value: moins.map((r) => `<@&${r.id}>`).join(' ') }] : [])] });
      }
      const t1 = avant.communicationDisabledUntilTimestamp, t2 = apres.communicationDisabledUntilTimestamp;
      if (t1 !== t2 && (t2 || t1)) {
        const qui = await executant(apres.guild, AuditLogEvent.MemberUpdate, apres.id);
        await envoyer(apres.guild, 'moderation', { titre: t2 && t2 > Date.now() ? '🤫 Membre mis en sourdine' : '🔊 Sourdine retirée', couleur: couleurs.miel, auteur: apres.user,
          description: `${apres}${qui ? `\nPar ${qui}` : ''}${t2 && t2 > Date.now() ? `\nJusqu'à <t:${Math.floor(t2 / 1000)}:f>` : ''}` });
      }
    });

    // ----- Modération -----
    client.on(Events.GuildBanAdd, async (b) => {
      const qui = await executant(b.guild, AuditLogEvent.MemberBanAdd, b.user.id);
      await envoyer(b.guild, 'moderation', { titre: '🔨 Membre banni', couleur: couleurs.erreur, auteur: b.user, description: `${b.user} (${b.user.id})`,
        champs: [{ name: 'Par', value: qui ? `${qui}` : 'inconnu', inline: true }, { name: 'Raison', value: b.reason || 'aucune', inline: true }] });
    });
    client.on(Events.GuildBanRemove, async (b) => {
      const qui = await executant(b.guild, AuditLogEvent.MemberBanRemove, b.user.id);
      await envoyer(b.guild, 'moderation', { titre: '🕊️ Membre débanni', couleur: couleurs.matcha, auteur: b.user, description: `${b.user} (${b.user.id})${qui ? `\nPar ${qui}` : ''}` });
    });

    // ----- Rôles -----
    client.on(Events.GuildRoleCreate, async (r) => envoyer(r.guild, 'roles', { titre: '🎀 Rôle créé', couleur: couleurs.matcha, description: `${r} (${r.name})` }));
    client.on(Events.GuildRoleDelete, async (r) => envoyer(r.guild, 'roles', { titre: '🗑️ Rôle supprimé', couleur: couleurs.erreur, description: `**${r.name}**` }));
    client.on(Events.GuildRoleUpdate, async (a, b) => {
      const ch = [];
      if (a.name !== b.name) ch.push({ name: 'Nom', value: `${a.name} → ${b.name}` });
      if (a.color !== b.color) ch.push({ name: 'Couleur', value: `#${a.color.toString(16).padStart(6, '0')} → #${b.color.toString(16).padStart(6, '0')}` });
      if (!a.permissions.equals(b.permissions)) ch.push({ name: 'Permissions', value: 'modifiées' });
      if (ch.length) await envoyer(b.guild, 'roles', { titre: '🎀 Rôle modifié', couleur: couleurs.miel, description: `${b}`, champs: ch });
    });

    // ----- Salons -----
    client.on(Events.ChannelCreate, async (c) => c.guild && envoyer(c.guild, 'salons', { titre: '📁 Salon créé', couleur: couleurs.matcha, description: `${c} (${c.name})` }));
    client.on(Events.ChannelDelete, async (c) => c.guild && !ignorer(c.guild, c) && envoyer(c.guild, 'salons', { titre: '🗑️ Salon supprimé', couleur: couleurs.erreur, description: `**#${c.name}**` }));
    client.on(Events.ChannelUpdate, async (a, b) => {
      if (!b.guild) return;
      const ch = [];
      if (a.name !== b.name) ch.push({ name: 'Nom', value: `${a.name} → ${b.name}` });
      if (a.topic !== b.topic) ch.push({ name: 'Description', value: `${a.topic || '—'} → ${b.topic || '—'}` });
      if (a.parentId !== b.parentId) ch.push({ name: 'Catégorie', value: `${a.parent?.name || '—'} → ${b.parent?.name || '—'}` });
      if (ch.length) await envoyer(b.guild, 'salons', { titre: '📁 Salon modifié', couleur: couleurs.miel, description: `${b}`, champs: ch });
    });

    // ----- Vocal -----
    client.on(Events.VoiceStateUpdate, async (a, b) => {
      const m = b.member || a.member; if (!m || m.user.bot) return;
      if (a.channelId === b.channelId) return;
      const texte = !a.channelId ? `🔊 ${m} a rejoint **${b.channel.name}**` : !b.channelId ? `🔇 ${m} a quitté **${a.channel.name}**` : `🔁 ${m} est passé(e) de **${a.channel.name}** à **${b.channel.name}**`;
      await envoyer(b.guild || a.guild, 'vocal', { titre: 'Activité vocale', auteur: m.user, description: texte });
    });
  },
};
