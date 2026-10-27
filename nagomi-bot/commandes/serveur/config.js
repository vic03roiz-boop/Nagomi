const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ChannelSelectMenuBuilder, RoleSelectMenuBuilder, ChannelType, MessageFlags } = require('discord.js');
const rep = require('../../outils/reponses');
const couleurs = require('../../reglages/couleurs');
const parametres = require('../../outils/parametres');

// Les réglages modifiables : [clé, titre, type]
const REGLAGES = [
  ['logsChannelId', '📋 Salon des logs (traces de modération)', 'salon'],
  ['welcomeChannelId', '🌸 Salon de bienvenue', 'salon'],
  ['staffRoleId', '🔑 Rôle Équipe', 'role'],
  ['memberRoleId', '✦ Rôle Membre', 'role'],
  ['ticketCategoryId', '🎫 Catégorie des tickets', 'categorie'],
];
const TYPE_CLE = { logs: 'logsChannelId', bienvenue: 'welcomeChannelId', staff: 'staffRoleId', membre: 'memberRoleId', tickets: 'ticketCategoryId' };

function valeur(cle, type) {
  const v = parametres.lire(cle);
  if (!v) return '*non défini*';
  return type === 'role' ? `<@&${v}>` : `<#${v}>`;
}

function panneau() {
  const e = new EmbedBuilder().setColor(couleurs.rose).setTitle('⚙️ Réglages de Nagomi')
    .setDescription('Choisis dans les menus ci-dessous. Tout est enregistré tout de suite.\n\n' +
      REGLAGES.map(([c, t, ty]) => `**${t}**\n${valeur(c, ty)}`).join('\n\n'));
  const salon = (id, ph) => new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId(`config:${id}`).setPlaceholder(ph)
    .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setMinValues(0).setMaxValues(1));
  const categorie = (id, ph) => new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId(`config:${id}`).setPlaceholder(ph)
    .setChannelTypes(ChannelType.GuildCategory).setMinValues(0).setMaxValues(1));
  const role = (id, ph) => new ActionRowBuilder().addComponents(new RoleSelectMenuBuilder().setCustomId(`config:${id}`).setPlaceholder(ph).setMinValues(0).setMaxValues(1));
  return { embeds: [e], components: [salon('logs', '📋 Salon des logs'), salon('bienvenue', '🌸 Salon de bienvenue'), role('staff', '🔑 Rôle Équipe'), role('membre', '✦ Rôle Membre'), categorie('tickets', '🎫 Catégorie des tickets')] };
}

module.exports = {
  data: new SlashCommandBuilder().setName('config').setDescription('Panneau des réglages du bot')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(i) { await i.reply({ ...panneau(), flags: MessageFlags.Ephemeral }); },
  async composant(i) {
    if (!i.isAnySelectMenu()) return;
    const cle = TYPE_CLE[i.customId.split(':')[1]];
    if (!cle || !i.memberPermissions.has(PermissionFlagsBits.ManageGuild)) return;
    parametres.ecrire(cle, i.values[0] || null);
    await i.update(panneau());
  },
};
