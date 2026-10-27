const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, AttachmentBuilder, MessageFlags } = require('discord.js');
const rep = require('../../outils/reponses');
const perms = require('../../outils/permissions');
const parametres = require('../../outils/parametres');
const { journaliser } = require('../../outils/journal');
const { ouvrir } = require('../../outils/stockage');
const couleurs = require('../../reglages/couleurs');
const textes = require('../../reglages/textes');
const cfg = require('../../reglages/tickets');

const P = PermissionFlagsBits;
const bd = ouvrir('tickets', { suivant: 1, liste: {} }); // lu aussi par systemes/tickets
const ouverts = () => Object.values(bd.data.liste).filter((t) => t.statut !== 'ferme');
const parSalon = (id) => ouverts().find((t) => t.channelId === id);
const [d1, d2] = textes.deco;

// ---------- Panneau ----------
function panneau() {
  const e = new EmbedBuilder().setColor(couleurs.rose).setTitle(`🎫 ${cfg.titrePanneau}`)
    .setDescription(`${d1}  𝓝𝓪𝓰𝓸𝓶𝓲  ${d2}\n\n${cfg.textePanneau}`).setFooter({ text: textes.pied });
  const menu = new StringSelectMenuBuilder().setCustomId('ticket:ouvrir').setPlaceholder('🍵 Choisis une raison…')
    .addOptions(cfg.motifs.map((m) => ({ label: m.label, value: m.id, emoji: m.emoji, description: m.description })));
  return { embeds: [e], components: [new ActionRowBuilder().addComponents(menu)] };
}

const boutonsTicket = (id) => new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId(`ticket:prendre:${id}`).setLabel('Prendre en charge').setEmoji('🔑').setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId(`ticket:fermer:${id}`).setLabel('Fermer').setEmoji('🔒').setStyle(ButtonStyle.Danger));

// ---------- Création ----------
async function ouvrirTicket(i) {
  const motif = cfg.motifs.find((m) => m.id === i.values[0]);
  const deja = ouverts().filter((t) => t.userId === i.user.id);
  if (deja.length >= cfg.maxParMembre) {
    return rep.repondre(i, rep.info(`Tu as déjà un ticket ouvert : <#${deja[0].channelId}> 🌸`));
  }
  await i.deferReply({ flags: MessageFlags.Ephemeral });
  const staffRole = parametres.lire('staffRoleId');
  const id = bd.data.suivant++;
  const nom = `${motif.emoji}・${i.user.username}`.toLowerCase().replace(/[^\p{L}\p{N}\p{Extended_Pictographic}・_-]/gu, '').slice(0, 90) || `ticket-${id}`;
  const droitsMembre = [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.AttachFiles, P.EmbedLinks, P.AddReactions];
  const overwrites = [
    { id: i.guild.id, deny: [P.ViewChannel] },
    { id: i.user.id, allow: droitsMembre },
    { id: i.client.user.id, allow: [...droitsMembre, P.ManageChannels, P.ManageMessages] },
  ];
  if (staffRole) overwrites.push({ id: staffRole, allow: [...droitsMembre, P.ManageMessages] });
  let salon;
  try {
    salon = await i.guild.channels.create({
      name: nom, type: ChannelType.GuildText, parent: parametres.lire('ticketCategoryId') || undefined,
      topic: `Ticket #${id} · ${motif.label} · ${i.user.tag}`, permissionOverwrites: overwrites, reason: `Ticket #${id}`,
    });
  } catch {
    bd.data.suivant--;
    return rep.repondre(i, rep.erreur("Je n'ai pas pu créer ton salon. Préviens l'équipe (il me manque la permission « Gérer les salons »)."));
  }
  bd.data.liste[id] = { id, userId: i.user.id, channelId: salon.id, motif: motif.id, motifLabel: motif.label, ouvertLe: Date.now(), statut: 'ouvert' };
  bd.sauver();
  const e = new EmbedBuilder().setColor(couleurs.rose).setTitle(`${motif.emoji} ${motif.label} · ticket #${id}`)
    .setDescription(`${d1}  Bienvenue ${i.user} !  ${d2}\n\nExplique-nous ta demande en détail, l'équipe te répond dès que possible 🌸\nQuand c'est réglé, clique sur **Fermer**.`)
    .setFooter({ text: textes.pied });
  await salon.send({ content: `${i.user}${staffRole ? ` <@&${staffRole}>` : ''}`, embeds: [e], components: [boutonsTicket(id)],
    allowedMentions: { users: [i.user.id], roles: staffRole ? [staffRole] : [] } });
  await journaliser(i.guild, { titre: '🎫 Ticket ouvert', champs: [{ name: 'Par', value: `${i.user}`, inline: true }, { name: 'Raison', value: motif.label, inline: true }, { name: 'Salon', value: `${salon}`, inline: true }] });
  await rep.repondre(i, rep.ok(`Ton ticket est ouvert : ${salon}`));
}

