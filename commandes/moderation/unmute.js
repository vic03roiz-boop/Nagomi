const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const rep = require('../../outils/reponses');
const { journaliser } = require('../../outils/journal');

module.exports = {
  data: new SlashCommandBuilder().setName('unmute').setDescription('Rend la parole à un membre')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName('membre').setDescription('La personne').setRequired(true)),
  async execute(i) {
    const user = i.options.getUser('membre');
    const membre = await i.guild.members.fetch(user.id).catch(() => null);
    if (!membre) return rep.repondre(i, rep.erreur('Je ne trouve pas cette personne.'));
    if (!membre.isCommunicationDisabled()) return rep.repondre(i, rep.info("Cette personne n'est pas muette."));
    await membre.timeout(null, `${i.user.tag}`);
    await journaliser(i.guild, { titre: '🔊 Fin de mute', champs: [{ name: 'Membre', value: `${user}`, inline: true }, { name: 'Par', value: `${i.user}`, inline: true }] });
    await rep.repondre(i, rep.ok(`**${user.displayName}** peut de nouveau parler.`));
  },
};
