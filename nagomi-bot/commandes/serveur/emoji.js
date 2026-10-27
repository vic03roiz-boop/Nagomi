const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const rep = require('../../outils/reponses');
const { journaliser } = require('../../outils/journal');
const { lireEmoji } = require('./_outils');

const TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

module.exports = {
  data: new SlashCommandBuilder().setName('emoji').setDescription('Gère les émojis du serveur (ajouter, supprimer, lister)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuildExpressions)
    .addStringOption((o) => o.setName('action').setDescription('Que faire ? (ajouter par défaut)').addChoices(
      { name: 'ajouter', value: 'ajouter' }, { name: 'supprimer', value: 'supprimer' }, { name: 'liste', value: 'liste' }))
    .addStringOption((o) => o.setName('nom').setDescription('Le nom de l’émoji (lettres, chiffres, _)'))
    .addAttachmentOption((o) => o.setName('image').setDescription('Une image (PNG, JPG, GIF ; 256 Ko max)'))
    .addStringOption((o) => o.setName('emoji').setDescription('OU colle ici un émoji venant d’un autre serveur'))
    .addStringOption((o) => o.setName('lien').setDescription('OU un lien direct vers une image')),
  async execute(i) {
    const action = i.options.getString('action') || 'ajouter';
    const nomBrut = i.options.getString('nom');

    if (action === 'liste') {
      const tous = [...i.guild.emojis.cache.values()];
      if (!tous.length) return rep.repondre(i, rep.info("Le serveur n'a pas encore d'émoji."));
      return rep.repondre(i, rep.info(`**${tous.length} émoji(s)** : ${tous.map((e) => e.toString()).join(' ').slice(0, 3800)}`));
    }

    if (action === 'supprimer') {
      const lu = lireEmoji(nomBrut);
      const cible = lu?.custom ? i.guild.emojis.cache.get(lu.id) : i.guild.emojis.cache.find((e) => e.name === nomBrut);
      if (!cible) return rep.repondre(i, rep.erreur("Je ne trouve pas cet émoji. Donne son nom exact ou colle-le."));
      await cible.delete(`${i.user.tag}`);
      await journaliser(i.guild, { titre: '🗑️ Émoji supprimé', champs: [{ name: 'Nom', value: cible.name, inline: true }, { name: 'Par', value: `${i.user}`, inline: true }] });
      return rep.repondre(i, rep.ok(`Émoji **${cible.name}** supprimé.`));
    }

    // ajouter
    const image = i.options.getAttachment('image');
    const collé = lireEmoji(i.options.getString('emoji'));
    const lien = i.options.getString('lien');
    let source = null, nomAuto = null;
    if (image) {
      if (!TYPES.includes(image.contentType)) return rep.repondre(i, rep.erreur('Le fichier doit être une image PNG, JPG, GIF ou WEBP.'));
      if (image.size > 256 * 1024) return rep.repondre(i, rep.erreur(`Image trop lourde (${Math.ceil(image.size / 1024)} Ko). Discord accepte 256 Ko maximum : réduis-la sur squoosh.app.`));
      source = image.url; nomAuto = image.name.replace(/\.[^.]+$/, '');
    } else if (collé?.custom) {
      source = `https://cdn.discordapp.com/emojis/${collé.id}.${collé.anime ? 'gif' : 'png'}?size=128`; nomAuto = collé.nom;
    } else if (lien && /^https?:\/\//i.test(lien)) {
      source = lien; nomAuto = 'emoji';
    } else return rep.repondre(i, rep.erreur("Donne-moi une `image`, un `emoji` d'un autre serveur, ou un `lien`."));

    const nom = (nomBrut || nomAuto).replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 32).padEnd(2, '_');
    await i.deferReply({ flags: 64 });
    try {
      const e = await i.guild.emojis.create({ attachment: source, name: nom, reason: `${i.user.tag}` });
      await journaliser(i.guild, { titre: '✨ Émoji ajouté', champs: [{ name: 'Émoji', value: `${e} \`:${e.name}:\``, inline: true }, { name: 'Par', value: `${i.user}`, inline: true }] });
      await rep.repondre(i, rep.ok(`Émoji ajouté : ${e} \`:${e.name}:\``));
    } catch (err) {
      const raisons = /Maximum number/i.test(err.message) ? "Le serveur n'a plus de place pour des émojis (booste-le pour en avoir plus)."
        : /Missing Permissions/i.test(err.message) ? "Il me manque la permission *Gérer les émojis et stickers*."
        : "Discord a refusé cette image (trop lourde ou format non valide).";
      await rep.repondre(i, rep.erreur(raisons));
    }
  },
};