// ---------- Fermeture ----------
async function transcription(salon) {
  let tout = [], avant;
  for (let n = 0; n < 10; n++) { // 1000 messages maximum
    const lot = await salon.messages.fetch({ limit: 100, ...(avant ? { before: avant } : {}) });
    if (!lot.size) break;
    tout.push(...lot.values()); avant = lot.last().id;
  }
  return tout.reverse().map((m) => {
    const pj = m.attachments.size ? ` [fichiers : ${[...m.attachments.values()].map((a) => a.url).join(' ')}]` : '';
    const emb = m.embeds.length ? ` [embed : ${m.embeds.map((e) => e.title || e.description || '').join(' | ').slice(0, 200)}]` : '';
    return `[${new Date(m.createdTimestamp).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}] ${m.author.tag} : ${m.content}${pj}${emb}`;
  }).join('\n');
}

async function fermerTicket(i, t) {
  const salon = i.channel;
  await i.update({ embeds: [rep.info('Fermeture du ticket… la conversation est enregistrée 🍵')], components: [] });
  const texte = await transcription(salon).catch(() => '(transcription impossible)');
  const fichier = () => new AttachmentBuilder(Buffer.from(texte || '(vide)', 'utf8'), { name: `ticket-${t.id}.txt` });
  t.statut = 'ferme'; t.fermePar = i.user.id; t.fermeLe = Date.now(); bd.sauver();
  const duree = Math.max(1, Math.round((t.fermeLe - t.ouvertLe) / 60000));
  const logId = parametres.lire('logsChannelId');
  const logs = logId ? await i.guild.channels.fetch(logId).catch(() => null) : null;
  if (logs) {
    const e = new EmbedBuilder().setColor(couleurs.rose).setTitle(`🎫 Ticket #${t.id} fermé`).setTimestamp()
      .addFields({ name: 'Ouvert par', value: `<@${t.userId}>`, inline: true }, { name: 'Fermé par', value: `${i.user}`, inline: true },
        { name: 'Raison', value: t.motifLabel, inline: true }, { name: 'Durée', value: `${duree} min`, inline: true });
    await logs.send({ embeds: [e], files: [fichier()] }).catch(() => {});
  }
  const membre = await i.client.users.fetch(t.userId).catch(() => null);
  await membre?.send({ embeds: [new EmbedBuilder().setColor(couleurs.rose).setTitle(`🎫 Ton ticket #${t.id} est fermé`)
    .setDescription(`Merci d'avoir contacté l'équipe de **${i.guild.name}** 🌸\nVoici la conversation, au cas où.`).setFooter({ text: textes.pied })], files: [fichier()] }).catch(() => {});
  setTimeout(() => salon.delete(`Ticket #${t.id} fermé`).catch(() => {}), 4000);
}

