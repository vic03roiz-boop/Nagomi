const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, MessageFlags } = require('discord.js');
const rep = require('../../outils/reponses');
const couleurs = require('../../reglages/couleurs');
const parametres = require('../../outils/parametres');
const plan = require('../../reglages/structure');

const TYPES = { texte: ChannelType.GuildText, annonce: ChannelType.GuildAnnouncement, vocal: ChannelType.GuildVoice };
const P = PermissionFlagsBits;

function apercu() {
  const nbSalons = plan.categories.reduce((n, c) => n + c.salons.length, 0);
  return new EmbedBuilder().setColor(couleurs.rose).setTitle('🏗️ Création de la structure de Nagomi')
    .setDescription(
      `Je vais **créer** :\n• **${plan.roles.length} rôles** : ${plan.roles.map((r) => `\`${r.nom}\``).join(', ')}\n` +
      `• **${plan.categories.length} catégories** et **${nbSalons} salons**, avec leurs permissions\n\n` +
      plan.categories.map((c) => `**${c.nom}**\n${c.salons.map((s) => `　${s.nom}`).join('\n')}`).join('\n\n') +
      `\n\n✅ Je ne **supprime rien** et je saute ce qui existe déjà (même nom).\n💡 Tu peux changer le plan dans \`reglages/structure.js\` avant de continuer.`);
}

async function construire(guild) {
  const fait = [], existe = [], echecs = [];
  const roles = {};
  for (const def of plan.roles) {
    let r = guild.roles.cache.find((x) => x.name === def.nom);
    if (r) existe.push(`rôle ${def.nom}`);
    else {
      r = await guild.roles.create({ name: def.nom, color: def.couleur, hoist: !!def.hoist, mentionable: !!def.mentionnable,
        permissions: def.perms.map((p) => P[p]).filter(Boolean), reason: '/setup Nagomi' }).catch((e) => { echecs.push(`rôle ${def.nom} : ${e.message}`); return null; });
      if (r) fait.push(`rôle ${def.nom}`);
    }
    if (r && def.cle) { roles[def.cle] = r; parametres.ecrire(def.cle, r.id); }
  }
  const equipe = roles.staffRoleId, membre = roles.memberRoleId;
  const tout = guild.roles.everyone;

  for (const cat of plan.categories) {
    // qui voit la catégorie
    const base = [];
    if (cat.acces === 'membres') {
      base.push({ id: tout.id, deny: [P.ViewChannel] });
      if (membre) base.push({ id: membre.id, allow: [P.ViewChannel] });
      if (equipe) base.push({ id: equipe.id, allow: [P.ViewChannel] });
    } else if (cat.acces === 'equipe') {
      base.push({ id: tout.id, deny: [P.ViewChannel] });
      if (equipe) base.push({ id: equipe.id, allow: [P.ViewChannel] });
    }
    let parent = guild.channels.cache.find((c) => c.type === ChannelType.GuildCategory && c.name === cat.nom);
    if (parent) existe.push(`catégorie ${cat.nom}`);
    else {
      parent = await guild.channels.create({ name: cat.nom, type: ChannelType.GuildCategory, permissionOverwrites: base, reason: '/setup Nagomi' })
        .catch((e) => { echecs.push(`catégorie ${cat.nom} : ${e.message}`); return null; });
      if (parent) fait.push(`catégorie ${cat.nom}`);
    }
    if (!parent) continue;

    for (const s of cat.salons) {
      let salon = guild.channels.cache.find((c) => c.parentId === parent.id && c.name === s.nom.toLowerCase().replace(/\s+/g, '-'))
        || guild.channels.cache.find((c) => c.parentId === parent.id && c.name === s.nom);
      if (salon) existe.push(`salon ${s.nom}`);
      else {
        const overwrites = base.map((o) => ({ ...o }));
        if (s.lecture) {
          const ev = overwrites.find((o) => o.id === tout.id);
          if (ev) ev.deny = [...(ev.deny || []), P.SendMessages];
          else overwrites.push({ id: tout.id, deny: [P.SendMessages] });
          if (equipe) {
            const eq = overwrites.find((o) => o.id === equipe.id);
            if (eq) eq.allow = [...(eq.allow || []), P.SendMessages];
            else overwrites.push({ id: equipe.id, allow: [P.ViewChannel, P.SendMessages] });
          }
        }
        const type = TYPES[s.type] ?? ChannelType.GuildText;
        const creer = (t) => guild.channels.create({ name: s.nom, type: t, parent: parent.id, permissionOverwrites: overwrites, reason: '/setup Nagomi' });
        salon = await creer(type).catch(async (e) => {
          if (type === ChannelType.GuildAnnouncement) return creer(ChannelType.GuildText).catch((e2) => { echecs.push(`salon ${s.nom} : ${e2.message}`); return null; });
          echecs.push(`salon ${s.nom} : ${e.message}`); return null;
        });
        if (salon) fait.push(`salon ${s.nom}`);
      }
      if (salon && s.cle) parametres.ecrire(s.cle, salon.id);
    }
  }
  return { fait, existe, echecs };
}

module.exports = {
  data: new SlashCommandBuilder().setName('setup').setDescription('Crée les rôles, catégories et salons de Nagomi en un clic')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(i) {
    const boutons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`setup:go:${i.user.id}`).setLabel('Créer la structure').setEmoji('🍵').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`setup:non:${i.user.id}`).setLabel('Annuler').setStyle(ButtonStyle.Secondary));
    await i.reply({ embeds: [apercu()], components: [boutons], flags: MessageFlags.Ephemeral });
  },
  async composant(i) {
    if (!i.isButton()) return;
    const [, action, userId] = i.customId.split(':');
    if (i.user.id !== userId || !i.memberPermissions.has(PermissionFlagsBits.Administrator)) return;
    if (action === 'non') return i.update({ embeds: [rep.info('Annulé, rien n’a été créé.')], components: [] });
    await i.update({ embeds: [rep.info('Création en cours… ça prend environ une minute ☕')], components: [] });
    const { fait, existe, echecs } = await construire(i.guild);
    const e = new EmbedBuilder().setColor(echecs.length ? couleurs.miel : couleurs.ok).setTitle('🍵 Structure terminée')
      .setDescription(`✅ **${fait.length}** créé(s) · ⏭️ **${existe.length}** déjà présent(s)${echecs.length ? ` · ⚠️ **${echecs.length}** échec(s)` : ''}`);
    if (echecs.length) e.addFields({ name: 'Problèmes', value: echecs.slice(0, 8).join('\n').slice(0, 1000) + '\n*Souvent : il manque la permission « Gérer les salons/rôles » au bot, ou son rôle est trop bas.*' });
    e.addFields({ name: 'Étape suivante', value: 'Écris le règlement avec `/embed`, puis donne le rôle **✦ Membre** avec `/reactionrole` sur le règlement. Tu peux vérifier les salons liés avec `/config`.' });
    await i.editReply({ embeds: [e], components: [] });
  },
};
