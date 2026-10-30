// 🍵 Le pendu MSP : un mot du monde de MovieStarPlanet, tout le monde joue dans le salon
const { SlashCommandBuilder } = require('discord.js');
const rep = require('../../outils/reponses');
const { parties, lancerPendu } = require('../../systemes/jeux');
const { estStaff } = require('../../outils/permissions');

module.exports = {
  data: new SlashCommandBuilder().setName('pendu').setDescription('Lancer une partie de pendu MSP dans ce salon')
    .addBooleanOption((o) => o.setName('arreter').setDescription("Arrêter la partie en cours (équipe)")),
  async execute(i) {
    if (i.options.getBoolean('arreter')) {
      if (!estStaff(i.member)) return rep.repondre(i, rep.erreur('Seule l\'équipe peut arrêter une partie.'));
      parties.delete(i.channelId);
      return rep.repondre(i, rep.ok('Partie arrêtée.'));
    }
    if (!i.channel?.isTextBased()) return;
    if (parties.has(i.channelId)) return rep.repondre(i, rep.info('Une partie est déjà en cours dans ce salon, tape tes lettres ! 🌸'));
    await rep.repondre(i, rep.ok('Partie lancée !'));
    await lancerPendu(i.channel);
  },
};
