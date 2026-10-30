// 🎫 Si un salon de ticket est supprimé à la main, on le marque comme fermé (sinon la personne ne pourrait plus en rouvrir).
const { Events } = require('discord.js');
const { ouvrir } = require('../../outils/stockage');
const bd = ouvrir('tickets', { suivant: 1, liste: {} });

module.exports = {
  demarrer(client) {
    client.on(Events.ChannelDelete, (salon) => {
      const t = Object.values(bd.data.liste).find((x) => x.channelId === salon.id && x.statut !== 'ferme');
      if (t) { t.statut = 'ferme'; t.fermeLe = Date.now(); bd.sauver(); }
    });
  },
};
