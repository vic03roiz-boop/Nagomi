const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const rep = require('../../outils/reponses');
const { journaliser } = require('../../outils/journal');
const couleurs = require('../../reglages/couleurs');
const { lireMessage, telecharger } = require('./_outils');

const enAttente = new Map(); // images choisies dans la commande, gardées en attendant le formulaire
const ligne = (champ) => new ActionRowBuilder().addComponents(champ);
const champ = (id, label, style, requis, valeur, max) => {
  const t = new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(style).setRequired(requis).setMaxLength(max);
  if (valeur) t.setValue(String(valeur).slice(0, max));
  return ligne(t);
};

module.exports = {
  data: new SlashCommandBuilder().setName('embed').setDescription('Crée (ou modifie) un joli message encadré')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addChannelOption((o) => o.setName('salon').setDescription("Où l'envoyer (ici par défaut)").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
    .addStringOption((o) => o.setName('message').setDescription("Pour MODIFIER un de mes embeds : son ID ou son lien"))
    .addAttachmentOption((o) => o.setName('image').setDescription('Grande image en bas'))
    .addAttachmentOption((o) => o.setName('miniature').setDescription('Petite image en haut à droite')),
  async execute(i) {
    const salon = i.options.getChannel('salon') || i.channel;
    let existant = null;
    const ref = i.options.getString('message');
    if (ref) {
      const l = lireMessage(ref, salon.id);
      if (!l) return rep.repondre(i, rep.erreur("Je ne comprends pas ce message. Donne son ID ou clique-droit → *Copier le lien du message*."));
      const canal = await i.guild.channels.fetch(l.channelId).catch(() => null);
      existant = await canal?.messages.fetch(l.messageId).catch(() => null);
      if (!existant || existant.author.id !== i.client.user.id || !existant.embeds[0])
        return rep.repondre(i, rep.erreur("Je ne trouve pas d'embed envoyé par moi avec cet ID."));
    }
    enAttente.set(i.user.id, { image: i.options.getAttachment('image'), miniature: i.options.getAttachment('miniature') });
    const e = existant?.embeds[0];
    const modal = new ModalBuilder().setCustomId(`embed:ok:${existant ? existant.channelId : salon.id}:${existant?.id || 0}`)
      .setTitle(existant ? "Modifier l'embed" : 'Créer un embed')
      .addComponents(
        champ('titre', 'Titre', TextInputStyle.Short, false, e?.title, 256),
        champ('description', 'Texte', TextInputStyle.Paragraph, false, e?.description, 4000),
        champ('couleur', 'Couleur (code hex, ex : f4b0b0)', TextInputStyle.Short, false, e?.color ? e.color.toString(16).padStart(6, '0') : '', 7),
        champ('pied', 'Petit texte du bas', TextInputStyle.Short, false, e?.footer?.text, 256),
        champ('lien_image', "Lien d'une image (facultatif)", TextInputStyle.Short, false, '', 500),
      );
    await i.showModal(modal);
  },

  async composant(i) {
    if (!i.isModalSubmit()) return;
    const [, , salonId, msgId] = i.customId.split(':');
    const titre = i.fields.getTextInputValue('titre').trim();
    const description = i.fields.getTextInputValue('description').trim();
    const couleurTxt = i.fields.getTextInputValue('couleur').trim().replace('#', '');
    const pied = i.fields.getTextInputValue('pied').trim();
    const lien = i.fields.getTextInputValue('lien_image').trim();
    if (!titre && !description) return rep.repondre(i, rep.erreur('Il faut au moins un titre ou un texte.'));
    if (couleurTxt && !/^[0-9a-f]{6}$/i.test(couleurTxt)) return rep.repondre(i, rep.erreur('Couleur invalide : utilise 6 caractères, par exemple `f4b0b0`.'));
    if (lien && !/^https?:\/\//i.test(lien)) return rep.repondre(i, rep.erreur("Le lien de l'image doit commencer par https://"));
    await i.deferReply({ flags: 64 });

    const pj = enAttente.get(i.user.id) || {}; enAttente.delete(i.user.id);
    const canal = await i.guild.channels.fetch(salonId).catch(() => null);
    if (!canal) return rep.repondre(i, rep.erreur('Ce salon a disparu.'));
    const existant = msgId !== '0' ? await canal.messages.fetch(msgId).catch(() => null) : null;

    const e = new EmbedBuilder().setColor(couleurTxt ? parseInt(couleurTxt, 16) : (existant?.embeds[0]?.color ?? couleurs.rose));
    if (titre) e.setTitle(titre);
    if (description) e.setDescription(description);
    if (pied) e.setFooter({ text: pied });
    const fichiers = [];
    try {
      if (pj.image) { const f = await telecharger(pj.image); fichiers.push(f); e.setImage(`attachment://${f.name}`); }
      else if (lien) e.setImage(lien);
      else if (existant?.embeds[0]?.image?.url) e.setImage(existant.embeds[0].image.url);
      if (pj.miniature) { const f = await telecharger(pj.miniature); fichiers.push(f); e.setThumbnail(`attachment://${f.name}`); }
      else if (existant?.embeds[0]?.thumbnail?.url) e.setThumbnail(existant.embeds[0].thumbnail.url);
    } catch { return rep.repondre(i, rep.erreur("Je n'ai pas réussi à récupérer l'image. Réessaie.")); }

    try {
      const envoye = existant
        ? await existant.edit({ embeds: [e], ...(fichiers.length ? { files: fichiers, attachments: [] } : {}) })
        : await canal.send({ embeds: [e], files: fichiers });
      await journaliser(i.guild, { titre: existant ? '✏️ Embed modifié' : '💌 Embed envoyé', champs: [{ name: 'Salon', value: `${canal}`, inline: true }, { name: 'Par', value: `${i.user}`, inline: true }] });
      await rep.repondre(i, rep.ok(`${existant ? 'Embed modifié' : 'Embed envoyé'} → ${envoye.url}`));
    } catch (err) {
      await rep.repondre(i, rep.erreur(`Je ne peux pas écrire dans ${canal} (il me faut les permissions *Envoyer des messages* et *Intégrer des liens*).`));
    }
  },
};
