// 🎁 Le moteur des giveaways : embed, tirage au sort, fin automatique, blacklist.
// Créés avec /giveaway, blacklist avec /blacklist.
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, time } = require('discord.js');
const { ouvrir } = require('../../outils/stockage');
const parametres = require('../../outils/parametres');
const { journaliser } = require('../../outils/journal');
const couleurs = require('../../reglages/couleurs');
const textes = require('../../reglages/textes');
const bienvenue = require('../bienvenue');

const bd = ouvrir('giveaways', { liste: {} });          // { idMessage: giveaway }
const bl = ouvrir('blacklist', { liste: [] });          // [{ userId, endTimestamp, raison, par }]
const [d1, d2] = textes.deco;

// ---------- Embed (le look "salon de thé") ----------
function embedGiveaway(g, { termine = false } = {}) {
  const e = new EmbedBuilder().setTitle(`🎁 ${g.lot}`).setFooter({ text: textes.pied });
  const lignes = [`${d1}  𝐆𝐈𝐕𝐄𝐀𝐖𝐀𝐘  ${d2}`, ''];
  if (!termine) {
    e.setColor(couleurs.rose);
    lignes.push(`Clique sur le bouton **🌸 Participer** pour tenter ta chance !`, '',
      `⏳ **Fin :** ${time(Math.floor(g.fin / 1000), 'R')} · ${time(Math.floor(g.fin / 1000), 'f')}`);
  } else {
    e.setColor(couleurs.matcha);
    lignes[0] = `${d1}  𝐓𝐄𝐑𝐌𝐈𝐍𝐄́  ${d2}`;
    lignes.push(g.gagnants.length ? `🏆 **${g.gagnants.length > 1 ? 'Gagnantes' : 'Gagnante'} :** ${g.gagnants.map((id) => `<@${id}>`).join(', ')}` : '😢 Aucun participant valide.');
  }
  lignes.push(`🍵 **Places :** ${g.nbGagnants}`);
  lignes.push(`🌸 **Participants :** ${g.participants.length}`, `🎀 **Organisé par :** <@${g.hoteId}>`);
  const cond = [];
  if (g.roleRequis) cond.push(`avoir le rôle <@&${g.roleRequis}>`);
  if (g.niveauMin) cond.push(`être au moins niveau **${g.niveauMin}**`);
  if (g.conditions) cond.push(g.conditions);
  if (cond.length) lignes.push('', `📜 **Conditions :** ${cond.join(' · ')}`);
  if (g.bonusBoost) lignes.push('', `💎 Les boosters ont **2 chances** de gagner !`);
  e.setDescription(lignes.join('\n'));
  if (g.image) e.setImage(`attachment://${g.image}`);
  return e;
}
const boutons = (g) => new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('giveaway:part').setLabel('Participer').setEmoji('🌸').setStyle(ButtonStyle.Success));

function fichierBanniere() {
  const img = bienvenue.trouverImage('giveaway');
  return img ? { fichier: new AttachmentBuilder(img.fichier, { name: img.nom }), nom: img.nom } : null;
}

// ---------- Tirage ----------
async function tirer(guild, g, nombre, exclus = []) {
  const bloques = new Set(blacklistActive().map((e) => e.userId));
  const eligibles = g.participants.filter((id) => !bloques.has(id) && !exclus.includes(id));
  const pot = [...eligibles];
  if (g.bonusBoost) for (const id of eligibles) {
    const m = guild.members.cache.get(id) || await guild.members.fetch(id).catch(() => null);
    if (m?.premiumSince) pot.push(id);
  }
  for (let i = pot.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pot[i], pot[j]] = [pot[j], pot[i]]; }
  const gagnants = [];
  for (const id of pot) { if (gagnants.length >= nombre) break; if (!gagnants.includes(id)) gagnants.push(id); }
  return gagnants;
}

