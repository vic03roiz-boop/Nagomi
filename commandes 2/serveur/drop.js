const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const rep = require('../../outils/reponses');
const dr = require('../../systemes/drops');

module.exports = {
  data: new SlashCommandBuilder().setName('drop').setDescription('Offre un lot au premier membre qui clique')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((o) => o.setName('lot').setDescription('Ce que tu veux faire gagner').setRequired(true))
    .addChannelOption((o) => o.setName('salon').setDescription('Où le poster (ici par défaut)').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)),

  async execute(i) {
    const salon = i.options.getChannel('salon') || i.channel;
    await i.deferReply({ flags: MessageFlags.Ephemeral });
    const d = { lot: i.options.getString('lot'), hoteId: i.user.id, channelId: salon.id, messageId: null,
      fin: Date.now() + dr.DUREE, etat: 'ouvert', gagnantId: null };
    try {
      const msg = await salon.send({ embeds: [dr.embedDrop(d)], components: [dr.bouton()] });
      d.messageId = msg.id; dr.bd.data.liste[msg.id] = d; dr.bd.sauver();
      await rep.repondre(i, rep.ok(`Drop publié dans ${salon} 🎁`));
    } catch { await rep.repondre(i, rep.erreur(`Je ne peux pas écrire dans ${salon}.`)); }
  },

  async composant(i) {
    if (!i.isButton() || i.customId !== 'drop:prendre') return;
    const d = dr.bd.data.liste[i.message.id];
    if (!d || d.etat !== 'ouvert' || d.fin <= Date.now()) return rep.repondre(i, rep.erreur('Trop tard, ce drop est terminé 🥀'));
    d.etat = 'gagne'; d.gagnantId = i.user.id; dr.bd.sauver();   // le 1er à passer ici gagne (JS = un seul à la fois)
    await i.update({ embeds: [dr.embedDrop(d, 'gagne')], components: [] });
    await i.channel.send({ content: dr.messageGagnant(d), allowedMentions: { users: [i.user.id] } }).catch(() => {});
  },
};
