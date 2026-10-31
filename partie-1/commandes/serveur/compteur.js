// 🔢 Compteur de membres dans le nom d'un salon vocal
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const rep = require('../../outils/reponses');
const { bd, majCompteurs } = require('../../systemes/vocaux');

module.exports = {
  data: new SlashCommandBuilder().setName('compteur').setDescription('Affiche le nombre de membres dans le nom d\'un salon')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand((s) => s.setName('ajouter').setDescription('Transformer un salon en compteur de membres')
      .addChannelOption((o) => o.setName('salon').setDescription('Un salon vocal (personne ne pourra y entrer)').addChannelTypes(ChannelType.GuildVoice).setRequired(true))
      .addStringOption((o) => o.setName('modele').setDescription('Le nom, avec {n} pour le nombre (défaut : 🌸・Membres : {n})').setMaxLength(80)))
    .addSubcommand((s) => s.setName('retirer').setDescription('Arrêter un compteur')
      .addChannelOption((o) => o.setName('salon').setDescription('Le salon').addChannelTypes(ChannelType.GuildVoice).setRequired(true))),
  async execute(i) {
    const salon = i.options.getChannel('salon');
    if (i.options.getSubcommand() === 'retirer') {
      bd.data.compteurs = bd.data.compteurs.filter((c) => c.channelId !== salon.id); bd.sauver();
      return rep.repondre(i, rep.ok(`${salon} n'est plus un compteur (renomme-le comme tu veux).`));
    }
    await i.deferReply({ flags: 64 });
    const modele = i.options.getString('modele') || '🌸・Membres : {n}';
    if (!modele.includes('{n}')) return rep.repondre(i, rep.erreur('Le modèle doit contenir `{n}` (le nombre de membres).'));
    bd.data.compteurs = bd.data.compteurs.filter((c) => c.channelId !== salon.id);
    bd.data.compteurs.push({ channelId: salon.id, modele }); bd.sauver();
    await salon.permissionOverwrites.edit(i.guild.id, { Connect: false }, { reason: 'Compteur de membres' }).catch(() => {});
    await majCompteurs(i.client);
    await rep.repondre(i, rep.ok(`Compteur prêt : ${salon.name} 🔢 Il se met à jour toutes les 10 minutes (limite de Discord). J'ai aussi fermé l'accès à ce salon vocal.`));
  },
};
