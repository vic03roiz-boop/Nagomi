const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const rep = require('../../outils/reponses');
const { ouvrir } = require('../../outils/stockage');

const bd = ouvrir('autoroles', { roles: [] }); // lu aussi par systemes/autorole

module.exports = {
  bd,
  data: new SlashCommandBuilder().setName('autorole').setDescription('Rôles donnés automatiquement aux nouveaux membres')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addStringOption((o) => o.setName('action').setDescription('Que faire ?').setRequired(true).addChoices(
      { name: 'ajouter', value: 'ajouter' }, { name: 'retirer', value: 'retirer' }, { name: 'liste', value: 'liste' }))
    .addRoleOption((o) => o.setName('role').setDescription('Le rôle')),
  async execute(i) {
    const action = i.options.getString('action');
    if (action === 'liste') {
      return rep.repondre(i, bd.data.roles.length
        ? rep.info(`Rôles donnés à l'arrivée : ${bd.data.roles.map((r) => `<@&${r}>`).join(' ')}`)
        : rep.info("Aucun rôle automatique pour l'instant."));
    }
    const role = i.options.getRole('role');
    if (!role) return rep.repondre(i, rep.erreur('Choisis un `role`.'));
    if (action === 'ajouter') {
      if (role.managed || role.id === i.guild.id || role.position >= i.guild.members.me.roles.highest.position)
        return rep.repondre(i, rep.erreur('Je ne peux pas donner ce rôle (mon rôle doit être au-dessus de lui).'));
      if (!bd.data.roles.includes(role.id)) bd.data.roles.push(role.id);
      bd.sauver();
      return rep.repondre(i, rep.ok(`Les nouveaux membres recevront **${role.name}**.`));
    }
    bd.data.roles = bd.data.roles.filter((r) => r !== role.id);
    bd.sauver();
    await rep.repondre(i, rep.ok(`**${role.name}** n'est plus donné automatiquement.`));
  },
};
