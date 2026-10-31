// 🎙️ Salons vocaux temporaires : on entre dans un salon « + Créer », le bot crée le sien
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const rep = require('../../outils/reponses');
const { bd } = require('../../systemes/vocaux');

module.exports = {
  data: new SlashCommandBuilder().setName('vocal').setDescription('Salons vocaux temporaires')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand((s) => s.setName('activer').setDescription('Choisir le salon vocal « + Créer mon salon »')
      .addChannelOption((o) => o.setName('salon').setDescription('Un salon vocal : ceux qui y entrent reçoivent le leur').addChannelTypes(ChannelType.GuildVoice).setRequired(true))
      .addStringOption((o) => o.setName('nom').setDescription('Nom des salons créés, avec {pseudo} (défaut : 🍵・{pseudo})').setMaxLength(60)))
    .addSubcommand((s) => s.setName('desactiver').setDescription('Arrêter les salons vocaux temporaires'))
    .addSubcommand((s) => s.setName('etat').setDescription('Voir le réglage')),
  async execute(i) {
    const sub = i.options.getSubcommand();
    if (sub === 'activer') {
      bd.data.hubId = i.options.getChannel('salon').id;
      const nom = i.options.getString('nom'); if (nom) bd.data.modele = nom;
      bd.sauver();
      const moi = i.guild.members.me;
      const manque = !moi.permissions.has(PermissionFlagsBits.ManageChannels) || !moi.permissions.has(PermissionFlagsBits.MoveMembers);
      return rep.repondre(i, rep.ok(`Quand quelqu'un entre dans <#${bd.data.hubId}>, je lui crée son salon (**${bd.data.modele}**) et il disparaît quand tout le monde est parti 🎙️` +
        (manque ? '\n⚠️ Il me faut les permissions **Gérer les salons** et **Déplacer des membres**.' : '')));
    }
    if (sub === 'desactiver') { bd.data.hubId = null; bd.sauver(); return rep.repondre(i, rep.ok('Salons vocaux temporaires désactivés (ceux qui existent disparaîtront quand ils seront vides).')); }
    await rep.repondre(i, rep.info(bd.data.hubId ? `Salon « créer » : <#${bd.data.hubId}> · nom : **${bd.data.modele}** · salons actifs : ${bd.data.temporaires.length}` : "Pas encore réglé : `/vocal activer salon:#créer`"));
  },
};