module.exports = {
  bd,
  data: new SlashCommandBuilder().setName('ticket').setDescription('Gère le système de tickets')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((o) => o.setName('action').setDescription('Que faire ?').setRequired(true).addChoices(
      { name: 'panneau (poster le message avec le menu)', value: 'panneau' }, { name: 'fermer (ce ticket)', value: 'fermer' },
      { name: 'ajouter (une personne à ce ticket)', value: 'ajouter' }, { name: 'retirer (une personne de ce ticket)', value: 'retirer' }))
    .addChannelOption((o) => o.setName('salon').setDescription('Pour « panneau » : où poster (ici par défaut)').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
    .addUserOption((o) => o.setName('membre').setDescription('Pour « ajouter » / « retirer »')),
  async execute(i) {
    const action = i.options.getString('action');
    if (action === 'panneau') {
      const idPanneau = parametres.lire('ticketPanelChannelId');
      const salon = i.options.getChannel('salon') || (idPanneau && await i.guild.channels.fetch(idPanneau).catch(() => null)) || i.channel;
      await salon.send(panneau()).catch(() => null);
      return rep.repondre(i, rep.ok(`Panneau posté dans ${salon} 🎫${parametres.lire('ticketCategoryId') ? '' : '\n*(Pense à choisir la catégorie des tickets avec /config.)*'}`));
    }
    const t = parSalon(i.channelId);
    if (!t) return rep.repondre(i, rep.erreur("Cette commande s'utilise dans un salon de ticket."));
    if (action === 'fermer') {
      return i.reply({ embeds: [rep.info('Fermer ce ticket ? La conversation sera enregistrée dans les logs.')], components: [confirmation(t.id)] });
    }
    const user = i.options.getUser('membre');
    if (!user) return rep.repondre(i, rep.erreur('Choisis le `membre`.'));
    if (action === 'ajouter') {
      await i.channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true, AttachFiles: true });
      return i.reply({ embeds: [rep.ok(`${user} a été ajouté(e) au ticket.`)] });
    }
    if (user.id === t.userId) return rep.repondre(i, rep.erreur("Tu ne peux pas retirer la personne qui a ouvert le ticket."));
    await i.channel.permissionOverwrites.delete(user.id);
    await i.reply({ embeds: [rep.ok(`${user} a été retiré(e) du ticket.`)] });
  },

  async composant(i) {
    const [, action, idTexte] = i.customId.split(':');
    if (action === 'ouvrir' && i.isStringSelectMenu()) return ouvrirTicket(i);
    const t = bd.data.liste[idTexte];
    if (!t || t.statut === 'ferme') return rep.repondre(i, rep.erreur('Ce ticket est déjà fermé.'));
    const staff = perms.estStaff(i.member);
    const proprio = i.user.id === t.userId;

    if (action === 'prendre') {
      if (!staff) return rep.repondre(i, rep.erreur(textes.pasStaff));
      t.statut = 'pris'; t.prisPar = i.user.id; bd.sauver();
      return i.reply({ embeds: [rep.ok(`${i.user} s'occupe de ton ticket 🔑`)] });
    }
    if (action === 'fermer') {
      if (!staff && !proprio) return rep.repondre(i, rep.erreur('Seule la personne qui a ouvert le ticket ou l\'équipe peut le fermer.'));
      return i.reply({ embeds: [rep.info('Fermer ce ticket ? La conversation sera enregistrée dans les logs.')], components: [confirmation(t.id)] });
    }
    if (action === 'non') return i.update({ embeds: [rep.info('Ok, le ticket reste ouvert 🌸')], components: [] });
    if (action === 'oui') {
      if (!staff && !proprio) return rep.repondre(i, rep.erreur('Tu ne peux pas fermer ce ticket.'));
      return fermerTicket(i, t);
    }
  },
};

function confirmation(id) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ticket:oui:${id}`).setLabel('Oui, fermer').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`ticket:non:${id}`).setLabel('Annuler').setStyle(ButtonStyle.Secondary));
}
