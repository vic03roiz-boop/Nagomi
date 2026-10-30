// 🔑 Qui a le droit de faire quoi.
const { PermissionFlagsBits } = require('discord.js');
const parametres = require('./parametres');

// Est-ce un membre de l'équipe ? (rôle Équipe défini avec /config, OU permission de modérer)
function estStaff(membre) {
  if (!membre) return false;
  const roleId = parametres.lire('staffRoleId');
  if (roleId && membre.roles?.cache?.has(roleId)) return true;
  return membre.permissions.has(PermissionFlagsBits.ManageMessages)
      || membre.permissions.has(PermissionFlagsBits.Administrator);
}

// Vérifie qu'on peut agir sur une cible (hiérarchie des rôles). Renvoie un texte d'erreur ou null.
function verifierCible(interaction, cible) {
  if (!cible) return "Je ne trouve pas cette personne sur le serveur.";
  const auteur = interaction.member;
  const moi = interaction.guild.members.me;
  if (cible.id === interaction.user.id) return "Tu ne peux pas faire ça sur toi-même 🌸";
  if (cible.id === interaction.guild.ownerId) return "Impossible : c'est le/la propriétaire du serveur.";
  if (cible.id === interaction.client.user.id) return "Pas sur moi, s'il te plaît 🥺";
  if (interaction.user.id !== interaction.guild.ownerId
      && cible.roles.highest.position >= auteur.roles.highest.position)
    return "Cette personne a un rôle égal ou supérieur au tien.";
  if (cible.roles.highest.position >= moi.roles.highest.position)
    return "Mon rôle est en dessous du sien : monte mon rôle dans la liste des rôles du serveur.";
  return null;
}

module.exports = { estStaff, verifierCible };