async function annoncerGagnants(client, g, gagnants, relance = false) {
  const canal = await client.channels.fetch(g.channelId).catch(() => null);
  if (!canal) return;
  const salonTicket = parametres.lire('ticketPanelChannelId');
  if (gagnants.length) {
    const e = new EmbedBuilder().setColor(couleurs.rose).setTitle(relance ? '🎉 Nouveau tirage !' : '🎉 Félicitations !')
      .setDescription(`${d1}\n${gagnants.map((id) => `<@${id}>`).join(', ')}\ntu remportes **${g.lot}** ! 🌸\n${d2}` +
        (salonTicket ? `\n\nOuvre un ticket dans <#${salonTicket}> pour récupérer ton lot 🎫` : '\n\nOuvre un ticket pour récupérer ton lot 🎫'))
      .setFooter({ text: textes.pied });
    await canal.send({ content: gagnants.map((id) => `<@${id}>`).join(' '), embeds: [e], allowedMentions: { users: gagnants } }).catch(() => {});
    for (const id of gagnants) {
      const u = await client.users.fetch(id).catch(() => null);
      await u?.send({ embeds: [new EmbedBuilder().setColor(couleurs.rose).setTitle('🎁 Tu as gagné !')
        .setDescription(`Bravo ! Tu as gagné **${g.lot}** sur **${canal.guild.name}** 🌸\nOuvre un ticket pour récupérer ton lot.`).setFooter({ text: textes.pied })] }).catch(() => {});
    }
  } else if (!relance) {
    await canal.send(`😢 Aucun participant valide pour le giveaway **${g.lot}**.`).catch(() => {});
  }
}

async function terminer(client, g) {
  if (g.termine) return false;
  g.termine = true;
  const canal = await client.channels.fetch(g.channelId).catch(() => null);
  const guild = canal?.guild || await client.guilds.fetch(g.guildId).catch(() => null);
  g.gagnants = guild ? await tirer(guild, g, g.nbGagnants) : [];
  bd.sauver();
  const msg = await canal?.messages.fetch(g.messageId).catch(() => null);
  await msg?.edit({ embeds: [embedGiveaway(g, { termine: true })], components: [] }).catch(() => {});
  await annoncerGagnants(client, g, g.gagnants);
  if (guild) await journaliser(guild, { titre: '🎁 Giveaway terminé', champs: [{ name: 'Lot', value: g.lot, inline: true }, { name: 'Participants', value: String(g.participants.length), inline: true }, { name: 'Gagnants', value: g.gagnants.map((i) => `<@${i}>`).join(', ') || 'aucun' }] });
  return true;
}

// ---------- Blacklist ----------
const blacklistActive = () => bl.data.liste.filter((e) => e.endTimestamp > Date.now());
const estBlackliste = (id) => blacklistActive().find((e) => e.userId === id);

async function verifierBlacklist(client) {
  const finies = bl.data.liste.filter((e) => e.endTimestamp <= Date.now());
  if (!finies.length) return;
  bl.data.liste = bl.data.liste.filter((e) => e.endTimestamp > Date.now()); bl.sauver();
  const roleId = parametres.lire('blacklistRoleId');
  for (const e of finies) {
    const guild = client.guilds.cache.first();
    const m = guild && await guild.members.fetch(e.userId).catch(() => null);
    if (m && roleId) await m.roles.remove(roleId, 'Fin de blacklist giveaways').catch(() => {});
    if (guild) await journaliser(guild, { titre: '✅ Fin de blacklist', description: `<@${e.userId}> peut de nouveau participer aux giveaways.` });
  }
}

module.exports = {
  bd, bl, embedGiveaway, boutons, fichierBanniere, tirer, annoncerGagnants, terminer, estBlackliste, blacklistActive,
  demarrer(client) {
    // toutes les 20 s : termine les giveaways arrivés à échéance ; toutes les 5 min : fin de blacklist
    setInterval(async () => {
      for (const g of Object.values(bd.data.liste)) if (!g.termine && g.fin <= Date.now()) await terminer(client, g).catch((e) => console.error('[giveaways]', e.message));
    }, 20 * 1000);
    setInterval(() => verifierBlacklist(client).catch(() => {}), 5 * 60 * 1000);
  },
};
