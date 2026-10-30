const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const rep = require('../../outils/reponses');
const { journaliser } = require('../../outils/journal');

module.exports = {
  data: new SlashCommandBuilder().setName('clear').setDescription('Supprime des messages du salon')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((o) => o.setName('nombre').setDescription('Combien de messages (1 à 100)').setRequired(true).setMinValue(1).setMaxValue(100))
    .addUserOption((o) => o.setName('membre').setDescription('Supprimer seulement les messages de cette personne')),
  async execute(i) {
    await i.deferReply({ flags: 64 });
    const n = i.options.getInteger('nombre');
    const user = i.options.getUser('membre');
    let msgs = await i.channel.messages.fetch({ limit: 100 });
    if (user) msgs = msgs.filter((m) => m.author.id === user.id);
    const cibles = [...msgs.values()].slice(0, n);
    const supprimes = await i.channel.bulkDelete(cibles, true); // ignore les messages de +14 jours
    await journaliser(i.guild, { titre: '🧹 Nettoyage', champs: [{ name: 'Salon', value: `${i.channel}`, inline: true }, { name: 'Messages', value: String(supprimes.size), inline: true }, { name: 'Par', value: `${i.user}`, inline: true }] });
    await rep.repondre(i, rep.ok(`**${supprimes.size}** message(s) supprimé(s).${supprimes.size < cibles.length ? '\n*(Les messages de plus de 14 jours ne peuvent pas être supprimés en masse.)*' : ''}`));
  },
};
