// 🪪 Voir / corriger le profil d'un membre (équipe uniquement)
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const rep = require('../../outils/reponses');
const couleurs = require('../../reglages/couleurs');
const textes = require('../../reglages/textes');
const { estStaff } = require('../../outils/permissions');
const profil = require('../../systemes/profil');
const { bd } = profil;

module.exports = {
  data: new SlashCommandBuilder().setName('profil').setDescription("Voir le profil d'un membre (pseudo MSP, rôles choisis)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addUserOption((o) => o.setName('membre').setDescription('Le membre'))
    .addStringOption((o) => o.setName('pseudo').setDescription('…ou un pseudo MSP à retrouver'))
    .addStringOption((o) => o.setName('action').setDescription('Facultatif').addChoices(
      { name: 'changer le pseudo', value: 'pseudo' }, { name: 'réinitialiser (il refera le questionnaire)', value: 'reset' }))
    .addStringOption((o) => o.setName('nouveau').setDescription('Le nouveau pseudo (avec « changer le pseudo »)')),
  async execute(i) {
    if (!estStaff(i.member)) return rep.repondre(i, rep.erreur(textes.pasStaff));
    let id = i.options.getUser('membre')?.id;
    const ps = i.options.getString('pseudo');
    if (!id && ps) id = bd.data.pseudos[profil.norm(ps)];
    if (!id) return rep.repondre(i, rep.erreur(ps ? `Aucun compte n'est lié au pseudo **${ps}**.` : 'Indique un `membre` ou un `pseudo`.'));
    const f = bd.data.membres[id];
    if (!f) return rep.repondre(i, rep.info(`<@${id}> n'a pas rempli le questionnaire.`));
    const action = i.options.getString('action');

    if (action === 'reset') {
      delete bd.data.pseudos[profil.norm(f.pseudo)]; delete bd.data.membres[id]; bd.sauver();
      return rep.repondre(i, rep.ok(`Profil de <@${id}> effacé. Il/elle peut refaire le questionnaire (ses rôles actuels restent jusque-là).`));
    }
    if (action === 'pseudo') {
      const nv = i.options.getString('nouveau')?.trim();
      if (!nv || !profil.pseudoValide(nv)) return rep.repondre(i, rep.erreur('Donne un `nouveau` pseudo valide.'));
      const n = profil.norm(nv);
      if (bd.data.pseudos[n] && bd.data.pseudos[n] !== id) return rep.repondre(i, rep.erreur('Ce pseudo est déjà lié à un autre compte.'));
      delete bd.data.pseudos[profil.norm(f.pseudo)]; bd.data.pseudos[n] = id; f.pseudo = nv; bd.sauver();
      return rep.repondre(i, rep.ok(`Pseudo changé en **${nv}**.`));
    }
    const lignes = bd.data.groupes.filter((g) => g.roles.length).map((g) => {
      const c = f.reponses?.[g.id] || [];
      return `**${g.titre}** : ${c.length ? c.map((r) => `<@&${r}>`).join(' ') : '—'}`;
    });
    await rep.repondre(i, new EmbedBuilder().setColor(couleurs.rose).setTitle(`🪪 ${f.pseudo}`)
      .setDescription([`Compte : <@${id}>`, `Rempli le <t:${Math.floor(f.date / 1000)}:D>`, '', ...lignes].join('\n')).setFooter({ text: textes.pied }));
  },
};
