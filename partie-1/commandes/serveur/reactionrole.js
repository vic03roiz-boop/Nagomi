const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const rep = require('../../outils/reponses');
const couleurs = require('../../reglages/couleurs');
const { ouvrir } = require('../../outils/stockage');
const { lireMessage, lireEmoji } = require('./_outils');

// { idMessage: { channelId, roles: { cleEmoji: idRole } } }  — lu aussi par systemes/roles-reactions
const bd = ouvrir('rolesreactions', {});

module.exports = {
  bd,
  data: new SlashCommandBuilder().setName('reactionrole').setDescription("Donne un rôle quand on clique sur une réaction")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addStringOption((o) => o.setName('action').setDescription('Que faire ?').setRequired(true).addChoices(
      { name: 'ajouter', value: 'ajouter' }, { name: 'retirer', value: 'retirer' }, { name: 'liste', value: 'liste' }))
    .addStringOption((o) => o.setName('message').setDescription('ID ou lien du message qui portera la réaction'))
    .addStringOption((o) => o.setName('emoji').setDescription('La réaction (ex : 🌸 ou un émoji du serveur)'))
    .addRoleOption((o) => o.setName('role').setDescription('Le rôle à donner'))
    .addChannelOption((o) => o.setName('salon').setDescription("Salon du message (si tu donnes juste l'ID)").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)),
  async execute(i) {
    const action = i.options.getString('action');

    if (action === 'liste') {
      const lignes = [];
      for (const [msgId, d] of Object.entries(bd.data)) {
        const paires = Object.entries(d.roles).map(([cle, r]) => {
          const emoji = /^\d+$/.test(cle) ? (i.guild.emojis.cache.get(cle)?.toString() || `:${cle}:`) : cle;
          return `${emoji} → <@&${r}>`;
        });
        lignes.push(`https://discord.com/channels/${i.guildId}/${d.channelId}/${msgId}\n${paires.join('\n')}`);
      }
      if (!lignes.length) return rep.repondre(i, rep.info("Aucun rôle-réaction pour l'instant. Utilise `/reactionrole action:ajouter`."));
      return rep.repondre(i, new EmbedBuilder().setColor(couleurs.rose).setTitle('🌸 Rôles-réactions').setDescription(lignes.join('\n\n').slice(0, 4000)));
    }

    const ref = lireMessage(i.options.getString('message'), (i.options.getChannel('salon') || i.channel).id);
    const emoji = lireEmoji(i.options.getString('emoji'));
    if (!ref) return rep.repondre(i, rep.erreur("Il me faut le `message` (ID ou lien : clique-droit → *Copier le lien du message*)."));
    if (!emoji) return rep.repondre(i, rep.erreur('Il me faut l\'`emoji`.'));
    const canal = await i.guild.channels.fetch(ref.channelId).catch(() => null);
    const message = await canal?.messages.fetch(ref.messageId).catch(() => null);
    if (!message) return rep.repondre(i, rep.erreur("Je ne trouve pas ce message. Si tu donnes seulement l'ID, précise aussi le `salon`."));

    if (action === 'retirer') {
      const d = bd.data[message.id];
      if (!d?.roles[emoji.cle]) return rep.repondre(i, rep.erreur("Cette réaction n'est pas configurée sur ce message."));
      delete d.roles[emoji.cle];
      if (!Object.keys(d.roles).length) delete bd.data[message.id];
      bd.sauver();
      await message.reactions.cache.get(emoji.cle)?.users.remove(i.client.user.id).catch(() => {});
      return rep.repondre(i, rep.ok('Rôle-réaction retiré.'));
    }

    // ajouter
    const role = i.options.getRole('role');
    if (!role) return rep.repondre(i, rep.erreur('Il me faut le `role` à donner.'));
    if (role.managed || role.id === i.guild.id) return rep.repondre(i, rep.erreur('Ce rôle ne peut pas être donné automatiquement.'));
    if (role.position >= i.guild.members.me.roles.highest.position)
      return rep.repondre(i, rep.erreur(`Mon rôle est en dessous de **${role.name}**. Dans *Paramètres du serveur → Rôles*, glisse mon rôle au-dessus.`));
    try { await message.react(emoji.aReagir); }
    catch { return rep.repondre(i, rep.erreur("Je n'arrive pas à réagir avec cet émoji (il doit être d'ici ou un émoji classique).")); }
    const d = (bd.data[message.id] ||= { channelId: message.channelId, roles: {} });
    d.roles[emoji.cle] = role.id;
    bd.sauver();
    await rep.repondre(i, rep.ok(`C'est réglé : réagir avec ${i.options.getString('emoji')} donne **${role.name}** ${message.url}`));
  },
};
