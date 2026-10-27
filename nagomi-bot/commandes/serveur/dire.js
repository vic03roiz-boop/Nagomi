const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const rep = require('../../outils/reponses');
const { journaliser } = require('../../outils/journal');
const { telecharger } = require('./_outils');

const enAttente = new Map();

async function envoyer(i, salonId, reponseId, texte, fichierJoint) {
  const canal = await i.guild.channels.fetch(salonId).catch(() => null);
  if (!canal) return rep.repondre(i, rep.erreur('Ce salon a disparu.'));
  const peutTout = i.memberPermissions.has(PermissionFlagsBits.MentionEveryone);
  const options = { content: texte, allowedMentions: { parse: peutTout ? ['users', 'roles', 'everyone'] : ['users', 'roles'] } };
  if (fichierJoint) options.files = [await telecharger(fichierJoint)];
  if (reponseId && reponseId !== '0') options.reply = { messageReference: reponseId, failIfNotExists: false };
  try {
    const m = await canal.send(options);
    await journaliser(i.guild, { titre: '💬 /dire utilisé', champs: [{ name: 'Par', value: `${i.user}`, inline: true }, { name: 'Salon', value: `${canal}`, inline: true }, { name: 'Message', value: texte.slice(0, 500) || '(fichier)' }] });
    return rep.repondre(i, rep.ok(`Message envoyé → ${m.url}`));
  } catch {
    return rep.repondre(i, rep.erreur(`Je ne peux pas écrire dans ${canal}.`));
  }
}

module.exports = {
  data: new SlashCommandBuilder().setName('dire').setDescription('Fait parler le bot (message simple, sans encadré)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((o) => o.setName('message').setDescription('Ton message (laisse vide pour écrire sur plusieurs lignes)'))
    .addChannelOption((o) => o.setName('salon').setDescription("Où l'envoyer (ici par défaut)").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
    .addAttachmentOption((o) => o.setName('fichier').setDescription('Une image ou un fichier à joindre'))
    .addStringOption((o) => o.setName('reponse').setDescription('ID du message auquel répondre')),
  async execute(i) {
    const salon = i.options.getChannel('salon') || i.channel;
    const texte = i.options.getString('message');
    const fichier = i.options.getAttachment('fichier');
    const reponse = i.options.getString('reponse') || '0';
    if (texte) { await i.deferReply({ flags: 64 }); return envoyer(i, salon.id, reponse, texte.replace(/\\n/g, '\n'), fichier); }
    enAttente.set(i.user.id, fichier);
    const modal = new ModalBuilder().setCustomId(`dire:ok:${salon.id}:${reponse}`).setTitle('Que dois-je dire ?')
      .addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('texte').setLabel('Ton message').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(2000)));
    await i.showModal(modal);
  },
  async composant(i) {
    if (!i.isModalSubmit()) return;
    const [, , salonId, reponseId] = i.customId.split(':');
    const fichier = enAttente.get(i.user.id); enAttente.delete(i.user.id);
    await i.deferReply({ flags: 64 });
    await envoyer(i, salonId, reponseId, i.fields.getTextInputValue('texte'), fichier);
  },
};
