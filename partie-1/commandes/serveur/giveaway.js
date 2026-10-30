const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const rep = require('../../outils/reponses');
const { lireDuree, afficherDuree } = require('../../outils/duree');
const nv = require('../../outils/niveaux');
const couleurs = require('../../reglages/couleurs');
const textes = require('../../reglages/textes');
const gw = require('../../systemes/giveaways');
const bienvenue = require('../../systemes/bienvenue');
const { lireMessage } = require('./_outils');

const TYPES = { 'image/gif': 'gif', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
const E = MessageFlags.Ephemeral;

async function majMessage(client, g) {
  const canal = await client.channels.fetch(g.channelId).catch(() => null);
  const msg = await canal?.messages.fetch(g.messageId).catch(() => null);
  await msg?.edit({ embeds: [gw.embedGiveaway(g)] }).catch(() => {});
}
const ligneAnnuler = (id) => new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId(`giveaway:annuler:${id}`).setLabel('Annuler ma participation').setEmoji('🥀').setStyle(ButtonStyle.Danger));

module.exports = {
  data: new SlashCommandBuilder().setName('giveaway').setDescription('Crée et gère les giveaways')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((o) => o.setName('action').setDescription('Que faire ? (créer par défaut)').addChoices(
      { name: 'creer (lancer un giveaway)', value: 'creer' }, { name: 'terminer (tirer au sort tout de suite)', value: 'terminer' },
      { name: 'reroll (retirer un gagnant)', value: 'reroll' }, { name: 'annuler (supprimer sans gagnant)', value: 'annuler' },
      { name: 'liste (giveaways en cours)', value: 'liste' }, { name: 'banniere (changer l’image par défaut)', value: 'banniere' }))
    .addStringOption((o) => o.setName('lot').setDescription('Le lot à gagner (pour créer)'))
    .addStringOption((o) => o.setName('duree').setDescription('Exemples : 30m, 12h, 3j'))
    .addIntegerOption((o) => o.setName('gagnants').setDescription('Nombre de gagnants (1 par défaut)').setMinValue(1).setMaxValue(25))
    .addChannelOption((o) => o.setName('salon').setDescription('Où le poster (ici par défaut)').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
    .addStringOption((o) => o.setName('conditions').setDescription('Conditions écrites (ex : être abonné à mon TikTok)'))
    .addBooleanOption((o) => o.setName('bonus').setDescription('Les boosters ont 2 chances ?'))
    .addRoleOption((o) => o.setName('role').setDescription('Rôle obligatoire pour participer'))
    .addIntegerOption((o) => o.setName('niveau').setDescription('Niveau minimum pour participer').setMinValue(1).setMaxValue(500))
    .addStringOption((o) => o.setName('message').setDescription('ID ou lien du giveaway (pour terminer / reroll / annuler)'))
    .addAttachmentOption((o) => o.setName('fichier').setDescription('Image ou GIF de bannière (pour « banniere »)')),

  async execute(i) {
    const action = i.options.getString('action') || 'creer';

    if (action === 'liste') {
      const l = Object.values(gw.bd.data.liste).filter((g) => !g.termine);
      if (!l.length) return rep.repondre(i, rep.info('Aucun giveaway en cours 🌸'));
      return rep.repondre(i, new EmbedBuilder().setColor(couleurs.rose).setTitle('🎁 Giveaways en cours').setFooter({ text: textes.pied })
        .setDescription(l.map((g) => `**${g.lot}** · fin <t:${Math.floor(g.fin / 1000)}:R> · ${g.participants.length} participant(s)\nhttps://discord.com/channels/${i.guildId}/${g.channelId}/${g.messageId}`).join('\n\n')));
    }

    if (action === 'banniere') {
      const f = i.options.getAttachment('fichier'); const ext = f && TYPES[f.contentType?.split(';')[0]];
      fs.mkdirSync(bienvenue.DOSSIER_IMAGES, { recursive: true });
      for (const x of Object.values(TYPES)) fs.rmSync(path.join(bienvenue.DOSSIER_IMAGES, `giveaway.${x}`), { force: true });
      if (!f) return rep.repondre(i, rep.ok('Bannière par défaut retirée.'));
      if (!ext) return rep.repondre(i, rep.erreur('Joins un GIF, PNG, JPG ou WEBP.'));
      if (f.size > 8 * 1024 * 1024) return rep.repondre(i, rep.erreur('Fichier trop lourd (8 Mo maximum).'));
      await i.deferReply({ flags: E });
      const r = await fetch(f.url);
      fs.writeFileSync(path.join(bienvenue.DOSSIER_IMAGES, `giveaway.${ext}`), Buffer.from(await r.arrayBuffer()));
      return rep.repondre(i, rep.ok('Bannière enregistrée : elle sera sur tous les prochains giveaways 🎁'));
    }

    if (action === 'terminer' || action === 'reroll' || action === 'annuler') {
      const l = lireMessage(i.options.getString('message'), i.channelId);
      const g = l && gw.bd.data.liste[l.messageId];
      if (!g) return rep.repondre(i, rep.erreur("Je ne trouve pas ce giveaway. Donne l'ID ou le lien de son message."));
      if (action === 'terminer') {
        if (g.termine) return rep.repondre(i, rep.erreur('Ce giveaway est déjà terminé.'));
        await i.deferReply({ flags: E }); await gw.terminer(i.client, g);
        return rep.repondre(i, rep.ok('Giveaway terminé, gagnants tirés 🎉'));
      }
      if (action === 'reroll') {
        if (!g.termine) return rep.repondre(i, rep.erreur("Ce giveaway n'est pas encore terminé."));
        await i.deferReply({ flags: E });
        const nb = i.options.getInteger('gagnants') || 1;
        const nouveaux = await gw.tirer(i.guild, g, nb, g.gagnants);
        if (!nouveaux.length) return rep.repondre(i, rep.erreur('Plus personne à tirer au sort.'));
        g.gagnants = [...g.gagnants, ...nouveaux]; gw.bd.sauver();
        await gw.annoncerGagnants(i.client, g, nouveaux, true);
        return rep.repondre(i, rep.ok('Nouveau tirage effectué 🎉'));
      }
      g.termine = true; g.gagnants = []; gw.bd.sauver();
      const canal = await i.client.channels.fetch(g.channelId).catch(() => null);
      const m = await canal?.messages.fetch(g.messageId).catch(() => null); await m?.delete().catch(() => {});
      return rep.repondre(i, rep.ok('Giveaway annulé et supprimé.'));
    }

    // ----- créer -----
    const lot = i.options.getString('lot'); const ms = lireDuree(i.options.getString('duree'));
    if (!lot) return rep.repondre(i, rep.erreur('Il me faut le `lot`.'));
    if (!ms || ms < 30000 || ms > 60 * 86400000) return rep.repondre(i, rep.erreur('Durée invalide. Exemples : `30m`, `12h`, `3j` (de 30 secondes à 60 jours).'));
    const salon = i.options.getChannel('salon') || i.channel;
    await i.deferReply({ flags: E });
    const banniere = gw.fichierBanniere();
    const g = { guildId: i.guildId, channelId: salon.id, messageId: null, lot, fin: Date.now() + ms, nbGagnants: i.options.getInteger('gagnants') || 1,
      hoteId: i.user.id, conditions: i.options.getString('conditions'), bonusBoost: !!i.options.getBoolean('bonus'),
      roleRequis: i.options.getRole('role')?.id || null, niveauMin: i.options.getInteger('niveau') || null,
      participants: [], termine: false, gagnants: [], image: banniere?.nom || null };
    try {
      const msg = await salon.send({ embeds: [gw.embedGiveaway(g)], components: [gw.boutons(g)], files: banniere ? [banniere.fichier] : [] });
      g.messageId = msg.id; gw.bd.data.liste[msg.id] = g; gw.bd.sauver();
      await rep.repondre(i, rep.ok(`Giveaway lancé dans ${salon} pour **${afficherDuree(ms)}** → ${msg.url}${banniere ? '' : '\n*(Astuce : `/giveaway action:banniere fichier:` ajoute ta bannière à tous les giveaways.)*'}`));
    } catch { await rep.repondre(i, rep.erreur(`Je ne peux pas écrire dans ${salon}.`)); }
  },

  async composant(i) {
    if (!i.isButton()) return;
    const [, action, mid] = i.customId.split(':');
    if (action === 'part') {
      const g = gw.bd.data.liste[i.message.id];
      if (!g || g.termine) return rep.repondre(i, rep.erreur("Ce giveaway n'est plus disponible."));
      const bl = gw.estBlackliste(i.user.id);
      if (bl) return rep.repondre(i, rep.erreur(`Tu es blacklisté(e) des giveaways jusqu'au <t:${Math.floor(bl.endTimestamp / 1000)}:F>.`));
      if (g.roleRequis && !i.member.roles.cache.has(g.roleRequis)) return rep.repondre(i, rep.erreur(`Il te faut le rôle <@&${g.roleRequis}> pour participer.`));
      if (g.niveauMin && nv.infos(i.user.id).niveau < g.niveauMin) return rep.repondre(i, rep.erreur(`Il faut être au moins **niveau ${g.niveauMin}** (tu es niveau ${nv.infos(i.user.id).niveau}).`));
      if (g.participants.includes(i.user.id)) return i.reply({ embeds: [rep.info('Tu participes déjà à ce giveaway ✅')], components: [ligneAnnuler(g.messageId)], flags: E });
      g.participants.push(i.user.id); gw.bd.sauver();
      await i.message.edit({ embeds: [gw.embedGiveaway(g)] }).catch(() => {});
      return i.reply({ embeds: [rep.ok('Tu participes bien au giveaway, bonne chance ! 🌸')], components: [ligneAnnuler(g.messageId)], flags: E });
    }
    if (action === 'annuler') {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`giveaway:oui:${mid}`).setLabel('Oui, je ne veux plus participer').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`giveaway:non:${mid}`).setLabel('Non, je reste').setStyle(ButtonStyle.Secondary));
      return i.update({ embeds: [rep.info('Es-tu sûr(e) de vouloir annuler ta participation ?')], components: [row] });
    }
    if (action === 'non') return i.update({ embeds: [rep.ok('Pas de souci, tu participes toujours 🌸')], components: [] });
    if (action === 'oui') {
      const g = gw.bd.data.liste[mid];
      if (!g || g.termine) return i.update({ embeds: [rep.erreur("Ce giveaway n'est plus disponible.")], components: [] });
      g.participants = g.participants.filter((id) => id !== i.user.id); gw.bd.sauver();
      await majMessage(i.client, g);
      return i.update({ embeds: [rep.ok('Ta participation a bien été annulée.')], components: [] });
    }
  },
};
