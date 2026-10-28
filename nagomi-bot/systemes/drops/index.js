// 🎁 Les drops : un lot offert au PREMIER qui clique sur le bouton. Créés avec /drop.
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { ouvrir } = require('../../outils/stockage');
const parametres = require('../../outils/parametres');
const couleurs = require('../../reglages/couleurs');
const textes = require('../../reglages/textes');

const bd = ouvrir('drops', { liste: {} });
const DUREE = 24 * 60 * 60 * 1000;           // un drop reste valable 24 h
const [d1, d2] = textes.deco;

function embedDrop(d, etat = 'ouvert') {
  const e = new EmbedBuilder().setFooter({ text: textes.pied });
  if (etat === 'ouvert') return e.setColor(couleurs.rose).setTitle('🎁 DROP !')
    .setDescription(`${d1}\n**${d.lot}**\n${d2}\n\nOffert par <@${d.hoteId}> 🎀\n**Le/la plus rapide à cliquer gagne !** 🌸`);
  if (etat === 'gagne') return e.setColor(couleurs.matcha).setTitle('🎁 Drop remporté !')
    .setDescription(`**${d.lot}**\n\n🏆 Attrapé par <@${d.gagnantId}>`);
  return e.setColor(couleurs.creme).setTitle('🎁 Drop expiré')
    .setDescription(`**${d.lot}**\n\nPersonne n'a cliqué à temps 🥀`);
}
const bouton = () => new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('drop:prendre').setLabel('Attraper !').setEmoji('🌸').setStyle(ButtonStyle.Success));

async function expirer(client) {
  for (const d of Object.values(bd.data.liste)) {
    if (d.etat !== 'ouvert' || d.fin > Date.now()) continue;
    d.etat = 'expire'; bd.sauver();
    const canal = await client.channels.fetch(d.channelId).catch(() => null);
    const msg = await canal?.messages.fetch(d.messageId).catch(() => null);
    await msg?.edit({ embeds: [embedDrop(d, 'expire')], components: [] }).catch(() => {});
  }
}

module.exports = {
  bd, DUREE, embedDrop, bouton,
  messageGagnant: (d) => {
    const t = parametres.lire('ticketPanelChannelId');
    return `🎉 Félicitations <@${d.gagnantId}> ! Tu remportes **${d.lot}** !\n` +
      (t ? `Rends-toi dans <#${t}> et ouvre un ticket pour récupérer ton lot 🎫` : 'Ouvre un ticket pour récupérer ton lot 🎫');
  },
  demarrer(client) { setInterval(() => expirer(client).catch(() => {}), 60 * 1000); },
};
