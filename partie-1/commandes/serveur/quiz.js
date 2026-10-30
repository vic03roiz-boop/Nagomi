// 🧠 Quiz MSP : le premier qui clique sur la bonne réponse gagne
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const rep = require('../../outils/reponses');
const couleurs = require('../../reglages/couleurs');
const textes = require('../../reglages/textes');
const { estStaff } = require('../../outils/permissions');
const { quiz } = require('../../systemes/jeux');

const actifs = new Map(); // messageId -> { q, bonne, rates:Set, fini }
const DUREE = 30 * 1000;

module.exports = {
  data: new SlashCommandBuilder().setName('quiz').setDescription('Quiz MSP')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand((s) => s.setName('lancer').setDescription('Poser une question au hasard dans ce salon'))
    .addSubcommand((s) => s.setName('ajouter').setDescription('Ajouter une question')
      .addStringOption((o) => o.setName('question').setDescription('La question').setRequired(true).setMaxLength(200))
      .addStringOption((o) => o.setName('bonne').setDescription('La bonne réponse').setRequired(true).setMaxLength(70))
      .addStringOption((o) => o.setName('fausse1').setDescription('Une mauvaise réponse').setRequired(true).setMaxLength(70))
      .addStringOption((o) => o.setName('fausse2').setDescription('Une autre mauvaise réponse').setMaxLength(70))
      .addStringOption((o) => o.setName('fausse3').setDescription('Encore une mauvaise réponse').setMaxLength(70)))
    .addSubcommand((s) => s.setName('liste').setDescription('Voir les questions'))
    .addSubcommand((s) => s.setName('retirer').setDescription('Supprimer une question')
      .addIntegerOption((o) => o.setName('numero').setDescription('Son numéro dans la liste').setRequired(true).setMinValue(1))),
  async execute(i) {
    if (!estStaff(i.member)) return rep.repondre(i, rep.erreur(textes.pasStaff));
    const sub = i.options.getSubcommand(), qs = quiz.data.questions;
    if (sub === 'ajouter') {
      const faux = ['fausse1', 'fausse2', 'fausse3'].map((n) => i.options.getString(n)).filter(Boolean);
      qs.push({ q: i.options.getString('question'), bonne: i.options.getString('bonne'), mauvaises: faux }); quiz.sauver();
      return rep.repondre(i, rep.ok(`Question ajoutée (n°${qs.length}).`));
    }
    if (sub === 'liste') return rep.repondre(i, rep.info(qs.map((x, n) => `**${n + 1}.** ${x.q} → *${x.bonne}*`).join('\n').slice(0, 3900) || 'Aucune question.'));
    if (sub === 'retirer') {
      const n = i.options.getInteger('numero');
      if (!qs[n - 1]) return rep.repondre(i, rep.erreur('Numéro inconnu.'));
      qs.splice(n - 1, 1); quiz.sauver();
      return rep.repondre(i, rep.ok('Question supprimée.'));
    }
    if (!qs.length) return rep.repondre(i, rep.erreur('Aucune question : ajoute-en avec `/quiz ajouter`.'));
    const x = qs[Math.floor(Math.random() * qs.length)];
    const rep_ = [x.bonne, ...x.mauvaises].map((t, k) => ({ t, ok: k === 0 })).sort(() => Math.random() - 0.5);
    const emb = new EmbedBuilder().setColor(couleurs.rose).setTitle('🧠 Quiz MSP')
      .setDescription(`**${x.q}**\n\nLe/la plus rapide à cliquer sur la bonne réponse gagne ! (une seule chance, ${DUREE / 1000} secondes) 🌸`).setFooter({ text: textes.pied });
    const row = new ActionRowBuilder().addComponents(rep_.map((r, k) => new ButtonBuilder().setCustomId(`quiz:r:${k}`).setLabel(r.t).setStyle(ButtonStyle.Secondary)));
    await rep.repondre(i, rep.ok('Question posée !'));
    const msg = await i.channel.send({ embeds: [emb], components: [row] });
    const etat = { x, rep: rep_, rates: new Set(), fini: false };
    actifs.set(msg.id, etat);
    setTimeout(async () => {
      if (etat.fini) return; etat.fini = true; actifs.delete(msg.id);
      await msg.edit({ embeds: [new EmbedBuilder().setColor(couleurs.creme).setTitle('🧠 Quiz terminé')
        .setDescription(`**${x.q}**\n\nPersonne n'a trouvé 🥀 La réponse était : **${x.bonne}**`).setFooter({ text: textes.pied })], components: [] }).catch(() => {});
    }, DUREE);
  },
  async composant(i) {
    const e = actifs.get(i.message.id);
    if (!e || e.fini) return i.reply({ content: 'Ce quiz est terminé 🌸', flags: MessageFlags.Ephemeral });
    if (e.rates.has(i.user.id)) return i.reply({ content: 'Tu as déjà tenté ta chance sur cette question 🥀', flags: MessageFlags.Ephemeral });
    const choix = e.rep[Number(i.customId.split(':')[2])];
    if (!choix.ok) { e.rates.add(i.user.id); return i.reply({ content: 'Raté 🥀 Tu ne peux plus rejouer cette question.', flags: MessageFlags.Ephemeral }); }
    e.fini = true; actifs.delete(i.message.id);
    await i.update({ embeds: [new EmbedBuilder().setColor(couleurs.matcha).setTitle('🧠 Quiz remporté !')
      .setDescription(`**${e.x.q}**\n\nBonne réponse : **${e.x.bonne}**\n🏆 Trouvé par <@${i.user.id}> !`).setFooter({ text: textes.pied })], components: [] });
  },
};
