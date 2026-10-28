const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, MessageFlags } = require('discord.js');
const rep = require('../../outils/reponses');
const couleurs = require('../../reglages/couleurs');
const textes = require('../../reglages/textes');
const sv = require('../../systemes/sauvegarde');

const joli = (nom) => { const d = sv.lire(nom); return `${nom.startsWith('auto') ? '🕐 auto' : '✋ manuelle'} · <t:${Math.floor(d.date / 1000)}:f> · ${d.roles.length} rôles · ${d.salons.length} salons`; };

module.exports = {
  data: new SlashCommandBuilder().setName('sauvegarde').setDescription('Sauvegarde et restaure la structure du serveur')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((o) => o.setName('action').setDescription('Que faire ?').setRequired(true).addChoices(
      { name: 'creer (sauvegarder maintenant)', value: 'creer' }, { name: 'liste (les sauvegardes)', value: 'liste' },
      { name: 'restaurer (recréer ce qui a été supprimé)', value: 'restaurer' }, { name: 'exporter (recevoir le fichier)', value: 'exporter' }, { name: 'supprimer', value: 'supprimer' }))
    .addStringOption((o) => o.setName('nom').setDescription('Quelle sauvegarde ? (la plus récente par défaut)').setAutocomplete(true)),

  async autocomplete(i) {
    const q = i.options.getFocused().toLowerCase();
    await i.respond(sv.fichiers().filter((f) => f.toLowerCase().includes(q)).slice(0, 25).map((f) => ({ name: f.replace('.json', ''), value: f }))).catch(() => {});
  },

  async execute(i) {
    const action = i.options.getString('action'); let nom = i.options.getString('nom');
    if (action === 'creer') {
      await i.deferReply({ flags: MessageFlags.Ephemeral });
      const { nom: n, data } = await sv.sauvegarder(i.guild, false);
      return rep.repondre(i, rep.ok(`Sauvegarde créée : **${data.roles.length} rôles**, **${data.salons.length} salons**, rôles de **${Object.keys(data.membres).length} membres**.\n\`${n}\``));
    }
    if (action === 'liste') {
      const l = sv.fichiers();
      return rep.repondre(i, l.length ? new EmbedBuilder().setColor(couleurs.rose).setTitle('💾 Sauvegardes').setFooter({ text: textes.pied })
        .setDescription(l.slice(0, 15).map(joli).join('\n') + '\n\n*Une sauvegarde automatique est faite chaque jour (les 7 dernières sont gardées).*') : rep.info('Aucune sauvegarde pour l’instant. `/sauvegarde action:creer`'));
    }
    nom = nom || sv.fichiers()[0];
    if (!nom || !sv.fichiers().includes(nom)) return rep.repondre(i, rep.erreur('Je ne trouve pas cette sauvegarde. `/sauvegarde action:liste`'));
    if (action === 'exporter') return i.reply({ content: '💾 Voici ta sauvegarde (garde-la précieusement) :', files: [new AttachmentBuilder(sv.chemin(nom), { name: nom })], flags: MessageFlags.Ephemeral });
    if (action === 'supprimer') { require('fs').rmSync(sv.chemin(nom), { force: true }); return rep.repondre(i, rep.ok('Sauvegarde supprimée.')); }
    // restaurer : on demande confirmation
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`sauvegarde:oui:${nom}`).setLabel('Oui, restaurer').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('sauvegarde:non').setLabel('Annuler').setStyle(ButtonStyle.Secondary));
    return i.reply({ flags: MessageFlags.Ephemeral, components: [row], embeds: [rep.info(`Je vais restaurer :\n${joli(nom)}\n\n✅ Je **recrée** seulement les rôles et salons qui n'existent plus (permissions comprises), je redonne les rôles recréés aux membres et je mets à jour mes réglages.\n🔒 Je **ne supprime rien** et je ne touche pas à ce qui existe déjà.`)] });
  },

  async composant(i) {
    if (!i.isButton()) return;
    const [, a, ...reste] = i.customId.split(':');
    if (a === 'non') return i.update({ embeds: [rep.info('Restauration annulée.')], components: [] });
    const nom = reste.join(':');
    await i.update({ embeds: [rep.info('Restauration en cours… ⏳')], components: [] });
    try {
      const r = await sv.restaurer(i.guild, sv.lire(nom));
      await i.editReply({ embeds: [rep.ok(`Restauration terminée 🌸\n• **${r.rolesCrees}** rôle(s) recréé(s)\n• **${r.salonsCrees}** salon(s) recréé(s)\n• rôles redonnés à **${r.rolesDonnes}** membre(s)\n• **${r.idsMisAJour}** réglage(s) mis à jour` +
        (r.echecs.length ? `\n\n⚠️ Échecs :\n${r.echecs.slice(0, 8).join('\n')}` : ''))] });
    } catch (e) { await i.editReply({ embeds: [rep.erreur(`Échec de la restauration : ${e.message}`)] }); }
  },
};
