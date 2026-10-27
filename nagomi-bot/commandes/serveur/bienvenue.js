const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const rep = require('../../outils/reponses');
const parametres = require('../../outils/parametres');
const sys = require('../../systemes/bienvenue');

const TYPES = { 'image/gif': 'gif', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

module.exports = {
  data: new SlashCommandBuilder().setName('bienvenue').setDescription("Règle les messages d'arrivée et de départ")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((o) => o.setName('action').setDescription('Que faire ?').setRequired(true).addChoices(
      { name: 'salon (où poster les bienvenues)', value: 'salon' }, { name: 'aurevoir (où poster les au revoir)', value: 'aurevoir' },
      { name: 'image (changer le GIF / l’image)', value: 'image' }, { name: 'apercu (voir les messages, juste pour toi)', value: 'apercu' },
      { name: 'retirer (enlever l’image)', value: 'retirer' }))
    .addChannelOption((o) => o.setName('salon').setDescription('Le salon (pour « salon » et « aurevoir »)').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
    .addStringOption((o) => o.setName('pour').setDescription('Pour « image » / « retirer » : bienvenue ou au revoir ?').addChoices(
      { name: 'bienvenue', value: 'bienvenue' }, { name: 'au revoir', value: 'aurevoir' }))
    .addAttachmentOption((o) => o.setName('fichier').setDescription('Le GIF ou l’image (8 Mo max)')),
  async execute(i) {
    const action = i.options.getString('action');
    const salon = i.options.getChannel('salon');

    if (action === 'salon' || action === 'aurevoir') {
      if (!salon) return rep.repondre(i, rep.erreur('Choisis le `salon`.'));
      parametres.ecrire(action === 'salon' ? 'welcomeChannelId' : 'goodbyeChannelId', salon.id);
      return rep.repondre(i, rep.ok(`Les ${action === 'salon' ? 'bienvenues' : 'au revoir'} seront postés dans ${salon}.`));
    }
    if (action === 'image' || action === 'retirer') {
      const pour = i.options.getString('pour');
      if (!pour) return rep.repondre(i, rep.erreur('Précise `pour` : bienvenue ou au revoir.'));
      fs.mkdirSync(sys.DOSSIER_IMAGES, { recursive: true });
      for (const ext of Object.values(TYPES)) fs.rmSync(path.join(sys.DOSSIER_IMAGES, `${pour}.${ext}`), { force: true });
      if (action === 'retirer') return rep.repondre(i, rep.ok('Image retirée (si le dossier images/ du bot en contient une, elle reste utilisée).'));
      const f = i.options.getAttachment('fichier');
      const ext = f && TYPES[f.contentType?.split(';')[0]];
      if (!ext) return rep.repondre(i, rep.erreur('Joins un GIF, PNG, JPG ou WEBP dans l’option `fichier`.'));
      if (f.size > 8 * 1024 * 1024) return rep.repondre(i, rep.erreur(`Fichier trop lourd (${(f.size / 1048576).toFixed(1)} Mo). Maximum : 8 Mo.`));
      await i.deferReply({ flags: 64 });
      const r = await fetch(f.url);
      if (!r.ok) return rep.repondre(i, rep.erreur('Je n’ai pas réussi à récupérer le fichier.'));
      fs.writeFileSync(path.join(sys.DOSSIER_IMAGES, `${pour}.${ext}`), Buffer.from(await r.arrayBuffer()));
      return rep.repondre(i, rep.ok(`Image de ${pour === 'bienvenue' ? 'bienvenue' : 'au revoir'} enregistrée. Utilise \`/bienvenue action:apercu\` pour la voir.`));
    }
    // aperçu (visible seulement par toi)
    const membre = i.member;
    const b = sys.construire('bienvenue', membre), a = sys.construire('aurevoir', membre);
    const [salonB, salonA] = [parametres.lire('welcomeChannelId'), parametres.lire('goodbyeChannelId')];
    await i.reply({ content: `**Bienvenue** → ${salonB ? `<#${salonB}>` : '⚠️ salon non défini (`action:salon`)'}`, ...b, flags: 64 });
    await i.followUp({ content: `**Au revoir** → ${salonA ? `<#${salonA}>` : '⚠️ salon non défini (`action:aurevoir`)'}`, ...a, flags: 64 });
  },
};
