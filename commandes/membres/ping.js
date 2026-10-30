const { SlashCommandBuilder } = require('discord.js');
const rep = require('../../outils/reponses');

module.exports = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Vérifie que je suis bien réveillée 🍵'),
  async execute(i) {
    await rep.repondre(i, rep.ok(`Pong ! Latence : **${Math.round(i.client.ws.ping)} ms**`));
  },
};
