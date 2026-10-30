// 📣 Messages automatiques répétés (rappel anti-arnaque, annonces…)
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const rep = require('../../outils/reponses');
const textes = require('../../reglages/textes');
const { estStaff } = require('../../outils/permissions');
const r = require('../../systemes/rappels');
const NOMS = { '6h': 'toutes les 6 heures', '12h': 'toutes les 12 heures', jour: 'chaque jour', semaine: 'chaque semaine' };

module.exports = {
  data: new SlashCommandBuilder().setName('auto').setDescription('Messages automatiques qui reviennent régulièrement')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand((s) => s.setName('ajouter').setDescription('Programmer un message')
      .addChannelOption((o) => o.setName('salon').setDescription('Où l\'envoyer').setRequired(true))
      .addStringOption((o) => o.setName('message').setDescription('Le texte (écris \\n pour passer à la ligne)').setRequired(true).setMaxLength(1500))
      .addStringOption((o) => o.setName('frequence').setDescription('À quel rythme ?').setRequired(true)
        .addChoices(...Object.entries(NOMS).map(([value, name]) => ({ name, value }))))
      .addStringOption((o) => o.setName('titre').setDescription('Titre du message (facultatif)').setMaxLength(100)))
    .addSubcommand((s) => s.setName('liste').setDescription('Voir les messages programmés'))
    .addSubcommand((s) => s.setName('tester').setDescription('Envoyer un message maintenant (pour voir le rendu)')
      .addIntegerOption((o) => o.setName('numero').setDescription('Son numéro dans la liste').setRequired(true)))
    .addSubcommand((s) => s.setName('retirer').setDescription('Supprimer un message programmé')
      .addIntegerOption((o) => o.setName('numero').setDescription('Son numéro dans la liste').setRequired(true))),
  async execute(i) {
    if (!estStaff(i.member)) return rep.repondre(i, rep.erreur(textes.pasStaff));
    const sub = i.options.getSubcommand(), bd = r.auto;
    if (sub === 'ajouter') {
      const salon = i.options.getChannel('salon');
      if (!salon?.isTextBased()) return rep.repondre(i, rep.erreur('Choisis un salon textuel.'));
      const a = { id: bd.data.suivant++, salonId: salon.id, texte: i.options.getString('message').replaceAll('\\n', '\n'),
        frequence: i.options.getString('frequence'), titre: i.options.getString('titre') || null };
      a.prochain = Date.now() + r.FREQ[a.frequence];
      bd.data.liste.push(a); bd.sauver();
      return rep.repondre(i, rep.ok(`Message **n°${a.id}** programmé dans ${salon}, ${NOMS[a.frequence]} (premier envoi dans ce délai). Utilise \`/auto tester numero:${a.id}\` pour voir le rendu.`));
    }
    if (sub === 'liste') {
      return rep.repondre(i, bd.data.liste.length
        ? rep.info(bd.data.liste.map((a) => `**n°${a.id}** · <#${a.salonId}> · ${NOMS[a.frequence]} · prochain <t:${Math.floor(a.prochain / 1000)}:R>\n> ${a.texte.slice(0, 80)}${a.texte.length > 80 ? '…' : ''}`).join('\n\n'))
        : rep.info('Aucun message automatique pour l\'instant.'));
    }
    const a = bd.data.liste.find((x) => x.id === i.options.getInteger('numero'));
    if (!a) return rep.repondre(i, rep.erreur('Je ne trouve pas ce numéro (regarde `/auto liste`).'));
    if (sub === 'tester') { await r.envoyerAuto(i.client, a); return rep.repondre(i, rep.ok(`Envoyé dans <#${a.salonId}>.`)); }
    bd.data.liste = bd.data.liste.filter((x) => x !== a); bd.sauver();
    await rep.repondre(i, rep.ok(`Message n°${a.id} supprimé.`));
  },
};
