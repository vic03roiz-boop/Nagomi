// 🎂 Anniversaires : chacun enregistre son jour (sans l'année, pour la vie privée)
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const rep = require('../../outils/reponses');
const couleurs = require('../../reglages/couleurs');
const textes = require('../../reglages/textes');
const { estStaff } = require('../../outils/permissions');
const { anniv, parisMaintenant } = require('../../systemes/rappels');
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const JOURS_MAX = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

module.exports = {
  data: new SlashCommandBuilder().setName('anniversaire').setDescription('Ton anniversaire, souhaité par Nagomi 🎂')
    .addSubcommand((s) => s.setName('definir').setDescription('Enregistrer ton anniversaire (jour et mois seulement)')
      .addIntegerOption((o) => o.setName('jour').setDescription('Le jour').setRequired(true).setMinValue(1).setMaxValue(31))
      .addIntegerOption((o) => o.setName('mois').setDescription('Le mois').setRequired(true).setMinValue(1).setMaxValue(12)))
    .addSubcommand((s) => s.setName('retirer').setDescription('Effacer ton anniversaire'))
    .addSubcommand((s) => s.setName('prochains').setDescription('Les prochains anniversaires'))
    .addSubcommand((s) => s.setName('salon').setDescription('(équipe) Salon où souhaiter les anniversaires')
      .addChannelOption((o) => o.setName('salon').setDescription('Le salon').setRequired(true))),
  async execute(i) {
    const sub = i.options.getSubcommand(), bd = anniv;
    if (sub === 'salon') {
      if (!estStaff(i.member)) return rep.repondre(i, rep.erreur(textes.pasStaff));
      bd.data.salonId = i.options.getChannel('salon').id; bd.sauver();
      return rep.repondre(i, rep.ok(`Les anniversaires seront souhaités dans <#${bd.data.salonId}>, chaque jour vers 9 h 🎂`));
    }
    if (sub === 'definir') {
      const j = i.options.getInteger('jour'), m = i.options.getInteger('mois');
      if (j > JOURS_MAX[m - 1]) return rep.repondre(i, rep.erreur(`Il n'y a pas de ${j} ${MOIS[m - 1]} 🥀`));
      bd.data.membres[i.user.id] = { j, m }; bd.sauver();
      return rep.repondre(i, rep.ok(`C'est noté : **${j} ${MOIS[m - 1]}** 🎂 Je te le souhaiterai ce jour-là ! (Je ne garde ni ton âge ni ton année de naissance.)`));
    }
    if (sub === 'retirer') {
      delete bd.data.membres[i.user.id]; bd.sauver();
      return rep.repondre(i, rep.ok('Ton anniversaire a été effacé.'));
    }
    const p = parisMaintenant();
    const ids = Object.keys(bd.data.membres);
    if (ids.length) await i.guild.members.fetch({ user: ids.slice(0, 100) }).catch(() => {});
    const aujourd = new Date(Date.UTC(p.an, p.mois - 1, p.jour));
    const liste = Object.entries(bd.data.membres).filter(([id]) => i.guild.members.cache.has(id)).map(([id, d]) => {
      let t = new Date(Date.UTC(p.an, d.m - 1, d.j)); if (t < aujourd) t = new Date(Date.UTC(p.an + 1, d.m - 1, d.j));
      return { id, d, t };
    }).sort((a, b) => a.t - b.t).slice(0, 10);
    await rep.repondre(i, new EmbedBuilder().setColor(couleurs.miel).setTitle('🎂 Prochains anniversaires')
      .setDescription(liste.length ? liste.map((x) => `**${x.d.j} ${MOIS[x.d.m - 1]}** · <@${x.id}>`).join('\n') : "Personne n'a encore enregistré son anniversaire. Lance-toi avec `/anniversaire definir` 🌸")
      .setFooter({ text: textes.pied }));
  },
};
