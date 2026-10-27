const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const rep = require('../../outils/reponses');
const nv = require('../../outils/niveaux');
const parametres = require('../../outils/parametres');
const couleurs = require('../../reglages/couleurs');
const textes = require('../../reglages/textes');

module.exports = {
  data: new SlashCommandBuilder().setName('palier').setDescription('Rôles donnés automatiquement selon le niveau')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addStringOption((o) => o.setName('action').setDescription('Que faire ?').setRequired(true).addChoices(
      { name: 'ajouter (un niveau + un rôle)', value: 'ajouter' }, { name: 'retirer (un palier)', value: 'retirer' },
      { name: 'liste (voir les paliers)', value: 'liste' }, { name: 'mode (garder ou remplacer les anciens rôles)', value: 'mode' },
      { name: 'annonces (salon des messages de niveau)', value: 'annonces' }, { name: 'appliquer (remettre les rôles à tout le monde)', value: 'appliquer' },
      { name: 'test (voir un exemple d’annonce)', value: 'test' }))
    .addIntegerOption((o) => o.setName('niveau').setDescription('Le niveau à atteindre').setMinValue(1).setMaxValue(500))
    .addRoleOption((o) => o.setName('role').setDescription('Le rôle donné à ce niveau'))
    .addStringOption((o) => o.setName('choix').setDescription('Pour « mode » : remplacer = un seul rôle à la fois, garder = on les cumule')
      .addChoices({ name: 'remplacer (seul le dernier rôle est gardé)', value: 'remplacer' }, { name: 'garder (tous les rôles s’accumulent)', value: 'garder' }))
    .addChannelOption((o) => o.setName('salon').setDescription('Pour « annonces »').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)),
  async execute(i) {
    const action = i.options.getString('action');
    const niveau = i.options.getInteger('niveau');
    const role = i.options.getRole('role');

    if (action === 'liste') {
      const l = nv.paliers();
      const salon = parametres.lire('levelChannelId');
      const e = new EmbedBuilder().setColor(couleurs.rose).setTitle('📈 Paliers de niveau').setFooter({ text: textes.pied })
        .setDescription((l.length ? l.map((p) => `Niveau **${p.niveau}** → <@&${p.roleId}>`).join('\n') : "Aucun palier pour l'instant : `/palier action:ajouter`.") +
          `\n\n**Mode :** ${nv.mode() === 'remplacer' ? 'chaque palier remplace le précédent' : 'les rôles s’accumulent'}\n**Annonces :** ${salon ? `<#${salon}>` : 'dans le salon où la personne écrit'}`);
      return rep.repondre(i, e);
    }
    if (action === 'ajouter') {
      if (!niveau || !role) return rep.repondre(i, rep.erreur('Il me faut le `niveau` ET le `role`.'));
      if (role.managed || role.id === i.guild.id || role.position >= i.guild.members.me.roles.highest.position)
        return rep.repondre(i, rep.erreur(`Je ne peux pas donner **${role.name}** : mon rôle doit être **au-dessus** de lui dans la liste des rôles.`));
      nv.cfg.data.liste = nv.cfg.data.liste.filter((p) => p.niveau !== niveau && p.roleId !== role.id);
      nv.cfg.data.liste.push({ niveau, roleId: role.id });
      nv.cfg.sauver();
      return rep.repondre(i, rep.ok(`Niveau **${niveau}** → **${role.name}** 🌸\n*(Utilise \`/palier action:appliquer\` pour donner les rôles à ceux qui ont déjà ce niveau.)*`));
    }
    if (action === 'retirer') {
      if (!niveau && !role) return rep.repondre(i, rep.erreur('Donne le `niveau` ou le `role` du palier à retirer.'));
      const avant = nv.cfg.data.liste.length;
      nv.cfg.data.liste = nv.cfg.data.liste.filter((p) => !(niveau && p.niveau === niveau) && !(role && p.roleId === role.id));
      nv.cfg.sauver();
      return rep.repondre(i, avant === nv.cfg.data.liste.length ? rep.erreur('Aucun palier trouvé.') : rep.ok('Palier retiré.'));
    }
    if (action === 'mode') {
      const choix = i.options.getString('choix');
      if (!choix) return rep.repondre(i, rep.erreur('Choisis `remplacer` ou `garder` dans l’option **choix**.'));
      nv.cfg.data.mode = choix; nv.cfg.sauver();
      return rep.repondre(i, rep.ok(choix === 'remplacer' ? 'Chaque nouveau palier **remplace** le rôle précédent.' : 'Les rôles de paliers **s’accumulent**.'));
    }
    if (action === 'annonces') {
      const salon = i.options.getChannel('salon');
      parametres.ecrire('levelChannelId', salon?.id || null);
      return rep.repondre(i, rep.ok(salon ? `Les passages de niveau seront annoncés dans ${salon}.` : 'Les annonces se feront dans le salon où la personne écrit.'));
    }
    if (action === 'test') {
      const id = parametres.lire('levelChannelId');
      const salon = (id && await i.guild.channels.fetch(id).catch(() => null)) || i.channel;
      const [d1, d2] = textes.deco;
      const palier = nv.paliers().find((p) => p.niveau === (niveau || 0)) || nv.paliers()[0];
      const e = new EmbedBuilder().setColor(couleurs.rose).setThumbnail(i.user.displayAvatarURL({ size: 128 }))
        .setDescription(`${d1}\n${i.user}, tu viens de passer au niveau **${palier?.niveau || niveau || 5}** ! 🌸\n${d2}` +
          (palier ? `\n\n✨ Nouveau rôle : <@&${palier.roleId}>` : '')).setFooter({ text: textes.pied });
      await salon.send({ content: `${i.user} *(test)*`, embeds: [e], allowedMentions: { users: [i.user.id] } });
      return rep.repondre(i, rep.ok(`Exemple envoyé dans ${salon}.`));
    }
    // appliquer : met les rôles à jour pour tout le monde
    await i.deferReply({ flags: 64 });
    const membres = await i.guild.members.fetch();
    let n = 0;
    for (const m of membres.values()) {
      if (m.user.bot) continue;
      const d = nv.infos(m.id);
      if (!d.xp) continue;
      await nv.synchroniser(m, d.niveau); n++;
    }
    await rep.repondre(i, rep.ok(`Rôles mis à jour pour **${n}** membre(s).`));
  },
};
