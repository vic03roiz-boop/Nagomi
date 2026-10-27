const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const couleurs = require('../../reglages/couleurs');
const rep = require('../../outils/reponses');

const TITRES = { membres: '🌸 Membres', moderation: '🔨 Modération', serveur: '🛠️ Serveur' };

module.exports = {
  data: new SlashCommandBuilder().setName('aide').setDescription('La liste de mes commandes'),
  async execute(i) {
    const groupes = {};
    for (const cmd of i.client.commands.values()) {
      const perm = cmd.data.default_member_permissions;
      if (perm && !i.memberPermissions.has(BigInt(perm))) continue; // cache ce qu'on ne peut pas utiliser
      (groupes[cmd.categorie] ||= []).push(`\`/${cmd.data.name}\` — ${cmd.data.description}`);
    }
    const e = new EmbedBuilder().setColor(couleurs.rose).setTitle('🍵 Les commandes de Nagomi')
      .setDescription('Tape `/` puis le nom de la commande.');
    for (const [cat, lignes] of Object.entries(groupes))
      e.addFields({ name: TITRES[cat] || cat, value: lignes.join('\n').slice(0, 1024) });
    await rep.repondre(i, e);
  },
};
