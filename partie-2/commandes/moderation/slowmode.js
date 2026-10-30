const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const rep = require('../../outils/reponses');

module.exports = {
  data: new SlashCommandBuilder().setName('slowmode').setDescription('Règle le mode lent du salon')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption((o) => o.setName('secondes').setDescription('Délai entre deux messages (0 = désactivé, max 21600)').setRequired(true).setMinValue(0).setMaxValue(21600)),
  async execute(i) {
    const s = i.options.getInteger('secondes');
    await i.channel.setRateLimitPerUser(s);
    await rep.repondre(i, rep.ok(s ? `Mode lent réglé sur **${s} s**.` : 'Mode lent désactivé.'));
  },
};
